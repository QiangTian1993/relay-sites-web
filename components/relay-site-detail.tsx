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
  const [showAllGroups, setShowAllGroups] = useState(false);
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
      <header className="border-b-2 border-swiss-fg swiss-grid">
        <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-6 sm:py-8">
          <Link href="/table/relay_sites_tracker" className="inline-flex min-h-11 items-center gap-2 font-mono text-sm font-black uppercase tracking-widest hover:text-swiss-accent">
            <IconArrowLeft className="h-4 w-4" /> 返回选站大盘
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-swiss-fg/50">
                <span>站点决策硬核情报单</span>
                <span className="bg-black/10 px-1.5 py-0.5 text-[11px] font-black text-black">{frameworkName} 架构</span>
              </div>
              <h1 className="mt-2 break-words text-4xl font-black leading-none sm:text-6xl">{name}</h1>
              {domain && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a href={domainHref(domain)} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1.5 font-mono text-sm text-swiss-fg/60 hover:text-swiss-accent">
                    <span className="truncate">{domainDisplay(domain)}</span><IconExtLink className="h-4 w-4 shrink-0" />
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText(domainDisplay(domain))}
                    className="inline-flex items-center gap-1 border border-black/20 bg-white px-2 py-0.5 font-mono text-xs font-bold text-black/70 hover:bg-black hover:text-white transition-colors"
                  >
                    {copiedDomain ? "✓ 已复制" : "复制域名"}
                  </button>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <AccessTags access={access} />
                {hasInvoice && <span className="border border-blue-600 bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">可开发票</span>}
                {hasRefund && <span className="border border-emerald-600 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700">退款保障</span>}
                {isPurePro && <span className="border border-purple-600 bg-purple-50 px-2 py-0.5 font-mono text-xs font-bold text-purple-700">官网纯血Pro</span>}
                {noVerify && <span className="border border-amber-600 bg-amber-50 px-2 py-0.5 font-mono text-xs font-bold text-amber-700">免验证注册</span>}
                {modelCheck && (
                  <span className="border border-emerald-600 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700">
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
              <a href={domainHref(domain)} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 bg-swiss-fg px-5 text-sm font-black text-swiss-bg transition-colors hover:bg-swiss-accent">
                访问站点注册/充值 <IconExtLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 高信息密度指标看板 */}
      <section className="border-b-2 border-swiss-fg">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 px-5 sm:px-6 lg:grid-cols-5">
          <Metric label="全站最低倍率" value={formatRate(toNumber(record["最低倍率"]))} note="基础折算参考" />
          <Metric label="包含模型总数" value={modelOffers.length > 0 ? `${modelOffers.length} 个` : "--"} note="覆盖模型大表" />
          <Metric label="计费分组" value={groups.length > 0 ? `${groups.length} 个` : "--"} note="分组计费梯度" />
          <Metric label="7日可用率" value={formatPercent(toNumber(performance?.availability_7d), false)} note={performance ? "实测稳定度" : "暂无打点"} />
          <Metric label="P50 首字延迟" value={performance?.ttft_p50_ms ? `${performance.ttft_p50_ms} ms` : "--"} note="TTFT 探针响应" />
        </div>
      </section>

      {/* 01 综合硬核决策与服务条款网格 */}
      <DetailSection number="01" title="综合选型决策与服务保障">
        <div className="grid gap-4 md:grid-cols-3 font-mono text-xs">
          <div className="border-2 border-swiss-fg bg-white p-4">
            <div className="font-black text-sm text-swiss-fg uppercase tracking-wider mb-2">🎯 综合买家选型建议</div>
            <p className="text-swiss-fg/80 leading-relaxed text-xs whitespace-pre-line">
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

          <div className="border-2 border-swiss-fg bg-white p-4">
            <div className="font-black text-sm text-swiss-fg uppercase tracking-wider mb-2">🛡️ 站点服务保障</div>
            <ul className="space-y-1.5 text-swiss-fg/80">
              <li className="flex items-center justify-between border-b border-swiss-fg/10 pb-1">
                <span>发票报销:</span>
                <span className="font-bold">{hasInvoice ? "支持开票" : "未标注支持"}</span>
              </li>
              <li className="flex items-center justify-between border-b border-swiss-fg/10 pb-1">
                <span>退款政策:</span>
                <span className="font-bold">{hasRefund ? "支持无手续费退款" : "参考站点细则"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>注册要求:</span>
                <span className="font-bold">{noVerify ? "无需手机/邮箱验证" : "常规注册"}</span>
              </li>
            </ul>
          </div>

          <div className="border-2 border-swiss-fg bg-white p-4">
            <div className="font-black text-sm text-swiss-fg uppercase tracking-wider mb-2">⚡ 网络健康度快照</div>
            <ul className="space-y-1.5 text-swiss-fg/80">
              <li className="flex items-center justify-between border-b border-swiss-fg/10 pb-1">
                <span>24h 可用率:</span>
                <span className="font-bold">{formatPercent(toNumber(performance?.availability_24h), false)}</span>
              </li>
              <li className="flex items-center justify-between border-b border-swiss-fg/10 pb-1">
                <span>最后打点时间:</span>
                <span className="font-bold">{performance?.last_probe_at ? String(performance.last_probe_at).slice(0, 16) : "暂无打点"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>连续失败数:</span>
                <span className="font-bold text-emerald-700">{String(performance?.consecutive_failures ?? 0)} 次</span>
              </li>
            </ul>
          </div>

          <div className="border-2 border-swiss-fg bg-white p-4">
            <div className="flex items-center justify-between border-b border-black/10 pb-2 mb-3">
              <div className="font-black text-sm text-swiss-fg uppercase tracking-wider flex items-center gap-2">
                🔬 模型真实性与混用质检
              </div>
              <Link
                href={`/detector?siteId=${encodeURIComponent(String(record["站点ID"] ?? ""))}`}
                className="font-mono text-[11px] font-bold text-white bg-black px-2.5 py-1 hover:bg-swiss-accent transition-colors flex items-center gap-1"
              >
                ⚡ 在线探针质检 →
              </Link>
            </div>

            {qcRecord ? (
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                  <span className="text-black/60">质检状态:</span>
                  <span className={`font-bold border px-2 py-0.5 ${
                    qcRecord.score >= 90 ? "border-emerald-800 bg-emerald-100 text-emerald-950" :
                    qcRecord.score >= 75 ? "border-blue-800 bg-blue-100 text-blue-950" :
                    "border-amber-800 bg-amber-100 text-amber-950"
                  }`}>
                    {qcRecord.score >= 90 ? "✅" : "⚠️"} {qcRecord.score}分 · {qcRecord.score >= 90 ? "验证通过" : "存在降级风险"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                  <span className="text-black/60">Juice 思考段:</span>
                  <span className="font-bold text-black">{qcRecord.juiceVerdict || "已完成检测"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                  <span className="text-black/60">行为分布:</span>
                  <span className="font-bold text-black">
                    Sol {qcRecord.probabilities?.sol ?? "--"}% | Terra {qcRecord.probabilities?.terra ?? "--"}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/60">篡改/覆盖:</span>
                  <span className={`font-bold ${qcRecord.tamperDetected ? "text-red-700" : "text-emerald-800"}`}>
                    {qcRecord.tamperDetected ? "⚠️ 检测到篡改" : "无改写 / Prompt正常"}
                  </span>
                </div>
              </div>
            ) : modelCheck ? (
              <p className="text-swiss-fg/80 leading-relaxed text-xs whitespace-pre-line mb-3">
                {modelCheck}
              </p>
            ) : (
              <div className="space-y-2 font-mono text-xs text-black/60 py-2">
                <div className="flex items-center justify-between border-b border-black/10 pb-1.5">
                  <span>质检状态:</span>
                  <span className="font-bold text-black/50 border border-black/20 bg-black/5 px-2 py-0.5">
                    未测试
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-black/50 pt-1">
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
          <span className="border-2 border-black bg-black px-3 py-1 font-mono text-xs font-black text-white">
            架构系统: {frameworkName}
          </span>
          {providersList.map(p => (
            <span key={p} className="border border-black/30 bg-white px-2.5 py-1 font-mono text-xs font-bold text-black">
              Provider: {p}
            </span>
          ))}
        </div>

        {providerRates.length > 0 ? (
          <div className="grid border-l-2 border-t-2 border-swiss-fg sm:grid-cols-2 lg:grid-cols-3">
            {providerRates.map((rate) => (
              <div key={rate} className="border-b-2 border-r-2 border-swiss-fg bg-swiss-bg px-4 py-3 font-mono text-sm font-black">{rate}</div>
            ))}
          </div>
        ) : (
          <EmptyState text="暂无 Provider 倍率明细" />
        )}
        <p className="mt-3 text-xs leading-5 text-swiss-fg/55">全站最低倍率可能来自特殊分组或非目标模型，具体决策请以下方模型和分组明细为准。</p>
      </DetailSection>

      <DetailSection number="03" title={`全量模型覆盖清单（${modelOffers.length} 个模型）`}>
        {modelOffers.length > 0 ? (
          (() => {
            const cov = computeModelCoverage(modelOffers);
            const typeLabel = cov.imageCount > 0 ? `${cov.textCount} 文本 · ${cov.imageCount} 图像` : "全部文本模型";
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-px bg-swiss-fg sm:grid-cols-4">
                  <CoverageCard label="模型总数" value={cov.total.toString()} sub="支持的模型" />
                  <CoverageCard label="最低倍率" value={cov.lowestRate != null ? formatRate(cov.lowestRate) : "--"} sub="站内最便宜" tone="accent" />
                  <CoverageCard label="覆盖厂商" value={cov.providers.length.toString()} sub={cov.providers.slice(0, 3).join(" · ") || "未知"} />
                  <CoverageCard label="类型分布" value={cov.imageCount > 0 ? `${cov.textCount}T + ${cov.imageCount}I` : "100% T"} sub={typeLabel} />
                </div>
                <p className="border-l-4 border-swiss-accent pl-4 font-mono text-sm leading-6 text-swiss-fg/65">
                  跨站比价（"GPT-5.6 在所有站多少钱"）见 <Link href="/" className="border-b border-swiss-accent font-black text-swiss-accent hover:text-swiss-fg">首页 → 按模型查 →</Link>。
                </p>
              </div>
            );
          })()
        ) : <EmptyState text="暂无模型明细" />}
      </DetailSection>

      <DetailSection number="03" title="网络性能打点看板">
        {performance ? (
          <div className="opacity-80">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-swiss-fg/45">测试窗口</span>
                <div className="flex border border-swiss-fg/40">
                  <button
                    type="button"
                    onClick={() => setPerfWindow("24h")}
                    className={`px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-widest transition-colors ${perfWindow === "24h" ? "bg-swiss-fg text-swiss-bg" : "text-swiss-fg/60 hover:bg-swiss-fg/10"}`}
                  >
                    24 小时
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerfWindow("7d")}
                    className={`border-l border-swiss-fg/40 px-2.5 py-1 font-mono text-xs font-bold uppercase tracking-widest transition-colors ${perfWindow === "7d" ? "bg-swiss-fg text-swiss-bg" : "text-swiss-fg/60 hover:bg-swiss-fg/10"}`}
                  >
                    7 日
                  </button>
                </div>
              </div>
              <span className="font-mono text-xs text-swiss-fg/45">* 探针数据来自第三方测试，仅供参考</span>
            </div>
            <div className="grid grid-cols-2 border-l border-t border-swiss-fg/30 sm:grid-cols-3 lg:grid-cols-4">
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

      <DetailSection number="04" title={`站点分组与倍率梯度（${groups.length} 个分组）`}>
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
                className="border-2 border-swiss-fg px-3 py-1.5 font-mono text-sm font-black uppercase tracking-widest hover:bg-swiss-fg hover:text-swiss-bg"
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
                className="border-2 border-swiss-fg bg-swiss-fg px-3 py-1.5 font-mono text-sm font-black uppercase tracking-widest text-swiss-bg hover:bg-swiss-accent"
              >
                全部折叠
              </button>
              <span className="ml-auto font-mono text-sm text-swiss-fg/55">{collapsedGroups.size} / {groups.length} 已折叠</span>
            </div>
            <div className="divide-y-2 divide-swiss-fg border-2 border-swiss-fg">
              {visibleGroups.map((group) => {
                const dir = String(group.change_direction ?? "").toLowerCase();
                const delta = Math.abs(toNumber(group.change_delta) ?? 0);
                const groupId = String(group.__id);
                const isCollapsed = collapsedGroups.has(groupId);
                return (
                  <div key={group.__id} className={`px-4 py-3 ${isCollapsed ? "bg-swiss-muted/40" : ""}`}>
                    {/* F.04: 折叠 header 行（可点击） */}
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(groupId)}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-mono text-base transition-transform inline-block ${isCollapsed ? "" : "rotate-90"}`}>▸</span>
                          <span className="text-base font-black">{String(group.group_name ?? "未命名分组")}</span>
                          {(dir === "up" || dir === "down") && delta > 0 && (
                            <ChangeBadge
                              direction={dir as "up" | "down"}
                              delta={delta}
                              compact
                            />
                          )}
                        </div>
                        <div className="mt-1 truncate font-mono text-sm text-swiss-fg/45">{formatGroupSource(group.rate_source)}</div>
                      </div>
                      <div className="font-mono text-base font-black whitespace-nowrap">{formatGroupRate(group)}</div>
                    </button>
                    {/* F.04: 展开内容 */}
                    {!isCollapsed && (
                      <div className="mt-3 border-l-4 border-swiss-accent pl-4 font-mono text-sm leading-6 text-swiss-fg/65">
                        {String(group.remark ?? "无额外限制说明")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {groups.length > 12 && (
              <button type="button" onClick={() => setShowAllGroups((value) => !value)} className="mt-3 min-h-11 border-b border-swiss-fg font-mono text-sm font-black">
                {showAllGroups ? "收起分组" : `查看全部 ${groups.length} 个分组`}
              </button>
            )}
          </>
        ) : <EmptyState text="暂无分组和限制明细" />}
      </DetailSection>

      {/* 05 真实性与防混用质检档案 */}
      <DetailSection number="05" title="模型真实性与防混用质检实测档案">
        {qcRecord ? (
          <div className="border-2 border-black bg-white p-6">
            <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-4 mb-5 gap-3">
              <div className="flex items-center gap-3">
                <div className="border-2 border-black bg-black px-3 py-1 text-white font-mono font-black text-xl">
                  {qcRecord.score} 分
                </div>
                <div>
                  <div className="font-mono text-xs font-black uppercase text-swiss-accent">
                    多轮加权评级: {qcRecord.score >= 90 ? "S 级 · 极高保真" : qcRecord.score >= 75 ? "A 级 · 良好达标" : qcRecord.score >= 60 ? "B 级 · 存在混用风险" : "F 级 · 严重降级/掺水"}
                  </div>
                  <div className="text-sm font-bold text-black mt-0.5">
                    {qcRecord.verdictText || "综合质检测试结论"}
                  </div>
                </div>
              </div>
              <Link
                href={`/detector?siteId=${encodeURIComponent(String(record["站点ID"] || record.__id))}&model=gpt-5.6-sol`}
                className="inline-flex items-center gap-2 border-2 border-black bg-black px-4 py-2 font-mono text-xs font-black text-white hover:bg-swiss-accent hover:border-swiss-accent transition-colors"
              >
                ⚡ 发起在线复测
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs mb-4">
              <div className="border border-black/20 p-3 bg-[#fafaf8]">
                <div className="text-black/45 text-[10px] font-bold uppercase">单次最新得分</div>
                <div className="text-lg font-black text-black mt-1">{qcRecord.currentScore ?? qcRecord.score} 分</div>
              </div>
              <div className="border border-black/20 p-3 bg-[#fafaf8]">
                <div className="text-black/45 text-[10px] font-bold uppercase">累计测试轮次</div>
                <div className="text-lg font-black text-black mt-1">{qcRecord.historicalRounds || 1} 轮</div>
              </div>
              <div className="border border-black/20 p-3 bg-[#fafaf8]">
                <div className="text-black/45 text-[10px] font-bold uppercase">历史通过率</div>
                <div className="text-lg font-black text-black mt-1">{qcRecord.passRate != null ? `${qcRecord.passRate}%` : "--"}</div>
              </div>
              <div className="border border-black/20 p-3 bg-[#fafaf8]">
                <div className="text-black/45 text-[10px] font-bold uppercase">历史波动区间</div>
                <div className="text-lg font-black text-black mt-1">
                  {qcRecord.scoreMin != null && qcRecord.scoreMax != null ? `${qcRecord.scoreMin} ~ ${qcRecord.scoreMax} 分` : "--"}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="border border-black/20 p-3">
                <span className="font-bold text-black block mb-1">行为指纹概率分布:</span>
                <span className="text-black/70">
                  Sol: {qcRecord.probabilities?.sol != null ? `${(qcRecord.probabilities.sol * 100).toFixed(1)}%` : "--"} · 
                  Terra: {qcRecord.probabilities?.terra != null ? `${(qcRecord.probabilities.terra * 100).toFixed(1)}%` : "--"} · 
                  防篡改: {qcRecord.tamperDetected ? "⚠️ 检测到篡改" : "✅ 正常"}
                </span>
              </div>
              <div className="border border-black/20 p-3">
                <span className="font-bold text-black block mb-1">测试时间与状态码:</span>
                <span className="text-black/70">
                  {formatDateTime(qcRecord.testedAt)} · 状态: {qcRecord.outcomeCode || qcRecord.verdict}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed border-black/30 bg-white p-6 text-center">
            <p className="font-mono text-sm text-black/60 mb-4">
              该站点尚未在本地质检中心记录测试数据。您可以使用双引擎流水线对该站发起模型真伪与混用检测。
            </p>
            <Link
              href={`/detector?siteId=${encodeURIComponent(String(record["站点ID"] || record.__id))}&model=gpt-5.6-sol`}
              className="inline-flex items-center gap-2 border-2 border-black bg-black px-5 py-2.5 font-mono text-xs font-black text-white hover:bg-swiss-accent hover:border-swiss-accent transition-colors"
            >
              ⚡ 立即前往质检中心检测该站点
            </Link>
          </div>
        )}
      </DetailSection>

      <DetailSection number="06" title="一键客户端接入与环境配置">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 font-mono text-xs">
          <div className="border border-swiss-fg/20 p-4 bg-white">
            <div className="font-bold text-swiss-fg uppercase tracking-wider mb-1">Standard OpenAI / OneAPI Base</div>
            <div className="p-2 bg-swiss-fg/5 border border-swiss-fg/10 font-bold select-all text-swiss-accent break-all">
              https://{domainDisplay(domain)}/v1
            </div>
            <div className="mt-2 text-swiss-fg/50 text-[11px]">适用于 NextChat / LobeChat / CherryStudio 等支持自定义 Base 的客户端</div>
          </div>

          <div className="border border-swiss-fg/20 p-4 bg-white">
            <div className="font-bold text-swiss-fg uppercase tracking-wider mb-1">Claude Code (Terminal CLI)</div>
            <div className="p-2 bg-swiss-fg/5 border border-swiss-fg/10 font-bold select-all text-swiss-accent break-all">
              export ANTHROPIC_BASE_URL=https://{domainDisplay(domain)}
            </div>
            <div className="mt-2 text-swiss-fg/50 text-[11px]">在命令行终端执行上述命令即可直接接入该中转站</div>
          </div>

          <div className="border border-swiss-fg/20 p-4 bg-white">
            <div className="font-bold text-swiss-fg uppercase tracking-wider mb-1">Cursor IDE (OpenAI Key)</div>
            <div className="p-2 bg-swiss-fg/5 border border-swiss-fg/10 font-bold select-all text-swiss-accent break-all">
              https://{domainDisplay(domain)}/v1
            </div>
            <div className="mt-2 text-swiss-fg/50 text-[11px]">在 Cursor -&gt; Models -&gt; Override OpenAI Base URL 中填入</div>
          </div>
        </div>
      </DetailSection>
    </div>
  );
}

function DetailSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b-2 border-swiss-fg">
      <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-baseline gap-3">
          <span className="bg-swiss-fg px-2 py-1 font-mono text-sm font-black text-swiss-bg">{number}</span>
          <h2 className="text-xl font-black sm:text-2xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function CoverageCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "accent" }) {
  const toneClass = tone === "accent" ? "text-swiss-accent" : "";
  return (
    <div className="min-h-[96px] bg-swiss-bg p-4">
      <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-black leading-none tracking-tighter ${toneClass}`}>{value}</div>
      <div className="mt-1 truncate font-mono text-sm text-swiss-fg/45" title={sub}>{sub}</div>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="min-h-[112px] border-b border-r border-swiss-fg p-4 even:border-r-0 lg:border-b-0 lg:even:border-r lg:last:border-r-0">
      <div className="font-mono text-sm uppercase tracking-widest text-swiss-fg/50">{label}</div>
      <div className="mt-2 text-2xl font-black sm:text-3xl">{value}</div>
      <div className="mt-1 font-mono text-sm text-swiss-fg/45">{note}</div>
    </div>
  );
}

function EvidenceMetric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-h-[92px] border-b-2 border-r-2 border-swiss-fg p-3">
      <div className="font-mono text-sm uppercase tracking-widest text-swiss-fg/45">{label}</div>
      <div className="mt-2 font-mono text-lg font-black">{value}</div>
      {note && <div className="mt-1 font-mono text-sm text-swiss-fg/55">{note}</div>}
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
    <span className={`inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-sm font-black ${available ? "border-swiss-success bg-swiss-successBg" : "border-swiss-fg/30"}`}>
      {available ? <IconCircleCheck className="h-3.5 w-3.5" /> : <IconCircleDot className="h-3.5 w-3.5" />}{label}
    </span>
  );
}

function Tag({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warning" | "info" }) {
  const classes = tone === "success" ? "border-swiss-success bg-swiss-successBg" : tone === "warning" ? "border-swiss-warning bg-swiss-warningBg" : tone === "info" ? "border-swiss-info bg-swiss-infoBg" : "border-swiss-fg/30";
  return <span className={`border px-2 py-1 font-mono text-sm font-black ${classes}`}>{label}</span>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="border-2 border-swiss-fg/25 p-8 text-center font-mono text-sm text-swiss-fg/45">{text}</div>;
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
