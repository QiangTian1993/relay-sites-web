"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  ChevronDown,
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
  selectedModel,
  isImage,
}: {
  stats: PriceDistributionStats;
  selectedModel: string;
  isImage: boolean;
}) {
  if (stats.count < 2 || stats.max <= stats.min) return null;

  const span = stats.max - stats.min;
  const p20Pos = Math.max(12, Math.min(35, ((stats.p20 - stats.min) / span) * 100));
  const p50Pos = Math.max(p20Pos + 10, Math.min(75, ((stats.p50 - stats.min) / span) * 100));
  const p70Pos = Math.max(p50Pos + 10, Math.min(90, ((stats.p70 - stats.min) / span) * 100));

  const formatVal = (v: number) => (isImage ? `¥${v.toFixed(3)}` : `${v.toFixed(4).replace(/\.?0+$/, "")}×`);

  return (
    <div className="mb-8 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* 标头 */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-black bg-black px-4 py-2 text-white font-mono text-xs">
        <div className="flex items-center gap-2 font-black uppercase tracking-[0.2em]">
          <span className="h-2 w-2 bg-swiss-accent" />
          <span>Market Price Spectrum // 全网价格分布与梯队刻度标尺</span>
        </div>
        <div className="text-[10px] text-white/60">
          基于当前 {stats.count} 家报价站动态计算 · 20% / 70% 分位数基线
        </div>
      </div>

      {/* 刻度尺可视化条 */}
      <div className="p-4 sm:p-6 bg-[#FAF9F5]">
        {/* 顶部标签 */}
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] font-bold text-black/60">
          <div className="flex items-center gap-1 text-black">
            <span className="font-black text-swiss-accent">★ 全网最低</span>
            <span className="border border-black bg-black px-1.5 py-0.2 text-white font-mono font-black">
              {formatVal(stats.min)}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-black/70">
            <span>◆ P50 中位数:</span>
            <span className="font-black text-black">{formatVal(stats.p50)}</span>
          </div>
          <div className="flex items-center gap-1 text-black/60">
            <span>▲ 全网最高:</span>
            <span className="font-bold text-black">{formatVal(stats.max)}</span>
          </div>
        </div>

        {/* 连续价格轴刻度线 */}
        <div className="relative h-9 border-2 border-black bg-white flex overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {/* T1 区间 */}
          <div
            className="relative h-full bg-black text-white flex items-center px-2 font-mono text-[10px] font-black tracking-wider transition-all"
            style={{ width: `${p20Pos}%` }}
            title={`T1 极限低价档: ≤ ${formatVal(stats.p20)}`}
          >
            <span className="truncate">T1 极限低价</span>
            <span className="absolute right-0 top-0 bottom-0 w-0.5 bg-swiss-accent" />
          </div>

          {/* T2 区间 */}
          <div
            className="relative h-full bg-[#FFFFFF] text-black flex items-center px-2 font-mono text-[10px] font-bold tracking-wider swiss-grid transition-all"
            style={{ width: `${p70Pos - p20Pos}%` }}
            title={`T2 稳健主流档: ${formatVal(stats.p20)} ~ ${formatVal(stats.p70)}`}
          >
            <span className="truncate">T2 稳健主流区间</span>
            {/* P50 中位数打点 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-black flex items-center justify-center"
              style={{ left: `${((p50Pos - p20Pos) / (p70Pos - p20Pos)) * 100}%` }}
              title={`P50 中位数: ${formatVal(stats.p50)}`}
            >
              <div className="h-2 w-2 rotate-45 bg-black -mt-6" />
            </div>
            <span className="absolute right-0 top-0 bottom-0 w-0.5 bg-black/40" />
          </div>

          {/* T3 区间 */}
          <div
            className="relative h-full bg-[#EAE9E4] text-black/70 flex items-center px-2 font-mono text-[10px] font-bold tracking-wider transition-all"
            style={{ width: `${100 - p70Pos}%` }}
            title={`T3 官号高溢档: > ${formatVal(stats.p70)}`}
          >
            <span className="truncate">T3 官号/高溢</span>
          </div>
        </div>

        {/* 底部梯队区间说明 */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs pt-1">
          <div className="border border-black bg-black p-2 text-white">
            <div className="flex items-center justify-between text-[10px] text-white/60 uppercase">
              <span>T1 · 极限性价比 (Top 20%)</span>
              <span className="text-swiss-accent font-black">● 推荐</span>
            </div>
            <div className="mt-1 font-black text-sm text-white">
              {formatVal(stats.min)} ~ {formatVal(stats.p20)}
            </div>
          </div>

          <div className="border border-black bg-white p-2 text-black">
            <div className="flex items-center justify-between text-[10px] text-black/50 uppercase">
              <span>T2 · 稳健主力档 (20%~70%)</span>
              <span className="font-bold text-black">主力站群</span>
            </div>
            <div className="mt-1 font-black text-sm text-black">
              {formatVal(stats.p20)} ~ {formatVal(stats.p70)}
            </div>
          </div>

          <div className="border border-black/30 bg-[#EAE9E4] p-2 text-black/70">
            <div className="flex items-center justify-between text-[10px] text-black/40 uppercase">
              <span>T3 · 官号高溢档 (Top 30%)</span>
              <span>高 SLA / 溢价</span>
            </div>
            <div className="mt-1 font-black text-sm text-black/80">
              &gt; {formatVal(stats.p70)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 子组件 02：模型家族横向联动矩阵 (ModelFamilyMatrixBar) - 工业工学控制台风格
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
    <div className="mb-8 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {/* 矩阵标头 */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-black bg-black px-4 py-2.5 text-white">
        <div className="flex items-center gap-2.5 font-mono text-xs font-black uppercase tracking-[0.2em]">
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-swiss-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 bg-swiss-accent" />
          </span>
          <span>{family.familyName}</span>
          <span className="text-white/40 font-normal">/</span>
          <span className="text-white/70 text-[10px] tracking-normal font-sans font-bold">核心变体横向对比矩阵</span>
        </div>
        <div className="font-mono text-[10px] font-bold text-white/60">
          全系收录 <strong className="text-white font-black">{family.totalSitesCovered}</strong> 站 · 点击下方卡片秒切
        </div>
      </div>

      {/* 变体卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y-2 sm:divide-y-0 sm:divide-x-2 divide-black bg-[#FAFAFA]">
        {family.subModels.map((variant, idx) => {
          const isActive = variant.modelName.toLowerCase() === selectedModel.toLowerCase();
          const codeName = `SPEC-0${idx + 1}`;

          return (
            <button
              key={variant.modelName}
              type="button"
              onClick={() => onSelectModel(variant.modelName)}
              className={`group relative flex flex-col justify-between p-4 text-left transition-all duration-150 ${
                isActive
                  ? "bg-white ring-4 ring-inset ring-black z-10 shadow-[inset_0_4px_0_0_#FF3000]"
                  : "bg-[#FAFAFA] hover:bg-white hover:shadow-[inset_0_2px_0_0_#000000]"
              }`}
            >
              {/* 顶部标签 */}
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase tracking-wider text-black">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? "bg-swiss-accent" : "bg-black/30 group-hover:bg-black"
                      }`}
                    />
                    <span>{variant.shortLabel}</span>
                  </div>
                  {isActive ? (
                    <span className="border-2 border-black bg-swiss-accent px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] text-black/35 font-bold">
                      {codeName} · {variant.siteCount} 站
                    </span>
                  )}
                </div>

                <div className="mt-2 font-mono text-sm font-black text-black truncate" title={variant.modelName}>
                  {variant.modelName}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-black/55 leading-tight">
                  {variant.tagline}
                </div>
              </div>

              {/* 底部价格与站点 */}
              <div className="mt-5 border-t border-black/15 pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-black/45">
                    全网最低折算价
                  </span>
                  <span className="font-mono text-xl font-black text-black tracking-tight">
                    {variant.lowestPrice != null ? (
                      <>
                        {variant.lowestPrice.toFixed(4).replace(/\.?0+$/, "")}
                        <span className="text-xs font-bold text-black/50 ml-0.5">×</span>
                      </>
                    ) : (
                      "--"
                    )}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-black/60">
                  <span className="truncate max-w-[130px] font-bold text-black/80" title={variant.lowestPriceSite?.name || ""}>
                    {variant.lowestPriceSite?.name ? `由 ${variant.lowestPriceSite.name}` : "暂无报价"}
                  </span>
                  <span className="text-black/50">
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
// 子组件 03：排位标尺与价格梯队徽章 (RankTierBadge) - 赛道排位风格
// ============================================================================

function RankTierBadge({ row }: { row: ComparisonRow }) {
  const isT1 = row.tierInfo.tier === "T1";
  const isT3 = row.tierInfo.tier === "T3";

  return (
    <div className="flex flex-col gap-1.5 shrink-0 font-mono">
      {/* 绝对名次与梯队徽章 */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black tracking-tighter text-black">
          #{String(row.rank).padStart(2, "0")}
        </span>
        <span
          className={`inline-flex items-center gap-1 border-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
            isT1
              ? "border-black bg-black text-white shadow-[1.5px_1.5px_0px_0px_#FF3000]"
              : isT3
              ? "border-black/30 bg-[#F2F2EE] text-black/65"
              : "border-black bg-white text-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"
          }`}
          title={row.tierInfo.description}
        >
          <span className={isT1 ? "text-swiss-accent font-black" : ""}>■</span>
          {row.tierInfo.tier} {row.tierInfo.label}
        </span>
      </div>

      {/* 相对排位百分位 */}
      <div className="text-[10px] font-bold text-black/50 tracking-tight">
        {row.percentileText} <span className="text-black/30">/</span> 共 {row.totalSites} 站
      </div>
    </div>
  );
}

// ============================================================================
// 子组件 04：计费公式拆解药丸 (PriceFormulaBreakdownPill) - 高透明度运算链
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
  const isNonDefaultGroup = formula.hasGroupDiscount && formula.groupName.toLowerCase() !== "default" && formula.groupName !== "标准基准";

  if (isImage) {
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <strong className="font-mono text-2xl font-black tracking-tight text-black">
            {formula.effectivePrice == null ? "--" : `¥${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(formula.effectivePrice)}`}
          </strong>
          {isBest && (
            <span className="border-2 border-black bg-swiss-accent px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              LOWEST
            </span>
          )}
        </div>
        <p className="font-mono text-[11px] text-black/60">
          {formula.hasGroupDiscount ? `基准 ¥${formula.basePrice} × [${formula.groupName} ${formula.groupRate}x]` : "按次计费"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* 最终到手价 */}
      <div className="flex flex-wrap items-baseline gap-2">
        <strong className="font-mono text-2xl font-black tracking-tight text-black">
          {formatMultiplier(formula.effectivePrice)}
        </strong>
        {isBest && (
          <span className="border-2 border-black bg-swiss-accent px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest text-white shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
            LOWEST
          </span>
        )}
      </div>

      {/* 公式运算链药丸 */}
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
        {formula.hasGroupDiscount ? (
          <div className="inline-flex flex-wrap items-center gap-1 border border-black/25 bg-white px-2 py-0.5 text-black/80 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.1)]">
            <span className="text-black/55">基准 {formula.basePrice}×</span>
            <span className="font-black text-black/40">×</span>
            <span className="font-bold text-black">
              [{formula.groupName} {formula.groupRate}×]
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-black/60 font-mono text-[11px]">
            <span>输入 {formatMultiplier(row.offer.inputRate)}</span>
            <span>·</span>
            <span>输出 {formatMultiplier(row.offer.outputRate)}</span>
          </div>
        )}

        {/* 关键分组后台切换指引 */}
        {isNonDefaultGroup && (
          <span
            className="inline-flex items-center gap-1 border-2 border-black bg-[#FFEFEA] px-1.5 py-0.5 font-mono text-[10px] font-black text-black shadow-[1px_1px_0px_0px_#FF3000]"
            title="请在站点控制台切换至该分组以享受此倍率"
          >
            <span className="text-swiss-accent font-black">☞</span>
            <span>切分组: <strong className="underline text-black">{formula.groupName}</strong></span>
          </span>
        )}
      </div>

      {(row.offer.cacheRate != null || row.offer.createCacheRate != null) && (
        <div className="font-mono text-[10px] text-black/45">
          CACHE {formatMultiplier(row.offer.cacheRate)} · CREATE {formatMultiplier(row.offer.createCacheRate)}
        </div>
      )}
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
  siteTags,
}: {
  isLowestPrice: boolean;
  ttftMs: number | null;
  availability7d: number | null;
  qcScore: number | null;
  siteTags: SiteFeatureTags;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
      {isLowestPrice && (
        <span className="inline-flex items-center gap-1 border border-black bg-black px-2 py-0.5 font-black text-white shadow-[1px_1px_0px_0px_#FF3000]">
          <span className="text-swiss-accent">★</span> 全网最低价
        </span>
      )}

      {ttftMs != null && ttftMs < 900 && (
        <span className="inline-flex items-center gap-1 border-2 border-black bg-[#FFEFEA] px-1.5 py-0.5 font-black text-black shadow-[1px_1px_0px_0px_#FF3000]">
          <span className="text-swiss-accent">⚡</span> 极速 {Math.round(ttftMs)}ms
        </span>
      )}

      {availability7d != null && availability7d >= 99.0 && (
        <span className="inline-flex items-center gap-1 border-2 border-black bg-white px-1.5 py-0.5 font-bold text-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
          {availability7d.toFixed(1)}% 稳线
        </span>
      )}

      {qcScore != null && (
        <span
          className={`inline-flex items-center gap-1 border-2 px-1.5 py-0.5 font-black ${
            qcScore >= 90
              ? "border-emerald-700 bg-emerald-50 text-emerald-900 shadow-[1px_1px_0px_0px_#059669]"
              : "border-black/30 bg-black/5 text-black/70"
          }`}
        >
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          质检 {qcScore >= 95 ? "S级" : qcScore >= 85 ? "A级" : ""}{qcScore}分
        </span>
      )}

      {siteTags.isPurePro && (
        <span className="border border-black bg-[#F4F4EE] px-1.5 py-0.5 font-bold text-black">
          💎 纯血Pro
        </span>
      )}
      {siteTags.hasInvoice && (
        <span className="border border-black/40 bg-white px-1.5 py-0.5 font-medium text-black/75">
          可开票
        </span>
      )}
      {siteTags.noVerify && (
        <span className="border border-black/40 bg-white px-1.5 py-0.5 font-medium text-black/75">
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
        <strong className="text-base font-black text-black">
          {formatPercent(value)}
        </strong>
        <span className="text-[10px] uppercase tracking-wider text-black/50">
          7D 可用率
        </span>
      </div>

      <div className="h-1.5 border border-black/30 bg-black/10">
        <div
          className={`h-full ${value != null && value >= 99 ? "bg-emerald-600" : "bg-black"}`}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-black/60 pt-0.5">
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
      <div className="font-mono text-xs text-black/40 flex items-center gap-1">
        <span className="h-1.5 w-1.5 bg-black/30 inline-block" />
        <span>价格平稳</span>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className={`inline-flex items-center gap-1.5 border-2 px-2 py-0.5 font-mono text-xs font-black ${change.changeDirection === "up" ? "border-black bg-swiss-accent text-white shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]" : "border-black bg-white text-black shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]"}`}>
        {change.changeDirection === "up" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
        {change.changeDirection === "up" ? "+" : ""}{formatMultiplier(change.changeDelta)}
      </div>
    </div>
  );
}

function DetailPanel({ row, selectedModel }: { row: ComparisonRow; selectedModel: string }) {
  return (
    <div className="border-t-2 border-black bg-[#FAF9F5] p-5 sm:p-7">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* 01 计费公式拆解 */}
        <div className="border-2 border-black bg-white p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
            <span className="font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 bg-swiss-accent" />
              01 · 当前生效计费公式拆解
            </span>
            <span className="border border-black bg-black px-2 py-0.5 font-mono text-[10px] font-black text-white">
              {row.formula.groupName} ({row.formula.groupRate}×)
            </span>
          </div>
          <div className="mt-4 space-y-2.5 font-mono text-xs">
            <div className="flex justify-between border-b border-black/10 pb-1.5">
              <span className="text-black/55">基础模型定价 (Base Rate)</span>
              <span className="font-bold text-black">{row.formula.basePrice}×</span>
            </div>
            <div className="flex justify-between border-b border-black/10 pb-1.5">
              <span className="text-black/55">命中最优分组 (Matched Group)</span>
              <span className="font-black text-swiss-accent">{row.formula.groupName} ({row.formula.groupRate}×)</span>
            </div>
            <div className="flex justify-between border-b border-black/10 pb-1.5">
              <span className="text-black/55">最终折算到手倍率 (Effective Rate)</span>
              <span className="font-black text-lg text-black">{row.formula.effectivePrice.toFixed(4).replace(/\.?0+$/, "")}×</span>
            </div>
            <div className="mt-3 text-[11px] text-black/80 bg-[#FFF9F6] p-3 border-2 border-black shadow-[2px_2px_0px_0px_#FF3000]">
              👉 <strong>调用指引</strong>：在向 <strong>{row.site.domain || row.site.name}</strong> 发起 <code>{selectedModel}</code> 请求时，请务必在后台将令牌或分组权限指定为 <code>{row.formula.groupName}</code>，以享受 <strong>{row.formula.effectivePrice.toFixed(4).replace(/\.?0+$/, "")}×</strong> 的优惠费率。
            </div>
          </div>
        </div>

        {/* 02 网络延迟与探针数据 */}
        <div className="border-2 border-black bg-white p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
            <span className="font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <span className="h-2 w-2 bg-black" />
              02 · 网络延迟与可用率实测档案
            </span>
            <span className="font-mono text-[10px] text-black/50">
              {row.site.performance?.lastProbeAt ? `打点于 ${row.site.performance.lastProbeAt}` : "无实测打点"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center font-mono">
            <div className="border-2 border-black p-2.5 bg-[#FAFAFA]">
              <div className="text-[10px] font-bold text-black/50 uppercase">TTFT 首字延迟</div>
              <div className="mt-1 text-lg font-black text-black">{formatMs(row.site.performance?.ttftP50Ms ?? null)}</div>
            </div>
            <div className="border-2 border-black p-2.5 bg-[#FAFAFA]">
              <div className="text-[10px] font-bold text-black/50 uppercase">P95 峰值延迟</div>
              <div className="mt-1 text-lg font-black text-black">{formatMs(row.site.performance?.latencyP95Ms ?? null)}</div>
            </div>
            <div className="border-2 border-black p-2.5 bg-[#FAFAFA]">
              <div className="text-[10px] font-bold text-black/50 uppercase">7日成功率</div>
              <div className="mt-1 text-lg font-black text-emerald-700">{formatPercent(row.site.performance?.successRate ?? null, true)}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-black/15 pt-3">
            <span className="font-mono text-xs text-black/50">包含 165+ 站底表全量分组与支持特性</span>
            <Link
              href={`/table/relay_sites_tracker/${encodeURIComponent(row.site.id)}`}
              className="inline-flex items-center gap-1 font-mono text-xs font-black text-black underline hover:text-swiss-accent"
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

  // 模型家族聚合
  const modelFamilies = useMemo(() => {
    return aggregateModelFamilies(data.sites);
  }, [data.sites]);

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

      const formula = resolveOfferFormula(offer, site.groups);
      const priceValue = formula.effectivePrice > 0 ? formula.effectivePrice : null;

      // 场景预设过滤
      if (presetFilter === "coding") {
        const isCoding =
          site.groups.some((g) => /claude|kiro|max|code|codex/i.test(g.name + (g.remark || ""))) ||
          /claude|cursor|codex/i.test(site.note) ||
          site.providers.some((p) => /claude/i.test(p));
        if (!isCoding) continue;
      } else if (presetFilter === "low_cost") {
        const isLow = (site.minimumRate != null && site.minimumRate <= 0.1) || (priceValue != null && priceValue <= 0.1);
        if (!isLow) continue;
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
      const riskScope = relevantGroups.length > 0 ? relevantGroups : site.groups;
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
    <div className="pb-24 bg-[#FCFCFA]">
      <RelaySubNav />

      {/* Header Banner - Swiss Typographic Statement */}
      <section className="swiss-grid border-b-4 border-black px-4 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="grid gap-8 xl:grid-cols-[1.45fr_0.55fr] xl:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2.5 border-2 border-black bg-black px-3 py-1 font-mono text-xs font-black uppercase tracking-[0.22em] text-white shadow-[2px_2px_0px_0px_#FF3000]">
              <span className="h-2 w-2 bg-swiss-accent" />
              Relay Pricing Observatory / V1
            </div>
            <h1 className="max-w-5xl text-5xl font-black leading-[0.9] tracking-[-0.065em] sm:text-7xl lg:text-[96px] text-black">
              同模型，<br /><span className="text-swiss-accent">横向比价。</span>
            </h1>
            <p className="mt-6 max-w-2xl border-l-4 border-black pl-4 text-base font-bold leading-7 sm:text-lg text-black/80">
              全网 167+ 中转站实时模型费率、最优分组命中、7 天可用率与网络延迟探针大盘。
            </p>
          </div>
          <div className="grid grid-cols-2 border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {[
              ["SITES", data.totals.sites],
              ["MODEL RATES", data.totals.offers],
              ["GROUPS", data.totals.groups],
              ["PERF SNAPSHOTS", data.totals.measuredSites],
            ].map(([label, value]) => (
              <div key={label} className="border-b-2 border-r-2 border-black p-4 sm:p-5 last:border-b-0 even:border-r-0">
                <div className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-black/45">{label}</div>
                <div className="mt-2 font-mono text-3xl font-black text-black">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ticker Bar */}
      <section className="border-b-4 border-black bg-black px-4 py-3 text-white sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Latest source update · {formatDate(data.latestUpdatedAt)}</span>
          </div>
          <span className="text-white/65">
            167+ 站点全量数据已校准 · 严格按模型实际绑定分组计算
          </span>
        </div>
      </section>

      {/* Controls & Filter Section */}
      <section className="border-b-4 border-black bg-[#F5F4EF] px-4 py-7 sm:px-8 lg:px-12">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          {/* 模型选择器 */}
          <div ref={dropdownRef} className="relative">
            <label className="mb-2 block font-mono text-xs font-black uppercase tracking-[0.16em]">
              01 / Select Target Model · 选择目标比价模型
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex min-h-12 w-full items-center justify-between border-2 border-black bg-white px-4 py-2.5 text-left font-mono text-sm font-black transition-colors hover:bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="h-3 w-3 bg-swiss-accent shrink-0" />
                <span className="text-base truncate">{selectedModel}</span>
                <span className="text-xs text-black/50 shrink-0">
                  ({data.models.find((m) => m.name === selectedModel)?.siteCount ?? 0} 站报价)
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* 热门模型快速标签 */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 font-mono text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-black/45 mr-1 flex items-center gap-1">
                <Flame className="h-3 w-3 text-swiss-accent inline" /> HOT:
              </span>
              {hotModels.map((hm) => (
                <button
                  key={hm}
                  type="button"
                  onClick={() => {
                    setSelectedModel(hm);
                    setIsDropdownOpen(false);
                  }}
                  className={`border-2 px-2.5 py-1 font-bold transition-all ${
                    selectedModel === hm
                      ? "border-black bg-black text-white shadow-[2px_2px_0px_0px_#FF3000]"
                      : "border-black/30 bg-white text-black/75 hover:border-black hover:bg-black/5"
                  }`}
                >
                  {hm}
                </button>
              ))}
            </div>

            {/* 模型下拉菜单 */}
            {isDropdownOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-[420px] w-full overflow-hidden border-2 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <div className="border-b-2 border-black bg-[#F5F4EF] p-2.5">
                  <div className="flex items-center gap-2 border-2 border-black bg-white px-2.5 py-2 font-mono text-xs">
                    <Search className="h-3.5 w-3.5 text-black/40 shrink-0" />
                    <input
                      type="text"
                      placeholder="快速过滤模型名 (如 sol / sonnet / r1)..."
                      value={modelSearchQuery}
                      onChange={(e) => setModelSearchQuery(e.target.value)}
                      className="w-full bg-transparent outline-none placeholder:text-black/30 font-bold"
                      autoFocus
                    />
                    {modelSearchQuery && (
                      <button type="button" onClick={() => setModelSearchQuery("")} className="text-black/40 hover:text-black font-bold">✕</button>
                    )}
                  </div>
                </div>

                <div className="max-h-[340px] overflow-y-auto p-1 font-mono text-xs divide-y divide-black/10">
                  {groupedModels.map((group) => (
                    <div key={group.vendor} className="mb-1">
                      <div className="sticky top-0 bg-black px-3 py-1 font-black uppercase tracking-wider text-white text-[10px]">
                        {group.vendor} ({group.models.length})
                      </div>
                      <div className="divide-y divide-black/5">
                        {group.models.map((model) => (
                          <button
                            key={model.name}
                            type="button"
                            onClick={() => {
                              setSelectedModel(model.name);
                              setIsDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#FFEFEA] transition-colors ${
                              model.name === selectedModel ? "bg-[#FFEFEA] font-black text-swiss-accent" : "text-black"
                            }`}
                          >
                            <span className="truncate">{model.name}</span>
                            <span className="text-[10px] text-black/45 shrink-0">{model.siteCount} 站</span>
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
            <label className="mb-2 block font-mono text-xs font-black uppercase tracking-[0.16em]">
              02 / Filter Sites · 检索站点 (按 <kbd className="border-2 border-black bg-white px-1.5 py-0.5 text-[10px] font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"> / </kbd> 聚焦)
            </label>
            <div className="flex min-h-12 items-center border-2 border-black bg-white px-3.5 font-mono text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Search className="mr-2.5 h-4 w-4 text-black/40 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="搜索站点名称、域名或关键词..."
                value={siteQuery}
                onChange={(e) => setSiteQuery(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-black/35 font-bold text-black"
              />
              {siteQuery && (
                <button type="button" onClick={() => setSiteQuery("")} className="font-mono text-xs text-black/40 hover:text-black font-bold px-1">✕</button>
              )}
            </div>
          </div>
        </div>

        {/* 排序与高级筛选行 */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-black/20 pt-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-black/45 mr-1">SORT BY:</span>
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
                className={`border-2 px-3 py-1 font-bold transition-all ${
                  sortKey === key
                    ? "border-black bg-black text-white shadow-[2px_2px_0px_0px_#FF3000]"
                    : "border-black/30 bg-white text-black hover:border-black hover:bg-white"
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
              className={`border-2 px-3 py-1 font-bold transition-colors ${
                measuredOnly ? "border-black bg-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "border-black/30 bg-white text-black hover:border-black"
              }`}
            >
              仅看有探针实测
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 font-mono text-xs font-black uppercase tracking-wider text-black/60 hover:text-swiss-accent hover:underline"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 重置筛选
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="px-4 py-8 sm:px-8 lg:px-12">
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
          selectedModel={selectedModel}
          isImage={selectedModelType === "image"}
        />

        {/* 场景预设卡片 */}
        <RelayScenarioTabs activePreset={presetFilter} onSelectPreset={setPresetFilter} />

        {/* 预估计算器 */}
        <RelayCostEstimator selectedModel={selectedModel} sites={rows} />

        {/* 决策大盘 Title & Summary Counters */}
        <div className="mb-6 grid gap-4 border-b-4 border-black pb-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="font-mono text-xs font-black uppercase tracking-[0.2em] text-swiss-accent flex items-center gap-2">
              <span className="h-2 w-2 bg-swiss-accent" />
              Cross-site comparison observatory
            </div>
            <h2 className="mt-2 break-all text-3xl font-black tracking-[-0.04em] sm:text-5xl text-black">
              {selectedModel}
            </h2>
          </div>
          <div className="flex flex-wrap border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {[
              ["MATCHED", `${rows.length} 站`],
              ["MEASURED", `${measuredCount} 站`],
              ["LOWEST", lowestPriceLabel],
              ["SPREAD", priceSpread == null ? "--" : `${priceSpread.toFixed(1)}×`],
            ].map(([label, value]) => (
              <div key={label} className="min-w-[100px] border-b-2 sm:border-b-0 border-r-2 border-black px-4 py-2.5 last:border-r-0">
                <div className="font-mono text-[9px] font-black uppercase tracking-widest text-black/45">{label}</div>
                <div className="mt-1 font-mono text-base font-black text-black">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 表头（桌面端） */}
        <div className="hidden grid-cols-[130px_minmax(250px,1.4fr)_minmax(250px,1.2fr)_minmax(160px,0.8fr)_minmax(130px,0.6fr)_40px] border-2 border-black bg-black font-mono text-[11px] font-black uppercase tracking-[0.16em] text-white lg:grid">
          {["Rank & Tier", "Station & Features", "Effective Price & Formula", "Availability & Latency", "Signal", ""].map((label) => (
            <div key={label || "expand"} className="border-r border-white/20 px-3.5 py-3 last:border-r-0">
              {label}
            </div>
          ))}
        </div>

        {/* 表格主体 */}
        <div className="border-2 border-black border-t-0 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {rows.length === 0 ? (
            <div className="bg-[#FAF9F5] px-6 py-20 text-center">
              <Activity className="mx-auto h-10 w-10 text-black/40" />
              <h3 className="mt-4 text-xl font-black">没有符合当前条件的站点</h3>
              <p className="mt-2 font-mono text-sm text-black/60 max-w-xl mx-auto leading-relaxed">
                {matchedSiteAcrossModels ? (
                  <span>
                    已收录站点 <strong className="text-swiss-accent font-black">{matchedSiteAcrossModels.name} ({matchedSiteAcrossModels.domain})</strong>，但该站暂未提供当前选中的 [{selectedModel}] 模型报价。<br />
                    可以去 <Link href={`/table/relay_sites_tracker/${encodeURIComponent(matchedSiteAcrossModels.id)}`} className="font-black text-black underline hover:text-swiss-accent">【{matchedSiteAcrossModels.name} 详情页】</Link> 查看其支持的全部模型，或在顶部尝试切换其他模型。
                  </span>
                ) : (
                  "降低可用率阈值、关闭“仅看有实测数据”或重置搜索。"
                )}
              </p>
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
                  className={`group border-b-2 border-black bg-white last:border-b-0 open:bg-[#FAF9F5] transition-colors ${
                    isT1 ? "border-l-4 border-l-black" : "border-l-4 border-l-transparent"
                  }`}
                >
                  <summary className="grid cursor-pointer list-none gap-4 p-4 transition-colors hover:bg-[#F9F8F3] lg:grid-cols-[130px_minmax(250px,1.4fr)_minmax(250px,1.2fr)_minmax(160px,0.8fr)_minmax(130px,0.6fr)_40px] lg:items-center lg:gap-3 lg:p-4 [&::-webkit-details-marker]:hidden">
                    {/* 1. 排位标尺与价格梯队 */}
                    <RankTierBadge row={row} />

                    {/* 2. 站点名称与决策亮点微标签 */}
                    <div className="min-w-0 pr-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/table/relay_sites_tracker/${encodeURIComponent(row.site.id)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate text-lg font-black hover:text-swiss-accent text-black"
                        >
                          {row.site.name}
                        </Link>
                        {row.site.domain && (
                          <a
                            href={domainHref(row.site.domain)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-xs text-black/40 hover:text-swiss-accent inline-flex items-center gap-0.5"
                          >
                            <span>{domainDisplay(row.site.domain)}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                      <div className="mt-2">
                        <SmartDecisionHighlightTags
                          isLowestPrice={isLowest}
                          ttftMs={row.site.performance?.ttftP50Ms ?? null}
                          availability7d={row.site.performance?.availability7d ?? null}
                          qcScore={qc?.score ?? null}
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
                      <ChevronDown className="h-5 w-5 text-black/40 transition-transform duration-200 group-open:rotate-180 group-hover:text-black" />
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
            <section className="border-t-2 border-dashed border-black/35 bg-[#FAF9F5] p-5 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-black/20 pb-3">
                <div>
                  <div className="font-mono text-xs font-black uppercase tracking-[0.2em] text-swiss-accent">
                    Catalog coverage
                  </div>
                  <h3 className="mt-1 text-xl font-black">已收录但暂无「{selectedModel}」报价</h3>
                </div>
                <span className="font-mono text-sm font-black">{unmatchedSites.length} 站</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unmatchedSites.map((site) => (
                  <Link
                    key={site.id}
                    href={`/table/relay_sites_tracker/${encodeURIComponent(site.id)}`}
                    className="border-2 border-black/20 bg-white p-3.5 transition-all hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="font-black text-black">{site.name}</div>
                    <div className="mt-1 truncate font-mono text-xs text-black/50">{site.domain || "NO DOMAIN"}</div>
                    <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-black/45">
                      {site.offers.length > 0 ? `其他模型 ${site.offers.length} 条` : "暂无模型明细"}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 底部说明 */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-black/45">
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
