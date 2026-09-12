"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Calculator,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Flame,
  Gauge,
  Layers,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from "lucide-react";
import type {
  ModelFamilyGroup,
  PriceDistributionStats,
  PriceFormulaBreakdown,
  PriceTierInfo,
  RelayV1Data,
  RelayV1Group,
  RelayV1Offer,
  RelayV1Site,
  RiskLevel,
  SiteFeatureTags,
} from "@/lib/relay-v1";
import {
  aggregateModelFamilies,
  assignPriceTier,
  buildInferredBenchmarks,
  computePriceDistributionStats,
  extractSiteTags,
  resolveOfferFormula,
} from "@/lib/relay-v1";
import type { QCRecord } from "@/lib/qc-store";
import { RelaySubNav } from "./relay-sub-nav";
import { RelayCostEstimator } from "./relay-cost-estimator";
import { RelayScenarioTabs, ScenarioPreset } from "./relay-scenario-tabs";

type SortKey = "price" | "availability" | "speed" | "name";
type RiskFilter = "all" | "safe" | "warning";

interface RelayV1ExplorerProps {
  data: RelayV1Data;
  qcRecords?: QCRecord[];
}

interface ComparisonRow {
  site: RelayV1Site;
  offer: RelayV1Offer;
  formula: PriceFormulaBreakdown;
  priceValue: number | null;
  rank: number;
  totalSites: number;
  percentileText: string;
  tierInfo: PriceTierInfo;
  relevantGroups: RelayV1Group[];
  riskLevel: RiskLevel;
  riskRemarks: RelayV1Group[];
  changedGroups: RelayV1Group[];
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

// ============================================================================
// 子组件 01：全网价格分布与分位数刻度标尺 (PriceDistributionRuler)
// ============================================================================

function PriceDistributionRuler({
  stats,
  isImage,
}: {
  stats: PriceDistributionStats;
  isImage: boolean;
}) {
  if (stats.count < 2 || stats.max <= stats.min) return null;

  const span = stats.max - stats.min;
  const p20Pos = Math.max(10, Math.min(30, ((stats.p20 - stats.min) / span) * 100));
  const p50Pos = Math.max(p20Pos + 10, Math.min(70, ((stats.p50 - stats.min) / span) * 100));
  const p70Pos = Math.max(p50Pos + 10, Math.min(88, ((stats.p70 - stats.min) / span) * 100));

  const formatVal = (v: number) => (isImage ? `¥${v.toFixed(3)}` : `${v.toFixed(4).replace(/\.?0+$/, "")}×`);

  return (
    <div className="mb-6 rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
      {/* 标头 */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200/80 bg-zinc-50/80 px-4 py-3 font-mono text-xs">
        <div className="flex items-center gap-2 font-semibold text-zinc-800">
          <span className="h-2 w-2 rounded-full bg-[#E03E1A]" />
          <span>全网价格分布刻度标尺 · Market Price Spectrum</span>
        </div>
        <div className="text-[11px] text-zinc-500 font-medium">
          {stats.count} 站有效报价 · 20% / 70% 动态分位数
        </div>
      </div>

      {/* 刻度尺可视化条 */}
      <div className="p-4 sm:p-5 bg-white">
        {/* 顶部标签 */}
        <div className="mb-2.5 flex items-center justify-between font-mono text-xs text-zinc-600">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#E03E1A]">★ 全网最低</span>
            <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-white font-mono font-bold text-xs">
              {formatVal(stats.min)}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-zinc-600">
            <span>◆ P50 中位数:</span>
            <span className="font-bold text-zinc-900">{formatVal(stats.p50)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <span>▲ 全网最高:</span>
            <span className="font-semibold text-zinc-700">{formatVal(stats.max)}</span>
          </div>
        </div>

        {/* 连续价格轴刻度线 */}
        <div className="relative h-7 rounded-lg border border-zinc-200 bg-zinc-100 flex overflow-hidden">
          {/* T1 区间 */}
          <div
            className="relative h-full bg-zinc-900 text-white flex items-center px-2 font-mono text-[10px] font-semibold tracking-wide transition-all"
            style={{ width: `${p20Pos}%` }}
            title={`T1 极限低价档: ≤ ${formatVal(stats.p20)}`}
          >
            <span className="truncate">T1 极限低价</span>
            <span className="absolute right-0 top-0 bottom-0 w-0.5 bg-[#E03E1A]" />
          </div>

          {/* T2 区间 */}
          <div
            className="relative h-full bg-zinc-100 text-zinc-800 flex items-center px-2 font-mono text-[10px] font-medium tracking-wide transition-all"
            style={{ width: `${p70Pos - p20Pos}%` }}
            title={`T2 稳健主流档: ${formatVal(stats.p20)} ~ ${formatVal(stats.p70)}`}
          >
            <span className="truncate">T2 稳健主流区间</span>
            {/* P50 中位数打点 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-zinc-400 flex items-center justify-center"
              style={{ left: `${((p50Pos - p20Pos) / (p70Pos - p20Pos)) * 100}%` }}
              title={`P50 中位数: ${formatVal(stats.p50)}`}
            >
              <div className="h-2 w-2 rotate-45 bg-zinc-900 -mt-4 rounded-xs" />
            </div>
            <span className="absolute right-0 top-0 bottom-0 w-0.5 bg-zinc-300" />
          </div>

          {/* T3 区间 */}
          <div
            className="relative h-full bg-zinc-200/70 text-zinc-500 flex items-center px-2 font-mono text-[10px] font-medium tracking-wide transition-all"
            style={{ width: `${100 - p70Pos}%` }}
            title={`T3 官号高溢档: > ${formatVal(stats.p70)}`}
          >
            <span className="truncate">T3 官号/高溢</span>
          </div>
        </div>

        {/* 底部梯队区间说明 */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-xs">
          <div className="rounded-xl border border-zinc-900 bg-zinc-900 p-3 text-white shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-zinc-300">
              <span>T1 · 极限性价比 (Top 20%)</span>
              <span className="text-[#FF6B4A] font-semibold">● 推荐</span>
            </div>
            <div className="mt-1 font-bold text-sm text-white">
              {formatVal(stats.min)} ~ {formatVal(stats.p20)}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 text-zinc-800">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>T2 · 稳健主力档 (20%~70%)</span>
              <span className="font-medium text-zinc-700">主力站群</span>
            </div>
            <div className="mt-1 font-bold text-sm text-zinc-900">
              {formatVal(stats.p20)} ~ {formatVal(stats.p70)}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200/60 bg-zinc-50/40 p-3 text-zinc-600">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>T3 · 官号高溢档 (Top 30%)</span>
              <span>高 SLA / 溢价</span>
            </div>
            <div className="mt-1 font-bold text-sm text-zinc-700">
              &gt; {formatVal(stats.p70)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 子组件 02：模型家族横向联动矩阵 (ModelFamilyMatrixBar) - 移动端横滑/桌面端网格
// ============================================================================

function ModelFamilyMatrixBar({
  family,
  selectedModel,
  onSelectModel,
}: {
  family: ModelFamilyGroup;
  selectedModel: string;
  onSelectModel: (name: string) => void;
}) {
  if (!family || family.subModels.length <= 1) return null;

  return (
    <div className="mb-6 rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden">
      {/* 矩阵标头 */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-200/80 bg-zinc-50/80 px-4 py-3 text-zinc-800">
        <div className="flex items-center gap-2.5 font-mono text-xs font-semibold">
          <span className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E03E1A] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E03E1A]" />
          </span>
          <span className="text-zinc-900 font-bold">{family.familyName}</span>
          <span className="text-zinc-300 font-normal">/</span>
          <span className="text-zinc-500 text-xs tracking-normal font-sans font-normal">核心变体横向对比矩阵</span>
        </div>
        <div className="font-mono text-xs text-zinc-500">
          全系收录 <strong className="text-zinc-900 font-bold">{family.totalSitesCovered}</strong> 站 · 点击下方卡片快速切换
        </div>
      </div>

      {/* 变体卡片：移动端横滑，桌面端 4 列等宽网格 */}
      <div className="flex sm:grid sm:grid-cols-4 overflow-x-auto sm:overflow-visible snap-x divide-x divide-zinc-200/80 bg-zinc-50/30">
        {family.subModels.map((variant, idx) => {
          const isActive = variant.modelName.toLowerCase() === selectedModel.toLowerCase();
          const codeName = `SPEC-0${idx + 1}`;

          return (
            <button
              key={variant.modelName}
              type="button"
              onClick={() => onSelectModel(variant.modelName)}
              className={`group relative flex min-w-[260px] sm:min-w-0 snap-start flex-col justify-between p-4 text-left transition-all duration-150 ${
                isActive
                  ? "bg-white ring-2 ring-inset ring-zinc-900 z-10 shadow-xs"
                  : "bg-white/60 hover:bg-white hover:shadow-xs"
              }`}
            >
              {/* 顶部标签 */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-zinc-800">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 transition-transform group-hover:scale-125 ${
                        isActive ? "bg-[#E03E1A]" : "bg-zinc-300 group-hover:bg-zinc-500"
                      }`}
                    />
                    <span>{variant.shortLabel}</span>
                  </div>
                  {isActive ? (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-zinc-400">
                      {codeName} · {variant.siteCount} 站
                    </span>
                  )}
                </div>

                <div className="mt-2 font-mono text-sm font-bold text-zinc-900 truncate" title={variant.modelName}>
                  {variant.modelName}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500 leading-tight">
                  {variant.tagline}
                </div>
              </div>

              {/* 底部价格与站点 */}
              <div className="mt-4 border-t border-zinc-100 pt-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] text-zinc-400">
                    全网最低折算价
                  </span>
                  <span className="font-mono text-xl font-bold text-zinc-900 tracking-tight">
                    {variant.lowestPrice != null ? (
                      <>
                        {variant.lowestPrice.toFixed(4).replace(/\.?0+$/, "")}
                        <span className="text-xs font-normal text-zinc-400 ml-0.5">×</span>
                      </>
                    ) : (
                      "--"
                    )}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                  <span className="truncate max-w-[130px] font-medium text-zinc-700" title={variant.lowestPriceSite?.name || ""}>
                    {variant.lowestPriceSite?.name ? `由 ${variant.lowestPriceSite.name}` : "暂无报价"}
                  </span>
                  <span className="text-zinc-400">
                    P50 {variant.avgP50 ? `${Math.round(variant.avgP50)}ms` : "--"}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 子组件 03：排位标尺与价格梯队徽章 (RankTierBadge)
// ============================================================================

function RankTierBadge({ row }: { row: ComparisonRow }) {
  const isT1 = row.tierInfo.tier === "T1";
  const isT3 = row.tierInfo.tier === "T3";
  const isSuspect = row.formula.suspectedPointsScale;

  return (
    <div className="flex flex-col gap-1 shrink-0 font-mono">
      {/* 绝对名次与梯队徽章 */}
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold tracking-tight text-zinc-900">
          {isSuspect ? "——" : `#${String(row.rank).padStart(2, "0")}`}
        </span>
        {isSuspect ? (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
            title="报价 ≥ 基准 10×，疑似积分制等异构计价口径，未换算不参与价格梯队"
          >
            ⚠ 口径存疑
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              isT1
                ? "bg-zinc-900 text-white shadow-2xs"
                : isT3
                ? "border border-zinc-200/60 bg-zinc-100/70 text-zinc-400"
                : "border border-zinc-200 bg-zinc-50 text-zinc-700"
            }`}
            title={row.tierInfo.description}
          >
            <span className={isT1 ? "text-[#FF6B4A]" : ""}>■</span>
            {row.tierInfo.tier} {row.tierInfo.label}
          </span>
        )}
      </div>

      {/* 相对排位百分位 */}
      <div className="text-[10px] text-zinc-400 tracking-tight">
        {isSuspect ? (
          <span className="text-amber-700">未参与排名 · 计价口径异常</span>
        ) : (
          <>
            {row.percentileText} <span className="text-zinc-300">/</span> 共 {row.totalSites} 站
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 子组件 04：计费公式拆解药丸 (PriceFormulaBreakdownPill)
// ============================================================================

function PriceFormulaBreakdownPill({
  row,
  isBest,
}: {
  row: ComparisonRow;
  isBest: boolean;
}) {
  const formula = row.formula;
  const isImage = row.offer.modelType === "image";
  const isNonDefaultGroup =
    formula.hasGroupDiscount &&
    formula.groupName.toLowerCase() !== "default" &&
    formula.groupName !== "标准基准" &&
    formula.pricingArchetype !== "flat_rate";

  const discountZhe = formula.effectivePrice != null
    ? (formula.effectivePrice * 10).toFixed(1).replace(/\.0$/, "") + "折"
    : "";

  if (isImage) {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <strong className="font-mono text-2xl font-bold tracking-tight text-zinc-900">
            {formula.effectivePrice == null ? "--" : `¥${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 }).format(formula.effectivePrice)}`}
          </strong>
          <span className="font-mono text-xs text-zinc-400">/ 次</span>
          {isBest && (
            <span className="rounded-full bg-[#E03E1A] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white shadow-2xs">
              LOWEST
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* 1. 主折扣与绝对价格（大字，第一视觉焦点） */}
      <div className="flex flex-wrap items-baseline gap-2">
        <strong className="font-mono text-2xl font-bold tracking-tight text-zinc-900">
          {formatMultiplier(formula.effectivePrice)}
        </strong>
        <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5">
          {discountZhe}
        </span>
        {isBest && (
          <span className="rounded-full bg-[#E03E1A] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white shadow-2xs">
            LOWEST
          </span>
        )}
      </div>

      {/* 2. 人民币成本估算 + 极简操作指引 */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
        {formula.estimatedRmbPer1MTokens != null && (
          <span className="text-zinc-600 font-medium">
            约 ¥{formula.estimatedRmbPer1MTokens.toFixed(2)} / 1M Tokens
          </span>
        )}

        {/* 仅在需要切换特定分组时提示，其余默认可用 */}
        {isNonDefaultGroup ? (
          <span
            className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900"
            title="请在站点控制台切换至该分组以享受此倍率"
          >
            <span>☞ 选分组: <strong className="underline text-amber-950">{formula.groupName}</strong></span>
          </span>
        ) : (
          <span className="text-[10px] text-zinc-400">
            · 默认可用
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 子组件 05：智能选型决策微标签 (SmartDecisionHighlightTags)
// ============================================================================

function SmartDecisionHighlightTags({
  isLowestPrice,
  ttftMs,
  availability7d,
  qcScore,
  riskLevel,
  siteTags,
}: {
  isLowestPrice: boolean;
  ttftMs: number | null;
  availability7d: number | null;
  qcScore: number | null;
  riskLevel: RiskLevel;
  siteTags: SiteFeatureTags;
}) {
  const isLowSla = availability7d != null && availability7d < 90;
  const isHighRisk = riskLevel === "high";

  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
      {isLowestPrice && (
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2 py-0.5 font-medium text-white shadow-2xs">
          <span className="text-[#FF6B4A]">★</span> 全网最低价
        </span>
      )}

      {/* 防坑熔断与高风险提示 */}
      {isHighRisk && (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-medium text-amber-900">
          <AlertTriangle className="h-3 w-3 text-amber-600" /> 存在拉闸/限制声明
        </span>
      )}

      {isLowSla && (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-700">
          ⚠️ 7D可用率低于90%
        </span>
      )}

      {ttftMs != null && ttftMs < 900 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
          <span>⚡</span> 极速 {Math.round(ttftMs)}ms
        </span>
      )}

      {availability7d != null && availability7d >= 99.0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          {availability7d.toFixed(1)}% 稳线
        </span>
      )}

      {qcScore != null && (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${
            qcScore >= 90
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-zinc-200 bg-zinc-100 text-zinc-600"
          }`}
        >
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          质检 {qcScore >= 95 ? "S级" : qcScore >= 85 ? "A级" : ""}{qcScore}分
        </span>
      )}

      {siteTags.isPurePro && (
        <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 font-medium text-purple-700">
          💎 纯血Pro
        </span>
      )}
      {siteTags.hasInvoice && (
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-medium text-zinc-600">
          可开票
        </span>
      )}
      {siteTags.noVerify && (
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-medium text-zinc-600">
          免验证
        </span>
      )}
    </div>
  );
}

function AvailabilityCell({ site }: { site: RelayV1Site }) {
  const value = site.performance?.availability7d ?? null;
  const width = value == null ? 0 : Math.max(0, Math.min(100, value));
  const ttft = site.performance?.ttftP50Ms ?? null;

  return (
    <div className="min-w-[140px] font-mono space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <strong className="text-sm font-bold text-zinc-900">
          {formatPercent(value)}
        </strong>
        <span className="text-[10px] text-zinc-400">
          7D 可用率
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${value != null && value >= 99 ? "bg-emerald-500" : "bg-zinc-800"}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-0.5">
        <span>TTFT {formatMs(ttft)}</span>
        <span>{site.performance ? `${site.performance.consecutiveFailures} 连败` : "未测"}</span>
      </div>
    </div>
  );
}

function ChangeAndRisk({ row }: { row: ComparisonRow }) {
  const change = row.changedGroups[0];
  if (!change) {
    return (
      <div className="font-mono text-xs text-zinc-400 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-300 inline-block" />
        <span>价格平稳</span>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${change.changeDirection === "up" ? "border border-amber-200 bg-amber-50 text-amber-800" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
        {change.changeDirection === "up" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        {change.changeDirection === "up" ? "+" : ""}{formatMultiplier(change.changeDelta)}
      </div>
    </div>
  );
}

function DetailPanel({ row, selectedModel }: { row: ComparisonRow; selectedModel: string }) {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1800);
    }
  };

  const domainUrl = row.site.domain
    ? (/^https?:\/\//i.test(row.site.domain) ? row.site.domain : `https://${row.site.domain}`)
    : "";

  return (
    <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 sm:p-6">
      <div className="grid gap-5 xl:grid-cols-2">
        {/* 01 计费公式拆解与一键复制 */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <span className="font-mono text-xs font-bold text-zinc-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#E03E1A]" />
              01 · 生效计费公式与调用配置
            </span>
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-700">
              {row.formula.groupName} ({row.formula.groupRate}×)
            </span>
          </div>

          <div className="mt-3.5 space-y-2 font-mono text-xs">
            <div className="flex justify-between border-b border-zinc-100 pb-1.5">
              <span className="text-zinc-500">站点标定基准 (Site Base Rate)</span>
              <span className="font-semibold text-zinc-800">{row.formula.basePrice}×</span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-1.5">
              <span className="text-zinc-500">命中最优分组 (Matched Group)</span>
              <span className="font-bold text-[#E03E1A]">{row.formula.groupName} ({row.formula.groupRate}×)</span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-1.5">
              <span className="text-zinc-500">官方标准输入基准 (Official Base)</span>
              <span className="font-semibold text-zinc-800">{row.formula.officialBenchmarkBase}×</span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-1.5">
              <span className="text-zinc-500">计费模式定位 (Archetype)</span>
              <span className="font-medium text-zinc-800">{row.formula.archetypeLabel}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-1.5">
              <span className="text-zinc-500">归一化真实到手折扣 (Normalized Ratio)</span>
              <span className="font-bold text-base text-zinc-900">{row.formula.effectivePrice.toFixed(4).replace(/\.?0+$/, "")}×</span>
            </div>
            {row.formula.estimatedRmbPer1MTokens != null && (
              <div className="flex justify-between border-b border-zinc-100 pb-1.5">
                <span className="text-zinc-500">折合人民币估算单价 (CNY Estimate)</span>
                <span className="font-bold text-sm text-emerald-700">¥{row.formula.estimatedRmbPer1MTokens.toFixed(2)} / 1M Tokens</span>
              </div>
            )}

            {/* 一键复制快捷动作 */}
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => copyToClipboard(row.formula.groupName, "group")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs transition-colors"
              >
                <Copy className="h-3 w-3" />
                {copiedType === "group" ? "✓ 已复制分组名" : `复制分组名 [${row.formula.groupName}]`}
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(selectedModel, "model")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs transition-colors"
              >
                <Copy className="h-3 w-3" />
                {copiedType === "model" ? "✓ 已复制模型ID" : `复制模型ID [${selectedModel}]`}
              </button>

              {domainUrl && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(`${domainUrl}/v1`, "baseurl")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 shadow-2xs transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  {copiedType === "baseurl" ? "✓ 已复制 BaseURL" : "复制 BaseURL (/v1)"}
                </button>
              )}
            </div>

            <div className="mt-3 text-xs text-amber-900 bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
              👉 <strong>配置指引</strong>：在向 <strong>{row.site.domain || row.site.name}</strong> 请求 <code>{selectedModel}</code> 时，请在后台指定分组为 <code>{row.formula.groupName}</code>，享受 <strong>{row.formula.effectivePrice.toFixed(4).replace(/\.?0+$/, "")}×</strong> 的优惠费率。
            </div>
          </div>
        </div>

        {/* 02 网络延迟与探针数据 */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <span className="font-mono text-xs font-bold text-zinc-900 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-zinc-800" />
              02 · 网络延迟与可用率实测档案
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              {row.site.performance?.lastProbeAt ? `打点于 ${row.site.performance.lastProbeAt}` : "无实测打点"}
            </span>
          </div>
          <div className="mt-3.5 grid grid-cols-3 gap-2.5 text-center font-mono">
            <div className="rounded-xl border border-zinc-200/80 p-2.5 bg-zinc-50/50">
              <div className="text-[10px] text-zinc-400">TTFT 首字延迟</div>
              <div className="mt-1 text-base font-bold text-zinc-900">{formatMs(row.site.performance?.ttftP50Ms ?? null)}</div>
            </div>
            <div className="rounded-xl border border-zinc-200/80 p-2.5 bg-zinc-50/50">
              <div className="text-[10px] text-zinc-400">P95 峰值延迟</div>
              <div className="mt-1 text-base font-bold text-zinc-900">{formatMs(row.site.performance?.latencyP95Ms ?? null)}</div>
            </div>
            <div className="rounded-xl border border-zinc-200/80 p-2.5 bg-zinc-50/50">
              <div className="text-[10px] text-zinc-400">7日成功率</div>
              <div className="mt-1 text-base font-bold text-emerald-700">{formatPercent(row.site.performance?.successRate ?? null, true)}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
            <span className="font-mono text-xs text-zinc-400">包含 165+ 站底表全量分组与支持特性</span>
            <Link
              href={`/table/relay_sites_tracker/${encodeURIComponent(row.site.id)}`}
              className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-zinc-800 hover:text-[#E03E1A]"
            >
              查看【{row.site.name}】站点全量档案 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 主组件：RelayV1Explorer
// ============================================================================

export function RelayV1Explorer({ data, qcRecords = [] }: RelayV1ExplorerProps) {
  const [selectedModel, setSelectedModel] = useState<string>(data.defaultModel);
  const [siteQuery, setSiteQuery] = useState("");
  const [minimumAvailability, setMinimumAvailability] = useState<number>(0);
  const [measuredOnly, setMeasuredOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [presetFilter, setPresetFilter] = useState<ScenarioPreset>("all");
  const [showEstimator, setShowEstimator] = useState(true); // 月度算账器默认展示
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // 快捷键聚焦搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 质检记录映射
  const qcBySiteId = useMemo(() => {
    const map = new Map<string, QCRecord>();
    for (const record of qcRecords) {
      if (record.siteId) map.set(record.siteId, record);
      if (record.domain) map.set(record.domain.toLowerCase(), record);
    }
    return map;
  }, [qcRecords]);

  // 官方基准表未收录模型的兜底锚点（跨站点众数推断）
  const inferredBenchmarks = useMemo(() => buildInferredBenchmarks(data.sites), [data.sites]);

  // 模型家族聚合
  const modelFamilies = useMemo(() => {
    return aggregateModelFamilies(data.sites, undefined, inferredBenchmarks);
  }, [data.sites, inferredBenchmarks]);

  const currentFamily = useMemo(() => {
    return modelFamilies.find((f) => f.subModels.some((m) => m.modelName.toLowerCase() === selectedModel.toLowerCase())) || null;
  }, [modelFamilies, selectedModel]);

  // 热门快捷模型
  const hotModels = useMemo(() => {
    return [
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.4",
      "claude-3-5-sonnet-20241022",
      "deepseek-r1",
      "gemini-2.0-flash",
    ].filter((name) => data.models.some((m) => m.name === name));
  }, [data.models]);

  const groupedModels = useMemo(() => {
    const query = modelSearchQuery.trim().toLowerCase();
    const filtered = data.models.filter((m) => !query || m.name.toLowerCase().includes(query));

    const groups: { vendor: string; models: typeof data.models }[] = [
      { vendor: "OpenAI / ChatGPT", models: [] },
      { vendor: "Anthropic / Claude", models: [] },
      { vendor: "DeepSeek / 深度求索", models: [] },
      { vendor: "Google / Gemini", models: [] },
      { vendor: "Other Models", models: [] },
    ];

    for (const model of filtered) {
      const name = model.name.toLowerCase();
      if (/^(gpt|o[1-4]|codex|chatgpt|text-davinci)/i.test(name)) {
        groups[0].models.push(model);
      } else if (/^claude/i.test(name)) {
        groups[1].models.push(model);
      } else if (/^deepseek/i.test(name)) {
        groups[2].models.push(model);
      } else if (/^gemini/i.test(name)) {
        groups[3].models.push(model);
      } else {
        groups[4].models.push(model);
      }
    }

    return groups.filter((g) => g.models.length > 0);
  }, [data.models, modelSearchQuery]);

  // 关闭下拉菜单点击外部
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 核心对比计算流水线
  const { rows, unmatchedSites, stats, lowestPrice, priceSpread } = useMemo(() => {
    const normalizedModel = selectedModel.toLowerCase();
    const query = siteQuery.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

    const matchedList: Array<{
      site: RelayV1Site;
      offer: RelayV1Offer;
      formula: PriceFormulaBreakdown;
      priceValue: number | null;
      relevantGroups: RelayV1Group[];
      riskLevel: RiskLevel;
      riskRemarks: RelayV1Group[];
      changedGroups: RelayV1Group[];
    }> = [];

    const unmatched: RelayV1Site[] = [];

    for (const site of data.sites) {
      const offer = site.offers.find((o) => o.modelName.toLowerCase() === normalizedModel);
      if (!offer) {
        unmatched.push(site);
        continue;
      }

      const formula = resolveOfferFormula(offer, site.groups, inferredBenchmarks);
      // 积分制等异构口径不参与统一价格排名与梯队分布
      const priceValue = formula.effectivePrice > 0 && !formula.suspectedPointsScale ? formula.effectivePrice : null;

      // 场景预设过滤（修复 verified 预设分支）
      if (presetFilter === "coding") {
        const isCoding =
          site.groups.some((g) => /claude|kiro|max|code|codex/i.test(g.name + (g.remark || ""))) ||
          /claude|cursor|codex/i.test(site.note) ||
          site.providers.some((p) => /claude/i.test(p));
        if (!isCoding) continue;
      } else if (presetFilter === "low_cost") {
        const isLow = (site.minimumRate != null && site.minimumRate <= 0.1) || (priceValue != null && priceValue <= 0.1);
        if (!isLow) continue;
      } else if (presetFilter === "verified") {
        const siteTags = extractSiteTags(site);
        const isVerified = siteTags.hasInvoice || siteTags.noVerify || siteTags.hasRefund;
        if (!isVerified) continue;
      }

      // 搜索过滤
      const searchTarget = `${site.id} ${site.name} ${site.domain} ${site.providers.join(" ")}`.toLowerCase();
      if (query && !searchTarget.includes(query)) continue;

      // 可用率与实测过滤
      const availability = site.performance?.availability7d ?? null;
      if (measuredOnly && !site.performance) continue;
      if (minimumAvailability > 0 && (availability == null || availability < minimumAvailability)) continue;

      const relevantGroups = site.groups.filter((g) =>
        g.relatedModels.some((m) => m.toLowerCase().startsWith(normalizedModel)),
      );
      // 风险评估范围与定价口径对齐：实际计价分组优先，其次模型绑定分组
      const baseRiskScope = relevantGroups.length > 0 ? relevantGroups : site.groups;
      const riskScope =
        formula.optimalGroup && !baseRiskScope.includes(formula.optimalGroup)
          ? [formula.optimalGroup, ...baseRiskScope]
          : baseRiskScope;
      const riskRemarks = riskScope.filter((g) => g.riskLevel !== "low" && g.remark);
      const riskLevel = riskScope.reduce<RiskLevel>(
        (acc, cur) => (cur.riskLevel === "high" ? "high" : cur.riskLevel === "medium" && acc !== "high" ? "medium" : acc),
        "low",
      );

      matchedList.push({
        site,
        offer,
        formula,
        priceValue,
        relevantGroups,
        riskLevel,
        riskRemarks,
        changedGroups: site.groups.filter((g) => g.changeDirection),
      });
    }

    // 价格分布统计与梯队生成
    const validPrices = matchedList
      .map((item) => item.priceValue)
      .filter((p): p is number => p != null && p > 0)
      .sort((a, b) => a - b);

    const stats = computePriceDistributionStats(validPrices);

    // 密集排名与百分位
    const sortedByPrice = [...matchedList].sort((a, b) => compareNullable(a.priceValue, b.priceValue, "asc"));
    const totalCount = sortedByPrice.length;

    let currentRank = 1;
    const enrichedRows: ComparisonRow[] = sortedByPrice.map((item, index) => {
      if (index > 0 && item.priceValue != null && sortedByPrice[index - 1].priceValue != null) {
        if (item.priceValue > (sortedByPrice[index - 1].priceValue as number)) {
          currentRank = index + 1;
        }
      }

      const pVal = totalCount > 0 ? (currentRank / totalCount) * 100 : 100;
      const ceilP = Math.max(1, Math.ceil(pVal));
      const percentileText = currentRank === 1 ? "Top 1 (全网最低)" : `Top ${ceilP}%`;
      const tierInfo = assignPriceTier(item.priceValue ?? 0, stats);

      return {
        ...item,
        rank: currentRank,
        totalSites: totalCount,
        percentileText,
        tierInfo,
      };
    });

    // 最终列表排序
    enrichedRows.sort((a, b) => {
      if (sortKey === "availability") {
        return compareNullable(a.site.performance?.availability7d ?? null, b.site.performance?.availability7d ?? null, "desc");
      }
      if (sortKey === "speed") {
        return compareNullable(a.site.performance?.ttftP50Ms ?? null, b.site.performance?.ttftP50Ms ?? null, "asc");
      }
      if (sortKey === "name") {
        return a.site.name.localeCompare(b.site.name, "zh-CN");
      }
      return compareNullable(a.priceValue, b.priceValue, "asc");
    });

    const lowest = stats.min > 0 ? stats.min : null;
    const highest = stats.max > 0 ? stats.max : null;
    const spread = lowest != null && highest != null && lowest > 0 ? highest / lowest : null;

    return {
      rows: enrichedRows,
      unmatchedSites: unmatched,
      stats,
      lowestPrice: lowest,
      priceSpread: spread,
    };
  }, [data.sites, selectedModel, siteQuery, presetFilter, measuredOnly, minimumAvailability, sortKey]);

  const measuredCount = rows.filter((row) => row.site.performance).length;
  const selectedModelType = data.models.find((model) => model.name === selectedModel)?.type ?? "unknown";
  const lowestPriceLabel = selectedModelType === "image"
    ? (lowestPrice == null ? "--" : `¥${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(lowestPrice)}`)
    : formatMultiplier(lowestPrice);

  const matchedSiteAcrossModels = useMemo(() => {
    const query = siteQuery.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!query || rows.length > 0) return null;
    return data.sites.find((site) => {
      const searchTarget = `${site.id} ${site.name} ${site.domain} ${site.providers.join(" ")}`.toLowerCase();
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
    <div className="pb-24 bg-[#FAF9F5]">
      <RelaySubNav />

      {/* Header Banner */}
      <section className="border-b border-zinc-200/80 bg-white/40 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr] xl:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white px-3 py-1 font-mono text-xs font-semibold text-zinc-800 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E03E1A]" />
              <span>Aisle 01 · Relay Pricing Observatory</span>
            </div>
            <h1 className="max-w-5xl text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-zinc-900 leading-[1.1]">
              同模型，<span className="text-[#E03E1A]">横向比价。</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-normal leading-relaxed text-zinc-600 sm:text-base">
              全网 167+ 中转站实时模型费率、最优分组命中、7 天可用率与网络延迟探针大盘。
            </p>
          </div>
          <div className="grid grid-cols-2 rounded-2xl border border-zinc-200/80 bg-white shadow-xs overflow-hidden">
            {[
              ["SITES", data.totals.sites],
              ["MODEL RATES", data.totals.offers],
              ["GROUPS", data.totals.groups],
              ["PERF SNAPSHOTS", data.totals.measuredSites],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-r border-zinc-100 p-3.5 sm:p-4 last:border-b-0 even:border-r-0">
                <div className="font-mono text-[10px] font-semibold text-zinc-400">{label}</div>
                <div className="mt-1 font-mono text-2xl font-bold text-zinc-900">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ticker Bar */}
      <section className="border-b border-zinc-200/80 bg-zinc-50/80 px-4 py-2.5 text-zinc-600 sm:px-8 lg:px-12 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 font-medium">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>全网源数据更新于 · {formatDate(data.latestUpdatedAt)}</span>
          </div>
          <span className="text-zinc-400 text-[11px]">
            167+ 站点全量数据已校准 · 严格按模型实际绑定分组计算
          </span>
        </div>
      </section>

      {/* Controls & Filter Section */}
      <section className="border-b border-zinc-200/80 bg-[#F4F3EE]/40 px-4 py-6 sm:px-8 lg:px-12">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          {/* 模型选择器 */}
          <div ref={dropdownRef} className="relative">
            <label className="mb-2 block font-mono text-xs font-semibold text-zinc-700">
              01 / Select Target Model · 选择目标比价模型
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex min-h-11 w-full items-center justify-between rounded-xl border border-zinc-200/80 bg-white px-4 py-2.5 text-left font-mono text-sm font-semibold transition-colors hover:border-zinc-300 shadow-2xs text-zinc-900"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="h-2 w-2 rounded-full bg-[#E03E1A] shrink-0" />
                <span className="truncate">{selectedModel}</span>
                <span className="text-xs text-zinc-400 shrink-0 font-normal">
                  ({data.models.find((m) => m.name === selectedModel)?.siteCount ?? 0} 站报价)
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* 热门模型快速标签 */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 font-mono text-xs">
              <span className="text-[10px] font-semibold text-zinc-400 mr-1 flex items-center gap-1">
                <Flame className="h-3 w-3 text-[#E03E1A] inline" /> HOT:
              </span>
              {hotModels.map((hm) => (
                <button
                  key={hm}
                  type="button"
                  onClick={() => {
                    setSelectedModel(hm);
                    setIsDropdownOpen(false);
                  }}
                  className={`rounded-lg border px-2.5 py-1 font-semibold transition-all ${
                    selectedModel === hm
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-2xs"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 shadow-2xs"
                  }`}
                >
                  {hm}
                </button>
              ))}
            </div>

            {/* 模型下拉菜单 */}
            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 max-h-[420px] w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl">
                <div className="border-b border-zinc-100 bg-zinc-50/80 p-2.5">
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs">
                    <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="快速过滤模型名 (如 sol / sonnet / r1)..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      className="w-full bg-transparent outline-none placeholder:text-zinc-400 font-medium text-zinc-800"
                      autoFocus
                    />
                    {modelSearchQuery && (
                      <button type="button" onClick={() => setModelSearchQuery("")} className="text-zinc-400 hover:text-zinc-700 font-bold">✕</button>
                    )}
                  </div>
                </div>

                <div className="max-h-[340px] overflow-y-auto p-1 font-mono text-xs divide-y divide-zinc-100">
                  {groupedModels.map((group) => (
                    <div key={group.vendor} className="mb-1">
                      <div className="sticky top-0 bg-zinc-100/90 backdrop-blur-sm px-3 py-1 font-semibold uppercase tracking-wider text-zinc-600 text-[10px]">
                        {group.vendor} ({group.models.length})
                      </div>
                      <div className="divide-y divide-zinc-50">
                        {group.models.map((model) => (
                          <button
                            key={model.name}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model.name);
                              setIsDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-zinc-50 transition-colors ${
                              model.name === selectedModel ? "bg-amber-50/60 font-bold text-[#E03E1A]" : "text-zinc-800"
                            }`}
                          >
                            <span className="truncate">{model.name}</span>
                            <span className="text-[10px] text-zinc-400 shrink-0">{model.siteCount} 站</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 搜索与快捷过滤 */}
          <div>
            <label className="mb-2 block font-mono text-xs font-semibold text-zinc-700">
              02 / Filter Sites · 检索站点 (按 <kbd className="rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 text-[10px] font-mono text-zinc-500"> / </kbd> 聚焦)
            </label>
            <div className="flex min-h-11 items-center rounded-xl border border-zinc-200/80 bg-white px-3.5 font-mono text-sm shadow-2xs focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900/5">
              <Search className="mr-2.5 h-4 w-4 text-zinc-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜索站点名称、域名或关键词..."
                value={siteQuery}
                onChange={(e) => setSiteQuery(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-zinc-400 font-medium text-zinc-900"
              />
              {siteQuery && (
                <button type="button" onClick={() => setSiteQuery("")} className="font-mono text-xs text-zinc-400 hover:text-zinc-700 font-bold px-1">✕</button>
              )}
            </div>
          </div>
        </div>

        {/* 排序与高级筛选行 */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/60 pt-4">
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
            <span className="text-[10px] font-semibold text-zinc-400 mr-1">SORT BY:</span>
            {[
              ["price", "价格最低 (Default)"],
              ["speed", "延迟最低 (TTFT)"],
              ["availability", "7日可用率最高"],
              ["name", "站点名称 A-Z"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortKey(key as SortKey)}
                className={`rounded-lg border px-3 py-1 font-semibold transition-all ${
                  sortKey === key
                    ? "border-zinc-900 bg-zinc-900 text-white shadow-2xs"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 shadow-2xs"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setMeasuredOnly(!measuredOnly)}
              className={`rounded-lg border px-3 py-1 font-semibold transition-colors ${
                measuredOnly
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-2xs"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 shadow-2xs"
              }`}
            >
              仅看有探针实测
            </button>

            <button
              type="button"
              onClick={() => setShowEstimator(!showEstimator)}
              className={`rounded-lg border px-3 py-1 font-semibold transition-colors inline-flex items-center gap-1.5 ${
                showEstimator
                  ? "border-zinc-900 bg-zinc-900 text-white shadow-2xs"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 shadow-2xs"
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>{showEstimator ? "收起月度算账器" : "月度算账器"}</span>
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 font-mono text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 重置筛选
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="px-4 py-6 sm:px-8 lg:px-12">
        {/* 模型家族横向对比矩阵 */}
        {currentFamily && (
          <ModelFamilyMatrixBar
            family={currentFamily}
            selectedModel={selectedModel}
            onSelectModel={(name) => setSelectedModel(name)}
          />
        )}

        {/* 全网价格分布与分位数刻度标尺 */}
        <PriceDistributionRuler
          stats={stats}
          isImage={selectedModelType === "image"}
        />

        {/* 场景预设卡片 */}
        <RelayScenarioTabs activePreset={presetFilter} onSelectPreset={setPresetFilter} />

        {/* 按需展开的月度算账器 */}
        {showEstimator && (
          <div className="mb-6">
            <RelayCostEstimator selectedModel={selectedModel} sites={rows} />
          </div>
        )}

        {/* 决策大盘 Title & Summary Counters */}
        <div className="mb-5 grid gap-4 border-b border-zinc-200/80 pb-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="font-mono text-xs font-semibold text-[#E03E1A] flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E03E1A]" />
              <span>Cross-site comparison observatory</span>
            </div>
            <h2 className="mt-1.5 break-all text-2xl font-bold tracking-tight sm:text-4xl text-zinc-900">
              {selectedModel}
            </h2>
          </div>
          <div className="flex flex-wrap rounded-xl border border-zinc-200/80 bg-white shadow-2xs overflow-hidden">
            {[
              ["MATCHED", `${rows.length} 站`],
              ["MEASURED", `${measuredCount} 站`],
              ["LOWEST", lowestPriceLabel],
              ["SPREAD", priceSpread == null ? "--" : `${priceSpread.toFixed(1)}×`],
            ].map(([label, value]) => (
              <div key={label} className="min-w-[90px] border-b sm:border-b-0 border-r border-zinc-100 px-3.5 py-2 last:border-r-0">
                <div className="font-mono text-[9px] font-semibold text-zinc-400">{label}</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-zinc-900">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 表头（桌面端） */}
        <div className="hidden grid-cols-[130px_minmax(250px,1.4fr)_minmax(250px,1.2fr)_minmax(160px,0.8fr)_minmax(130px,0.6fr)_40px] rounded-t-2xl border border-b-0 border-zinc-200/80 bg-zinc-100/90 backdrop-blur-sm font-mono text-xs font-semibold text-zinc-600 lg:grid">
          {["梯队排位 // Rank & Tier", "站点与特性 // Station & Features", "真实折扣与单价 // Discount & Price", "可用率与延迟 // SLA & Speed", "变价 // Signal", ""].map((label) => (
            <div key={label || "expand"} className="border-r border-zinc-200/60 px-4 py-3 last:border-r-0">
              {label}
            </div>
          ))}
        </div>

        {/* 表格主体 */}
        <div className="rounded-b-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden divide-y divide-zinc-100">
          {rows.length === 0 ? (
            <div className="bg-white px-6 py-20 text-center">
              <Activity className="mx-auto h-10 w-10 text-zinc-300" />
              <h3 className="mt-4 text-lg font-bold text-zinc-800">没有符合当前条件的站点</h3>
              <p className="mt-2 text-sm text-zinc-500 max-w-xl mx-auto leading-relaxed">
                {matchedSiteAcrossModels ? (
                  <span>
                    已收录站点 <strong className="text-zinc-900 font-semibold">{matchedSiteAcrossModels.name} ({matchedSiteAcrossModels.domain})</strong>，但该站暂未提供当前选中的 [{selectedModel}] 模型报价。<br />
                    可以去 <Link href={`/table/relay_sites_tracker/${encodeURIComponent(matchedSiteAcrossModels.id)}`} className="font-semibold text-zinc-900 underline hover:text-[#E03E1A]">【{matchedSiteAcrossModels.name} 详情页】</Link> 查看其支持的全部模型，或在顶部尝试切换其他模型。
                  </span>
                ) : (
                  "降低可用率阈值、关闭“仅看有实测数据”或重置搜索。"
                )}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-zinc-800 transition-colors shadow-2xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>一键重置筛选条件</span>
              </button>
            </div>
          ) : (
            rows.map((row, index) => {
              const siteTags = extractSiteTags(row.site);
              const isLowest = lowestPrice != null && row.priceValue === lowestPrice;
              const qc = qcBySiteId.get(row.site.id) || (row.site.domain ? qcBySiteId.get(row.site.domain.toLowerCase()) : null);
              const isT1 = row.tierInfo.tier === "T1";

              return (
                <details
                  key={row.site.id}
                  className={`group bg-white last:border-b-0 open:bg-zinc-50/30 transition-colors ${
                    isT1 ? "border-l-4 border-l-[#E03E1A]" : "border-l-4 border-l-transparent"
                  }`}
                >
                  <summary className="grid cursor-pointer list-none gap-4 p-4 transition-colors hover:bg-zinc-50/60 lg:grid-cols-[130px_minmax(250px,1.4fr)_minmax(250px,1.2fr)_minmax(160px,0.8fr)_minmax(130px,0.6fr)_40px] lg:items-center lg:gap-3 lg:p-4 [&::-webkit-details-marker]:hidden">
                    {/* 1. 排位标尺与价格梯队 */}
                    <RankTierBadge row={row} />

                    {/* 2. 站点名称与决策亮点微标签 */}
                    <div className="min-w-0 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/table/relay_sites_tracker/${encodeURIComponent(row.site.id)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate text-base font-bold text-zinc-900 hover:text-[#E03E1A] transition-colors"
                        >
                          {row.site.name}
                        </Link>
                        {row.site.domain && (
                          <a
                            href={domainHref(row.site.domain)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs text-zinc-400 hover:text-zinc-700 inline-flex items-center gap-0.5"
                          >
                            <span>{domainDisplay(row.site.domain)}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                      <div className="mt-1.5">
                        <SmartDecisionHighlightTags
                          isLowestPrice={isLowest}
                          ttftMs={row.site.performance?.ttftP50Ms ?? null}
                          availability7d={row.site.performance?.availability7d ?? null}
                          qcScore={qc?.score ?? null}
                          riskLevel={row.riskLevel}
                          siteTags={siteTags}
                        />
                      </div>
                    </div>

                    {/* 3. 计费公式拆解药丸 */}
                    <PriceFormulaBreakdownPill row={row} isBest={isLowest} />

                    {/* 4. 7D 可用率与性能快照 */}
                    <AvailabilityCell site={row.site} />

                    {/* 5. 变价与风险信号 */}
                    <ChangeAndRisk row={row} />

                    {/* 6. 展开指示箭头 */}
                    <div className="flex justify-end">
                      <ChevronDown className="h-4 w-4 text-zinc-400 transition-transform duration-200 group-open:rotate-180 group-hover:text-zinc-700" />
                    </div>
                  </summary>

                  {/* 展开面板 */}
                  <DetailPanel row={row} selectedModel={selectedModel} />
                </details>
              );
            })
          )}

          {/* 未收录该具体模型的站点列表 */}
          {unmatchedSites.length > 0 && (
            <section className="border-t border-zinc-200/80 bg-zinc-50/50 p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-zinc-200/60 pb-3">
                <div>
                  <div className="font-mono text-xs font-semibold text-[#E03E1A]">
                    Catalog coverage
                  </div>
                  <h3 className="mt-0.5 text-base font-bold text-zinc-900">已收录但暂无「{selectedModel}」报价的站点</h3>
                </div>
                <span className="font-mono text-xs font-semibold text-zinc-500">{unmatchedSites.length} 站</span>
              </div>
              <div className="mt-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unmatchedSites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/table/relay_sites_tracker/${encodeURIComponent(site.id)}`}
                    className="rounded-xl border border-zinc-200/80 bg-white p-3.5 transition-all hover:border-zinc-300 hover:shadow-2xs"
                  >
                    <div className="font-bold text-zinc-900 text-sm">{site.name}</div>
                    <div className="mt-0.5 truncate font-mono text-xs text-zinc-400">{site.domain || "NO DOMAIN"}</div>
                    <div className="mt-2 font-mono text-[10px] text-zinc-500">
                      {site.offers.length > 0 ? `其他模型 ${site.offers.length} 条` : "暂无模型明细"}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 底部说明 */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-zinc-400">
          <span>价格排序：文本模型优先使用 rate_input，缺失时回退 rate_output；图片模型使用 model_price。</span>
          <span>T1/T2/T3 梯队基于当前模型全网有效报价的 20% 与 70% 分位数动态计算。</span>
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
