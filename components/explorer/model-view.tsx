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
      <section className="border-2 border-swiss-fg bg-swiss-bg p-8 swiss-dots">
        <div className="mx-auto max-w-2xl text-center">
          <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">F.01 / MODEL COVERAGE</div>
          <h3 className="mt-3 text-2xl font-black tracking-tighter sm:text-3xl">查模型覆盖，不在这里排名</h3>
          <p className="mt-3 font-mono text-sm text-swiss-fg/55">
            用于确认哪些站点接入目标模型；价格仅显示原始模型费率参考，完整分组折扣与成本估算请进入模型比价。
          </p>
          <div className="mt-6">
            <label className="flex max-w-md items-center border-2 border-swiss-fg bg-swiss-bg mx-auto">
              <span className="flex h-12 w-12 items-center justify-center border-r border-swiss-fg bg-swiss-muted">
                <IconSearch className="h-5 w-5" />
              </span>
              <input
                value={modelQuery}
                onChange={(event) => onModelChange(event.target.value)}
                list="relay-model-options"
                placeholder="输入模型"
                autoFocus
                className="min-w-0 flex-1 bg-swiss-bg px-3 py-3 font-mono text-base outline-none focus:bg-swiss-muted"
              />
            </label>
            <datalist id="relay-model-options">
              {modelNames.slice(0, 50).map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>

          <div className="mt-8">
            <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">热门模型</div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {modelNames.slice(0, 10).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => onModelChange(name)}
                  className="border-2 border-swiss-fg bg-swiss-bg px-3 py-1.5 font-mono text-sm font-black transition-colors hover:bg-swiss-fg hover:text-swiss-bg"
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
    <section className="border-2 border-swiss-fg bg-swiss-bg">
      <div className="flex flex-wrap items-stretch gap-0 border-b-2 border-swiss-fg">
        <div className="flex flex-1 items-center gap-3 px-4 py-3">
          <span className="bg-swiss-accent px-2 py-1 font-mono text-sm font-black text-swiss-bg">F.01</span>
          <span className="font-mono text-sm font-black uppercase tracking-widest">模型覆盖</span>
          <span className="hidden text-xs text-swiss-fg/50 sm:inline">站点接入清单 · 非最终价格排名</span>
        </div>
        <div className="flex items-center border-l-2 border-swiss-fg bg-swiss-fg px-4 font-mono text-sm font-black uppercase tracking-widest text-swiss-bg">
          {rows.length} STATIONS
        </div>
      </div>
      <div className="flex items-center gap-3 border-b-2 border-swiss-fg px-4 py-3">
        <span className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">MODEL</span>
        <label className="flex flex-1 items-center border-2 border-swiss-fg">
          <IconSearch className="ml-3 h-4 w-4 text-swiss-fg/45" />
          <input
            value={modelQuery}
            onChange={(event) => onModelChange(event.target.value)}
            list="relay-model-options"
            className="min-w-0 flex-1 bg-swiss-bg px-3 py-2 font-mono text-sm font-bold outline-none"
          />
          <datalist id="relay-model-options">
            {modelNames.map((name) => <option key={name} value={name} />)}
          </datalist>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="p-12 text-center font-mono text-sm text-swiss-fg/45">暂无站支持该模型</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b-2 border-swiss-fg bg-swiss-muted font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">
                <th className="px-3 py-3 text-left">#</th>
                <th className="px-3 py-3 text-left">站点</th>
                <th className="px-3 py-3 text-left">原始费率参考</th>
                <th className="px-3 py-3 text-right">7d 可用率</th>
                <th className="px-3 py-3 text-right">成功率</th>
                <th className="px-3 py-3 text-center">风控</th>
                <th className="px-3 py-3 text-left">分组覆盖</th>
                <th className="px-3 py-3 text-left" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rateValue = row.offer.type === "image" ? row.offer.perCallPrice : (row.offer.inputRate ?? row.offer.outputRate);
                const tier = rateTier(rateValue ?? null);
                const a7Tone = row.availability7d == null ? "" : row.availability7d >= 95 ? "text-swiss-success" : row.availability7d >= 80 ? "" : "text-swiss-warning";
                const riskIcon = row.riskLevel === "high" ? <IconCircleAlert className="h-4 w-4 text-swiss-warning" /> : row.riskLevel === "medium" ? <span className="inline-block h-3 w-3 rounded-full border border-swiss-fg" /> : <IconCircleCheck className="h-4 w-4 text-swiss-success" />;
                return (
                  <tr key={row.siteId} className="border-b border-swiss-fg/15 transition-colors last:border-b-0 hover:bg-swiss-muted">
                    <td className="px-3 py-3 font-mono text-sm font-black text-swiss-fg/45">{String(idx + 1).padStart(2, "0")}</td>
                    <td className="px-3 py-3">
                      <Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.siteId)}`} className="font-black hover:text-swiss-accent">{row.siteName}</Link>
                      {row.domain && <div className="mt-0.5 truncate font-mono text-sm text-swiss-fg/45">{row.domain}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block border-2 border-swiss-fg px-2 py-1 font-mono text-sm font-black ${tier.classes}`}>
                        {row.offer.type === "image" ? row.offer.perCallPrice == null ? "--" : `¥${row.offer.perCallPrice}/次` : formatRate(rateValue)}
                      </span>
                      <div className="mt-1 font-mono text-sm text-swiss-fg/45">{modelOfferLabel(row.offer)}</div>
                    </td>
                    <td className={`px-3 py-3 text-right font-mono text-sm font-black ${a7Tone}`}>{row.availability7d == null ? "--" : `${row.availability7d.toFixed(1)}%`}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-black">{row.successRate == null ? "--" : `${(row.successRate * 100).toFixed(0)}%`}</td>
                    <td className="px-3 py-3 text-center">{row.hasPerf ? riskIcon : <span className="font-mono text-sm text-swiss-fg/45">未测</span>}</td>
                    <td className="max-w-[200px] truncate px-3 py-3 font-mono text-sm text-swiss-fg/65" title={row.offer.group}>{row.offer.group || "--"}</td>
                    <td className="px-3 py-3"><Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.siteId)}`} className="border border-swiss-fg bg-swiss-fg px-3 py-1.5 font-mono text-sm font-black uppercase tracking-widest text-swiss-bg transition-colors hover:bg-swiss-accent">VIEW →</Link></td>
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