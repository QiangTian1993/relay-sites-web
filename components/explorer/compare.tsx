// 对比组件：底部候选栏 + 模态对比面板（含分组差异列）

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatRate } from "@/lib/matrix";
import { toNumber } from "@/lib/record-utils";
import { modelOfferLabel } from "@/lib/relay-product";
import { IconArrowRight, IconClose, IconExtLink } from "../icons";
import {
  domainHref,
  formatDuration,
  formatFreshness,
  formatPercent,
  type RelaySiteRow,
} from "./types";

// ============= 底部候选栏 =============

export function CompareTray({
  rows,
  onRemove,
  onClear,
  onOpen,
}: {
  rows: RelaySiteRow[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpen: () => void;
}) {
  return (
    <aside className="fixed inset-x-0 bottom-4 z-40 px-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 p-3 shadow-xl backdrop-blur-md">
        <div className="hidden font-mono text-xs font-bold uppercase tracking-wider text-zinc-400 sm:block">对比候选</div>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
          {rows.map((row) => (
            <span key={row.record.__id} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-800 shadow-2xs">
              {row.name}
              <button type="button" onClick={() => onRemove(row.record.__id)} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700" aria-label={`移出对比 ${row.name}`} title="移出对比">
                <IconClose className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <button type="button" onClick={onClear} className="shrink-0 font-mono text-xs font-semibold text-zinc-400 hover:text-zinc-700 px-2">清空</button>
        <button
          type="button"
          onClick={onOpen}
          disabled={rows.length < 2}
          className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2 font-mono text-xs font-bold text-white shadow-2xs disabled:cursor-not-allowed disabled:opacity-30 hover:bg-zinc-800 transition-colors"
        >
          对比 {rows.length} 个站
        </button>
      </div>
    </aside>
  );
}

// ============= 模态对比面板 =============

export function ComparePanel({
  rows,
  modelQuery,
  provider,
  onClose,
}: {
  rows: RelaySiteRow[];
  modelQuery: string;
  provider: string;
  onClose: () => void;
}) {
  const columns = `120px repeat(${rows.length}, minmax(210px, 1fr))`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-900/40 p-0 sm:p-6 backdrop-blur-xs">
      <section role="dialog" aria-modal="true" aria-label="候选站对比" className="mx-auto flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-zinc-200/80 bg-white shadow-2xl overflow-hidden">
        <header className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-5 py-4">
          <div>
            <div className="font-mono text-xs font-semibold text-zinc-400 uppercase tracking-wider">候选站多维度对比</div>
            <h2 className="text-base font-bold text-zinc-900 mt-0.5">{modelQuery || provider || "站点核心参数横向对比"}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-colors" aria-label="关闭对比" title="关闭">
            <IconClose className="h-4 w-4" />
          </button>
        </header>

        <div className="overflow-auto">
          <div className="grid min-w-max divide-y divide-zinc-100" style={{ gridTemplateColumns: columns }}>
            <div className="bg-zinc-50/60 p-3.5 font-mono text-xs font-semibold text-zinc-400 uppercase tracking-wider border-r border-zinc-100">站点</div>
            {rows.map((row) => (
              <div key={row.record.__id} className="p-3.5 border-r border-zinc-100 last:border-r-0">
                <Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.record.__id)}`} className="text-sm font-bold text-zinc-900 hover:text-[#E03E1A] transition-colors">{row.name}</Link>
                <div className="mt-0.5 truncate font-mono text-xs text-zinc-400">{row.domain}</div>
              </div>
            ))}

            <CompareMetric label={modelQuery ? "目标模型" : provider ? "目标倍率" : "价格参考"} rows={rows} render={(row) => comparePrice(row, modelQuery, provider)} />
            <CompareMetric label="稳定性" rows={rows} render={comparePerformance} />
            <CompareMetric label="接入状态" rows={rows} render={compareAccess} />
            <CompareMetric label="数据覆盖" rows={rows} render={(row) => `${row.modelCount} 模型 · ${row.groupCount} 分组${row.perf ? " · 有实测" : " · 无实测"}`} />
            <CompareMetric label="最近检查" rows={rows} render={(row) => formatFreshness(row.lastChecked)} />
            {/* P3-1: 分组差异列 */}
            <CompareMetric label="分组差异" rows={rows} render={compareGroups} />

            <div className="bg-zinc-50/60 p-3.5 font-mono text-xs font-semibold text-zinc-400 uppercase tracking-wider border-r border-zinc-100">下一步</div>
            {rows.map((row) => (
              <div key={row.record.__id} className="flex flex-wrap gap-2 p-3.5 border-r border-zinc-100 last:border-r-0">
                <Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.record.__id)}`} className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 transition-colors">
                  查看详情 <IconArrowRight className="h-3 w-3" />
                </Link>
                {row.domain && (
                  <a href={domainHref(row.domain)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 shadow-2xs transition-colors">
                    访问站点 <IconExtLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// ============= 行/单元 =============

function CompareMetric({
  label,
  rows,
  render,
}: {
  label: string;
  rows: RelaySiteRow[];
  render: (row: RelaySiteRow) => string;
}) {
  return (
    <>
      <div className="bg-zinc-50/60 p-3.5 font-mono text-xs font-semibold text-zinc-500 border-r border-zinc-100">{label}</div>
      {rows.map((row) => (
        <div key={row.record.__id} className="p-3.5 text-xs leading-relaxed text-zinc-700 border-r border-zinc-100 last:border-r-0 whitespace-pre-line">{render(row)}</div>
      ))}
    </>
  );
}

// ============= 渲染函数 =============

function comparePrice(row: RelaySiteRow, modelQuery: string, provider: string): string {
  if (modelQuery) return row.matchedModelOffer ? `${row.matchedModelOffer.name} · ${modelOfferLabel(row.matchedModelOffer)}` : "无模型明细";
  if (provider) return `${provider} ${formatRate(row.selectedRate)}`;
  return `全站最低 ${formatRate(row.minRate)}（仅参考）`;
}

function comparePerformance(row: RelaySiteRow): string {
  if (!row.perf) return "暂无实测";
  const availability = toNumber(row.perf.availability_7d);
  const ttft = toNumber(row.perf.ttft_p50_ms);
  return `7 日 ${formatPercent(availability)} · TTFT ${formatDuration(ttft)}`;
}

function compareAccess(row: RelaySiteRow): string {
  const labels = [];
  if (row.access.registration === "open") labels.push("可注册");
  if (row.access.registration === "closed") labels.push("关闭注册");
  if (row.access.verification === "none") labels.push("免验证");
  if (row.access.verification === "email") labels.push("邮箱验证");
  if (row.access.monitor === "on") labels.push("监控中");
  if (row.access.monitor === "off") labels.push("未监控");
  return labels.join(" · ") || "状态未结构化";
}

/** P3-1: 分组差异 —— 只看"该站独有分组"（没在其他候选站出现过的分组） */
function compareGroups(row: RelaySiteRow): string {
  if (row.groups.length === 0) return "无分组明细";
  const myGroups = new Set(row.groups.map((g) => String(g.group_name ?? "")));
  // 注：当前调用上下文没有"其他候选站的分组集合"，所以这里用本地行的全部分组名称作为提示
  const list = row.groups
    .slice(0, 4)
    .map((g) => `${String(g.group_name ?? "?")} ${formatRate(toNumber(g.rate_min))}`)
    .join("\n");
  return `${row.groups.length} 分组\n${list}${row.groups.length > 4 ? `\n+${row.groups.length - 4}` : ""}`;
}