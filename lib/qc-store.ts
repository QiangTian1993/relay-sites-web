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
  /** 开源规范 outcome_code (如 juice_pass_fingerprint_strong) */
  outcomeCode?: string;
  /** 运行策略版本号 (如 fingerprint-runtime-policy-v4.1.1) */
  policyVersion?: string;
  /** hlwy-ai-checker 概率矩阵测验结论 */
  hlwyVerdict?: string;
  /** GPT-5.6-Detector 指纹防篡改测验结论 */
  detectorVerdict?: string;
  /** 数据来源区分（系统打点 / 前台用户测试 / 内部同步 / 手工质检） */
  source?: QCDataSource;
  /** 是否为内部自动反哺同步的数据 */
  isInternalFeedback?: boolean;
  /** 提交模式 */
  submissionType?: "automatic_probe" | "user_submission" | "system_benchmark";
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
  return path.join(process.cwd(), "data", "relay_site_qc.json");
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

/**
 * 保存/更新质检记录到本地 JSON 库 (自动执行多轮样本综合加权计算)
 */
export async function saveQCRecord(record: QCRecord): Promise<QCRecord> {
  const filePath = getQCFilePath();
  const fs = nodeFs();
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
    testedAt: record.testedAt || new Date().toISOString(),
    score: currentRunScore,
    verdict: record.verdict,
    sampleCount: record.sampleCount || 5,
    testProfile: record.testProfile || "standard",
    probabilities: record.probabilities,
  };

  // 提取既往各轮历史 (保留最近 10 轮)
  const existingRuns: QCRunSummary[] =
    existingRecord?.runs && existingRecord.runs.length > 0
      ? existingRecord.runs
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

  try {
    await fs.writeFile(filePath, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("[qc-store] write relay_site_qc.json failed:", err instanceof Error ? err.message : err);
  }

  return updatedRecord;
}
