// Explorer 共享类型 + 工具函数 —— 给 list-row / compare / 主组件用

import type { KeyedRecord } from "@/lib/types";
import type { AccessSignals, ModelOfferSummary } from "@/lib/relay-product";

// ============= 接口 =============

export interface ExplorerProps {
  records: KeyedRecord[];
  performanceRecords: KeyedRecord[];
  modelOffers: ModelOfferSummary[];
  groupRecords?: KeyedRecord[];
}

export type ViewMode = "list" | "matrix" | "model";
export type SortKey = "rate" | "availability" | "ttft" | "updated";

export interface RelaySiteRow {
  record: KeyedRecord;
  siteId: string;
  name: string;
  domain: string;
  providers: string[];
  framework: string;
  note: string;
  access: AccessSignals;
  minRate: number | null;
  selectedRate: number | null;
  groupCount: number;
  modelCount: number;
  lastChecked: string;
  lastCheckedMs: number | null;
  perf: KeyedRecord | null;
  modelOffers: ModelOfferSummary[];
  matchedModelOffer: ModelOfferSummary | null;
  groups: KeyedRecord[];
}

export const PAGE_SIZE = 50;

// ============= 工具函数 =============

export function formatPercent(value: number | null, ratio = false): string {
  if (value == null) return "--";
  const percent = ratio ? value * 100 : value;
  const digits = percent >= 99.95 ? 0 : 1;
  return `${percent.toFixed(digits)}%`;
}

export function formatDuration(value: number | null): string {
  if (value == null) return "--";
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

export function formatFreshness(value: string): string {
  if (!value) return "未知";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "未知";
  const hours = Math.max(0, (Date.now() - time) / 3_600_000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${Math.floor(hours)} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(time).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function domainHref(domain: string): string {
  if (!domain) return "#";
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

export function domainDisplay(domain: string): string {
  if (!domain) return "";
  return domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

export function nullableNumberCompare(a: number | null, b: number | null, direction: "asc" | "desc"): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "asc" ? a - b : b - a;
}

export function getListNote(note: string): string {
  if (!note) return "";
  return note
    .split(/\s*\/\s*/)
    .filter((part) => !/^(注册[开关]|免验证|邮箱验证|监控[开关]|(?:旧式公开)?(?:分组|倍率|渠道)\s+\d+)$/i.test(part))
    .join(" / ");
}