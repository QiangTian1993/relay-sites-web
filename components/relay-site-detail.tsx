"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { KeyedRecord } from "@/lib/types";
import { formatRate } from "@/lib/matrix";
import { modelOfferLabel, parseAccessSignals, type ModelOfferSummary } from "@/lib/relay-product";
import { toNumber, truncate } from "@/lib/record-utils";
import { computeModelCoverage } from "@/lib/model-coverage";
import type { QCRecord } from "@/lib/qc-store";
import { ChangeBadge, RiskBadge, detectChangeDirection, detectRisk } from "./badges";
import {
  IconArrowLeft,
  IconArrowRight,
  IconCircleCheck,
  IconCircleDot,
  IconClose,
  IconExtLink,
  IconSearch,
} from "./icons";

interface Props {
  record: KeyedRecord;
  performance: KeyedRecord | null;
  groups: KeyedRecord[];
  modelOffers: ModelOfferSummary[];
  qcRecord?: QCRecord | null;
}

const MODEL_PAGE_SIZE = 50;

export function RelaySiteDetail({ record, performance, groups, modelOffers, qcRecord }: Props) {
  const [modelSearch, setModelSearch] = useState("");
  const [modelPage, setModelPage] = useState(0);
  const [showAllGroups, setShowAllGroups] = useState(true);
  const [copiedDomain, setCopiedDomain] = useState(false);

  function copyText(text: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  }

  const name = String(record["名称"] ?? "未命名站点");
  const domain = String(record["域名"] ?? "");
  const note = String(record["备注"] ?? "");
  const modelCheck = String(record["模型检测"] ?? "");
  const access = parseAccessSignals(note);
  const providerRates = String(record["分组倍率"] ?? "")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  const filteredOffers = useMemo(() => {
    const query = modelSearch.trim().toLocaleLowerCase();
    if (!query) return modelOffers;
    return modelOffers.filter((offer) => offer.name.toLocaleLowerCase().includes(query));
  }, [modelOffers, modelSearch]);

  useEffect(() => setModelPage(0), [modelSearch]);

  const modelPageCount = Math.max(1, Math.ceil(filteredOffers.length / MODEL_PAGE_SIZE));
  const safeModelPage = Math.min(modelPage, modelPageCount - 1);
  const visibleOffers = filteredOffers.slice(safeModelPage * MODEL_PAGE_SIZE, (safeModelPage + 1) * MODEL_PAGE_SIZE);
  const visibleGroups = showAllGroups ? groups : groups.slice(0, 12);
  const evidenceCount = Number(modelOffers.length > 0) + Number(groups.length > 0) + Number(Boolean(performance));
  const lastProbe = String(performance?.last_probe_at ?? "");
  const probeAgeDays = lastProbe ? (Date.now() - new Date(lastProbe).getTime()) / 86_400_000 : null;

  // 涨价/降价 + 风控（PRD v1 SHOULD 1/3 + MUST 6）
  const siteChange = detectChangeDirection(groups as Array<{ change_direction?: unknown; change_delta?: unknown }>);
  const siteRisk = detectRisk(performance);
  // F.03: 性能窗口 24h / 7d 切换（PRD F.03）
  const [perfWindow, setPerfWindow] = useState<"24h" | "7d">("7d");
  const availabilityValue = perfWindow === "24h" ? toNumber(performance?.availability_24h) : toNumber(performance?.availability_7d);

  // F.04: 分组折叠（PRD F.04）—— 状态持久化到 localStorage
  const STORAGE_KEY = `relay-group-collapse-${record.__id}`;
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setCollapsedGroups(new Set(JSON.parse(saved)));
    } catch {}
  }, [STORAGE_KEY]);
  function toggleGroupCollapse(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  // 综合服务与特征提取
  const noteText = note.toLowerCase();
  const hasInvoice = noteText.includes("开票");
  const hasRefund = noteText.includes("退款");
  const isPurePro = noteText.includes("纯血") || noteText.includes("官网") || noteText.includes("pro池");
  const noVerify = noteText.includes("免验证");
  const frameworkName = String(record["框架"] ?? "通用中转框架");
  const providersList = Array.isArray(record["Provider"]) ? (record["Provider"] as string[]) : String(record["Provider"] ?? "").split(",").map(s => s.trim()).filter(Boolean);

  return (
    <div className="pb-20">
      <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
          <Link href="/table/relay_sites_tracker" className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-zinc-500 hover:text-[#E03E1A] transition-colors">
            <IconArrowLeft className="h-4 w-4" /> 返回选站大盘
          </Link>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-zinc-400">
                <span>站点决策硬核情报单</span>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 border border-zinc-200/60">{frameworkName} 架构</span>
              </div>
              <h1 className="mt-2.5 break-words text-3xl font-extrabold text-zinc-900 tracking-tight sm:text-5xl">{name}</h1>
              {domain && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a href={domainHref(domain)} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 font-mono text-xs text-zinc-500 hover:text-[#E03E1A] transition-colors">
                    <span className="truncate">{domainDisplay(domain)}</span><IconExtLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(domainDisplay(domain))}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors shadow-2xs"
                  >
                    {copiedDomain ? "✓ 已复制" : "复制域名"}
                  </button>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <AccessTags access={access} />
                {hasInvoice && <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-blue-700">可开发票</span>}
                {hasRefund && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-700">退款保障</span>}
                {isPurePro && <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-purple-700">官网纯血Pro</span>}
                {noVerify && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-amber-700">免验证注册</span>}
                {modelCheck && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-700">
                    {modelCheck.includes("通过") && !modelCheck.includes("不足") ? "模型检测·通过" : "模型检测·见详情"}
                  </span>
                )}
                <EvidenceTag available={modelOffers.length > 0} label={modelOffers.length > 0 ? `${modelOffers.length} 个可用模型` : "未录入模型明细"} />
                {performance && <EvidenceTag available={false} label="第三方实测打点" />}
                <ChangeBadge direction={siteChange.direction} delta={siteChange.delta} />
                <RiskBadge level={siteRisk} />
              </div>
            </div>

            {domain && (
              <a href={domainHref(domain)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-800">
                访问站点注册/充值 <IconExtLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 高信息密度指标看板 */}
      <section className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-2 rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden divide-y divide-zinc-100 lg:divide-y-0 lg:divide-x lg:grid-cols-5">
          <Metric label="全站最低倍率" value={formatRate(toNumber(record["最低倍率"]))} note="基础折算参考" />
          <Metric label="包含模型总数" value={modelOffers.length > 0 ? `${modelOffers.length} 个` : "--"} note="覆盖模型大表" />
          <Metric label="计费分组" value={groups.length > 0 ? `${groups.length} 个` : "--"} note="分组计费梯度" />
          <Metric label="7日可用率" value={formatPercent(toNumber(performance?.availability_7d), false)} note={performance ? "实测稳定度" : "暂无打点"} />
          <Metric label="P50 首字延迟" value={performance?.ttft_p50_ms ? `${performance.ttft_p50_ms} ms` : "--"} note="TTFT 探针响应" />
        </div>
      </section>

      {/* 01 综合硬核决策与服务条款网格 */}
      <DetailSection number="01" title="综合选型决策与服务保障">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 font-mono text-xs">
          <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
            <div className="font-bold text-xs text-zinc-900 uppercase tracking-wider mb-2">🎯 综合买家选型建议</div>
            <p className="text-zinc-600 leading-relaxed text-xs whitespace-pre-line">
              {(() => {
                // 1. 清理探针机械前缀与自动化系统日志
                const lines = note
                  .split("\n")
                  .map((l) => l.trim())
                  .filter(Boolean);

                const cleanLines = lines
                  .map((line) => {
                    let l = line;
                    l = l.replace(/^\[探针实测\].*$/i, "");
                    l = l.replace(/^\[Status探针.*$/i, "");
                    l = l.replace(/^status探针正常\s*\/?\s*/i, "");
                    l = l.replace(/^注册(开|关)\s*\/.*$/i, "");
                    l = l.replace(/^Error:.*$/i, "");
                    l = l.replace(/^spawnSync.*$/i, "");
                    return l.trim();
                  })
                  .filter(Boolean);

                let cleanedHumanNote = cleanLines.join(" ").replace(/\s+/g, " ").trim();
                // 过滤与移除 aio / cch 负载推荐词句
                cleanedHumanNote = cleanedHumanNote
                  .replace(/，?适合用\s*cch\s*或\s*aio\s*做负载的用户/gi, "")
                  .replace(/，?适合用\s*aio\s*做负载的用户/gi, "")
                  .replace(/，?用\s*aio\s*做负载/gi, "")
                  .replace(/\baio\b/gi, "")
                  .replace(/；\s*；/g, "；")
                  .trim();

                // 2. 提炼指标与保障要点
                const parts: string[] = [];
                const avail7d = toNumber(performance?.availability_7d);
                const ttft = toNumber(performance?.ttft_p50_ms);

                if (avail7d != null && avail7d >= 99) {
                  parts.push(`7日可用率 ${avail7d.toFixed(1)}%（稳定度优秀）`);
                } else if (avail7d != null && avail7d < 95) {
                  parts.push(`近期可用率 ${avail7d.toFixed(1)}%（建议做备用路由）`);
                }

                if (ttft != null && ttft > 0) {
                  if (ttft < 1000) parts.push(`P50首字延迟仅 ${ttft}ms`);
                  else if (ttft > 2500) parts.push(`P50首字延迟约 ${(ttft / 1000).toFixed(1)}s`);
                }

                if (hasRefund) parts.push("支持退款保障");
                if (hasInvoice) parts.push("支持开发票");
                if (noVerify) parts.push("免验证极速开箱");
                if (isPurePro) parts.push("包含官网纯血Pro池");

                const synthHeader = parts.length > 0 ? `【实测与保障】${parts.join(" · ")}。` : "";

                if (cleanedHumanNote) {
                  return synthHeader
                    ? `${synthHeader}\n\n【选型与运营情报】\n${cleanedHumanNote}`
                    : `【选型与运营情报】\n${cleanedHumanNote}`;
                }

                return synthHeader
                  ? `${synthHeader}\n\n【建议】站点整体指标表现良好，无特殊限流风控，适合直接试用或小额充值观察。`
                  : "该站点无特殊风控与限量限制。建议先小额充值试用，重点测算高频模型的首字延迟（TTFT）与高峰期分组倍率表现。";
              })()}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
            <div className="font-bold text-xs text-zinc-900 uppercase tracking-wider mb-2">🛡️ 站点服务保障</div>
            <ul className="space-y-1.5 text-zinc-600">
              <li className="flex items-center justify-between border-b border-zinc-100 pb-1">
                <span>发票报销:</span>
                <span className="font-semibold text-zinc-900">{hasInvoice ? "支持开票" : "未标注支持"}</span>
              </li>
              <li className="flex items-center justify-between border-b border-zinc-100 pb-1">
                <span>退款政策:</span>
                <span className="font-semibold text-zinc-900">{hasRefund ? "支持无手续费退款" : "参考站点细则"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>注册要求:</span>
                <span className="font-semibold text-zinc-900">{noVerify ? "无需手机/邮箱验证" : "常规注册"}</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
            <div className="font-bold text-xs text-zinc-900 uppercase tracking-wider mb-2">⚡ 网络健康度快照</div>
            <ul className="space-y-1.5 text-zinc-600">
              <li className="flex items-center justify-between border-b border-zinc-100 pb-1">
                <span>24h 可用率:</span>
                <span className="font-semibold text-zinc-900">{formatPercent(toNumber(performance?.availability_24h), false)}</span>
              </li>
              <li className="flex items-center justify-between border-b border-zinc-100 pb-1">
                <span>最后打点时间:</span>
                <span className="font-semibold text-zinc-900">{performance?.last_probe_at ? String(performance.last_probe_at).slice(0, 16) : "暂无打点"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>连续失败数:</span>
                <span className="font-semibold text-emerald-700">{String(performance?.consecutive_failures ?? 0)} 次</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2 mb-3">
              <div className="font-bold text-xs text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                🔬 模型真实性与质检
              </div>
              <Link
                href={`/detector?siteId=${encodeURIComponent(String(record["站点ID"] ?? ""))}`}
                className="font-mono text-[11px] font-semibold text-white bg-zinc-900 px-2 py-0.5 rounded-lg hover:bg-[#E03E1A] transition-colors flex items-center gap-1 shadow-2xs"
              >
                ⚡ 在线质检 →
              </Link>
            </div>

            {qcRecord ? (
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                  <span className="text-zinc-500">质检状态:</span>
                  <span className={`font-semibold rounded-full border px-2 py-0.5 text-[11px] ${
                    qcRecord.verdict === "PASS" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
                    qcRecord.verdict === "FAIL" ? "border-rose-200 bg-rose-50 text-rose-800" :
                    "border-amber-200 bg-amber-50 text-amber-800"
                  }`}>
                    {qcRecord.verdict === "PASS" ? "✅" : qcRecord.verdict === "FAIL" ? "❌" : "⚠️"} {qcRecord.score}分 · {qcRecord.verdict === "PASS" ? "验证通过" : qcRecord.verdict === "FAIL" ? "质检不合格" : "存在风险"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                  <span className="text-zinc-500">Juice 思考段:</span>
                  <span className="font-semibold text-zinc-900">{qcRecord.juiceVerdict || "已完成检测"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                  <span className="text-zinc-500">行为分布:</span>
                  <span className="font-semibold text-zinc-900">
                    Sol {qcRecord.probabilities?.sol ?? "--"}% | Terra {qcRecord.probabilities?.terra ?? "--"}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">篡改/覆盖:</span>
                  <span className={`font-semibold ${qcRecord.tamperDetected ? "text-rose-600" : "text-emerald-700"}`}>
                    {qcRecord.tamperDetected ? "⚠️ 检测到篡改" : "无改写 / Prompt正常"}
                  </span>
                </div>
              </div>
            ) : modelCheck ? (
              <p className="text-zinc-600 leading-relaxed text-xs whitespace-pre-line mb-3">
                {modelCheck}
              </p>
            ) : (
              <div className="space-y-2 font-mono text-xs text-zinc-500 py-1">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                  <span>质检状态:</span>
                  <span className="font-medium text-zinc-400 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px]">
                    未测试
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-400 pt-1">
                  该站点尚未在质检中心记录测试数据。点击右上角即可发起模型真伪与混用检测。
                </p>
              </div>
            )}
          </div>
        </div>
      </DetailSection>

      {/* 02 架构与 Provider 部署 */}
      <DetailSection number="02" title="架构与 Provider 渠道明细">
        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded-md bg-zinc-900 px-3 py-1 font-mono text-xs font-semibold text-white shadow-2xs">
            架构系统: {frameworkName}
          </span>
          {providersList.map(p => (
            <span key={p} className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs font-medium text-zinc-700 shadow-2xs">
              Provider: {p}
            </span>
          ))}
        </div>

        {providerRates.length > 0 ? (
          <div className="grid rounded-xl border border-zinc-200/80 bg-white overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 sm:grid-cols-2 lg:grid-cols-3">
            {providerRates.map((rate) => (
              <div key={rate} className="bg-white px-4 py-3 font-mono text-xs font-semibold text-zinc-800">{rate}</div>
            ))}
          </div>
        ) : (
          <EmptyState text="暂无 Provider 倍率明细" />
        )}
        <p className="mt-3 text-xs leading-5 text-zinc-500">全站最低倍率可能来自特殊分组或非目标模型，具体决策请以下方模型和分组明细为准。</p>
      </DetailSection>

      <DetailSection number="03" title={`全量模型覆盖清单（${modelOffers.length} 个模型）`}>
        {modelOffers.length > 0 ? (
          (() => {
            const cov = computeModelCoverage(modelOffers);
            const typeLabel = cov.imageCount > 0 ? `${cov.textCount} 文本 · ${cov.imageCount} 图像` : "全部文本模型";
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 rounded-xl border border-zinc-200/80 bg-white overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 sm:grid-cols-4">
                  <CoverageCard label="模型总数" value={cov.total.toString()} sub="支持的模型" />
                  <CoverageCard label="最低倍率" value={cov.lowestRate != null ? formatRate(cov.lowestRate) : "--"} sub="站内最便宜" tone="accent" />
                  <CoverageCard label="覆盖厂商" value={cov.providers.length.toString()} sub={cov.providers.slice(0, 3).join(" · ") || "未知"} />
                  <CoverageCard label="类型分布" value={cov.imageCount > 0 ? `${cov.textCount}T + ${cov.imageCount}I` : "100% T"} sub={typeLabel} />
                </div>
                <p className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-3 font-mono text-xs leading-relaxed text-amber-900">
                  跨站比价（"GPT-5.6 在所有站多少钱"）见 <Link href="/relay" className="font-bold underline text-[#E03E1A] hover:text-zinc-900">按模型查 (Relay Pricing Observatory) →</Link>。
                </p>
              </div>
            );
          })()
        ) : <EmptyState text="暂无模型明细" />}
      </DetailSection>

      <DetailSection number="04" title="网络性能打点看板">
        {performance ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">测试窗口</span>
                <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPerfWindow("24h")}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors ${perfWindow === "24h" ? "bg-white text-zinc-900 shadow-2xs font-semibold" : "text-zinc-500 hover:text-zinc-900"}`}
                  >
                    24 小时
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerfWindow("7d")}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-medium transition-colors ${perfWindow === "7d" ? "bg-white text-zinc-900 shadow-2xs font-semibold" : "text-zinc-500 hover:text-zinc-900"}`}
                  >
                    7 日
                  </button>
                </div>
              </div>
              <span className="font-mono text-xs text-zinc-400">* 探针数据来自第三方测试，仅供参考</span>
            </div>
            <div className="grid grid-cols-2 rounded-xl border border-zinc-200/80 bg-white overflow-hidden divide-y divide-zinc-100 sm:grid-cols-3 lg:grid-cols-4">
              <EvidenceMetric label="最近探针成功率" value={formatPercent(toNumber(performance.success_rate), true)} />
              <EvidenceMetric
                label={perfWindow === "24h" ? "24 小时可用率" : "7 日可用率"}
                value={formatPercent(availabilityValue, false)}
              />
              <EvidenceMetric label="TTFT P50" value={formatDuration(toNumber(performance.ttft_p50_ms))} />
              <EvidenceMetric label="P95 延迟" value={formatDuration(toNumber(performance.latency_p95_ms))} />
              <EvidenceMetric label="平均 TPS" value={formatPlain(toNumber(performance.tps_avg))} />
              <EvidenceMetric label="连续失败" value={formatPlain(toNumber(performance.consecutive_failures))} />
              <EvidenceMetric
                label={perfWindow === "24h" ? "7 日可用率（对比）" : "24 小时可用率（对比）"}
                value={formatPercent(perfWindow === "24h" ? toNumber(performance.availability_7d) : toNumber(performance.availability_24h), false)}
              />
              <EvidenceMetric label="最后探针" value={formatDateTime(lastProbe)} note={formatProbeAge(probeAgeDays)} />
            </div>
          </div>
        ) : <EmptyState text="暂无第三方探针数据" />}
      </DetailSection>

      <DetailSection number="05" title={`站点分组与倍率梯度（${groups.length} 个分组）`}>
        {groups.length > 0 ? (
          <>
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = new Set<string>();
                  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
                  setCollapsedGroups(next);
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-2xs"
              >
                全部展开
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new Set(visibleGroups.map((g) => String(g.__id)));
                  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
                  setCollapsedGroups(next);
                }}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-zinc-800 transition-colors shadow-2xs"
              >
                全部折叠
              </button>
              <span className="ml-auto font-mono text-xs text-zinc-400">{collapsedGroups.size} / {groups.length} 已折叠</span>
            </div>
            <div className="rounded-xl border border-zinc-200/80 bg-white overflow-hidden divide-y divide-zinc-100">
              {visibleGroups.map((group) => {
                const dir = String(group.change_direction ?? "").toLowerCase();
                const delta = Math.abs(toNumber(group.change_delta) ?? 0);
                const groupId = String(group.__id);
                const isCollapsed = collapsedGroups.has(groupId);
                return (
                  <div key={group.__id} className={`p-4 transition-colors ${isCollapsed ? "bg-zinc-50/50" : ""}`}>
                    {/* F.04: 折叠 header 行（可点击） */}
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(groupId)}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-mono text-xs text-zinc-400 transition-transform inline-block ${isCollapsed ? "" : "rotate-90"}`}>▸</span>
                          <span className="text-sm font-bold text-zinc-900">{String(group.group_name ?? "未命名分组")}</span>
                          {(dir === "up" || dir === "down") && delta > 0 && (
                            <ChangeBadge
                              direction={dir as "up" | "down"}
                              delta={delta}
                              compact
                            />
                          )}
                        </div>
                        <div className="mt-1 truncate font-mono text-xs text-zinc-400">{formatGroupSource(group.rate_source)}</div>
                      </div>
                      <div className="font-mono text-sm font-bold text-zinc-900 whitespace-nowrap">{formatGroupRate(group)}</div>
                    </button>
                    {/* F.04: 展开内容 */}
                    {!isCollapsed && (
                      <div className="mt-3 rounded-lg bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-600 border border-zinc-100">
                        {String(group.remark ?? "无额外限制说明")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {groups.length > 12 && (
              <button type="button" onClick={() => setShowAllGroups((value) => !value)} className="mt-3 text-xs font-semibold text-zinc-600 hover:text-zinc-900 underline">
                {showAllGroups ? "收起分组" : `查看全部 ${groups.length} 个分组`}
              </button>
            )}
          </>
        ) : <EmptyState text="暂无分组和限制明细" />}
      </DetailSection>

      {/* 06 真实性与防混用质检档案 */}
      <DetailSection number="06" title="模型真实性与防混用质检实测档案">
        {qcRecord ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-zinc-100 pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-zinc-900 px-3.5 py-1.5 text-white font-mono font-bold text-lg shadow-sm">
                  {qcRecord.score} 分
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-[#E03E1A]">
                    多轮加权评级: {qcRecord.outcomeCode === "insufficient_evidence" ? "证据不足 · 建议复测" : qcRecord.verdict === "FAIL" ? "F 级 · 检出欺诈改写" : qcRecord.score >= 90 ? "S 级 · 极高保真" : qcRecord.score >= 75 ? "A 级 · 良好达标" : qcRecord.score >= 60 ? "B 级 · 存在风险" : "F 级 · 严重降级/掺水"}
                  </div>
                  <div className="text-sm font-bold text-zinc-900 mt-0.5">
                    {qcRecord.verdictText || "综合质检测试结论"}
                  </div>
                </div>
              </div>
              <Link
                href={`/detector?siteId=${encodeURIComponent(String(record["站点ID"] || record.__id))}&model=gpt-5.6-sol`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-[#E03E1A] transition-colors shadow-2xs"
              >
                ⚡ 发起在线复测
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
                <div className="text-zinc-400 text-[10px] font-semibold uppercase">单次最新得分</div>
                <div className="text-base font-bold text-zinc-900 mt-1">{qcRecord.currentScore ?? qcRecord.score} 分</div>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
                <div className="text-zinc-400 text-[10px] font-semibold uppercase">累计测试轮次</div>
                <div className="text-base font-bold text-zinc-900 mt-1">{qcRecord.historicalRounds || 1} 轮</div>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
                <div className="text-zinc-400 text-[10px] font-semibold uppercase">历史通过率</div>
                <div className="text-base font-bold text-zinc-900 mt-1">{qcRecord.passRate != null ? `${qcRecord.passRate}%` : "--"}</div>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
                <div className="text-zinc-400 text-[10px] font-semibold uppercase">历史波动区间</div>
                <div className="text-base font-bold text-zinc-900 mt-1">
                  {qcRecord.scoreMin != null && qcRecord.scoreMax != null ? `${qcRecord.scoreMin} ~ ${qcRecord.scoreMax} 分` : "--"}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3 font-mono text-xs">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
                <span className="font-semibold text-zinc-900 block mb-1">行为指纹概率分布:</span>
                <span className="text-zinc-600">
                  Sol: {qcRecord.probabilities?.sol != null ? `${Math.round(qcRecord.probabilities.sol)}%` : "--"} · 
                  Terra: {qcRecord.probabilities?.terra != null ? `${Math.round(qcRecord.probabilities.terra)}%` : "--"} · 
                  防篡改: {qcRecord.tamperDetected ? "⚠️ 检测到篡改" : "✅ 正常"}
                </span>
              </div>
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
                <span className="font-semibold text-zinc-900 block mb-1">测试时间与状态码:</span>
                <span className="text-zinc-600">
                  {formatDateTime(qcRecord.testedAt)} · 状态: {qcRecord.outcomeCode || qcRecord.verdict}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-6 text-center">
            <p className="font-sans text-xs text-zinc-500 mb-3">
              该站点尚未在本地质检中心记录测试数据。您可以使用双引擎流水线对该站发起模型真伪与混用检测。
            </p>
            <Link
              href={`/detector?siteId=${encodeURIComponent(String(record["站点ID"] || record.__id))}&model=gpt-5.6-sol`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-[#E03E1A] transition-colors shadow-2xs"
            >
              ⚡ 立即前往质检中心检测该站点
            </Link>
          </div>
        )}
      </DetailSection>

      <DetailSection number="07" title="一键客户端接入与环境配置">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 font-mono text-xs">
          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4">
            <div className="font-semibold text-zinc-900 uppercase tracking-wider mb-1 text-xs">Standard OpenAI / OneAPI Base</div>
            <div className="p-2.5 bg-zinc-900 text-emerald-400 rounded-lg font-mono font-medium select-all break-all text-xs">
              https://{domainDisplay(domain)}/v1
            </div>
            <div className="mt-2 text-zinc-400 text-[11px]">适用于 NextChat / LobeChat / CherryStudio 等支持自定义 Base 的客户端</div>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4">
            <div className="font-semibold text-zinc-900 uppercase tracking-wider mb-1 text-xs">Claude Code (Terminal CLI)</div>
            <div className="p-2.5 bg-zinc-900 text-emerald-400 rounded-lg font-mono font-medium select-all break-all text-xs">
              export ANTHROPIC_BASE_URL=https://{domainDisplay(domain)}
            </div>
            <div className="mt-2 text-zinc-400 text-[11px]">在命令行终端执行上述命令即可直接接入该中转站</div>
          </div>

          <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4">
            <div className="font-semibold text-zinc-900 uppercase tracking-wider mb-1 text-xs">Cursor IDE (OpenAI Key)</div>
            <div className="p-2.5 bg-zinc-900 text-emerald-400 rounded-lg font-mono font-medium select-all break-all text-xs">
              https://{domainDisplay(domain)}/v1
            </div>
            <div className="mt-2 text-zinc-400 text-[11px]">在 Cursor -&gt; Models -&gt; Override OpenAI Base URL 中填入</div>
          </div>
        </div>
      </DetailSection>
    </div>
  );
}

function DetailSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-7">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-xs font-bold text-white shadow-2xs">{number}</span>
        <h2 className="text-base font-bold text-zinc-900 tracking-tight sm:text-lg">{title}</h2>
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm">
        {children}
      </div>
    </section>
  );
}

function CoverageCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "accent" }) {
  const toneClass = tone === "accent" ? "text-[#E03E1A]" : "text-zinc-900";
  return (
    <div className="min-h-[90px] bg-zinc-50/40 p-4">
      <div className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
      <div className={`mt-1.5 font-mono text-2xl font-extrabold leading-none tracking-tight ${toneClass}`}>{value}</div>
      <div className="mt-1 truncate font-mono text-xs text-zinc-400" title={sub}>{sub}</div>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="min-h-[96px] p-4 sm:p-5">
      <div className="font-mono text-xs uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-1.5 text-2xl font-extrabold text-zinc-900 tracking-tight sm:text-3xl">{value}</div>
      <div className="mt-1 font-mono text-xs text-zinc-400">{note}</div>
    </div>
  );
}

function EvidenceMetric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="p-4 bg-white">
      <div className="font-mono text-xs uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-1.5 font-mono text-base font-bold text-zinc-900">{value}</div>
      {note && <div className="mt-0.5 font-mono text-xs text-zinc-400">{note}</div>}
    </div>
  );
}

function AccessTags({ access }: { access: ReturnType<typeof parseAccessSignals> }) {
  return (
    <>
      {access.registration === "open" && <Tag label="可注册" tone="success" />}
      {access.registration === "closed" && <Tag label="关闭注册" tone="warning" />}
      {access.verification === "none" && <Tag label="免验证" tone="info" />}
      {access.verification === "email" && <Tag label="邮箱验证" />}
      {access.monitor === "on" && <Tag label="监控中" tone="success" />}
      {access.monitor === "off" && <Tag label="未监控" tone="warning" />}
    </>
  );
}

function EvidenceTag({ available, label }: { available: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${available ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-zinc-50 text-zinc-500"}`}>
      {available ? <IconCircleCheck className="h-3.5 w-3.5 text-emerald-600" /> : <IconCircleDot className="h-3.5 w-3.5 text-zinc-400" />}{label}
    </span>
  );
}

function Tag({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warning" | "info" }) {
  const classes = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : tone === "info" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-zinc-200 bg-zinc-50 text-zinc-600";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold ${classes}`}>{label}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8 text-center font-mono text-xs text-zinc-400">{text}</div>;
}

function domainHref(domain: string) {
  return /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
}

function domainDisplay(domain: string) {
  if (!domain) return "";
  return domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
}

function formatPercent(value: number | null, ratio: boolean) {
  if (value == null) return "--";
  const percent = ratio ? value * 100 : value;
  return `${percent >= 99.95 ? percent.toFixed(0) : percent.toFixed(1)}%`;
}

function formatDuration(value: number | null) {
  if (value == null) return "--";
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`;
}

function formatPlain(value: number | null) {
  return value == null ? "--" : String(value);
}

function formatDateTime(value: string) {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("zh-CN", { hour12: false });
}

/** 探针距今多久（"刚刚 / X 小时前 / X 天前 / X 周前"） */
function formatProbeAge(days: number | null): string {
  if (days == null || !Number.isFinite(days)) return "距上次 --";
  if (days < 1 / 24) return "距上次 < 1 小时";
  if (days < 1) return `距上次 ${Math.round(days * 24)} 小时`;
  if (days < 7) return `距上次 ${days.toFixed(1)} 天`;
  if (days < 30) return `距上次 ${Math.floor(days / 7)} 周`;
  return `距上次 ${Math.floor(days / 30)} 个月`;
}

function formatGroupSource(value: unknown) {
  const source = Array.isArray(value) ? value.join(" / ") : String(value ?? "");
  return source || "来源未知";
}

function formatGroupRate(group: KeyedRecord) {
  const min = toNumber(group.rate_min);
  const max = toNumber(group.rate_max);
  if (min == null && max == null) return String(group.rate_values ?? "--");
  if (min === max || max == null) return formatRate(min);
  return `${formatRate(min)} - ${formatRate(max)}`;
}
