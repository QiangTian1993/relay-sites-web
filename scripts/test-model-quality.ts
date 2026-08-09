// 中转站模型真实性检测工具 —— 探测"掺水"（降智/冒充）模型
// 用法:
//   npx tsx scripts/test-model-quality.ts --base-url https://api.xxx.com/v1 --api-key sk-xxx --model claude-opus-4-6
//   npx tsx scripts/test-model-quality.ts --base-url ... --api-key ... --model ... --baseline-url https://api.anthropic.com ...  (可选：官方基线对比)
// 输出: 每项探针的响应 + 掺水风险提示 + 速度统计
// 注意: 部分站点要求 model 名带前缀（如 claude-opus-4-6），按站点文档填

import { performance } from "node:perf_hooks";

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const BASE_URL = (argValue("--base-url") ?? "").replace(/\/+$/, "");
const API_KEY = argValue("--api-key") ?? "";
const MODEL = argValue("--model") ?? "";
const BASELINE_URL = (argValue("--baseline-url") ?? "").replace(/\/+$/, "");
const BASELINE_KEY = argValue("--baseline-key") ?? API_KEY;
const BASELINE_MODEL = argValue("--baseline-model") ?? MODEL;

if (!BASE_URL || !API_KEY || !MODEL) {
  console.error("用法: npx tsx scripts/test-model-quality.ts --base-url <url> --api-key <key> --model <model> [--baseline-url <官方API> --baseline-model <model>]");
  process.exit(1);
}

// ============ 探针组（有区分度：官方强模型可答，小/降智模型必错） ============

interface Probe {
  name: string;
  system: string;
  prompt: string;
  /** 判定提示：什么是"可疑输出" */
  suspect?: (out: string) => string | null;
}

const PROBES: Probe[] = [
  {
    name: "身份自述",
    system: "只回答一句话。",
    prompt: "请告诉我：你是什么模型，由哪家公司训练？",
    suspect: (out) =>
      out.toLowerCase().includes("anthropic") ? null
      : out.toLowerCase().includes("claude") ? null
      : "⚠️ 未自称 Anthropic/Claude —— 如果是 Claude 模型通常会说，可能为冒充",
  },
  {
    name: "训练者辨别",
    system: "只回答：是 或 否，不要解释。",
    prompt: "你是 OpenAI 训练的模型吗？",
    suspect: (out) => {
      const o = out.trim().toLowerCase();
      if (o.startsWith("否") || o.startsWith("不") || o.startsWith("no")) return null;
      return "⚠️ 对『你是 OpenAI 训练的吗』未否定 —— 真 Claude 会明确否认";
    },
  },
  {
    name: "数学(17位乘法)",
    system: "只输出数字结果，不要解释。",
    prompt: "计算 48392017835621405 × 719283645 = ?",
    suspect: (out) => {
      const digits = out.replace(/[^\d]/g, "");
      if (digits === "34808968637437862244725") return null;
      return "⚠️ 乘法结果错误（小模型/降智模型典型失败点）";
    },
  },
  {
    name: "代码(并发安全计数器)",
    system: "输出完整可运行代码，不解释。",
    prompt:
      "用 TypeScript 写一个线程安全的计数器类：支持 increment()/get()，并给出使用示例。",
  },
  {
    name: "逻辑(纸牌谜题)",
    system: "推理后给出结论。",
    prompt:
      "一副标准扑克牌，甲抽了 1 张牌不看，乙抽了 2 张牌看到：一张红桃 3、一张黑桃 5。乙说：甲的牌是黑桃 K 的概率是多少？（假设牌堆均匀随机）",
    suspect: (out) => (out.includes("1/") || out.includes("0.0") ? null : "⚠️ 未给出概率结论"),
  },
  {
    name: "知识时效(2025年事件)",
    system: "只回答是或否。",
    prompt: "Anthropic 在 2025 年 11 月发布了 Claude Opus 4.5 吗？",
    suspect: (out) => (out.trim().toLowerCase().startsWith("是") ? null : "⚠️ 对已知事实判断错误（知识陈旧）"),
  },
];

// ============ 调用 ============

interface CallResult {
  text: string;
  durationMs: number;
  tokensPerSec: number | null;
  outputTokens: number;
}

async function callOnce(baseUrl: string, key: string, model: string, system: string, prompt: string): Promise<CallResult> {
  const start = performance.now();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { completion_tokens?: number; total_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const durationMs = performance.now() - start;
  const outputTokens = json.usage?.completion_tokens ?? Math.ceil(text.length / 3.5);
  return { text, durationMs, tokensPerSec: outputTokens / (durationMs / 1000), outputTokens };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function runProbe(p: Probe, baseUrl: string, key: string, model: string, label: string) {
  try {
    const r = await callOnce(baseUrl, key, model, p.system, p.prompt);
    const verdict = p.suspect ? p.suspect(r.text) : null;
    console.log(`\n── ${p.name}（${label}）  ${r.durationMs.toFixed(0)}ms  ${r.tokensPerSec?.toFixed(1) ?? "-"} tok/s`);
    console.log(`  响应: ${truncate(r.text.replace(/\s+/g, " ").trim(), 220)}`);
    if (verdict) console.log(`  ${verdict}`);
    return { probe: p.name, text: r.text, verdict, tokensPerSec: r.tokensPerSec };
  } catch (e) {
    console.log(`\n── ${p.name}（${label}）  失败: ${e instanceof Error ? e.message : e}`);
    return { probe: p.name, text: "", verdict: `调用失败: ${e instanceof Error ? e.message : e}`, tokensPerSec: null };
  }
}

// ============ Main ============

async function main() {
  console.log(`=== 中转站模型检测 ===`);
  console.log(`目标: ${BASE_URL}  model=${MODEL}`);
  if (BASELINE_URL) console.log(`基线: ${BASELINE_URL}  model=${BASELINE_MODEL}`);

  console.log("\n[1] 基础连通性");
  const ping = await callOnce(BASE_URL, API_KEY, MODEL, "只回复 OK", "ping").catch((e) => null);
  if (!ping) {
    console.error("连不上目标 API —— 检查 base-url/key/model 名。");
    process.exit(1);
  }
  console.log(`    连通 OK，${ping.durationMs.toFixed(0)}ms，输出 ${ping.outputTokens} tok`);

  const targetResults: Array<{ probe: string; text: string; verdict: string | null; tokensPerSec: number | null }> = [];
  for (const p of PROBES) {
    targetResults.push(await runProbe(p, BASE_URL, API_KEY, MODEL, "目标"));
  }

  let baselineResults: typeof targetResults = [];
  if (BASELINE_URL) {
    console.log("\n=== 官方基线对比 ===");
    for (const p of PROBES) {
      baselineResults.push(await runProbe(p, BASELINE_URL, BASELINE_KEY, BASELINE_MODEL, "官方"));
    }
  }

  // 汇总
  console.log("\n=== 汇总 ===");
  console.log("探针               结果");
  let suspicious = 0;
  for (const r of targetResults) {
    const flag = r.verdict ? "⚠️ " : "✅ ";
    if (r.verdict) suspicious++;
    console.log(`${flag}${r.probe.padEnd(16)} ${(r.verdict ?? "通过").slice(0, 60)}`);
  }
  const avgTps = targetResults.filter((r) => r.tokensPerSec).reduce((a, r) => a + (r.tokensPerSec ?? 0), 0) / targetResults.filter((r) => r.tokensPerSec).length;
  console.log(`\n平均输出速度: ${avgTps.toFixed(1)} tok/s（Claude Opus 级约 20-60 tok/s；小模型常 100+）`);

  if (suspicious >= 2) {
    console.log(`\n结论: ${suspicious}/${PROBES.length} 项可疑 —— 强烈疑似掺水/降智模型，建议换站或要求解释。`);
  } else if (suspicious === 1) {
    console.log(`\n结论: 1 项可疑 —— 建议重点复测该项（可增加长上下文针测试）。`);
  } else {
    console.log(`\n结论: 全部探针通过 —— 未见明显掺水迹象（仍建议抽测长上下文与高峰期表现）。`);
  }
}

main().catch((e) => {
  console.error("失败:", e instanceof Error ? e.message : e);
  process.exit(1);
});
