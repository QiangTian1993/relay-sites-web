/**
 * GPT-5.6 行为指纹打分引擎 —— 移植自 gpt56-detector v4.1.1 的 trusted-fingerprint-v3 模型。
 * 基线与阈值取自仓库内置发行版 (lib/baselines/*.json，PolyForm Noncommercial，出处见文件头注释)。
 *
 * 打分口径：观测答案分布 → 各可信模型平滑分布下的平均对数似然 → softmax 归一为匹配度；
 * 强指向判定：样本完成率 ≥ 90% 且恰好一个模型的匹配度严格大于其档位阈值。
 */

import baselineArtifact from "./baselines/trusted_fingerprint_v3.json";
import policyArtifact from "./baselines/fingerprint_runtime_policy_v4_1_1.json";

export type FingerprintFamily = "gpt-5.6-sol" | "gpt-5.6-terra" | "gpt-5.6-luna";
const FAMILIES: FingerprintFamily[] = ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"];

/** 官方行为题面（已通过基线 probe_metadata 的 SHA256 校验，禁止改写） */
export const BEHAVIOR_PROBES = {
  rand_country: {
    prompt: "Name a random country. Reply with ONLY the country name.",
    normalizer: "behavior_label" as const,
  },
  rand_bird: {
    prompt: "Name a random bird. Reply with ONLY the bird name, one word.",
    normalizer: "behavior_label" as const,
  },
  b80_letter_count: {
    prompt: "Count the letter r in strawberry. Reply only with the integer.",
    normalizer: "b80_exact_3" as const,
  },
} as const;

export type BehaviorProbeId = keyof typeof BEHAVIOR_PROBES;
export const BEHAVIOR_CELL_PROFILE = "normal+no_history";

type CellKey = string;
interface BaselineCell {
  categories: string[];
  model_distributions: Record<string, Record<string, number>>;
  weight: number;
}
const CELLS = baselineArtifact.cells as unknown as Record<CellKey, BaselineCell>;
const THRESHOLDS = policyArtifact.thresholds as unknown as Record<
  string,
  Record<string, number>
>;

function safeLog(v: number): number {
  return Math.log(Math.max(v, 1e-300));
}

/** 与参考实现 behavior_label / b80_exact_3 归一化器逐行对齐 */
export function normalizeBehaviorAnswer(
  probeId: BehaviorProbeId,
  raw: string,
): string {
  const text = String(raw ?? "");
  if (probeId === "b80_letter_count") {
    const stripped = text.trim();
    if (!/^[+-]?\d+$/.test(stripped)) return "__INVALID_OUTPUT__";
    return Number.parseInt(stripped, 10) === 3 ? "exact_3" : "other_integer";
  }
  let normalized = text
    .trim()
    .replace(/[`"'.,:;!?()[\]{}]/g, "")
    .toLowerCase();
  normalized = normalized.replace(/\s+/g, " ");
  if (!/^[a-z][a-z .'-]*$/.test(normalized)) return "__INVALID_OUTPUT__";
  if (normalized.length > 128) return "__INVALID_OUTPUT__";
  if (!normalized) return "__INVALID_OUTPUT__";
  return normalized;
}

export interface FingerprintInput {
  /** 各探针的归一化答案计数（含 __OTHER__/__INVALID_OUTPUT__） */
  counts: Partial<Record<BehaviorProbeId, Record<string, number>>>;
  /** 各探针的计划发数（用于完成率门禁） */
  planned: Partial<Record<BehaviorProbeId, number>>;
  /** 阈值档位：low(3发)/medium(10发)；计划必须与官方契约完全一致才允许出强结论 */
  decisionLevel: "low" | "medium";
}

export interface FingerprintVerdict {
  /** softmax 匹配度（0-100 整数），语义是"与可信答案分布的相对接近度"，不是路由概率 */
  matches: Record<FingerprintFamily, number>;
  status: "strong_match" | "unclear" | "insufficient_samples";
  strongModel: FingerprintFamily | null;
  runnerUp: FingerprintFamily | null;
  /** 是否满足官方运行契约（计划=契约、完成率达标）；false 时结果仅供参考 */
  officialEligible: boolean;
  reasons: string[];
}

function softmax(scores: Record<FingerprintFamily, number>): Record<FingerprintFamily, number> {
  const max = Math.max(...FAMILIES.map((m) => scores[m]));
  const exps = FAMILIES.map((m) => Math.exp(scores[m] - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const out = {} as Record<FingerprintFamily, number>;
  FAMILIES.forEach((m, i) => {
    out[m] = exps[i] / sum;
  });
  return out;
}

export function scoreFingerprint(input: FingerprintInput): FingerprintVerdict {
  const reasons: string[] = [];
  const totalScores: Record<FingerprintFamily, number> = { "gpt-5.6-sol": 0, "gpt-5.6-terra": 0, "gpt-5.6-luna": 0 };
  let activeFamilies = 0;
  let allComplete = true;
  const contractPlan: Record<BehaviorProbeId, number> =
    input.decisionLevel === "medium"
      ? { rand_country: 10, rand_bird: 10, b80_letter_count: 10 }
      : { rand_country: 3, rand_bird: 3, b80_letter_count: 3 };

  for (const probeId of Object.keys(BEHAVIOR_PROBES) as BehaviorProbeId[]) {
    const cell = CELLS[`${probeId}|${BEHAVIOR_CELL_PROFILE}`];
    if (!cell || cell.weight <= 0) {
      reasons.push(`${probeId}:baseline_cell_missing`);
      continue;
    }
    const planned = contractPlan[probeId];
    if ((input.planned[probeId] ?? 0) !== planned) {
      reasons.push(`${probeId}:plan_mismatch_contract`);
      continue;
    }
    // 观测计数归一到基线类别（词表外 → __OTHER__）
    const categories = cell.categories as string[];
    const allowed = new Set(categories);
    const observed: Record<string, number> = {};
    let completed = 0;
    for (const [cat, n] of Object.entries(input.counts[probeId] ?? {})) {
      const key = allowed.has(cat) ? cat : "__OTHER__";
      observed[key] = (observed[key] ?? 0) + n;
      completed += n;
    }
    const minimum = Math.ceil(planned * baselineArtifact.completion_ratio);
    if (completed < minimum) {
      allComplete = false;
      reasons.push(`${probeId}:incomplete(${completed}/${minimum})`);
    }
    // 平均对数似然：Σ count·ln P_model(cat) / completed
    const ll: Record<FingerprintFamily, number> = { "gpt-5.6-sol": 0, "gpt-5.6-terra": 0, "gpt-5.6-luna": 0 };
    for (const model of FAMILIES) {
      const dist = cell.model_distributions[model] ?? {};
      ll[model] =
        completed > 0
          ? Object.entries(observed).reduce(
              (acc, [cat, n]) => acc + n * safeLog(dist[cat] ?? 1e-300),
              0,
            ) / completed
          : 0;
    }
    activeFamilies += 1;
    for (const model of FAMILIES) totalScores[model] += cell.weight * ll[model];
  }

  const matchesRaw = activeFamilies > 0 ? softmax(totalScores) : { "gpt-5.6-sol": 1 / 3, "gpt-5.6-terra": 1 / 3, "gpt-5.6-luna": 1 / 3 };
  const matches = Object.fromEntries(
    FAMILIES.map((m) => [m, Math.round(matchesRaw[m] * 100)]),
  ) as Record<FingerprintFamily, number>;

  const ordered = [...FAMILIES].sort((a, b) => matchesRaw[b] - matchesRaw[a]);
  const thresholds = THRESHOLDS[input.decisionLevel];
  const planMatchesContract = (Object.keys(contractPlan) as BehaviorProbeId[]).every(
    (p) => (input.planned[p] ?? 0) === contractPlan[p],
  );
  const officialEligible = planMatchesContract && allComplete && activeFamilies === Object.keys(BEHAVIOR_PROBES).length;
  if (!officialEligible && !reasons.some((r) => r.includes("plan_mismatch") || r.includes("incomplete"))) {
    reasons.push("samples_incomplete");
  }

  let status: FingerprintVerdict["status"] = "unclear";
  let strongModel: FingerprintFamily | null = null;
  if (!officialEligible) {
    status = "insufficient_samples";
  } else {
    const winners = FAMILIES.filter(
      (m) => matchesRaw[m] > (thresholds?.[m] ?? 1.0),
    );
    if (winners.length === 1) {
      status = "strong_match";
      strongModel = winners[0];
    } else if (winners.length === 0) {
      reasons.push("no_model_reached_strong_match_threshold");
    } else {
      reasons.push("multiple_models_reached_threshold");
    }
  }

  return {
    matches,
    status,
    strongModel,
    runnerUp: ordered[1],
    officialEligible,
    reasons,
  };
}
