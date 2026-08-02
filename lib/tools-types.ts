// AI 编程工具行类型 —— 详情页 + Explorer 共用

import type { KeyedRecord } from "./types";

/** 标准化后的工具行（视图层） */
export interface ToolRow {
  record: KeyedRecord;
  id: string;
  name: string;
  vendor: string;
  score: number;
  scoreLabel: string; // "4 / 5" 形式
  scoreTone: "high" | "medium" | "low"; // 颜色分级
  types: string[]; // 多选
  platforms: string[];
  myState: string; // 单选
  supportedModels: string[];
  url: string;
  githubUrl: string | null;
  stars: number | null;
  pricing: string;
  advantages: string;
  disadvantages: string;
  useCases: string[];
  multiAgent: string;
  chinese: string;
  githubStars: number | null;
  note: string;
  positioning: string;
  targetUsers: string;
  usageTips: string;
  competitor: string;
}

/** 单选字段数组转字符串（取第一个） */
function firstOf(value: unknown, fallback = "未知"): string {
  if (Array.isArray(value)) return value[0] ? String(value[0]) : fallback;
  if (value == null || value === "") return fallback;
  return String(value);
}

/** 多选字段数组去重 */
function toStrArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (value == null || value === "") return [];
  return [String(value)];
}

/** 评分 → Swiss 颜色分级 */
export function scoreTone(score: number): "high" | "medium" | "low" {
  if (score >= 4) return "high";
  if (score >= 3) return "medium";
  return "low";
}

/** 构造 ToolRow（接收 KB record） */
export function buildToolRow(record: KeyedRecord): ToolRow {
  const rawScore = Number(record["评分"]) || 0;
  return {
    record,
    id: String(record.__id ?? ""),
    name: String(record["工具名"] ?? "未命名"),
    vendor: String(record["厂商"] ?? "未知"),
    score: rawScore,
    scoreLabel: rawScore > 0 ? `${rawScore} / 5` : "--",
    scoreTone: scoreTone(rawScore),
    types: toStrArray(record["类型"]),
    platforms: toStrArray(record["平台"]),
    myState: firstOf(record["我的状态"], "未标记"),
    supportedModels: toStrArray(record["支持模型"]),
    url: String(record["链接"] ?? ""),
    githubUrl: typeof record["GitHub URL"] === "string" && record["GitHub URL"] ? String(record["GitHub URL"]) : null,
    stars: typeof record["GitHub Stars"] === "number" && Number.isFinite(record["GitHub Stars"]) ? Number(record["GitHub Stars"]) : null,
    pricing: String(record["定价"] ?? "未标注"),
    advantages: String(record["核心优势"] ?? ""),
    disadvantages: String(record["主要劣势"] ?? ""),
    useCases: toStrArray(record["适用场景"]),
    multiAgent: firstOf(record["多Agent支持"], "未知"),
    chinese: firstOf(record["中文支持"], "未知"),
    githubStars: record["GitHub stars"] != null ? Number(record["GitHub stars"]) : null,
    note: String(record["备注"] ?? ""),
    positioning: String(record["产品定位"] ?? ""),
    targetUsers: String(record["目标用户"] ?? ""),
    usageTips: String(record["使用建议"] ?? ""),
    competitor: String(record["竞品对比"] ?? ""),
  };
}