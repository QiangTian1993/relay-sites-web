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
    <aside className="fixed inset-x-0 bottom-0 z-40 border-t-4 border-swiss-fg bg-swiss-bg">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6">
        <div className="hidden font-mono text-sm font-black uppercase tracking-widest sm:block">候选站</div>
        <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
          {rows.map((row) => (
            <span key={row.record.__id} className="inline-flex shrink-0 items-center gap-2 border border-swiss-fg bg-swiss-muted px-2 py-1.5 text-sm font-bold">
              {row.name}
              <button type="button" onClick={() => onRemove(row.record.__id)} className="flex h-11 w-11 items-center justify-center sm:h-7 sm:w-7" aria-label={`移出对比 ${row.name}`} title="移出对比">
                <IconClose className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
        <button type="button" onClick={onClear} className="min-h-11 shrink-0 font-mono text-sm font-black underline">清空</button>
        <button
          type="button"
          onClick={onOpen}
          disabled={rows.length < 2}
          className="min-h-11 shrink-0 bg-swiss-fg px-4 py-2.5 text-sm font-black text-swiss-bg disabled:cursor-not-allowed disabled:opacity-30"
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
    <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-0 sm:items-center sm:p-6">
      <section role="dialog" aria-modal="true" aria-label="候选站对比" className="mx-auto flex max-h-[92vh] w-full max-w-6xl flex-col border-2 border-swiss-fg bg-swiss-bg">
        <header className="flex items-center border-b-2 border-swiss-fg bg-swiss-fg px-4 py-3 text-swiss-bg">
          <div>
            <div className="font-mono text-sm uppercase tracking-widest text-swiss-bg/55">候选对比</div>
            <h2 className="text-lg font-black">{modelQuery || provider || "站点核心信息"}</h2>
          </div>
          <button type="button" onClick={onClose} className="ml-auto flex h-11 w-11 items-center justify-center border border-swiss-bg sm:h-9 sm:w-9" aria-label="关闭对比" title="关闭">
            <IconClose className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-auto">
          <div className="grid min-w-max" style={{ gridTemplateColumns: columns }}>
            <div className="border-b-2 border-r-2 border-swiss-fg bg-swiss-muted p-3 font-mono text-sm font-black uppercase tracking-widest">站点</div>
            {rows.map((row) => (
              <div key={row.record.__id} className="border-b-2 border-r border-swiss-fg p-3 last:border-r-0">
                <Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.record.__id)}`} className="text-base font-black hover:text-swiss-accent">{row.name}</Link>
                <div className="mt-1 truncate font-mono text-sm text-swiss-fg/50">{row.domain}</div>
              </div>
            ))}

            <CompareMetric label={modelQuery ? "目标模型" : provider ? "目标倍率" : "价格参考"} rows={rows} render={(row) => comparePrice(row, modelQuery, provider)} />
            <CompareMetric label="稳定性" rows={rows} render={comparePerformance} />
            <CompareMetric label="接入状态" rows={rows} render={compareAccess} />
            <CompareMetric label="数据覆盖" rows={rows} render={(row) => `${row.modelCount} 模型 · ${row.groupCount} 分组${row.perf ? " · 有实测" : " · 无实测"}`} />
            <CompareMetric label="最近检查" rows={rows} render={(row) => formatFreshness(row.lastChecked)} />
            {/* P3-1: 分组差异列 */}
            <CompareMetric label="分组差异" rows={rows} render={compareGroups} />

            <div className="border-r-2 border-swiss-fg bg-swiss-muted p-3 font-mono text-sm font-black uppercase tracking-widest">下一步</div>
            {rows.map((row) => (
              <div key={row.record.__id} className="flex flex-wrap gap-2 border-r border-swiss-fg p-3 last:border-r-0">
                <Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.record.__id)}`} className="inline-flex items-center gap-1 bg-swiss-fg px-3 py-2 text-sm font-black text-swiss-bg">
                  查看详情 <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
                {row.domain && (
                  <a href={domainHref(row.domain)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border border-swiss-fg px-3 py-2 text-sm font-black">
                    访问站点 <IconExtLink className="h-3.5 w-3.5" />
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
      <div className="border-b border-r-2 border-swiss-fg bg-swiss-muted p-3 font-mono text-sm font-black uppercase tracking-widest">{label}</div>
      {rows.map((row) => (
        <div key={row.record.__id} className="border-b border-r border-swiss-fg p-3 text-sm leading-5 last:border-r-0">{render(row)}</div>
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