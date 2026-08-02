// 站点徽章组件 —— 涨价/降价 + 风控/跑路 + 数据新鲜度
// 用于：首页 KPI 周边 / Explorer 列表行 / Detail 头部

import { IconCircleAlert, IconCircleCheck, IconCircleDot } from "./icons";

// ============= 涨价/降价 =============

export type ChangeDirection = "up" | "down" | "flat" | "unknown";

export function detectChangeDirection(groupRows: Array<{ change_direction?: unknown; change_delta?: unknown }> | undefined): {
  direction: ChangeDirection;
  delta: number;
  groupName: string | null;
} {
  if (!groupRows || groupRows.length === 0) return { direction: "unknown", delta: 0, groupName: null };
  let best: { direction: ChangeDirection; delta: number; groupName: string | null } | null = null;
  for (const g of groupRows) {
    const raw = String(g.change_direction ?? "").toLowerCase();
    const d: ChangeDirection = raw === "up" ? "up" : raw === "down" ? "down" : raw === "flat" ? "flat" : "unknown";
    if (d !== "up" && d !== "down") continue;
    const delta = Math.abs(Number(g.change_delta) ?? 0);
    if (delta <= 0) continue;
    if (!best || delta > best.delta) best = { direction: d, delta, groupName: null };
  }
  return best ?? { direction: "unknown", delta: 0, groupName: null };
}

export function ChangeBadge({ direction, delta, compact = false }: { direction: ChangeDirection; delta?: number; compact?: boolean }) {
  if (direction === "up") {
    return (
      <span className={`inline-flex items-center gap-1 border border-swiss-warning bg-swiss-warningBg px-2 py-0.5 font-mono text-sm font-black text-swiss-warning ${compact ? "" : ""}`}>
        ↑ 涨价{delta != null && delta > 0 ? ` +${(delta * 100).toFixed(0)}%` : ""}
      </span>
    );
  }
  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-1 border border-swiss-success bg-swiss-successBg px-2 py-0.5 font-mono text-sm font-black text-swiss-success">
        ↓ 降价{delta != null && delta > 0 ? ` −${(delta * 100).toFixed(0)}%` : ""}
      </span>
    );
  }
  if (direction === "flat") {
    return <span className="inline-flex items-center gap-1 border border-swiss-fg/30 px-2 py-0.5 font-mono text-sm font-black">— 不变</span>;
  }
  return null;
}

// ============= 风控/跑路 =============

export interface RiskLevel {
  severity: "high" | "medium" | "low" | "none";
  reasons: string[];
  consecutiveFailures: number;
}

export function detectRisk(perf: Record<string, unknown> | null | undefined): RiskLevel {
  if (!perf) return { severity: "none", reasons: [], consecutiveFailures: 0 };
  const cf = Number(perf.consecutive_failures) || 0;
  const a24 = perf.availability_24h != null ? Number(perf.availability_24h) : null;
  const a7d = perf.availability_7d != null ? Number(perf.availability_7d) : null;
  const reasons: string[] = [];
  let severity: RiskLevel["severity"] = "low";
  if (cf >= 5) {
    reasons.push(`连续失败 ${cf} 次`);
    severity = "high";
  } else if (cf >= 2) {
    reasons.push(`连续失败 ${cf} 次`);
    severity = "medium";
  }
  if (a24 != null) {
    if (a24 < 50) {
      reasons.push(`24h 可用率仅 ${a24.toFixed(1)}%`);
      severity = "high";
    } else if (a24 < 80 && severity === "low") {
      reasons.push(`24h 可用率 ${a24.toFixed(1)}%`);
      severity = "medium";
    }
  }
  if (a24 != null && a7d != null && a7d - a24 > 10) {
    reasons.push(`较 7d 跌 ${(a7d - a24).toFixed(1)}%`);
    if (severity === "low") severity = "medium";
  }
  return { severity, reasons, consecutiveFailures: cf };
}

export function RiskBadge({ level, compact = false }: { level: RiskLevel; compact?: boolean }) {
  if (level.severity === "none") return null;
  const isHigh = level.severity === "high";
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-sm font-black ${
        isHigh ? "border-swiss-warning bg-swiss-warningBg text-swiss-warning" : "border-swiss-fg/40"
      }`}
      title={level.reasons.join(" · ")}
    >
      {isHigh ? <IconCircleAlert className="h-3.5 w-3.5" /> : <IconCircleDot className="h-3.5 w-3.5" />}
      {isHigh ? "高风险" : "观察"}
    </span>
  );
}

// ============= 数据新鲜度 =============

export type Freshness = "fresh" | "stale" | "missing";

export function detectFreshness(lastProbeAt: unknown, staleDays = 3): { freshness: Freshness; daysAgo: number | null } {
  if (!lastProbeAt) return { freshness: "missing", daysAgo: null };
  const t = new Date(String(lastProbeAt)).getTime();
  if (Number.isNaN(t)) return { freshness: "missing", daysAgo: null };
  const days = (Date.now() - t) / 86_400_000;
  return { freshness: days <= staleDays ? "fresh" : "stale", daysAgo: days };
}

export function FreshnessBadge({ freshness, daysAgo }: { freshness: Freshness; daysAgo: number | null }) {
  if (freshness === "missing") {
    return (
      <span className="inline-flex items-center gap-1 border border-swiss-fg/30 px-2 py-0.5 font-mono text-sm font-black text-swiss-fg/45">
        <IconCircleDot className="h-3.5 w-3.5" />无实测
      </span>
    );
  }
  if (freshness === "stale") {
    const days = daysAgo != null ? Math.floor(daysAgo) : 0;
    const isCritical = days > 14;
    return (
      <span
        className={`inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-sm font-black ${
          isCritical
            ? "border-swiss-warning bg-swiss-warningBg text-swiss-warning"
            : "border-swiss-fg/30 text-swiss-fg/60"
        }`}
      >
        <IconCircleAlert className="h-3.5 w-3.5" />
        {isCritical ? `实测过期 ${days} 天前` : `无近期实测 (${days} 天前)`}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 border border-swiss-success bg-swiss-successBg px-2 py-0.5 font-mono text-sm font-black text-swiss-success">
      <IconCircleCheck className="h-3.5 w-3.5" />实测 {daysAgo != null ? `${daysAgo.toFixed(1)} 天内` : ""}
    </span>
  );
}