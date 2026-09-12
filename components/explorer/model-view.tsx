// 模型视图 —— PRD F.01 按模型查所有站
// 行 = 站，列 = 倍率、可用率、状态

"use client";

import Link from "next/link";
import { IconCircleCheck, IconCircleAlert, IconSearch } from "../icons";
import { modelOfferLabel, type ModelOfferSummary } from "@/lib/relay-product";
import { formatRate, rateTier } from "@/lib/matrix";
import { toNumber } from "@/lib/record-utils";
import { detectRisk } from "../badges";
import type { KeyedRecord } from "@/lib/types";

interface Props {
  modelQuery: string;
  modelNames: string[];
  onModelChange: (q: string) => void;
  /** 站 id -> 该站的 model offer 列表（按 model 查）*/
  offersBySite: Map<string, ModelOfferSummary[]>;
  /** 站 id -> site record */
  sitesById: Map<string, KeyedRecord>;
  /** 站 id -> perf record */
  perfBySiteId: Map<string, KeyedRecord>;
  /** 站 id -> 域名 */
  domainBySite: Map<string, string>;
}

export function ModelView({ modelQuery, modelNames, onModelChange, offersBySite, sitesById, perfBySiteId, domainBySite }: Props) {
  if (!modelQuery.trim()) {
    return (
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-xs font-semibold text-zinc-400 uppercase tracking-wider">F.01 / MODEL COVERAGE</div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">查模型覆盖</h3>
          <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
            用于快速确认全网哪些站点已接入目标模型；此表仅展示原始模型费率，完整分组折算与月度成本请前往模型比价。
          </p>
          <div className="mt-6">
            <label className="flex max-w-md items-center rounded-xl border border-zinc-200/80 bg-white mx-auto shadow-2xs focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900/5">
              <span className="flex h-11 w-11 items-center justify-center text-zinc-400">
                <IconSearch className="h-4 w-4" />
              </span>
              <input
                value={modelQuery}
                onChange={(event) => onModelChange(event.target.value)}
                list="relay-model-options"
                placeholder="输入目标模型 (如 claude-3-7 / gpt-5.4)..."
                autoFocus
                className="min-w-0 flex-1 bg-transparent px-2 py-2.5 font-mono text-xs font-semibold text-zinc-900 outline-none"
              />
            </label>
            <datalist id="relay-model-options">
              {modelNames.slice(0, 50).map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>

          <div className="mt-7">
            <div className="font-mono text-xs font-semibold text-zinc-400 uppercase tracking-wider">热门模型快捷检索</div>
            <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
              {modelNames.slice(0, 10).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onModelChange(name)}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 shadow-2xs transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 聚合所有站的该模型 offer
  const rows: ModelRow[] = [];
  for (const [siteId, offers] of offersBySite.entries()) {
    const matching = offers.filter((o) => o.name.toLowerCase().includes(modelQuery.toLowerCase()));
    if (matching.length === 0) continue;
    // 取最低原始费率，仅用于覆盖清单参考，不代表最终到手价。
    const sorted = [...matching].sort((a, b) => {
      const av = a.type === "image" ? (a.perCallPrice ?? Infinity) : (a.inputRate ?? a.outputRate ?? Infinity);
      const bv = b.type === "image" ? (b.perCallPrice ?? Infinity) : (b.inputRate ?? b.outputRate ?? Infinity);
      return av - bv;
    });
    const best = sorted[0];
    const site = sitesById.get(siteId);
    const perf = perfBySiteId.get(siteId);
    rows.push({
      siteId,
      siteName: String(site?.["名称"] ?? "未知"),
      domain: domainBySite.get(siteId) ?? "",
      offer: best,
      availability7d: toNumber(perf?.availability_7d),
      successRate: toNumber(perf?.success_rate),
      riskLevel: detectRisk(perf).severity,
      hasPerf: !!perf,
    });
  }
  rows.sort((a, b) => {
    const av = a.offer.type === "image" ? (a.offer.perCallPrice ?? Infinity) : (a.offer.inputRate ?? a.offer.outputRate ?? Infinity);
    const bv = b.offer.type === "image" ? (b.offer.perCallPrice ?? Infinity) : (b.offer.inputRate ?? b.offer.outputRate ?? Infinity);
    return av - bv;
  });

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden mb-6">
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200/80 bg-zinc-50/80 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-[#E03E1A] px-2 py-0.5 font-mono text-[10px] font-bold text-white">F.01</span>
          <span className="font-mono text-xs font-bold text-zinc-900 uppercase tracking-wider">模型覆盖</span>
          <span className="hidden text-xs text-zinc-400 sm:inline">站点接入清单 · 非最终到手价排名</span>
        </div>
        <div className="rounded-full bg-zinc-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-zinc-600">
          {rows.length} 站已支持
        </div>
      </div>
      <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-2.5 bg-white">
        <span className="font-mono text-xs font-semibold text-zinc-400">MODEL</span>
        <label className="flex flex-1 items-center rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-1">
          <IconSearch className="h-3.5 w-3.5 text-zinc-400 mr-2" />
          <input
            value={modelQuery}
            onChange={(event) => onModelChange(event.target.value)}
            list="relay-model-options"
            className="min-w-0 flex-1 bg-transparent font-mono text-xs font-semibold text-zinc-800 outline-none"
          />
          <datalist id="relay-model-options">
            {modelNames.map((name) => <option key={name} value={name} />)}
          </datalist>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-center font-mono text-xs text-zinc-400">暂无站点支持该模型</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/80 font-mono text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <th className="px-3.5 py-2.5">#</th>
                <th className="px-3.5 py-2.5">站点</th>
                <th className="px-3.5 py-2.5">原始费率参考</th>
                <th className="px-3.5 py-2.5 text-right">7D 可用率</th>
                <th className="px-3.5 py-2.5 text-right">成功率</th>
                <th className="px-3.5 py-2.5 text-center">风控</th>
                <th className="px-3.5 py-2.5">分组覆盖</th>
                <th className="px-3.5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-mono text-xs">
              {rows.map((row, idx) => {
                const rateValue = row.offer.type === "image" ? row.offer.perCallPrice : (row.offer.inputRate ?? row.offer.outputRate);
                const tier = rateTier(rateValue ?? null);
                const a7Tone = row.availability7d == null ? "" : row.availability7d >= 95 ? "text-emerald-600" : row.availability7d >= 80 ? "text-zinc-800" : "text-amber-600";
                const riskIcon = row.riskLevel === "high" ? <IconCircleAlert className="h-4 w-4 text-amber-500" /> : row.riskLevel === "medium" ? <span className="inline-block h-3 w-3 rounded-full border border-zinc-400" /> : <IconCircleCheck className="h-4 w-4 text-emerald-600" />;
                return (
                  <tr key={row.siteId} className="transition-colors hover:bg-zinc-50/60">
                    <td className="px-3.5 py-3 text-zinc-400 font-semibold">{String(idx + 1).padStart(2, "0")}</td>
                    <td className="px-3.5 py-3">
                      <Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.siteId)}`} className="font-bold text-zinc-900 hover:text-[#E03E1A] transition-colors">{row.siteName}</Link>
                      {row.domain && <div className="mt-0.5 truncate text-[11px] text-zinc-400">{row.domain}</div>}
                    </td>
                    <td className="px-3.5 py-3">
                      <span className="inline-block rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-bold text-zinc-900 shadow-2xs">
                        {row.offer.type === "image" ? row.offer.perCallPrice == null ? "--" : `¥${row.offer.perCallPrice}/次` : formatRate(rateValue)}
                      </span>
                      <div className="mt-1 text-[11px] text-zinc-400">{modelOfferLabel(row.offer)}</div>
                    </td>
                    <td className={`px-3.5 py-3 text-right font-bold ${a7Tone}`}>{row.availability7d == null ? "--" : `${row.availability7d.toFixed(1)}%`}</td>
                    <td className="px-3.5 py-3 text-right text-zinc-700">{row.successRate == null ? "--" : `${(row.successRate * 100).toFixed(0)}%`}</td>
                    <td className="px-3.5 py-3 text-center">{row.hasPerf ? riskIcon : <span className="text-zinc-400">未测</span>}</td>
                    <td className="max-w-[200px] truncate px-3.5 py-3 text-zinc-600" title={row.offer.group}>{row.offer.group || "--"}</td>
                    <td className="px-3.5 py-3 text-right">
                      <Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.siteId)}`} className="rounded-lg bg-zinc-900 px-3 py-1 font-bold text-white transition-colors hover:bg-zinc-800 shadow-2xs">
                        VIEW →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


interface ModelRow {
  siteId: string;
  siteName: string;
  domain: string;
  offer: ModelOfferSummary;
  availability7d: number | null;
  successRate: number | null;
  riskLevel: "high" | "medium" | "low" | "none";
  hasPerf: boolean;
}