"use client";

import { useMemo, useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";
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
  inputCostPer1M: number | null;
  outputCostPer1M: number | null;
  cacheCreationCostPer1M: number | null;
  cacheReadCostPer1M: number | null;
  blendedCostPer1M: number | null;
  monthlyCostCny: number | null; // null = 图片模型按次计费，无法按 token 量估算
  tags: SiteFeatureTags;
}

interface TokenUsageProfile {
  inputShare: number;
  outputShare: number;
  cacheCreationShare: number;
  cacheReadShare: number;
}

const SHOW_OPTIONS = [
  { value: 10, label: "Top 10" },
  { value: 20, label: "Top 20" },
  { value: 50, label: "Top 50" },
  { value: 0, label: "全部" },
] as const;

// 用户 sub2api 实例 2026-05 完整月聚合：
// 输入 239,304,270；输出 10,778,679；缓存创建 0；缓存读取 2,050,872,576。
// sub2api 的总 token 口径是四类 token 之和，费用亦按四类分别计价后相加。
const SUB2API_PROFILE_TOTAL_TOKENS = 2_300_955_525;
const SUB2API_USAGE_PROFILE: TokenUsageProfile = {
  inputShare: 239_304_270 / SUB2API_PROFILE_TOTAL_TOKENS,
  outputShare: 10_778_679 / SUB2API_PROFILE_TOTAL_TOKENS,
  cacheCreationShare: 0,
  cacheReadShare: 2_050_872_576 / SUB2API_PROFILE_TOTAL_TOKENS,
};

function formatEffective(formula: PriceFormulaBreakdown): string {
  const v = formula.effectivePrice;
  if (v == null || v <= 0) return "--";
  return formula.basePriceType === "per_call"
    ? `¥${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 }).format(v)}/次`
    : `${v.toFixed(4).replace(/\.?0+$/, "")}×`;
}

export function RelayCostEstimator({ selectedModel, sites }: CostEstimatorProps) {
  const [isOpen, setIsOpen] = useState(true); // 估算器默认展开
  const [tokenMillions, setTokenMillions] = useState<number>(20); // 默认 20M tokens/月
  const [showCount, setShowCount] = useState<number>(0); // 0 = 全部展示
  const [showFullList, setShowFullList] = useState(false); // 全站成本排序列表默认收起

  // 按 sub2api 的真实账单公式逐项计费：
  // 总费用 = 输入 token×输入价 + 输出 token×输出价 + 缓存创建 token×创建价 + 缓存读取 token×读取价。
  // tokenMillions 表示四类 token 的总量；构成比例来自用户 sub2api 2026-05 完整月实测。
  const rankedSites = useMemo<RankedSite[]>(() => {
    return sites
      .map((item) => {
        const inputCostPer1M = item.formula.estimatedRmbPer1MTokens;
        const hasInputPrice = inputCostPer1M != null && inputCostPer1M > 0;
        const inputRate = item.offer.inputRate;
        const outputRate = item.offer.outputRate;
        const outputCostPer1M = hasInputPrice
          ? inputRate != null && inputRate > 0 && outputRate != null && outputRate > 0
            ? inputCostPer1M * (outputRate / inputRate)
            : inputCostPer1M
          : null;
        const cacheReadCostPer1M = hasInputPrice
          ? inputCostPer1M * (item.offer.cacheRate ?? 0.1)
          : null;
        const cacheCreationCostPer1M = hasInputPrice
          ? inputCostPer1M * (item.offer.createCacheRate ?? 1.25)
          : null;
        const blendedCostPer1M =
          hasInputPrice && outputCostPer1M != null && cacheReadCostPer1M != null && cacheCreationCostPer1M != null
            ? SUB2API_USAGE_PROFILE.inputShare * inputCostPer1M +
              SUB2API_USAGE_PROFILE.outputShare * outputCostPer1M +
              SUB2API_USAGE_PROFILE.cacheCreationShare * cacheCreationCostPer1M +
              SUB2API_USAGE_PROFILE.cacheReadShare * cacheReadCostPer1M
            : null;
        const monthlyCostCny = blendedCostPer1M != null ? tokenMillions * blendedCostPer1M : null;

        return {
          ...item,
          inputCostPer1M: hasInputPrice ? inputCostPer1M : null,
          outputCostPer1M,
          cacheCreationCostPer1M,
          cacheReadCostPer1M,
          blendedCostPer1M,
          monthlyCostCny,
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
    <div className="mb-6 rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200/80 bg-zinc-50 text-zinc-800 shadow-2xs">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
              <span>月度消耗与成本预估器</span>
              <span className="font-mono text-xs font-normal text-zinc-400">Token Cost Estimator</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              拖动总 Token 用量，按 sub2api 实测的输入 / 输出 / 缓存构成测算 <strong className="text-zinc-800 font-semibold">{selectedModel}</strong> 月度账单
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors shadow-2xs"
        >
          {isOpen ? "收起估算器 ▲" : "展开月度算账器 ▼"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-5 border-t border-zinc-100 pt-5">
          <div className="grid gap-6 md:grid-cols-12 md:items-start">
            <div className="md:col-span-5 rounded-xl border border-zinc-200/60 bg-zinc-50/50 p-4">
              <label className="mb-2 flex items-center justify-between font-mono text-xs font-semibold text-zinc-700">
                <span>预估每月 Token 消耗量：</span>
                <span className="font-mono text-sm font-bold text-[#E03E1A]">{tokenMillions}M Tokens / 月</span>
              </label>
              <input
                type="range"
                min="1"
                max="1000"
                step="1"
                value={tokenMillions}
                onChange={(e) => setTokenMillions(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-zinc-900"
              />
              <div className="mt-2 flex justify-between font-mono text-[10px] text-zinc-400">
                <span>1M</span>
                <span>100M</span>
                <span>500M</span>
                <span>1000M</span>
              </div>

              <p className="mt-3.5 border-t border-zinc-200/60 pt-2.5 text-[11px] leading-relaxed text-zinc-500">
                基于 sub2api 2026-05 完整月实测构成：输入 10.40% · 输出 0.47% · 缓存读取 89.13% · 缓存创建 0%。四类 Token 分别按对应费率计价求和。
              </p>
            </div>

            <div className="md:col-span-7">
              <div className="text-xs font-semibold text-zinc-700 mb-2.5 flex items-center gap-1.5">
                <span>🏆 当前消耗量下最省钱推荐</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {topPicks.map((item, idx) => (
                  <div key={item.site.id} className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs hover:border-zinc-300 transition-all">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-mono text-xs font-bold text-zinc-900">
                        #{idx + 1} {item.site.name}
                      </span>
                      {idx === 0 && (
                        <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-bold">
                          最省
                        </span>
                      )}
                    </div>
                    <div className="mt-2 font-mono text-lg font-bold text-zinc-900">
                      {item.monthlyCostCny != null ? (
                        <>
                          ¥ {item.monthlyCostCny.toFixed(1)} <span className="text-[10px] text-zinc-400 font-normal">/月</span>
                        </>
                      ) : (
                        <span className="text-sm text-zinc-500 font-normal">
                          {item.formula.basePriceType === "per_call" ? "按次计费" : "价格未知"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 font-mono text-[10px] text-zinc-500">
                      <span className="rounded bg-zinc-100 px-1 py-0.5">到手 {formatEffective(item.formula)}</span>
                      {item.blendedCostPer1M != null && (
                        <span className="rounded bg-zinc-100 px-1 py-0.5">混合 ¥{item.blendedCostPer1M.toFixed(3)}/1M</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

            {/* 全量成本排序表 */}
          <div className="mt-5 border-t border-zinc-100 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowFullList(!showFullList)}
                className="flex items-center gap-1.5 font-mono text-xs font-semibold text-zinc-700 transition-colors hover:text-zinc-900"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showFullList ? "rotate-180" : ""}`} />
                全站成本排序 · 已对全部 <strong className="font-bold text-zinc-900">{rankedSites.length}</strong> 站完成计算
                <span className="ml-1 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-500">
                  {showFullList ? "收起 ▲" : "展开 ▼"}
                </span>
              </button>
              {showFullList && (
                <div className="flex flex-wrap gap-1 font-mono text-xs">
                  {SHOW_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setShowCount(opt.value)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        showCount === opt.value
                          ? "border-zinc-900 bg-zinc-900 text-white shadow-2xs"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                      }`}
                    >
                      {opt.value === 0 ? `全部 (${rankedSites.length})` : opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              className={`mt-3 max-h-[420px] overflow-auto rounded-xl border border-zinc-200/80 bg-white ${showFullList ? "" : "hidden"}`}
            >
              <table className="w-full min-w-[800px] font-mono text-xs">
                <thead className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold">站点</th>
                    <th className="px-3 py-2.5 text-right font-semibold">输入到手</th>
                    <th className="px-3 py-2.5 text-right font-semibold">混合价 ¥/1M</th>
                    <th className="px-3 py-2.5 text-right font-semibold">月费用 ¥</th>
                    <th className="px-3 py-2.5 text-right font-semibold">7D 可用率</th>
                    <th className="px-3 py-2.5 text-left font-semibold">特性</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {visibleSites.map((item, idx) => {
                    const availability = item.site.performance?.availability7d ?? null;
                    return (
                      <tr key={item.site.id} className={`transition-colors ${idx === 0 ? "bg-amber-50/30" : "hover:bg-zinc-50/50"}`}>
                        <td className="whitespace-nowrap px-3 py-2 font-bold text-zinc-700">
                          #{idx + 1}
                          {idx === 0 && (
                            <span className="ml-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-1.5 py-0.2 text-[9px] font-bold">最省</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <span className="font-semibold text-zinc-900">{item.site.name}</span>
                          {item.site.domain && (
                            <span className="ml-1.5 text-[10px] text-zinc-400">
                              {item.site.domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "")}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-zinc-700">{formatEffective(item.formula)}</td>
                        <td
                          className="whitespace-nowrap px-3 py-2 text-right text-zinc-600"
                          title={
                            item.blendedCostPer1M != null
                              ? `输入 ¥${item.inputCostPer1M?.toFixed(3)} / 输出 ¥${item.outputCostPer1M?.toFixed(3)} / 缓存读取 ¥${item.cacheReadCostPer1M?.toFixed(3)} / 缓存创建 ¥${item.cacheCreationCostPer1M?.toFixed(3)}`
                              : undefined
                          }
                        >
                          {item.blendedCostPer1M != null ? `¥${item.blendedCostPer1M.toFixed(3)}` : "--"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-bold text-zinc-900">
                          {item.monthlyCostCny != null
                            ? `¥${item.monthlyCostCny.toFixed(1)}`
                            : item.formula.basePriceType === "per_call"
                            ? "按次计费"
                            : "价格未知"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-zinc-700">
                          {availability == null ? "--" : `${availability.toFixed(1)}%`}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-[10px] text-zinc-500">
                          {item.tags.tagList.length > 0 ? item.tags.tagList.join(" / ") : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {showFullList && showCount > 0 && rankedSites.length > showCount && (
              <p className="mt-2 text-[11px] text-zinc-400">
                已对全部 {rankedSites.length} 站完成计算排序，当前仅展示前 {showCount} 名，点击「全部」查看完整列表。
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
