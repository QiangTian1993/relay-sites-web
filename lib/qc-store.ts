import "server-only";

export type QCDataSource = "system_benchmark" | "user_probe" | "internal_sync" | "manual_audit";

export interface QCRunSummary {
  testedAt: string;
  score: number;
  verdict: "PASS" | "WARNING" | "FAIL";
  sampleCount: number;
  testProfile: "quick" | "standard" | "full";
  probabilities?: { sol: number; terra: number; luna: number };
}

export interface QCRecord {
  siteId: string;
  siteName: string;
  domain?: string;
  declaredModel: string;
  testedModel: string;
  /** 综合多轮加权评分 (0 - 100) */
  score: number;
  /** 本次单轮测试得分 (0 - 100) */
  currentScore?: number;
  /** 累计质检轮数 */
  historicalRounds?: number;
  /** 累计探针样本总量 */
  totalSamples?: number;
  /** 历史多轮通过率 (0 - 100) */
  passRate?: number;
  /** 历史最低分 */
  scoreMin?: number;
  /** 历史最高分 */
  scoreMax?: number;
  /** 历史各轮快照 (保留最近 10 轮) */
  runs?: QCRunSummary[];
  verdict: "PASS" | "WARNING" | "FAIL";
  verdictText: string;
  juiceVerdict: string;
  behaviorVerdict: string;
  probabilities: { sol: number; terra: number; luna: number };
  tamperDetected: boolean;
  promptOverrideDetected: boolean;
  testProfile: "quick" | "standard" | "full";
  sampleCount: number;
  testedAt: string;
  logs?: string[];
  /** 扣分明细列表 (可查明为何得 78分 或 95分) */
  scoreDeductions?: Array<{ item: string; pts: number; reason: string }>;
  /** 结论代码 (如 juice_pass_fingerprint_strong / insufficient_evidence) */
  outcomeCode?: string;
  /** 运行策略版本号 */
  policyVersion?: string;
  /** 行为概率采样结论 */
  hlwyVerdict?: string;
  /** 指纹防篡改测验结论 */
  detectorVerdict?: string;
  /** 数据来源区分（系统打点 / 前台用户测试 / 内部同步 / 手工质检） */
  source?: QCDataSource;
  /** 是否为内部自动反哺同步的数据 */
  isInternalFeedback?: boolean;
  /** 提交模式 */
  submissionType?: "automatic_probe" | "user_submission" | "system_benchmark";
  /** 证据置信等级 (high: 多轮稳定指纹 / medium: 单轮指纹或充分行为样本 / low: 样本稀疏) */
  confidence?: "high" | "medium" | "low";
  /** 行为分布是否为声明模型基线预估（而非实测） */
  probabilitiesEstimated?: boolean;
  /** Juice 指纹探针实际发射轮数 */
  juiceSamples?: number;
  /** 响应元数据取证结果 */
  metadataFindings?: MetadataFindings;
}

/** 协议/元数据层取证：跨供应商残留、model 回显一致性等 */
export interface MetadataFindings {
  /** usage/响应结构中出现异供应商命名痕迹（如 OpenAI 协议里出现 input_tokens/cache_creation_input_tokens） */
  crossProviderResidue: boolean;
  residueKeys?: string[];
  /** 回显 model 与请求模型不一致的探针次数 */
  modelEchoMismatchCount: number;
  /** 抽样展示的回显值 */
  modelEchoSamples?: string[];
}

/**
 * 档案表精简行：剥离 logs / runs / scoreDeductions 等重字段，
 * 用于服务端组件向浏览器下发全量快照时压缩 RSC 载荷。
 */
export type QCArchiveRow = Omit<QCRecord, "logs" | "runs" | "scoreDeductions">;

export function toArchiveRow(r: QCRecord): QCArchiveRow {
  const { logs: _logs, runs: _runs, scoreDeductions: _deductions, ...rest } = r;
  return rest;
}

function nodeFs(): typeof import("fs/promises") {
  const getBuiltin = (process as NodeJS.Process & {
    getBuiltinModule?: (id: string) => unknown;
  }).getBuiltinModule;
  if (typeof getBuiltin === "function") {
    return getBuiltin("fs/promises") as typeof import("fs/promises");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-eval
  return eval("require")("fs/promises") as typeof import("fs/promises");
}

function nodePath(): typeof import("path") {
  const getBuiltin = (process as NodeJS.Process & {
    getBuiltinModule?: (id: string) => unknown;
  }).getBuiltinModule;
  if (typeof getBuiltin === "function") {
    return getBuiltin("path") as typeof import("path");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-eval
  return eval("require")("path") as typeof import("path");
}

function getQCFilePath(): string {
  const path = nodePath();
  // 生产环境通过 QC_DATA_PATH 把质检库指向独立挂载卷，部署重建容器不丢数据
  if (process.env.QC_DATA_PATH) {
    return path.resolve(process.env.QC_DATA_PATH);
  }
  return path.join(process.cwd(), "data", "relay_site_qc.json");
}

// ============ 输入消毒：所有写入路径统一过这道闸 ============

const VERDICTS = ["PASS", "WARNING", "FAIL"] as const;
const PROFILES = ["quick", "standard", "full"] as const;
const SOURCES = ["system_benchmark", "user_probe", "internal_sync", "manual_audit"] as const;

type RawRecord = Record<string, unknown>;

function asRecord(v: unknown): RawRecord {
  return typeof v === "object" && v !== null ? (v as RawRecord) : {};
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function safeStr(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  // 剥离控制字符，防日志注入/文件膨胀
  return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, maxLen);
}

function enumOf<T extends readonly string[]>(v: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T[number]) : fallback;
}

/**
 * 将不可信输入收敛为合法 QCRecord；siteId / declaredModel 缺失时返回 null。
 * 所有字段做类型收窄、长度截断与数值钳制，防止伪造数据撑爆存储或注入展示层。
 */
export function sanitizeQCRecord(input: unknown): QCRecord | null {
  const raw = asRecord(input);
  const siteId = safeStr(raw.siteId, 120).trim();
  const declaredModel = safeStr(raw.declaredModel, 120).trim();
  if (!siteId || !declaredModel) return null;

  const probsRaw = asRecord(raw.probabilities);
  const testedAtMs = Date.parse(safeStr(raw.testedAt, 40));
  const testedAt = Number.isFinite(testedAtMs)
    ? new Date(testedAtMs).toISOString()
    : new Date().toISOString();

  const deductionsRaw = Array.isArray(raw.scoreDeductions) ? raw.scoreDeductions.slice(0, 12) : [];
  const logsRaw = Array.isArray(raw.logs) ? raw.logs.slice(0, 150) : [];

  const record: QCRecord = {
    siteId,
    siteName: safeStr(raw.siteName, 120).trim() || siteId,
    domain: safeStr(raw.domain, 200).trim() || undefined,
    declaredModel,
    testedModel: safeStr(raw.testedModel, 120).trim().toLowerCase() || declaredModel.toLowerCase(),
    score: clampInt(raw.score, 0, 100, 0),
    currentScore: raw.currentScore === undefined ? undefined : clampInt(raw.currentScore, 0, 100, 0),
    verdict: enumOf(raw.verdict, VERDICTS, "WARNING"),
    verdictText: safeStr(raw.verdictText, 300) || "未提供结论描述",
    juiceVerdict: safeStr(raw.juiceVerdict, 300),
    behaviorVerdict: safeStr(raw.behaviorVerdict, 300),
    probabilities: {
      sol: clampInt(probsRaw.sol, 0, 100, 0),
      terra: clampInt(probsRaw.terra, 0, 100, 0),
      luna: clampInt(probsRaw.luna, 0, 100, 0),
    },
    tamperDetected: raw.tamperDetected === true,
    promptOverrideDetected: raw.promptOverrideDetected === true,
    testProfile: enumOf(raw.testProfile, PROFILES, "standard"),
    sampleCount: clampInt(raw.sampleCount, 1, 500, 5),
    testedAt,
    logs: logsRaw.map((l) => safeStr(l, 400)).filter(Boolean),
    scoreDeductions: deductionsRaw
      .map((d) => {
        const item = asRecord(d);
        return {
          item: safeStr(item.item, 60),
          pts: clampInt(item.pts, -100, 0, 0),
          reason: safeStr(item.reason, 200),
        };
      })
      .filter((d) => d.item),
    outcomeCode: safeStr(raw.outcomeCode, 80) || undefined,
    policyVersion: safeStr(raw.policyVersion, 80) || undefined,
    hlwyVerdict: safeStr(raw.hlwyVerdict, 300) || undefined,
    detectorVerdict: safeStr(raw.detectorVerdict, 300) || undefined,
    source: enumOf(raw.source, SOURCES, "user_probe"),
    isInternalFeedback: raw.isInternalFeedback === true,
    submissionType: enumOf(
      raw.submissionType,
      ["automatic_probe", "user_submission", "system_benchmark"] as const,
      "user_submission",
    ),
    confidence: raw.confidence === "high" || raw.confidence === "medium" ? raw.confidence : "low",
    probabilitiesEstimated: raw.probabilitiesEstimated !== false,
    juiceSamples: clampInt(raw.juiceSamples, 0, 500, 0),
  };

  if (record.logs && record.logs.length === 0) delete record.logs;
  if (record.scoreDeductions && record.scoreDeductions.length === 0) delete record.scoreDeductions;
  if (!record.domain) delete record.domain;

  return record;
}

/**
 * 获取全量站点质检快照记录
 */
export async function getAllQCRecords(): Promise<QCRecord[]> {
  const filePath = getQCFilePath();
  const fs = nodeFs();
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const records = JSON.parse(content) as QCRecord[];
    return Array.isArray(records) ? records : [];
  } catch (err) {
    console.warn("[qc-store] read relay_site_qc.json failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * 根据 siteId 查询单个站点的最新质检记录
 */
export async function getQCBySiteId(siteId: string): Promise<QCRecord | null> {
  if (!siteId) return null;
  const all = await getAllQCRecords();
  const matched = all.find(
    (r) => r.siteId.toLowerCase() === siteId.toLowerCase() || r.domain?.toLowerCase() === siteId.toLowerCase(),
  );
  return matched ?? null;
}

// 进程内写互斥：serialize 读-改-写，避免并发检测互相覆盖丢数据
let writeChain: Promise<unknown> = Promise.resolve();

async function persistSanitized(record: QCRecord): Promise<QCRecord> {
  const filePath = getQCFilePath();
  const fs = nodeFs();
  const path = nodePath();
  const all = await getAllQCRecords();

  const existingIndex = all.findIndex(
    (r) =>
      r.siteId.toLowerCase() === record.siteId.toLowerCase() ||
      (record.domain && r.domain?.toLowerCase() === record.domain.toLowerCase()),
  );

  const existingRecord = existingIndex >= 0 ? all[existingIndex] : null;

  // 构造本次 run 快照
  const currentRunScore = record.currentScore ?? record.score;
  const currentRun: QCRunSummary = {
    testedAt: record.testedAt,
    score: currentRunScore,
    verdict: record.verdict,
    sampleCount: record.sampleCount,
    testProfile: record.testProfile,
    probabilities: record.probabilities,
  };

  // 提取既往各轮历史 (保留最近 10 轮)
  const existingRuns: QCRunSummary[] =
    existingRecord?.runs && existingRecord.runs.length > 0
      ? existingRecord.runs.slice(0, 10)
      : existingRecord
      ? [
          {
            testedAt: existingRecord.testedAt,
            score: existingRecord.currentScore ?? existingRecord.score,
            verdict: existingRecord.verdict,
            sampleCount: existingRecord.sampleCount || 5,
            testProfile: existingRecord.testProfile || "standard",
            probabilities: existingRecord.probabilities,
          },
        ]
      : [];

  // 同一毫秒内的重复快照视为同一 run（幂等）
  const combinedRuns: QCRunSummary[] = [
    currentRun,
    ...existingRuns.filter((r) => r.testedAt !== currentRun.testedAt),
  ].slice(0, 10);

  // 统计多轮加权评分与指标
  let totalSampleWeight = 0;
  let weightedScoreSum = 0;
  let passCount = 0;
  let minScore = currentRunScore;
  let maxScore = currentRunScore;

  combinedRuns.forEach((r, idx) => {
    // 权重 = 样本量 * 时间衰减 (越近的轮次权重越大)
    const recencyWeight = Math.max(0.5, 1 - idx * 0.08);
    const weight = Math.max(1, r.sampleCount) * recencyWeight;
    totalSampleWeight += weight;
    weightedScoreSum += r.score * weight;
    if (r.verdict === "PASS") passCount++;
    if (r.score < minScore) minScore = r.score;
    if (r.score > maxScore) maxScore = r.score;
  });

  const aggregatedScore = Math.round(weightedScoreSum / Math.max(totalSampleWeight, 1));
  const passRate = Math.round((passCount / combinedRuns.length) * 100);
  const totalSamples = combinedRuns.reduce((acc, r) => acc + (r.sampleCount || 0), 0);

  const updatedRecord: QCRecord = {
    ...record,
    currentScore: currentRunScore,
    score: aggregatedScore,
    historicalRounds: combinedRuns.length,
    totalSamples,
    passRate,
    scoreMin: minScore,
    scoreMax: maxScore,
    runs: combinedRuns,
    testedAt: currentRun.testedAt,
  };

  if (existingIndex >= 0) {
    all[existingIndex] = updatedRecord;
  } else {
    all.unshift(updatedRecord);
  }

  // 原子写：先写临时文件再 rename，避免进程崩溃留下半截 JSON
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(all, null, 2), "utf-8");
    await fs.rename(tmpPath, filePath);
  } catch (err) {
    console.error("[qc-store] write relay_site_qc.json failed:", err instanceof Error ? err.message : err);
    throw err instanceof Error ? err : new Error(String(err));
  }

  return updatedRecord;
}

/**
 * 保存/更新质检记录到本地 JSON 库 (自动执行多轮样本综合加权计算)
 * 输入先经 sanitizeQCRecord 消毒；写路径进程内串行化 + 原子落盘。
 */
export async function saveQCRecord(record: QCRecord): Promise<QCRecord> {
  const sanitized = sanitizeQCRecord(record);
  if (!sanitized) {
    throw new Error("无效的质检记录: 缺少 siteId 或 declaredModel");
  }
  const next = writeChain.then(() => persistSanitized(sanitized));
  // 链上吞掉异常以免阻塞后续写，但当前调用方仍能拿到错误
  writeChain = next.catch(() => undefined);
  return next;
}
