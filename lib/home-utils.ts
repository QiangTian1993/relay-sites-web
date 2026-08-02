// 首页专用计算 —— KPI / 今日变化 / 风控 / Provider 速览
// 纯函数，客户端/服务端都能用

import type { KeyedRecord } from "./types";
import { formatRate, PROVIDERS, rateTier, getRateForProvider } from "./matrix";
import { toNumber, toStringArray } from "./record-utils";

// ============= KPI 卡 =============

export interface KpiSummary {
  /** 全网最低倍率（仅展示参考价，决策以具体模型为准） */
  lowestRate: { siteId: string; siteName: string; rate: number; note: string } | null;
  /** 7d 平均可用率（基于有实测的站） */
  avgAvailability7d: { value: number; measuredCount: number; totalCount: number };
  /** 24h 平均可用率 */
  avgAvailability24h: { value: number; measuredCount: number } | null;
  /** 探针总数 */
  probeStats: { measured: number; unmeasured: number; stale: number };
}

export function computeKpi(sites: KeyedRecord[], perf: KeyedRecord[]): KpiSummary {
  // 全网最低
  let lowest: KpiSummary["lowestRate"] = null;
  for (const s of sites) {
    const r = toNumber(s["最低倍率"]);
    if (r == null) continue;
    if (!lowest || r < lowest.rate) {
      lowest = {
        siteId: String(s.__id),
        siteName: String(s["名称"] ?? "未命名"),
        rate: r,
        note: "参考价 / 实际看模型",
      };
    }
  }

  // 可用率
  const a7 = perf.map((p) => toNumber(p.availability_7d)).filter((n): n is number => n != null);
  const a24 = perf.map((p) => toNumber(p.availability_24h)).filter((n): n is number => n != null);
  const avg7 = a7.length ? a7.reduce((x, y) => x + y, 0) / a7.length : NaN;
  const avg24 = a24.length ? a24.reduce((x, y) => x + y, 0) / a24.length : NaN;

  // 探针新鲜度
  const now = Date.now();
  let stale = 0;
  for (const p of perf) {
    const t = p.last_probe_at ? new Date(String(p.last_probe_at)).getTime() : NaN;
    if (Number.isNaN(t) || now - t > 3 * 86_400_000) stale++;
  }

  return {
    lowestRate: lowest,
    avgAvailability7d: {
      value: Number.isNaN(avg7) ? 0 : avg7,
      measuredCount: a7.length,
      totalCount: sites.length,
    },
    avgAvailability24h: a24.length ? { value: avg24, measuredCount: a24.length } : null,
    probeStats: { measured: perf.length, unmeasured: sites.length - perf.length, stale },
  };
}

// ============= 今日变化 =============

export interface ChangeItem {
  siteId: string;
  siteName: string;
  /** "up" 涨价 / "down" 降价 / "flat" 不变 */
  direction: "up" | "down" | "flat";
  /** 变化幅度（百分点，无方向） */
  delta: number;
  /** 哪个分组变了（首个有变化方向 + delta>0 的分组） */
  groupName: string;
}

export interface RiskItem {
  siteId: string;
  siteName: string;
  severity: "high" | "medium";
  reasons: string[];
  consecutiveFailures: number;
  availability24h: number | null;
  availability7d: number | null;
}

export function computeChanges(groups: KeyedRecord[], sites: KeyedRecord[]): ChangeItem[] {
  // 按 site 聚合变化方向：选幅度最大的
  const bySite = new Map<string, ChangeItem>();
  for (const g of groups) {
    const dir = String(g.change_direction ?? "").toLowerCase();
    if (!["up", "down"].includes(dir)) continue;
    const delta = Math.abs(toNumber(g.change_delta) ?? 0);
    if (delta <= 0) continue;
    const sid = String(g.__siteId ?? g.site_id ?? g.site_name ?? "");
    if (!sid) continue;
    const site = sites.find((s) => String(s.__id) === sid);
    const name = String(g.site_name ?? site?.["名称"] ?? sid);
    const existing = bySite.get(sid);
    const item: ChangeItem = {
      siteId: sid,
      siteName: name,
      direction: dir as "up" | "down",
      delta,
      groupName: String(g.group_name ?? ""),
    };
    if (!existing || item.delta > existing.delta) bySite.set(sid, item);
  }
  return Array.from(bySite.values()).sort((a, b) => b.delta - a.delta).slice(0, 8);
}

export function computeRisks(perf: KeyedRecord[], sites: KeyedRecord[]): RiskItem[] {
  const byId = new Map(sites.map((s) => [String(s.__id), s]));
  const items: RiskItem[] = [];
  for (const p of perf) {
    const sid = String(p.site_id ?? p.__siteId ?? "");
    const site = byId.get(sid);
    const name = String(p.site_name ?? site?.["名称"] ?? sid);
    const cf = toNumber(p.consecutive_failures) ?? 0;
    const a24 = toNumber(p.availability_24h);
    const a7d = toNumber(p.availability_7d);
    const reasons: string[] = [];
    let severity: RiskItem["severity"] = "medium";
    if (cf >= 5) {
      reasons.push(`连续失败 ${cf} 次`);
      severity = "high";
    } else if (cf >= 2) {
      reasons.push(`连续失败 ${cf} 次`);
    }
    if (a24 != null && a24 < 50) {
      reasons.push(`24h 可用率仅 ${a24.toFixed(1)}%`);
      severity = "high";
    } else if (a24 != null && a24 < 80) {
      reasons.push(`24h 可用率 ${a24.toFixed(1)}%`);
    }
    if (a7d != null && a24 != null && a7d - a24 > 10) {
      reasons.push(`可用率较 7d 跌 ${(a7d - a24).toFixed(1)}%`);
      if (severity === "medium") severity = "high";
    }
    if (reasons.length > 0) items.push({ siteId: sid, siteName: name, severity, reasons, consecutiveFailures: cf, availability24h: a24, availability7d: a7d });
  }
  return items.sort((a, b) => (b.consecutiveFailures - a.consecutiveFailures) || (a.availability24h ?? 100) - (b.availability24h ?? 100)).slice(0, 6);
}

// ============= 跨站比价 =============

export interface PriceRow {
  siteId: string;
  siteName: string;
  /** 全站最低倍率（仅参考） */
  minRate: number | null;
  /** 该 provider 的倍率（若 user 选了 provider，否则取最低） */
  primaryRate: number | null;
  primaryProvider: string;
  /** 支持的 provider 列表 */
  providers: string[];
  /** 是否有模型明细 */
  modelCount: number;
  /** 7d 可用率 */
  availability7d: number | null;
  /** 最近探针 */
  lastProbe: string | null;
}

export function computePriceTable(sites: KeyedRecord[], perf: KeyedRecord[]): PriceRow[] {
  const perfById = new Map(perf.map((p) => [String(p.site_id ?? ""), p]));
  const rows: PriceRow[] = sites.map((s) => {
    const minRate = toNumber(s["最低倍率"]);
    const providers = toStringArray(s["支持的 provider"]);
    const perfRec = perfById.get(String(s["站点ID"] ?? "")) ?? null;
    let primaryRate = minRate;
    let primaryProvider = "全站最低";
    if (providers.length > 0) {
      // 找第一个有倍率的 provider
      for (const p of providers) {
        const r = getRateForProvider(s["分组倍率"], p);
        if (r != null) {
          primaryRate = r;
          primaryProvider = p;
          break;
        }
      }
    }
    const lastProbe = perfRec?.last_probe_at ? String(perfRec.last_probe_at) : null;
    return {
      siteId: String(s.__id),
      siteName: String(s["名称"] ?? "未命名"),
      minRate,
      primaryRate,
      primaryProvider,
      providers,
      modelCount: Array.isArray(s["站点分组"]) ? (s["站点分组"] as unknown[]).length : 0,
      availability7d: toNumber(perfRec?.availability_7d),
      lastProbe,
    };
  });
  return rows.sort((a, b) => {
    const av = a.primaryRate ?? Infinity;
    const bv = b.primaryRate ?? Infinity;
    if (av !== bv) return av - bv;
    return a.siteName.localeCompare(b.siteName, "zh-CN");
  });
}

// ============= Provider 速览 =============

export interface ProviderMiniStat {
  provider: string;
  /** 支持该 provider 的站数 */
  siteCount: number;
  /** 该 provider 下的最低倍率 */
  bestRate: number | null;
  /** 平均倍率（参考） */
  avgRate: number | null;
}

export function computeProviderMini(sites: KeyedRecord[]): ProviderMiniStat[] {
  return PROVIDERS.map((provider) => {
    const rates: number[] = [];
    let count = 0;
    for (const s of sites) {
      const r = getRateForProvider(s["分组倍率"], provider);
      if (r != null) {
        rates.push(r);
        count++;
      }
    }
    const best = rates.length ? Math.min(...rates) : null;
    const avg = rates.length ? rates.reduce((x, y) => x + y, 0) / rates.length : null;
    return { provider, siteCount: count, bestRate: best, avgRate: avg };
  });
}