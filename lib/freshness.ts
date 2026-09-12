// 数据新鲜度计算 —— PRD F.06
// 顶部栏：fresh < 30min / stale 30-60min / critical > 60min

export type FreshnessLevel = "fresh" | "stale" | "critical" | "missing";

export interface FreshnessInfo {
  level: FreshnessLevel;
  label: string;
  minutesAgo: number | null;
  iso: string | null;
  color: string; // Tailwind class
  bgColor: string;
}

const FRESH_THRESHOLD_MIN = 30;
const STALE_THRESHOLD_MIN = 60;

/** 计算数据新鲜度（输入可以是任意时间字符串） */
export function calcFreshness(input: string | Date | null | undefined): FreshnessInfo {
  if (!input) {
    return {
      level: "missing",
      label: "无数据",
      minutesAgo: null,
      iso: null,
      color: "text-zinc-400",
      bgColor: "bg-zinc-100",
    };
  }
  const date = typeof input === "string" ? new Date(input) : input;
  const t = date.getTime();
  if (Number.isNaN(t)) {
    return {
      level: "missing",
      label: "无数据",
      minutesAgo: null,
      iso: null,
      color: "text-zinc-400",
      bgColor: "bg-zinc-100",
    };
  }
  const minutesAgo = Math.max(0, (Date.now() - t) / 60_000);
  const iso = date.toISOString();
  let level: FreshnessLevel;
  let label: string;
  let color: string;
  let bgColor: string;
  if (minutesAgo < FRESH_THRESHOLD_MIN) {
    level = "fresh";
    label = formatRelativeMinutes(minutesAgo);
    color = "text-emerald-700";
    bgColor = "bg-emerald-50";
  } else if (minutesAgo < STALE_THRESHOLD_MIN) {
    level = "stale";
    label = formatRelativeMinutes(minutesAgo);
    color = "text-amber-700";
    bgColor = "bg-amber-50";
  } else {
    level = "critical";
    label = formatRelativeMinutes(minutesAgo);
    color = "text-rose-700";
    bgColor = "bg-rose-50";
  }
  return { level, label, minutesAgo, iso, color, bgColor };
}

function formatRelativeMinutes(min: number): string {
  if (min < 1) return "刚刚";
  if (min < 60) return `${Math.floor(min)} 分钟前`;
  const hours = min / 60;
  if (hours < 24) return `${hours.toFixed(1)} 小时前`;
  const days = hours / 24;
  return `${days.toFixed(1)} 天前`;
}

/** 取多张表中最新一次 fetch 时间 */
export function latestFetchTime(dates: Array<string | Date | null | undefined>): Date | null {
  let max = 0;
  for (const d of dates) {
    if (!d) continue;
    const date = typeof d === "string" ? new Date(d) : d;
    const t = date.getTime();
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max > 0 ? new Date(max) : null;
}