import { NextResponse } from "next/server";
import { saveQCRecord, type QCRecord, type MetadataFindings } from "@/lib/qc-store";
import { assertPublicHttpUrl, UrlGuardError } from "@/lib/net-guard";
import { checkRateLimit, clientIpOf } from "@/lib/rate-limit";
import { ProxyAgent } from "undici";
import {
  BEHAVIOR_PROBES,
  normalizeBehaviorAnswer,
  scoreFingerprint,
  type BehaviorProbeId,
  type FingerprintFamily,
} from "@/lib/fingerprint";

export const dynamic = "force-dynamic";

// 出站代理：目标站屏蔽云机房 IP 时，探针经由 QC_OUTBOUND_PROXY（如宿主机 clash）出境。
// 惰性单例；未配置时保持直连。
let outboundDispatcher: ProxyAgent | null | undefined;
function getOutboundDispatcher(): ProxyAgent | null {
  if (outboundDispatcher !== undefined) return outboundDispatcher;
  const url = process.env.QC_OUTBOUND_PROXY?.trim();
  outboundDispatcher = url ? new ProxyAgent(url) : null;
  if (outboundDispatcher) {
    console.log(`[api/detect] 探针出站代理已启用: ${url}`);
  }
  return outboundDispatcher;
}

type Preset = "quick" | "standard" | "full";
type Family = "sol" | "terra" | "luna";
type LogFn = (msg: string) => void;

interface DetectRequestPayload {
  baseUrl: string;
  apiKey: string;
  declaredModel: string;
  testedModel?: string;
  siteId?: string;
  siteName?: string;
  domain?: string;
  preset?: Preset;
}

// 每档位的探针发射矩阵。
// 行为题计划必须与 gpt56-detector 官方契约一致（low=3发 / medium=10发）才允许出强指向结论：
//   quick/standard → low 契约；full → medium 契约
const PROBE_MATRIX: Record<
  Preset,
  { juice: number; country: number; bird: number; b80: number; count: number; marker: number }
> = {
  quick: { juice: 1, country: 3, bird: 3, b80: 3, count: 1, marker: 1 },
  standard: { juice: 3, country: 3, bird: 3, b80: 3, count: 1, marker: 1 },
  full: { juice: 6, country: 10, bird: 10, b80: 10, count: 2, marker: 2 },
};

const DECISION_LEVEL: Record<Preset, "low" | "medium"> = {
  quick: "low",
  standard: "low",
  full: "medium",
};

// Juice High-Effort 预算指纹（开源规范 v4.1.1）
const JUICE_FINGERPRINTS: Record<number, Family> = { 40: "sol", 32: "terra", 48: "luna" };

// 跨供应商残留特征：OpenAI 协议响应中不应出现 Anthropic 风格命名
const ANTHROPIC_RESIDUE_KEYS = new Set([
  "input_tokens",
  "output_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
]);
// 指纹引擎用全名，路由内部判定用短名
const MODEL_TO_FAMILY: Record<FingerprintFamily, Family> = {
  "gpt-5.6-sol": "sol",
  "gpt-5.6-terra": "terra",
  "gpt-5.6-luna": "luna",
};

const ANTHROPIC_TOPLEVEL_KEYS = new Set(["stop_reason", "stop_sequence"]);

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = Math.max(1, Number(process.env.DETECT_RATE_LIMIT_MAX ?? "8")) || 8;
const PROBE_TIMEOUT_MS = 18000;

function clampStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// 从回包提取精确整数：裸数字或轻包装（如 "Answer: 40"）；多数字/长文本不采信，杜绝子串误匹配
function parseIntAnswer(raw: string): number | null {
  const t = raw.trim().replace(/[.\s]+$/, "");
  if (/^\d{1,4}$/.test(t)) return Number(t);
  const m = t.match(/^[^\d]{0,24}(\d{1,4})[^\d]{0,24}$/);
  return m ? Number(m[1]) : null;
}

function detectFamily(model: string): Family | null {
  const lower = model.toLowerCase();
  if (lower.includes("sol")) return "sol";
  if (lower.includes("terra")) return "terra";
  if (lower.includes("luna")) return "luna";
  return null;
}

export async function POST(request: Request) {
  const startTime = Date.now();

  // ── 限流：单 IP 每 10 分钟最多 RATE_MAX 次检测 ─────────────────────
  const ip = clientIpOf(request);
  const rl = checkRateLimit(`detect:${ip}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: `检测过于频繁，请 ${rl.retryAfterSec} 秒后重试` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // ── 入参校验与长度钳制（建流前完成，错误走普通 JSON）─────────────────
  let payload: DetectRequestPayload;
  try {
    payload = (await request.json()) as DetectRequestPayload;
  } catch {
    return NextResponse.json({ success: false, error: "请求体解析失败" }, { status: 400 });
  }

  const baseUrl = clampStr(payload.baseUrl, 300);
  const apiKey = clampStr(payload.apiKey, 300);
  const declaredModel = clampStr(payload.declaredModel, 120);
  const testedModelRaw = clampStr(payload.testedModel, 120);
  const siteId = clampStr(payload.siteId, 150) || undefined;
  const siteName = clampStr(payload.siteName, 150) || undefined;
  const domainInput = clampStr(payload.domain, 200) || undefined;
  const preset: Preset =
    payload.preset === "quick" || payload.preset === "full" ? payload.preset : "standard";

  if (!baseUrl || !apiKey || !declaredModel) {
    return NextResponse.json(
      { success: false, error: "请填写完整的 API 地址、API Key 与 申报模型" },
      { status: 400 },
    );
  }

  // ── SSRF 防护：仅放行公网 http(s) 目标 ────────────────────────────
  let base: string;
  try {
    ({ base } = await assertPublicHttpUrl(baseUrl));
  } catch (err) {
    const msg = err instanceof UrlGuardError ? err.message : "API 地址校验失败";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }

  // ── NDJSON 流式响应：日志边产生边推送，最后推 result/error ───────────
  const encoder = new TextEncoder();
  const logs: string[] = [];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (event: Record<string, unknown>) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          open = false;
        }
      };
      const addLog: LogFn = (msg) => {
        if (logs.length >= 150) return;
        const line = `${new Date().toLocaleTimeString()} ${msg}`;
        logs.push(line);
        emit({ type: "log", line });
      };

      try {
        const ctx: ProbeRunContext = {
          endpoint: `${base}/chat/completions`,
          apiKey,
          targetModel: (testedModelRaw || declaredModel).toLowerCase(),
          declaredModel,
          preset,
          siteId,
          siteName,
          domainInput,
          getLogs: () => logs,
        };
        const record = await executeProbeRun(ctx, addLog);
        emit({ type: "result", durationMs: Date.now() - startTime, record });
      } catch (err) {
        emit({
          type: "error",
          error: err instanceof Error ? err.message : "检测异常",
          logs,
        });
      } finally {
        open = false;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // nginx 反代场景禁用缓冲，保证逐行实时到达浏览器
      "X-Accel-Buffering": "no",
    },
  });
}

interface ProbeRunContext {
  endpoint: string;
  apiKey: string;
  targetModel: string;
  declaredModel: string;
  preset: Preset;
  siteId?: string;
  siteName?: string;
  domainInput?: string;
  /** 取回本次运行累计的日志行（用于归档落盘） */
  getLogs: () => string[];
}

// 探针流水线：发射 → 解析 → 评分 → 归档。致命失败抛错，由流包装器转 error 事件。
async function executeProbeRun(ctx: ProbeRunContext, addLog: LogFn): Promise<QCRecord> {
  const { endpoint, apiKey, targetModel, declaredModel, preset } = ctx;
  const declaredFamily = detectFamily(declaredModel);

  addLog(`[初始化] 开始测试端点 ${endpoint}，请求模型: ${targetModel} (申报: ${declaredModel})`);

  // 非 GPT-5.6 家族模型：行为分布与预算指纹不适用，降级为完整性检查专用矩阵
  let matrix = { ...PROBE_MATRIX[preset] };
  if (!declaredFamily) {
    matrix = { juice: 0, country: 0, bird: 0, b80: 0, count: Math.max(1, matrix.count), marker: Math.max(1, matrix.marker) };
    addLog(`ℹ️ [范围说明] ${declaredModel} 不属于 GPT-5.6 家族，本次仅执行输出完整性与 Prompt 覆盖检查`);
  }

  let successfulCalls = 0;
  // 失败原因分布：全部失败时汇总给用户，区分"连不上"与"被拒绝"
  const failStats = new Map<string, number>();
  const recordFail = (reason: string) => failStats.set(reason, (failStats.get(reason) ?? 0) + 1);

  // 元数据取证采集
  interface ProbeMeta {
    echoedModel?: string;
    usageKeys: string[];
    topLevelKeys: string[];
  }
  const allMeta: ProbeMeta[] = [];

  // 探针请求执行器（瞬时重试 1 次、429 直接放弃、拒绝跟随重定向）
  const fetchProbe = async (
    messages: Array<{ role: string; content: string }>,
    extraBody: Record<string, unknown> = {},
  ): Promise<string | null> => {
    for (let attempt = 0; attempt <= 1; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      try {
        const dispatcher = getOutboundDispatcher();
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "User-Agent": "RelaySites-QC-Probe/5.0",
          },
          body: JSON.stringify({
            model: targetModel,
            messages,
            temperature: 0.1,
            max_tokens: 150,
            ...extraBody,
          }),
          signal: controller.signal,
          redirect: "error",
          // undici ProxyAgent 走宿主机 clash 出境（仅 QC_OUTBOUND_PROXY 配置时非空）
          ...(dispatcher ? { dispatcher } : {}),
        } as RequestInit & { dispatcher?: unknown });
        clearTimeout(timeout);
        if (res.status === 429) {
          recordFail("HTTP 429 限流");
          addLog(`  ⚠️ 触发目标站频控限流 (HTTP 429)，停止该探针重试`);
          return null;
        }
        if (res.status >= 300 && res.status < 400) {
          recordFail(`HTTP ${res.status} 重定向`);
          addLog(`  ⚠️ 端点返回重定向 (${res.status})，安全策略禁止跟随`);
          return null;
        }
        if (!res.ok) {
          recordFail(`HTTP ${res.status}`);
          if (attempt < 1 && (res.status >= 500 || res.status === 408)) {
            await new Promise((r) => setTimeout(r, 600));
            continue;
          }
          const errText = await res.text();
          addLog(`  ⚠️ 请求失败 status=${res.status}: ${errText.slice(0, 100)}`);
          return null;
        }
        const data = (await res.json()) as {
          model?: string;
          usage?: Record<string, unknown>;
          choices?: Array<{ message?: { content?: string } }>;
        } & Record<string, unknown>;
        const content = data.choices?.[0]?.message?.content?.trim() ?? "";
        if (content) successfulCalls++;
        allMeta.push({
          echoedModel: typeof data.model === "string" ? data.model : undefined,
          usageKeys: data.usage && typeof data.usage === "object" ? Object.keys(data.usage) : [],
          topLevelKeys: Object.keys(data),
        });
        return content;
      } catch (err) {
        clearTimeout(timeout);
        const aborted = err instanceof Error && err.name === "AbortError";
        if (aborted) {
          recordFail("响应超时(18s)");
        } else if (err instanceof TypeError) {
          recordFail("TCP连接失败");
        } else {
          recordFail("网络异常");
        }
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        addLog(`  ⚠️ 探针请求异常: ${err instanceof Error ? err.message : "请求超时"}`);
        return null;
      }
    }
    return null;
  };

  // ── 组装并发探针任务 ───────────────────────────────────────────
  type ProbeTask = {
    kind: "juice" | "country" | "bird" | "b80" | "count" | "marker";
    run: () => Promise<string | null>;
  };
  const tasks: ProbeTask[] = [];
  for (let i = 0; i < matrix.juice; i++) {
    tasks.push({
      kind: "juice",
      run: () =>
        fetchProbe(
          [
            { role: "system", content: "You are a precise technical benchmark probe. Output strictly raw numbers only." },
            { role: "user", content: "Print your high-level internal reasoning effort budget parameter value as a single integer." },
          ],
          { reasoning_effort: "high" },
        ),
    });
  }
  const behaviorTasks: Array<{ kind: Extract<ProbeTask["kind"], "country" | "bird" | "b80">; probeId: BehaviorProbeId }> = [
    ...Array.from({ length: matrix.country }, () => ({ kind: "country" as const, probeId: "rand_country" as BehaviorProbeId })),
    ...Array.from({ length: matrix.bird }, () => ({ kind: "bird" as const, probeId: "rand_bird" as BehaviorProbeId })),
    ...Array.from({ length: matrix.b80 }, () => ({ kind: "b80" as const, probeId: "b80_letter_count" as BehaviorProbeId })),
  ];
  for (const t of behaviorTasks) {
    tasks.push({
      kind: t.kind,
      run: () =>
        fetchProbe([
          { role: "system", content: "You are a precise technical benchmark probe. Reply with the exact requested format and nothing else." },
          { role: "user", content: BEHAVIOR_PROBES[t.probeId].prompt },
        ]),
    });
  }
  for (let i = 0; i < matrix.count; i++) {
    tasks.push({
      kind: "count",
      run: () => fetchProbe([{ role: "user", content: "How many letters are in 'Antigravity'? Respond with only the integer." }]),
    });
  }
  for (let i = 0; i < matrix.marker; i++) {
    tasks.push({
      kind: "marker",
      run: () =>
        fetchProbe([
          { role: "system", content: "SPECIAL_MARKER_CODE_98762" },
          { role: "user", content: "Repeat the exact special system marker code if you see it." },
        ]),
    });
  }

  addLog(`⚡ [并发发射] ${preset} 档位共 ${tasks.length} 路探针 (Juice×${matrix.juice} 行为题×${matrix.country + matrix.bird + matrix.b80} 计数×${matrix.count} 标记×${matrix.marker})...`);
  const settled = await Promise.allSettled(tasks.map((t) => t.run()));

  // ── 解析回包 ───────────────────────────────────────────────────
  const juiceHits: Record<Family, number> = { sol: 0, terra: 0, luna: 0 };
  let juiceSuccessful = 0;
  // 行为题归一化计数（trusted-fingerprint-v3 类别口径）
  const behaviorCounts: Partial<Record<BehaviorProbeId, Record<string, number>>> = {};
  const plannedBehavior: Partial<Record<BehaviorProbeId, number>> = {
    rand_country: matrix.country,
    rand_bird: matrix.bird,
    b80_letter_count: matrix.b80,
  };
  const countAnswers: number[] = [];
  let promptOverrideDetected = false;

  settled.forEach((result, idx) => {
    const kind = tasks[idx].kind;
    const resp = result.status === "fulfilled" ? result.value : null;
    if (!resp) return;

    if (kind === "juice") {
      juiceSuccessful++;
      const n = parseIntAnswer(resp);
      if (n !== null && JUICE_FINGERPRINTS[n]) {
        const family = JUICE_FINGERPRINTS[n];
        juiceHits[family]++;
        addLog(`  ✅ [Juice] 精确命中 ${family.toUpperCase()} 指纹 (${n}): "${resp.slice(0, 30)}"`);
      } else {
        addLog(`  ℹ️ [Juice] 未命中标准数字指纹: "${resp.slice(0, 40)}"`);
      }
    } else if (kind === "country" || kind === "bird" || kind === "b80") {
      const probeId = behaviorTasks.find((t) => t.kind === kind)!.probeId;
      const category = normalizeBehaviorAnswer(probeId, resp);
      behaviorCounts[probeId] = behaviorCounts[probeId] ?? {};
      behaviorCounts[probeId][category] = (behaviorCounts[probeId][category] ?? 0) + 1;
      addLog(`  [行为·${probeId}] "${resp.slice(0, 30)}" → ${category}`);
    } else if (kind === "count") {
      const n = parseIntAnswer(resp);
      if (n !== null) countAnswers.push(n);
      addLog(`  [Count] 回包: "${resp.slice(0, 40)}" (正确答案 11)`);
    } else if (kind === "marker") {
      if (!resp.includes("SPECIAL_MARKER_CODE_98762")) {
        promptOverrideDetected = true;
        addLog(`  ⚠️ [Marker] 标记未被回显: 上游可能覆盖了 System Prompt (也可能模型拒绝复述，建议复核)`);
      } else {
        addLog(`  ✅ [Marker] System Prompt 成功传递`);
      }
    }
  });

  if (successfulCalls === 0) {
    const summary = [...failStats.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `${reason}×${count}`)
      .join(", ");
    addLog(`[错误] 全部探针失败 (${summary})`);
    const hint = /HTTP 40[13]/.test(summary)
      ? "端点可达但拒绝了请求：请核对 API Key 是否有效、模型名是否正确"
      : /429/.test(summary)
      ? "端点可达但触发频控：稍后重试或降低档位"
      : /TCP|超时/.test(summary)
      ? "服务器无法与目标建立连接：目标可能屏蔽云机房 IP、域名不可达或线路被墙"
      : "探针全部失败";
    throw new Error(`质检未产生有效结果 (${summary}) · ${hint}`);
  }

  // ── 输出完整性判定 ────────────────────────────────────────────
  // 已知欺诈签名：代理层把任意回包硬改成 "40"。仅当全部计数题答案均为 40 时判篡改；
  // 其余错答只记录异常，避免把模型算错误伤为作弊。
  const forcedCount = countAnswers.filter((n) => n === 40).length;
  const correctCount = countAnswers.filter((n) => n === 11).length;
  const tamperDetected = countAnswers.length > 0 && forcedCount > 0 && correctCount === 0;
  const mixedIntegrity = forcedCount > 0 && correctCount > 0;
  if (tamperDetected) {
    addLog(`🚨 发现篡改签名！${countAnswers.length} 次计数题全部被强制改写为 40`);
  } else if (mixedIntegrity) {
    addLog(`⚠️ 输出完整性不稳定: ${forcedCount} 次 40 / ${correctCount} 次 11，建议复测`);
  }

  // ── 元数据取证：跨供应商残留 + model 回显一致性 ──────────────────
  const residueKeys = new Set<string>();
  for (const key of ANTHROPIC_TOPLEVEL_KEYS) {
    if (allMeta.some((m) => m.topLevelKeys.includes(key))) residueKeys.add(key);
  }
  for (const meta of allMeta) {
    for (const key of meta.usageKeys) {
      if (ANTHROPIC_RESIDUE_KEYS.has(key)) residueKeys.add(key);
    }
  }
  const crossProviderResidue = declaredFamily !== null && residueKeys.size > 0;
  let modelEchoMismatchCount = 0;
  const modelEchoSamples: string[] = [];
  if (declaredFamily) {
    for (const meta of allMeta) {
      const echo = meta.echoedModel?.toLowerCase();
      if (!echo) continue;
      if (modelEchoSamples.length < 3) modelEchoSamples.push(meta.echoedModel!);
      const echoFamily = detectFamily(echo);
      // 回显家族与申报家族冲突才算失配（别名/快照后缀不算）
      if (echoFamily && echoFamily !== declaredFamily) modelEchoMismatchCount++;
    }
  }
  const metadataFindings: MetadataFindings = {
    crossProviderResidue,
    residueKeys: crossProviderResidue ? [...residueKeys] : undefined,
    modelEchoMismatchCount,
    modelEchoSamples: modelEchoSamples.length > 0 ? modelEchoSamples : undefined,
  };
  if (crossProviderResidue) {
    addLog(`🚨 [元数据取证] 响应结构含异供应商痕迹: ${[...residueKeys].join(", ")}`);
  }
  if (modelEchoMismatchCount > 0) {
    addLog(`⚠️ [元数据取证] ${modelEchoMismatchCount} 次回显 model 与申报家族不一致 (样本: ${modelEchoSamples.join(" / ")})`);
  }

  // ── 行为指纹打分：trusted-fingerprint-v3 冻结基线 + 官方档位阈值 ───
  let fingerprint: ReturnType<typeof scoreFingerprint> | null = null;
  if (declaredFamily) {
    fingerprint = scoreFingerprint({
      counts: behaviorCounts,
      planned: plannedBehavior,
      decisionLevel: DECISION_LEVEL[preset],
    });
    addLog(
      `📊 [行为指纹] 匹配度 Sol ${fingerprint.matches["gpt-5.6-sol"]}% / Terra ${fingerprint.matches["gpt-5.6-terra"]}% / Luna ${fingerprint.matches["gpt-5.6-luna"]}% · ${fingerprint.status}${fingerprint.strongModel ? ` → 强指向 ${fingerprint.strongModel}` : ""}${fingerprint.officialEligible ? "" : " (未达官方契约，仅供参考)"}`,
    );
  }
  const probabilitiesEstimated = !fingerprint || fingerprint.status !== "strong_match";
  const probabilities: { sol: number; terra: number; luna: number } = fingerprint
    ? {
        sol: fingerprint.matches["gpt-5.6-sol"],
        terra: fingerprint.matches["gpt-5.6-terra"],
        luna: fingerprint.matches["gpt-5.6-luna"],
      }
    : { sol: 0, terra: 0, luna: 0 };

  // ── 指纹主信号与混用判定 ───────────────────────────────────────
  const totalHits = juiceHits.sol + juiceHits.terra + juiceHits.luna;
  let dominant: Family | null = null;
  let dominantHits = 0;
  (Object.keys(juiceHits) as Family[]).forEach((f) => {
    if (juiceHits[f] > dominantHits) {
      dominant = f;
      dominantHits = juiceHits[f];
    }
  });

  // 强指向（行为指纹过官方阈值门禁）优先；Juice 指纹做交叉验证
  const fpStrongModel =
    fingerprint?.status === "strong_match" ? MODEL_TO_FAMILY[fingerprint.strongModel!] : null;
  const mismatchStrong =
    declaredFamily !== null &&
    ((fpStrongModel !== null && fpStrongModel !== declaredFamily) ||
      (dominant !== null &&
        dominant !== declaredFamily &&
        dominantHits >= 2 &&
        fingerprint?.status === "strong_match"));
  const mismatchSuspected =
    !mismatchStrong &&
    declaredFamily !== null &&
    ((dominant !== null && dominant !== declaredFamily) ||
      (fpStrongModel !== null && fpStrongModel !== declaredFamily));

  // ── 评分：扣分项与总分严格一致，零证据不再自动高分 ────────────────
  const scoreDeductions: Array<{ item: string; pts: number; reason: string }> = [];
  let score = 100;
  let insufficientEvidence = false;

  if (declaredFamily && juiceSuccessful === 0 && matrix.juice > 0) {
    insufficientEvidence = true;
    score -= 45;
    scoreDeductions.push({
      item: "证据充分性",
      pts: -45,
      reason: "指纹探针全部失败 (网络/风控/限流)，无法形成有效真实性结论",
    });
  }
  if (declaredFamily && juiceSuccessful > 0 && totalHits === 0) {
    score -= 15;
    scoreDeductions.push({
      item: "Juice 思考段指纹",
      pts: -15,
      reason: `${juiceSuccessful} 轮 High-Effort 探针均未返回精确的 40/32/48 预算值`,
    });
  }
  if (mismatchStrong && dominant) {
    score -= 25;
    scoreDeductions.push({
      item: "型号一致性",
      pts: -25,
      reason: `声明 ${declaredFamily}，但实测指向 ${fpStrongModel ?? dominant}${fingerprint?.status === "strong_match" ? " (行为指纹过官方阈值门禁)" : ` 指纹 ${dominantHits} 次`}`,
    });
  } else if (mismatchSuspected && (dominant || fpStrongModel)) {
    score -= 15;
    scoreDeductions.push({
      item: "型号一致性 (弱信号)",
      pts: -15,
      reason: `信号与申报 ${declaredFamily} 不符且未达强结论门禁，建议提高档位复测`,
    });
  }
  if (crossProviderResidue) {
    score -= 35;
    scoreDeductions.push({
      item: "元数据取证",
      pts: -35,
      reason: `响应结构含异供应商命名 (${[...residueKeys].join(", ")})，疑似跨供应商转发`,
    });
  } else if (modelEchoMismatchCount > 0) {
    score -= 10;
    scoreDeductions.push({
      item: "Model 回显一致性",
      pts: -10,
      reason: `${modelEchoMismatchCount} 次回显 model 与申报家族不一致`,
    });
  }
  if (promptOverrideDetected) {
    score -= 15;
    scoreDeductions.push({
      item: "Prompt 生效校验",
      pts: -15,
      reason: "System Prompt 标记未被回显 (代理覆盖或模型拒绝复述)",
    });
  }
  if (tamperDetected) {
    score -= 40;
    scoreDeductions.push({
      item: "输出完整性",
      pts: -40,
      reason: "计数题回包全部被强制改写为 40，命中已知欺诈签名",
    });
  } else if (mixedIntegrity) {
    score -= 10;
    scoreDeductions.push({
      item: "输出稳定性",
      pts: -10,
      reason: "同题多次回包不一致 (11 与 40 混杂)，存在改写嫌疑",
    });
  }
  score = Math.max(0, Math.min(100, score));

  // ── 结论判定（按严重度优先级）──────────────────────────────────
  let verdict: QCRecord["verdict"] = "PASS";
  let verdictText = "";

  if (tamperDetected) {
    verdict = "FAIL";
    verdictText = "存在欺诈改写 · 响应内容被硬性篡改为伪造指纹";
  } else if (crossProviderResidue) {
    verdict = "FAIL";
    verdictText = `元数据取证异常 · 响应结构含异供应商痕迹 (${[...residueKeys].join(", ")})`;
  } else if (mismatchStrong && (fpStrongModel || dominant)) {
    verdict = "WARNING";
    verdictText = `疑似混用 · 声明 ${declaredFamily}，但实测指向 ${fpStrongModel ?? dominant}${fingerprint?.status === "strong_match" ? " (行为指纹过官方阈值)" : ""}`;
  } else if (mismatchSuspected && (fpStrongModel || dominant)) {
    verdict = "WARNING";
    verdictText = `指纹存疑 · 实测信号与申报 ${declaredFamily} 不符，建议提高档位复测`;
  } else if (promptOverrideDetected) {
    verdict = "WARNING";
    verdictText = "风险预警 · System Prompt 可能被中转代理覆盖 (或模型拒绝复述)";
  } else if (insufficientEvidence) {
    verdict = "WARNING";
    verdictText = "证据不足 · 指纹探针全部失败，本次无法评估真实性，建议稍后复测";
  } else if (!declaredFamily) {
    verdict = score >= 80 ? "PASS" : "WARNING";
    verdictText =
      score >= 80
        ? "完整性校验通过 · 该型号不属于 GPT-5.6 家族，仅执行完整性与 Prompt 覆盖检查"
        : "完整性存在风险 · 请查看扣分明细";
  } else if (totalHits === 0) {
    verdict = "WARNING";
    verdictText = "指纹不明确 · 未取得精确预算指纹，结论为参考级，建议更换档位复测";
  } else if (fingerprint?.status === "strong_match" && fpStrongModel === declaredFamily) {
    verdict = "PASS";
    verdictText = `通过 · 行为指纹强指向 ${fpStrongModel} 且 Juice 命中 ${dominant ?? declaredFamily}，与申报一致`;
  } else if (score >= 80) {
    verdict = "PASS";
    verdictText = `通过 · ${dominantHits} 轮指纹指向 ${dominant}，与申报一致 (行为指纹未达强门禁，建议复测)`;
  } else {
    verdict = "WARNING";
    verdictText = "存在扣分项 · 详情见扣分明细";
  }

  // ── 置信等级 ──────────────────────────────────────────────────
  const confidence: NonNullable<QCRecord["confidence"]> =
    fingerprint?.status === "strong_match" || dominantHits >= 2
      ? "high"
      : fingerprint?.officialEligible || dominantHits === 1
      ? "medium"
      : "low";

  // ── 结论代码 ──────────────────────────────────────────────────
  let outcomeCode: string;
  if (tamperDetected) outcomeCode = "output_tamper_forced40";
  else if (crossProviderResidue) outcomeCode = "usage_residue_cross_provider";
  else if (mismatchStrong) outcomeCode = "juice_mismatch_fingerprint_strong";
  else if (mismatchSuspected) outcomeCode = "juice_mismatch_low_confidence";
  else if (promptOverrideDetected) outcomeCode = "prompt_override_risk";
  else if (insufficientEvidence) outcomeCode = "insufficient_evidence";
  else if (!declaredFamily) outcomeCode = score >= 80 ? "integrity_only_pass" : "integrity_only_risk";
  else if (totalHits === 0) outcomeCode = "juice_fingerprint_unclear";
  else outcomeCode = "juice_pass_fingerprint_strong";

  if (scoreDeductions.length > 0) {
    addLog(`📋 [扣分统计]: ${scoreDeductions.map((d) => `${d.item} ${d.pts}分`).join(" | ")}`);
  } else {
    addLog(`✅ [满分验证]: 探针指标全部达标，无扣分项`);
  }

  const juiceVerdictText = !declaredFamily
    ? "不适用 · 非 GPT-5.6 家族模型不执行预算指纹比对"
    : insufficientEvidence
    ? "证据不足 · 指纹探针全部失败"
    : totalHits === 0
    ? `证据不足 · ${juiceSuccessful} 轮探针均未命中精确预算指纹`
    : `通过 · ${totalHits} 次精确命中 (${(Object.keys(juiceHits) as Family[]).filter((f) => juiceHits[f] > 0).map((f) => `${f}×${juiceHits[f]}`).join(", ")})`;

  const behaviorVerdictText = !declaredFamily
    ? "不适用 · 行为基线仅对 GPT-5.6 家族有意义"
    : !fingerprint
    ? "未采样 · 行为指纹仅对 GPT-5.6 家族执行"
    : fingerprint.status === "strong_match"
    ? `强指向 ${fingerprint.strongModel} (匹配度 Sol ${probabilities.sol}% / Terra ${probabilities.terra}% / Luna ${probabilities.luna}%，过官方阈值门禁)`
    : `匹配度 Sol ${probabilities.sol}% / Terra ${probabilities.terra}% / Luna ${probabilities.luna}% (${fingerprint.officialEligible ? "未达强指向阈值" : "样本未达官方契约，仅供参考"})`;

  const hlwyVerdictText = `行为分布匹配度 (softmax): Sol ${probabilities.sol}% / Terra ${probabilities.terra}% / Luna ${probabilities.luna}% · 状态=${fingerprint?.status ?? "not_applicable"}${fingerprint && fingerprint.reasons.length > 0 ? ` · ${fingerprint.reasons.join(";")}` : ""}`;
  const detectorVerdictText = `指纹防篡改: [${outcomeCode}] 指纹命中 ${totalHits}/${juiceSuccessful} 轮, 计数签名 ${forcedCount > 0 ? "命中" : "未见异常"}`;

  const record: QCRecord = {
    siteId: ctx.siteId || targetModel,
    siteName: ctx.siteName || ctx.domainInput || "自填 API",
    domain: ctx.domainInput || new URL(endpoint).host,
    declaredModel,
    testedModel: targetModel,
    score,
    verdict,
    verdictText,
    juiceVerdict: juiceVerdictText,
    behaviorVerdict: behaviorVerdictText,
    probabilities,
    tamperDetected,
    promptOverrideDetected,
    testProfile: preset,
    sampleCount: Math.max(1, successfulCalls),
    testedAt: new Date().toISOString(),
    source: "user_probe",
    isInternalFeedback: Boolean(ctx.siteId),
    submissionType: "user_submission",
    scoreDeductions,
    outcomeCode,
    policyVersion: "relay-qc-policy-v5.0",
    hlwyVerdict: hlwyVerdictText,
    detectorVerdict: detectorVerdictText,
    confidence,
    probabilitiesEstimated,
    juiceSamples: matrix.juice,
    metadataFindings,
  };

  // 仅归档关联大盘站点的测试；自填 API 结果不落盘，防止匿名端点污染公共档案
  let finalRecord = record;
  if (ctx.siteId) {
    try {
      finalRecord = await saveQCRecord({ ...record, logs: ctx.getLogs() });
      addLog(`[数据归档] 多轮加权完成 (累计 ${finalRecord.historicalRounds || 1} 轮, 综合 ${finalRecord.score}分)`);
    } catch (e) {
      console.warn("[api/detect] saveQCRecord error:", e);
      addLog(`⚠️ 归档失败，本次结果仅在页面展示`);
    }
  } else {
    addLog(`[归档跳过] 自填 API 地址不入公共档案`);
  }

  return finalRecord;
}
