// 列表行 + 行内徽章 + 小信号徽章

"use client";

import Link from "next/link";
import { formatRate, getRateForProvider, rateTier } from "@/lib/matrix";
import { toNumber, truncate } from "@/lib/record-utils";
import { modelOfferLabel, modelOfferSortValue } from "@/lib/relay-product";
import {
  ChangeBadge,
  RiskBadge,
  FreshnessBadge,
  detectChangeDirection,
  detectRisk,
  detectFreshness,
} from "../badges";
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleAlert,
  IconCircleCheck,
  IconCircleDot,
  IconClose,
  IconExtLink,
  IconPlus,
} from "../icons";
import {
  domainHref,
  domainDisplay,
  formatDuration,
  formatFreshness,
  formatPercent,
  getListNote,
  type RelaySiteRow,
} from "./types";

// ============= 列表行 =============

export function RelaySiteListRow({
  row,
  selectedProvider,
  modelQuery,
  selected,
  compareDisabled,
  onToggleCompare,
}: {
  row: RelaySiteRow;
  selectedProvider: string;
  modelQuery: string;
  selected: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
}) {
  const providerRates = row.providers.map((provider) => ({
    provider,
    rate: getRateForProvider(row.record["分组倍率"], provider),
  }));
  const successRate = toNumber(row.perf?.success_rate);
  const availability = toNumber(row.perf?.availability_7d);
  const ttft = toNumber(row.perf?.ttft_p50_ms);
  const measuredOk = row.perf && (successRate == null || successRate >= 0.9);
  const modelOffer = modelQuery ? row.matchedModelOffer : null;
  const rate = modelOffer ? modelOfferSortValue(modelOffer) : selectedProvider ? row.selectedRate : row.minRate;
  const rateStyle = rateTier(rate);
  const listNote = getListNote(row.note);
  const primaryValue = modelOffer?.type === "image"
    ? modelOffer.perCallPrice == null ? "--" : `¥${modelOffer.perCallPrice}`
    : formatRate(rate);
  const primaryLabel = modelOffer
    ? modelOffer.type === "image" ? "按次价格" : "输入倍率"
    : selectedProvider || "全站最低";

  return (
    <article className={`grid grid-cols-1 gap-4 px-4 py-3.5 transition-colors hover:bg-zinc-50/60 lg:grid-cols-[minmax(220px,1.35fr)_minmax(230px,1.35fr)_minmax(170px,1fr)_minmax(190px,1fr)_105px_42px] lg:items-center lg:gap-0 ${selected ? "bg-amber-50/30" : ""}`}>
      <div className="min-w-0 lg:pr-5">
        <Link href={`/table/relay_sites_tracker/${encodeURIComponent(row.record.__id)}`} className="block truncate text-base font-bold leading-tight text-zinc-900 hover:text-[#E03E1A] transition-colors">{row.name}</Link>
        {row.domain && (
          <a href={domainHref(row.domain)} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex max-w-full items-center gap-1 font-mono text-xs text-zinc-400 hover:text-zinc-700">
            <span className="truncate">{domainDisplay(row.domain)}</span><IconExtLink className="h-3 w-3 shrink-0" />
          </a>
        )}
        <SiteBadges row={row} />
      </div>

      <div className="min-w-0 lg:border-l lg:border-zinc-200/60 lg:px-5">
        <div className="mb-1.5 flex items-end gap-2">
          <span className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-base font-bold text-zinc-900 shadow-2xs">{primaryValue}</span>
          <span className="pb-0.5 font-mono text-xs uppercase tracking-wider text-zinc-400">{primaryLabel}</span>
        </div>
        {modelOffer ? (
          <div className="min-w-0">
            <div className="truncate font-mono text-xs font-bold text-zinc-900" title={modelOffer.name}>{modelOffer.name}</div>
            <div className="mt-0.5 font-mono text-xs text-zinc-400">{modelOfferLabel(modelOffer)}</div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {providerRates.slice(0, 4).map((item) => (
              <span key={item.provider} className={`rounded-md border px-1.5 py-0.5 font-mono text-xs ${item.provider === selectedProvider ? "border-zinc-900 bg-zinc-900 text-white font-bold" : "border-zinc-200 bg-white text-zinc-700"}`}>
                {item.provider} {formatRate(item.rate)}
              </span>
            ))}
            {providerRates.length > 4 && <span className="rounded-md border border-zinc-200 px-1.5 py-0.5 font-mono text-xs text-zinc-400">+{providerRates.length - 4}</span>}
          </div>
        )}
      </div>

      <div className="lg:border-l lg:border-zinc-200/60 lg:px-5">
        {row.perf ? (
          <>
            <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500" title="数据来自第三方实测，仅供参考">
              <IconCircleDot className="h-3.5 w-3.5 text-zinc-400" />
              实测 {formatPercent(successRate, true)} <span className="text-[10px] text-zinc-400">(参考)</span>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2 font-mono text-xs text-zinc-400">
              <span>7D <b className="font-semibold text-zinc-700">{formatPercent(availability)}</b></span>
              <span>TTFT <b className="font-semibold text-zinc-700">{formatDuration(ttft)}</b></span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-400"><IconCircleDot className="h-3.5 w-3.5" />无探针数据</div>
        )}
      </div>

      <div className="lg:border-l lg:border-zinc-200/60 lg:px-5">
        <div className="flex flex-wrap gap-1">
          {row.access.registration === "open" && <Signal label="可注册" tone="success" />}
          {row.access.registration === "closed" && <Signal label="关闭注册" tone="warning" />}
          {row.access.verification === "none" && <Signal label="免验证" tone="info" />}
          {row.access.verification === "email" && <Signal label="邮箱验证" />}
          {row.access.monitor === "on" && <Signal label="监控中" tone="success" />}
          {row.access.monitor === "off" && <Signal label="未监控" tone="warning" />}
          {row.access.registration === "unknown" && row.access.verification === "unknown" && row.access.monitor === "unknown" && <Signal label="未结构化" />}
        </div>
        <div className="mt-1.5 font-mono text-xs text-zinc-400">
          {row.framework || "未知框架"}{row.groupCount > 0 ? ` · ${row.groupCount} 分组` : ""}{row.modelCount > 0 ? ` · ${row.modelCount} 模型` : ""}
        </div>
      </div>

      <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 lg:block lg:border-l lg:border-zinc-200/60 lg:px-4">
        <FreshnessIcon timestamp={row.lastCheckedMs} />
        <span title={row.lastChecked} className="ml-1">{formatFreshness(row.lastChecked)}</span>
      </div>

      <button
        type="button"
        onClick={onToggleCompare}
        disabled={compareDisabled}
        className={`flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 font-mono text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-20 lg:h-7 lg:w-7 lg:p-0 ${selected ? "border-zinc-900 bg-zinc-900 text-white shadow-2xs" : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"}`}
        aria-label={selected ? `移出对比 ${row.name}` : `加入对比 ${row.name}`}
        title={selected ? "移出对比" : compareDisabled ? "最多对比 4 个站" : "加入对比"}
      >
        {selected ? <IconCheck className="h-3.5 w-3.5" /> : <IconPlus className="h-3.5 w-3.5" />}
        <span className="lg:hidden">{selected ? "已加入对比" : "加入对比"}</span>
      </button>
    </article>
  );
}

// ============= 行内徽章组 =============

export function SiteBadges({ row }: { row: RelaySiteRow }) {
  const change = detectChangeDirection(row.groups as Array<{ change_direction?: unknown; change_delta?: unknown }>);
  const risk = detectRisk(row.perf);
  const changeEl = <ChangeBadge direction={change.direction} delta={change.delta} compact />;
  const riskEl = <RiskBadge level={risk} compact />;

  const noteText = String(row.record["备注"] || "").toLowerCase();
  const hasInvoice = noteText.includes("开票");
  const hasRefund = noteText.includes("退款");
  const isPurePro = noteText.includes("纯血") || noteText.includes("官网") || noteText.includes("pro池");

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {changeEl}
      {riskEl}
      <Link
        href={`/detector?siteId=${encodeURIComponent(row.siteId || row.record.__id)}`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100"
        title="前往质检中心对该站点进行真伪与混用检测"
      >
        <span>⚡ 质检</span>
      </Link>
      {hasInvoice && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-medium text-blue-700">可开发票</span>}
      {hasRefund && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-700">退款保障</span>}
      {isPurePro && <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 font-mono text-[10px] font-medium text-purple-700">官网纯血Pro</span>}
    </div>
  );
}

// ============= 小信号徽章 =============

export function Signal({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warning" | "info" }) {
  const classes = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : tone === "warning"
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : tone === "info"
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-zinc-200 bg-zinc-50 text-zinc-600";
  return <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] font-medium ${classes}`}>{label}</span>;
}

export function FreshnessIcon({ timestamp }: { timestamp: number | null }) {
  if (timestamp == null) return <IconCircleDot className="h-3.5 w-3.5 text-zinc-400" />;
  const days = (Date.now() - timestamp) / 86_400_000;
  return days <= 7 ? <IconCircleCheck className="h-3.5 w-3.5 text-emerald-600" /> : <IconAlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
}