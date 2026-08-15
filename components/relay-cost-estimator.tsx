"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import type { PriceFormulaBreakdown, RelayV1Offer, RelayV1Site, SiteFeatureTags } from "@/lib/relay-v1";
import { extractSiteTags } from "@/lib/relay-v1";

interface SiteOfferPair {
  site: RelayV1Site;
  offer: RelayV1Offer;
  formula: PriceFormulaBreakdown;
}

interface CostEstimatorProps {
  selectedModel: string;
  sites: SiteOfferPair[];
}

interface RankedSite extends SiteOfferPair {
  monthlyCostCny: number | null; // null = 图片模型按次计费，无法按 token 量估算
  cacheReadPer1M: number | null; // 缓存读取单价 ¥/1M（null = 无有效基准或图片模型）
  tags: SiteFeatureTags;
}

const SHOW_OPTIONS = [
  { value: 10, label: "Top 10" },
  { value: 20, label: "Top 20" },
  { value: 50, label: "Top 50" },
  { value: 0, label: "全部" },
] as const;

function formatEffective(formula: PriceFormulaBreakdown): string {
  const v = formula.effectivePrice;
  if (v == null || v <= 0) return "--";
  return formula.basePriceType === "per_call"
    ? `¥${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 }).format(v)}/次`
    : `${v.toFixed(4).replace(/\.?0+$/, "")}×`;
}

export function RelayCostEstimator({ selectedModel, sites }: CostEstimatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tokenMillions, setTokenMillions] = useState<number>(20); // 默认 20M tokens/月
  const [showCount, setShowCount] = useState<number>(0); // 0 = 全部展示

  // 缓存参考档：固定 80% 命中率（Cursor/Claude Code 典型场景），不要求用户输入
  // 命中率因使用模式而异，此处仅作参考区间下界
  const CACHE_HIT_REF = 0.8;

  // 全量站点参与成本计算与排序（不截断）
  // 口径与主列表 DetailPanel 一致：输入价 = estimatedRmbPer1MTokens（已含分组折扣/一口价/积分归一化）
  // 缓存模型（对齐 Anthropic 官方计费，80% 参考档）：
  //   - 命中部分 h×T：按缓存读取价（= 输入到手价 × 站 rate_cache；未填按 × 0.1）
  //   - 新增部分 (1-h)×T：按输入价 + 缓存写入价双计（= 输入到手价 × 站 rate_create_cache；未填按 × 1.25）
  //   缓存倍率一律相对"本站输入到手价"折算（官方标准：读取 0.1、写入 1.25），
  //   避免填了缓存字段的站被按官方基准误判（深度折扣站缓存价会虚高数倍）
  const rankedSites = useMemo<RankedSite[]>(() => {
    const h = CACHE_HIT_REF;
    return sites
      .map((item) => {
        const costPer1M = item.formula.estimatedRmbPer1MTokens;
        const readPer1M =
          costPer1M != null && costPer1M > 0
            ? costPer1M * (item.offer.cacheRate ?? 0.1)
            : null;
        const writePer1M =
          costPer1M != null && costPer1M > 0
            ? costPer1M * (item.offer.createCacheRate ?? 1.25)
            : null;
        const monthlyCostCny =
          costPer1M != null && costPer1M > 0
            ? tokenMillions *
              (readPer1M != null && writePer1M != null
                ? (1 - h) * (costPer1M + writePer1M) + h * readPer1M
                : costPer1M)
            : null;
        return {
          ...item,
          monthlyCostCny,
          cacheReadPer1M: readPer1M,
          tags: extractSiteTags(item.site),
        };
      })
      .sort(
        (a, b) =>
          (a.monthlyCostCny ?? Number.POSITIVE_INFINITY) - (b.monthlyCostCny ?? Number.POSITIVE_INFINITY) ||
          a.site.name.localeCompare(b.site.name, "zh-CN"),
      );
  }, [sites, tokenMillions]);

  if (sites.length === 0) return null;

  const topPicks = rankedSites.slice(0, 3);
  const visibleSites = showCount > 0 ? rankedSites.slice(0, showCount) : rankedSites;

  return (
    <div className="mb-6 border-2 border-black bg-[#fbfbf8] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center border border-black bg-swiss-accent text-white">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-black uppercase tracking-wider text-black">
              💡 月度消耗与成本预估器 (Token Cost Estimator)
            </h3>
            <p className="font-mono text-[11px] text-black/55">
              拖动预估用量，测算在不同中转站使用 <strong className="text-black">{selectedModel}</strong> 的月度账单（¥/月，含分组折扣与 80% 缓存命中参考）
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="border-2 border-black bg-white px-3 py-1.5 font-mono text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
        >
          {isOpen ? "收起估算器 ▲" : "展开月度算账器 ▼"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-5 border-t-2 border-dashed border-black/20 pt-5">
          <div className="grid gap-6 md:grid-cols-12 md:items-start">
            <div className="md:col-span-5">
              <label className="mb-2 flex items-center justify-between font-mono text-xs font-bold text-black/70">
                <span>预估每月 Token 消耗量：</span>
                <span className="font-mono text-sm font-black text-swiss-accent">{tokenMillions}M Tokens / 月</span>
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={tokenMillions}
                onChange={(e) => setTokenMillions(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none bg-black/10 accent-swiss-accent"
              />
              <div className="mt-2 flex justify-between font-mono text-[10px] text-black/45">
                <span>1M (测试试用)</span>
                <span>20M (Cursor中度)</span>
                <span>50M (高频代码)</span>
                <span>100M (团队重度)</span>
              </div>

              <p className="mt-4 border-t-2 border-dashed border-black/20 pt-2.5 font-mono text-[10px] leading-4 text-black/45">
                月费用含 80% 缓存命中参考（Cursor/Claude Code 典型场景，命中率因负载而异）。命中部分按缓存读取价计（输入到手价 × 站缓存倍率，未填按 0.1×），新增部分按输入 + 缓存写入双计（未填按 1.25×）。缓存读取价见「缓存读取」列。
              </p>
            </div>

            <div className="md:col-span-7">
              <div className="font-mono text-xs font-bold text-black/70 mb-2">
                🏆 当前消耗量下最省钱推荐：
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {topPicks.map((item, idx) => (
                  <div key={item.site.id} className="border border-black bg-white p-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-mono text-xs font-black text-black">
                        #{idx + 1} {item.site.name}
                      </span>
                      {idx === 0 && (
                        <span className="border border-black bg-swiss-accent px-1 text-[9px] font-black text-white">
                          最省
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 font-mono text-lg font-black text-swiss-accent">
                      {item.monthlyCostCny != null ? (
                        <>
                          ¥ {item.monthlyCostCny.toFixed(1)} <span className="text-[10px] text-black/50">/月</span>
                        </>
                      ) : (
                        <span className="text-sm text-black/60">
                          {item.formula.basePriceType === "per_call" ? "按次计费" : "价格未知"}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 font-mono text-[9px] text-black/50">
                      <span>到手 {formatEffective(item.formula)}</span>
                      {item.cacheReadPer1M != null && (
                        <span className="bg-black/5 px-1">缓存 ¥{item.cacheReadPer1M.toFixed(3)}/1M</span>
                      )}
                      {item.tags.hasInvoice && <span className="bg-black/5 px-1">可开票</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 全量成本排序表 */}
          <div className="mt-5 border-t-2 border-dashed border-black/20 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-xs font-bold text-black/70">
                全站成本排序 · 已对全部 <strong className="font-black text-swiss-accent">{rankedSites.length}</strong> 站完成计算
              </div>
              <div className="flex flex-wrap gap-1 font-mono text-[11px]">
                {SHOW_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setShowCount(opt.value)}
                    className={`border-2 px-2 py-0.5 font-bold transition-colors ${
                      showCount === opt.value
                        ? "border-black bg-black text-white shadow-[1px_1px_0px_0px_#FF3000]"
                        : "border-black/30 bg-white text-black/70 hover:border-black hover:text-black"
                    }`}
                  >
                    {opt.value === 0 ? `全部 (${rankedSites.length})` : opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2.5 max-h-[420px] overflow-auto border-2 border-black bg-white">
              <table className="w-full min-w-[780px] font-mono text-xs">
                <thead className="sticky top-0 z-10 bg-black text-white">
                  <tr>
                    <th className="px-2.5 py-2 text-left font-black uppercase tracking-wider">#</th>
                    <th className="px-2.5 py-2 text-left font-black uppercase tracking-wider">站点</th>
                    <th className="px-2.5 py-2 text-right font-black uppercase tracking-wider">到手价</th>
                    <th className="px-2.5 py-2 text-right font-black uppercase tracking-wider">缓存读取 ¥/1M</th>
                    <th className="px-2.5 py-2 text-right font-black uppercase tracking-wider">月费用 ¥</th>
                    <th className="px-2.5 py-2 text-right font-black uppercase tracking-wider">7D 可用率</th>
                    <th className="px-2.5 py-2 text-left font-black uppercase tracking-wider">特性</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10">
                  {visibleSites.map((item, idx) => {
                    const availability = item.site.performance?.availability7d ?? null;
                    return (
                      <tr key={item.site.id} className={idx === 0 ? "bg-[#FFEFEA]" : idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
                        <td className="whitespace-nowrap px-2.5 py-1.5 font-black">
                          #{idx + 1}
                          {idx === 0 && (
                            <span className="ml-1 bg-swiss-accent px-1 text-[9px] font-black text-white">最省</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-1.5">
                          <span className="font-black text-black">{item.site.name}</span>
                          {item.site.domain && (
                            <span className="ml-1.5 text-[10px] text-black/45">
                              {item.site.domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "")}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-1.5 text-right">{formatEffective(item.formula)}</td>
                        <td className="whitespace-nowrap px-2.5 py-1.5 text-right">
                          {item.cacheReadPer1M != null ? `¥${item.cacheReadPer1M.toFixed(3)}` : "--"}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-1.5 text-right font-black text-swiss-accent">
                          {item.monthlyCostCny != null
                            ? `¥${item.monthlyCostCny.toFixed(1)}`
                            : item.formula.basePriceType === "per_call"
                            ? "按次计费"
                            : "价格未知"}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-1.5 text-right">
                          {availability == null ? "--" : `${availability.toFixed(1)}%`}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-1.5 text-[10px] text-black/60">
                          {item.tags.tagList.length > 0 ? item.tags.tagList.join(" / ") : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {showCount > 0 && rankedSites.length > showCount && (
              <p className="mt-1.5 font-mono text-[10px] text-black/45">
                已对全部 {rankedSites.length} 站完成计算排序，当前仅展示前 {showCount} 名，点击「全部」查看完整列表。
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
