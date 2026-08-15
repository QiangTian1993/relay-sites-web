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
  const [isOpen, setIsOpen] = useState(false);
  const [tokenMillions, setTokenMillions] = useState<number>(20); // 默认 20M tokens/月
  const [showCount, setShowCount] = useState<number>(0); // 0 = 全部展示

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
              拖动总 Token 用量，按 sub2api 实测的输入 / 输出 / 缓存构成逐项测算 <strong className="text-black">{selectedModel}</strong> 月度账单
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
                max="1000"
                step="1"
                value={tokenMillions}
                onChange={(e) => setTokenMillions(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none bg-black/10 accent-swiss-accent"
              />
              <div className="mt-2 flex justify-between font-mono text-[10px] text-black/45">
                <span>1M</span>
                <span>100M</span>
                <span>500M</span>
                <span>1000M</span>
              </div>

              <p className="mt-4 border-t-2 border-dashed border-black/20 pt-2.5 font-mono text-[10px] leading-4 text-black/45">
                采用你服务器 sub2api 2026-05 完整月实测构成：输入 10.40% · 输出 0.47% · 缓存读取 89.13% · 缓存创建 0%。四类 Token 分别乘各自价格后相加；不再使用固定命中率猜测。
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
                      <span>输入到手 {formatEffective(item.formula)}</span>
                      {item.blendedCostPer1M != null && (
                        <span className="bg-black/5 px-1">混合 ¥{item.blendedCostPer1M.toFixed(3)}/1M</span>
                      )}
                      {item.cacheReadCostPer1M != null && (
                        <span className="bg-black/5 px-1">缓存 ¥{item.cacheReadCostPer1M.toFixed(3)}/1M</span>
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
              <table className="w-full min-w-[800px] font-mono text-xs">
                <thead className="sticky top-0 z-10 bg-black text-white">
                  <tr>
                    <th className="px-2.5 py-2 text-left font-black uppercase tracking-wider">#</th>
                    <th className="px-2.5 py-2 text-left font-black uppercase tracking-wider">站点</th>
                    <th className="px-2.5 py-2 text-right font-black uppercase tracking-wider">输入到手</th>
                    <th className="px-2.5 py-2 text-right font-black uppercase tracking-wider">混合价 ¥/1M</th>
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
                        <td
                          className="whitespace-nowrap px-2.5 py-1.5 text-right"
                          title={
                            item.blendedCostPer1M != null
                              ? `输入 ¥${item.inputCostPer1M?.toFixed(3)} / 输出 ¥${item.outputCostPer1M?.toFixed(3)} / 缓存读取 ¥${item.cacheReadCostPer1M?.toFixed(3)} / 缓存创建 ¥${item.cacheCreationCostPer1M?.toFixed(3)}`
                              : undefined
                          }
                        >
                          {item.blendedCostPer1M != null ? `¥${item.blendedCostPer1M.toFixed(3)}` : "--"}
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
