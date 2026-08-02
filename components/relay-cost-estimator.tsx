"use client";

import { useState } from "react";
import { Calculator, Sparkles, TrendingDown, DollarSign, Zap } from "lucide-react";
import type { RelayV1Offer, RelayV1Site } from "@/lib/relay-v1";
import { extractSiteTags } from "@/lib/relay-v1";

interface CostEstimatorProps {
  selectedModel: string;
  sites: { site: RelayV1Site; offer: RelayV1Offer; priceValue: number | null }[];
}

export function RelayCostEstimator({ selectedModel, sites }: CostEstimatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tokenMillions, setTokenMillions] = useState<number>(20); // 默认 20M tokens/月

  // 1M Tokens 的官方标准官方指导基准价 (Dollar)
  // 以 gpt-4o / gpt-5.6 为基准折算
  const basePricePerMillion = 2.5; 

  if (sites.length === 0) return null;

  // 计算每家站点预计月费用（元/月）
  // 基础逻辑：1刀额度官方 $1 = 7.2 CNY
  // 站点实际消耗金额 = (tokenMillions * basePricePerMillion / 1000) * (offer.inputRate || 1.0) * 7.2
  const rankedSites = sites
    .map((item) => {
      const rate = item.offer.inputRate ?? item.offer.outputRate ?? 1.0;
      const monthlyCostCny = (tokenMillions * basePricePerMillion * rate * 0.1 * 7.2);
      const tags = extractSiteTags(item.site);
      return {
        ...item,
        rate,
        monthlyCostCny,
        tags,
      };
    })
    .sort((a, b) => a.monthlyCostCny - b.monthlyCostCny)
    .slice(0, 3);

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
              拖动预估用量，精准测算在不同中转站使用 <strong className="text-black">{selectedModel}</strong> 的真实月度账单（¥/月）
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
          <div className="grid gap-6 md:grid-cols-12 md:items-center">
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
            </div>

            <div className="md:col-span-7">
              <div className="font-mono text-xs font-bold text-black/70 mb-2">
                🏆 当前消耗量下最省钱推荐：
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {rankedSites.map((item, idx) => (
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
                      ¥ {item.monthlyCostCny.toFixed(1)} <span className="text-[10px] text-black/50">/月</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 font-mono text-[9px] text-black/50">
                      <span>倍率 {item.rate.toFixed(2)}x</span>
                      {item.tags.hasInvoice && <span className="bg-black/5 px-1">可开票</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
