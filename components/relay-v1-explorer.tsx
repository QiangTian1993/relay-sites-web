"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  ChevronDown,
  ExternalLink,
  Gauge,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import type { RelayV1Data, RelayV1Group, RelayV1Offer, RelayV1Site, RiskLevel } from "@/lib/relay-v1";
import { extractSiteTags } from "@/lib/relay-v1";
import { RelaySubNav } from "./relay-sub-nav";
import { RelayCostEstimator } from "./relay-cost-estimator";
import { RelayScenarioTabs, ScenarioPreset } from "./relay-scenario-tabs";

type SortKey = "price" | "availability" | "speed" | "name";
type RiskFilter = "all" | "safe" | "warning";

interface RelayV1ExplorerProps {
  data: RelayV1Data;
}

interface ComparisonRow {
  site: RelayV1Site;
  offer: RelayV1Offer;
  priceValue: number | null;
  relevantGroups: RelayV1Group[];
  riskLevel: RiskLevel;
  riskRemarks: RelayV1Group[];
  changedGroups: RelayV1Group[];
}

function offerPrice(offer: RelayV1Offer, groups: RelayV1Group[]): number | null {
  const basePrice = offer.modelType === "image" ? offer.perCallPrice : (offer.inputRate ?? offer.outputRate);
  if (basePrice == null) return null;
  if (groups.length === 0) return basePrice;

  const applicableGroups = offer.enabledGroups.length > 0
    ? groups.filter((g) => offer.enabledGroups.includes(g.name))
    : groups;

  if (applicableGroups.length === 0) return basePrice;

  const rates = applicableGroups.map((g) => g.rateMin).filter((r): r is number => r != null);
  if (rates.length === 0) return basePrice;

  return basePrice * Math.min(...rates);
}

function compareNullable(a: number | null, b: number | null, direction: "asc" | "desc"): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === "asc" ? a - b : b - a;
}

function formatMultiplier(value: number | null): string {
  if (value == null) return "--";
  return `${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(value)}×`;
}

function formatPercent(value: number | null, ratio = false): string {
  if (value == null) return "--";
  const normalized = ratio ? value * 100 : value;
  return `${normalized.toFixed(1)}%`;
}

function formatMs(value: number | null): string {
  if (value == null) return "--";
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

function formatDate(value: string): string {
  if (!value) return "--";
  const date = new Date(value.replace(" ", "T"));
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function groupMatchesModel(group: RelayV1Group, modelName: string): boolean {
  const normalized = modelName.toLocaleLowerCase();
  return group.relatedModels.some((item) => item.toLocaleLowerCase().startsWith(normalized));
}

function riskWeight(level: RiskLevel): number {
  return level === "high" ? 2 : level === "medium" ? 1 : 0;
}

function getRiskLevel(groups: RelayV1Group[]): RiskLevel {
  return groups.reduce<RiskLevel>((current, group) => (
    riskWeight(group.riskLevel) > riskWeight(current) ? group.riskLevel : current
  ), "low");
}

function PriceCell({ offer, siteGroups, isBest }: { offer: RelayV1Offer; siteGroups: RelayV1Group[]; isBest: boolean }) {
  const effectivePrice = offerPrice(offer, siteGroups);
  const basePrice = offer.modelType === "image" ? offer.perCallPrice : (offer.inputRate ?? offer.outputRate);
  const hasGroupMultiplier = effectivePrice != null && basePrice != null && Math.abs(effectivePrice - basePrice) > 1e-6;

  if (offer.modelType === "image") {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <strong className="font-mono text-2xl font-black">{effectivePrice == null ? "--" : `¥${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(effectivePrice)}`}</strong>
          {isBest && <span className="bg-swiss-accent px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-white">LOWEST</span>}
        </div>
        <p className="mt-1 font-mono text-xs text-black/55">
          {hasGroupMultiplier ? `基础 ¥${basePrice} × 分组最低` : "按次价格"}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <strong className="font-mono text-2xl font-black">{formatMultiplier(effectivePrice)}</strong>
        {isBest && <span className="bg-swiss-accent px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-white">LOWEST</span>}
      </div>
      <p className="mt-1 font-mono text-xs text-black/55">
        {hasGroupMultiplier ? (
          <span className="text-swiss-accent font-bold">基础 {formatMultiplier(offer.inputRate)} × 分组最低</span>
        ) : (
          <>IN {formatMultiplier(offer.inputRate)} · OUT {formatMultiplier(offer.outputRate)}</>
        )}
      </p>
      {(offer.cacheRate != null || offer.createCacheRate != null) && (
        <p className="mt-1 font-mono text-[11px] text-black/40">
          CACHE {formatMultiplier(offer.cacheRate)} · CREATE {formatMultiplier(offer.createCacheRate)}
        </p>
      )}
    </div>
  );
}

function AvailabilityCell({ site }: { site: RelayV1Site }) {
  const value = site.performance?.availability7d ?? null;
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="min-w-[150px] opacity-75">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <strong className="font-mono text-base font-bold text-black/70">{formatPercent(value)}</strong>
        <span className="font-mono text-[9px] uppercase tracking-widest text-black/40">7D (第三方参考)</span>
      </div>
      <div className="h-1.5 border border-black/20 bg-white">
        <div className="h-full bg-black/40" style={{ width: `${width}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-black/40">
        <span>成功 {formatPercent(site.performance?.successRate ?? null, true)}</span>
        <span>{site.performance ? `${site.performance.consecutiveFailures} 连败` : "未测"}</span>
      </div>
    </div>
  );
}

function ChangeAndRisk({ row }: { row: ComparisonRow }) {
  const change = row.changedGroups[0];
  if (!change) {
    return <span className="font-mono text-xs text-black/35">无变价记录</span>;
  }
  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center gap-1.5 border-2 px-2 py-1 font-mono text-xs font-black ${change.changeDirection === "up" ? "border-swiss-accent bg-swiss-accent text-white" : "border-black bg-white text-black"}`}>
        {change.changeDirection === "up" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        {change.changeDirection === "up" ? "+" : ""}{formatMultiplier(change.changeDelta)}
      </div>
    </div>
  );
}

function DetailPanel({ row, selectedModel }: { row: ComparisonRow; selectedModel: string }) {
  const { site } = row;
  const applicableGroups = row.offer.enabledGroups.length > 0 ? site.groups.filter(g => row.offer.enabledGroups.includes(g.name)) : site.groups;
  const orderedGroups = [...applicableGroups].sort((a, b) => (a.rateMin ?? Infinity) - (b.rateMin ?? Infinity));
  return (
    <div className="grid border-t-2 border-black bg-[#f4f4f0] xl:grid-cols-[0.78fr_1.22fr]">
      <section className="border-b-2 border-black p-5 xl:border-b-0 xl:border-r-2">
        <div className="mb-4 flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-black/60">
          <Gauge className="h-4 w-4" /> Performance Snapshot <span className="text-[10px] font-normal text-black/40">(第三方实测，仅供参考)</span>
        </div>
        {site.performance ? (
          <div className="grid grid-cols-2 border-l-2 border-t-2 border-black/40">
            {[
              ["TTFT P50", formatMs(site.performance.ttftP50Ms)],
              ["LATENCY P95", formatMs(site.performance.latencyP95Ms)],
              ["TOKENS / S", site.performance.tpsAvg == null ? "--" : site.performance.tpsAvg.toFixed(1)],
              ["LAST PROBE", formatDate(site.performance.lastProbeAt)],
            ].map(([label, value]) => (
              <div key={label} className="border-b-2 border-r-2 border-black/40 bg-white p-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/45">{label}</div>
                <div className="mt-2 font-mono text-base font-bold text-black/70">{value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-black/25 bg-white p-6 font-mono text-sm text-black/45">该站点暂无第三方实测数据。</div>
        )}
      </section>

      <section className="p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.18em]">
            <BarChart3 className="h-4 w-4" /> Groups & Multipliers
          </div>
          <span className="font-mono text-xs text-black/45">{applicableGroups.length} GROUPS</span>
        </div>
        <div className="max-h-[360px] overflow-y-auto border-l-2 border-t-2 border-black bg-white">
          {orderedGroups.length === 0 ? (
            <div className="border-b-2 border-r-2 border-black p-6 font-mono text-sm text-black/45">暂无分组数据</div>
          ) : orderedGroups.map((group) => {
            const related = groupMatchesModel(group, selectedModel);
            return (
              <div key={group.id} className={`grid border-b-2 border-r-2 border-black md:grid-cols-[1fr_150px] ${related ? "bg-[#fff0ec]" : "bg-white"}`}>
                <div className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm">{group.name}</strong>
                    {related && <span className="border border-swiss-accent px-1.5 py-0.5 font-mono text-[9px] font-black text-swiss-accent">MODEL LINKED</span>}
                    {group.changeDirection && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-black text-swiss-accent">
                        {group.changeDirection === "up" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {group.changeDirection === "up" ? "+" : ""}{formatMultiplier(group.changeDelta)}
                      </span>
                    )}
                  </div>
                  {group.remark && <p className="mt-1 text-xs leading-5 text-black/55">{group.remark}</p>}
                </div>
                <div className="border-t-2 border-black p-3 md:border-l-2 md:border-t-0">
                  <div className="font-mono text-base font-black">{group.rateValues || formatMultiplier(group.rateMin)}</div>
                  <div className="mt-1 font-mono text-[10px] text-black/45">{formatMultiplier(group.rateMin)} — {formatMultiplier(group.rateMax)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function RelayV1Explorer({ data }: RelayV1ExplorerProps) {
  const [selectedModel, setSelectedModel] = useState(data.defaultModel);
  const [siteQuery, setSiteQuery] = useState("");
  const [minimumAvailability, setMinimumAvailability] = useState(0);
  const [measuredOnly, setMeasuredOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [presetFilter, setPresetFilter] = useState<ScenarioPreset>("all");

  const rows = useMemo<ComparisonRow[]>(() => {
    const normalizedModel = selectedModel.toLocaleLowerCase();
    const query = siteQuery.trim().toLocaleLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const result: ComparisonRow[] = [];

    for (const site of data.sites) {
      const offers = site.offers
        .filter((offer) => offer.modelName.toLocaleLowerCase() === normalizedModel)
        .sort((a, b) => compareNullable(offerPrice(a, site.groups), offerPrice(b, site.groups), "asc"));
      const offer = offers[0];
      if (!offer) continue;

      // 场景化预设过滤
      if (presetFilter === "coding") {
        const isCodingSite =
          site.groups.some((g) => /claude|kiro|max|code|codex/i.test(g.name + (g.remark || ""))) ||
          /claude|cursor|codex/i.test(site.note) ||
          site.providers.some((p) => /claude/i.test(p));
        if (!isCodingSite) continue;
      }
      if (presetFilter === "low_cost") {
        const priceVal = offerPrice(offer, site.groups);
        const isLowRate = (site.minimumRate != null && site.minimumRate <= 0.1) || (priceVal != null && priceVal <= 0.1);
        if (!isLowRate) continue;
      }
      if (presetFilter === "verified") {
        const tags = extractSiteTags(site);
        if (!tags.hasInvoice && !tags.hasRefund && !tags.isPurePro && !tags.noVerify) continue;
      }

      const searchTarget = `${site.id} ${site.name} ${site.domain} ${site.providers.join(" ")}`.toLocaleLowerCase();
      if (query && !searchTarget.includes(query)) continue;
      const availability = site.performance?.availability7d ?? null;
      if (measuredOnly && !site.performance) continue;
      if (minimumAvailability > 0 && (availability == null || availability < minimumAvailability)) continue;

      const relevantGroups = site.groups.filter((group) => groupMatchesModel(group, selectedModel));
      const riskScope = relevantGroups.length > 0 ? relevantGroups : site.groups;
      const riskRemarks = riskScope.filter((group) => group.riskLevel !== "low" && group.remark);
      const riskLevel = getRiskLevel(riskScope);

      result.push({
        site,
        offer,
        priceValue: offerPrice(offer, site.groups),
        relevantGroups,
        riskLevel,
        riskRemarks,
        changedGroups: site.groups.filter((group) => group.changeDirection),
      });
    }

    return result.sort((a, b) => {
      if (sortKey === "availability") return compareNullable(a.site.performance?.availability7d ?? null, b.site.performance?.availability7d ?? null, "desc");
      if (sortKey === "speed") return compareNullable(a.site.performance?.ttftP50Ms ?? null, b.site.performance?.ttftP50Ms ?? null, "asc");
      if (sortKey === "name") return a.site.name.localeCompare(b.site.name, "zh-CN");
      return compareNullable(a.priceValue, b.priceValue, "asc");
    });
  }, [data.sites, measuredOnly, minimumAvailability, presetFilter, selectedModel, siteQuery, sortKey]);

  const finitePrices = rows.map((row) => row.priceValue).filter((value): value is number => value != null);
  const lowestPrice = finitePrices.length ? Math.min(...finitePrices) : null;
  const highestPrice = finitePrices.length ? Math.max(...finitePrices) : null;
  const priceSpread = lowestPrice != null && highestPrice != null && lowestPrice > 0 ? highestPrice / lowestPrice : null;
  const measuredCount = rows.filter((row) => row.site.performance).length;
  const selectedModelType = data.models.find((model) => model.name === selectedModel)?.type ?? "unknown";
  const lowestPriceLabel = selectedModelType === "image"
    ? (lowestPrice == null ? "--" : `¥${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(lowestPrice)}`)
    : formatMultiplier(lowestPrice);

  const matchedSiteAcrossModels = useMemo(() => {
    const query = siteQuery.trim().toLocaleLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!query || rows.length > 0) return null;
    return data.sites.find((site) => {
      const searchTarget = `${site.id} ${site.name} ${site.domain} ${site.providers.join(" ")}`.toLocaleLowerCase();
      return searchTarget.includes(query);
    });
  }, [data.sites, rows.length, siteQuery]);

  const resetFilters = () => {
    setSiteQuery("");
    setMinimumAvailability(0);
    setMeasuredOnly(false);
    setSortKey("price");
    setPresetFilter("all");
  };

  return (
    <div className="pb-20">
      <RelaySubNav />
      <section className="swiss-grid border-b-4 border-black px-4 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="grid gap-8 xl:grid-cols-[1.45fr_0.55fr] xl:items-end">
          <div>
            <div className="mb-5 flex items-center gap-3 font-mono text-xs font-black uppercase tracking-[0.22em]">
              <span className="h-3 w-3 bg-swiss-accent" /> Relay Pricing Observatory / V1
            </div>
            <h1 className="max-w-5xl text-5xl font-black leading-[0.88] tracking-[-0.065em] sm:text-7xl lg:text-[96px]">
              同模型，<br /><span className="text-swiss-accent">横向比价。</span>
            </h1>
            <p className="mt-7 max-w-2xl border-l-4 border-black pl-4 text-base font-bold leading-7 sm:text-lg">
              把模型倍率、站点分组、7 天可用率和性能快照放进同一张决策表。只展示数据里真实存在的字段，不生成综合评分。
            </p>
          </div>
          <div className="grid grid-cols-2 border-l-2 border-t-2 border-black bg-white">
            {[
              ["SITES", data.totals.sites],
              ["MODEL RATES", data.totals.offers],
              ["GROUPS", data.totals.groups],
              ["PERF SNAPSHOTS", data.totals.measuredSites],
            ].map(([label, value]) => (
              <div key={label} className="border-b-2 border-r-2 border-black p-4 sm:p-5">
                <div className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black/45">{label}</div>
                <div className="mt-2 font-mono text-3xl font-black">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-4 border-black bg-black px-4 py-3 text-white sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs font-bold uppercase tracking-wider">
          <span>Latest source update · {formatDate(data.latestUpdatedAt)}</span>
          <span className="text-[#ff8b70]">{data.totals.changedGroups} price changes</span>
        </div>
      </section>

      <section className="border-b-4 border-black bg-[#f4f4f0] p-4 sm:p-8 lg:p-12">
        <div className="mb-4 flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.2em]">
          <SlidersHorizontal className="h-4 w-4" /> Filters / Exact Model Match
        </div>
        <div className="grid border-l-2 border-t-2 border-black bg-white lg:grid-cols-12">
          <label className="border-b-2 border-r-2 border-black p-4 lg:col-span-5">
            <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-widest text-black/45">01 / 模型</span>
            <select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} className="h-12 w-full border-2 border-black bg-white px-3 font-mono text-sm font-black outline-none focus:border-swiss-accent">
              {data.models.map((model) => <option key={model.name} value={model.name}>{model.name} · {model.siteCount} 站</option>)}
            </select>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="font-mono text-[10px] text-black/40 self-center">热门快捷:</span>
              {["gpt-5.6-sol", "claude-3-7-sonnet", "gpt-4o", "gemini-2.0-flash"].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedModel(m)}
                  className={`border px-2 py-0.5 font-mono text-[10px] font-bold transition-colors ${selectedModel === m ? "border-black bg-black text-white" : "border-black/30 bg-black/5 hover:bg-black/10 text-black/75"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </label>
          <label className="border-b-2 border-r-2 border-black p-4 lg:col-span-3">
            <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-widest text-black/45">02 / 站点搜索</span>
            <span className="flex h-12 items-center border-2 border-black focus-within:border-swiss-accent">
              <Search className="ml-3 h-4 w-4 shrink-0" />
              <input value={siteQuery} onChange={(event) => setSiteQuery(event.target.value)} placeholder="名称 / 域名 / Provider" className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm font-bold outline-none" />
            </span>
          </label>
          <label className="border-b-2 border-r-2 border-black p-4 lg:col-span-2">
            <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-widest text-black/45">03 / 7D 可用率</span>
            <select value={minimumAvailability} onChange={(event) => setMinimumAvailability(Number(event.target.value))} className="h-12 w-full border-2 border-black bg-white px-3 font-mono text-sm font-black outline-none focus:border-swiss-accent">
              <option value={0}>不限</option>
              <option value={80}>≥ 80%</option>
              <option value={90}>≥ 90%</option>
              <option value={95}>≥ 95%</option>
              <option value={99}>≥ 99%</option>
            </select>
          </label>
          <label className="border-b-2 border-r-2 border-black p-4 lg:col-span-2">
            <span className="mb-2 block font-mono text-[10px] font-black uppercase tracking-widest text-black/45">04 / 排序</span>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} className="h-12 w-full border-2 border-black bg-white px-3 font-mono text-sm font-black outline-none focus:border-swiss-accent">
              <option value="price">价格从低到高</option>
              <option value="availability">可用率从高到低</option>
              <option value="speed">TTFT 从快到慢</option>
              <option value="name">站点名称</option>
            </select>
          </label>
          <div className="flex flex-wrap items-stretch border-b-2 border-r-2 border-black lg:col-span-12">
            <button type="button" onClick={() => setMeasuredOnly((value) => !value)} className={`min-h-12 border-r-2 border-black px-4 font-mono text-xs font-black uppercase tracking-wider ${measuredOnly ? "bg-black text-white" : "bg-white hover:bg-[#f4f4f0]"}`}>
              {measuredOnly ? "✓ " : ""}仅看有实测数据
            </button>
            <button type="button" onClick={resetFilters} className="ml-auto flex min-h-12 items-center gap-2 px-4 font-mono text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white">
              <RotateCcw className="h-4 w-4" /> 重置
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8 lg:px-12">
        <RelayScenarioTabs activePreset={presetFilter} onSelectPreset={setPresetFilter} />
        
        <RelayCostEstimator selectedModel={selectedModel} sites={rows} />

        <div className="mb-5 grid gap-4 border-b-4 border-black pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="font-mono text-xs font-black uppercase tracking-[0.2em] text-swiss-accent">Cross-site comparison</div>
            <h2 className="mt-2 break-all text-3xl font-black tracking-[-0.04em] sm:text-5xl">{selectedModel}</h2>
          </div>
          <div className="flex flex-wrap border-l-2 border-t-2 border-black">
            {[
              ["MATCHED", `${rows.length} 站`],
              ["MEASURED", `${measuredCount} 站`],
              ["LOWEST", lowestPriceLabel],
              ["SPREAD", priceSpread == null ? "--" : `${priceSpread.toFixed(1)}×`],
            ].map(([label, value]) => (
              <div key={label} className="min-w-[100px] border-b-2 border-r-2 border-black px-3 py-2">
                <div className="font-mono text-[9px] font-black uppercase tracking-widest text-black/40">{label}</div>
                <div className="mt-1 font-mono text-sm font-black">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden grid-cols-[56px_minmax(220px,1.25fr)_minmax(205px,0.9fr)_minmax(180px,0.8fr)_minmax(145px,0.65fr)_48px] border-x-2 border-t-2 border-black bg-black font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white lg:grid">
          {['#', 'Station', 'Model price', 'Availability', 'Signal', ''].map((label) => <div key={label || 'expand'} className="border-r border-white/25 px-3 py-3 last:border-r-0">{label}</div>)}
        </div>

        <div className="border-x-2 border-t-2 border-black lg:border-t-0">
          {rows.length === 0 ? (
            <div className="border-b-2 border-black bg-[#f4f4f0] px-6 py-20 text-center">
              <Activity className="mx-auto h-10 w-10 text-black/40" />
              <h3 className="mt-4 text-xl font-black">没有符合当前条件的站点</h3>
              <p className="mt-2 font-mono text-sm text-black/60 max-w-xl mx-auto leading-relaxed">
                {matchedSiteAcrossModels ? (
                  <span>
                    已收录站点 <strong className="text-swiss-accent font-black">{matchedSiteAcrossModels.name} ({matchedSiteAcrossModels.domain})</strong>，但该站暂未提供当前选中的 [{selectedModel}] 模型报价。<br />
                    可以去 <Link href={`/table/relay_sites_tracker/${encodeURIComponent(matchedSiteAcrossModels.id)}`} className="font-black text-black underline hover:text-swiss-accent">【{matchedSiteAcrossModels.name} 详情页】</Link> 查看其支持的全部模型，或在顶部尝试切换其他模型。
                  </span>
                ) : (
                  "降低可用率阈值、关闭“仅看有实测数据”或重置搜索。"
                )}
              </p>
            </div>
          ) : rows.map((row, index) => {
            const siteTags = extractSiteTags(row.site);
            return (
            <details key={row.site.id} className="group border-b-2 border-black bg-white open:bg-[#f4f4f0]">
              <summary className="grid cursor-pointer list-none gap-4 p-4 transition-colors hover:bg-[#f4f4f0] lg:grid-cols-[40px_minmax(220px,1.25fr)_minmax(205px,0.9fr)_minmax(180px,0.8fr)_minmax(145px,0.65fr)_32px] lg:items-center lg:gap-3 lg:p-3 [&::-webkit-details-marker]:hidden">
                <div className="font-mono text-sm font-black text-black/40">{String(index + 1).padStart(2, "0")}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.site.id)}`} onClick={(event) => event.stopPropagation()} className="truncate text-lg font-black hover:text-swiss-accent">{row.site.name}</Link>
                    {index === 0 && sortKey === "price" && <span className="border-2 border-black bg-black px-2 py-0.5 font-mono text-[9px] font-black text-white">#1 PRICE</span>}
                    {siteTags.tagList.map(tag => (
                      <span key={tag} className="border border-black/30 bg-[#eef] px-1.5 py-0.5 font-mono text-[9px] font-bold text-black/75">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-black/45">
                    {row.site.domain ? (
                      <a href={domainHref(row.site.domain)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 hover:text-swiss-accent">
                        <span>{domainDisplay(row.site.domain)}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span>NO DOMAIN</span>
                    )}
                  </div>
                </div>
                <PriceCell offer={row.offer} siteGroups={row.site.groups} isBest={lowestPrice != null && row.priceValue === lowestPrice} />
                <AvailabilityCell site={row.site} />
                <ChangeAndRisk row={row} />
                <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
              </summary>
              <DetailPanel row={row} selectedModel={selectedModel} />
            </details>
          );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-black/45">
          <span>价格排序：文本模型优先使用 rate_input，缺失时回退 rate_output；图片模型使用 model_price。</span>
          <span>可用率缺失不会被推断为 0。</span>
        </div>
      </section>
    </div>
  );
}

function domainHref(domain: string): string {
  if (!domain) return "#";
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

function domainDisplay(domain: string): string {
  if (!domain) return "";
  return domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}
