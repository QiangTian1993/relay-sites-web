// 工具函数

import type { KeyedRecord } from "./types";

/** 文本搜索（多字段模糊匹配） */
export function matchesSearch(
  record: KeyedRecord,
  query: string,
  searchableKeys: string[]
): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  for (const key of searchableKeys) {
    const v = record[key];
    if (v == null) continue;
    const s = Array.isArray(v) ? v.join(" ") : String(v);
    if (s.toLowerCase().includes(q)) return true;
  }
  return false;
}

/** 数字安全转换 */
export function toNumber(v: unknown): number | null {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/** 提取多选值数组 */
export function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string") as string[];
  if (typeof v === "string") return [v];
  return [];
}

/** 截断长文本（带省略号） */
export function truncate(s: string, max = 60): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

/** 格式化数字（千分位） */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}