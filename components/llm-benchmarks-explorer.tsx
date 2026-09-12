"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Trophy,
  Sparkles,
  Zap,
  Code2,
  Brain,
  Scale,
  DollarSign,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  X,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
  Star,
  Award,
  ShieldCheck,
  TrendingUp,
  Flame
} from "lucide-react";
import type { ModelBenchmarkRecord } from "@/lib/benchmarks";
import { getModelComprehensiveVerdict } from "@/lib/benchmarks";

interface Props {
  records: ModelBenchmarkRecord[];
}

type SortKey =
  | "综合评分"
  | "LMSYS总榜Elo"
  | "SWE_bench_Verified"
  | "AIME_2024"
  | "GPQA_Diamond"
  | "MATH_500"
  | "输入价格_美元";

// 梯队颜色映射
const getTierBadge = (tier: string) => {
  if (tier.startsWith("S+")) {
    return "bg-rose-50 text-rose-700 border-rose-200/80";
  }
  if (tier.startsWith("S")) {
    return "bg-amber-50 text-amber-700 border-amber-200/80";
  }
  if (tier.startsWith("A+")) {
    return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
  }
  return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
};

// 家族配色
const getFamilyBadge = (fam: string) => {
  switch (fam) {
    case "Claude":
      return "bg-orange-50 text-orange-700 border-orange-200/80";
    case "GPT":
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    case "Gemini":
      return "bg-blue-50 text-blue-700 border-blue-200/80";
    case "DeepSeek":
      return "bg-cyan-50 text-cyan-700 border-cyan-200/80";
    case "GLM":
      return "bg-purple-50 text-purple-700 border-purple-200/80";
    case "Qwen":
      return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
    case "Grok":
      return "bg-zinc-100 text-zinc-800 border-zinc-300";
    default:
      return "bg-zinc-50 text-zinc-700 border-zinc-200";
  }
};

interface ModelCardProps {
  model: ModelBenchmarkRecord;
  isCompared: boolean;
  onToggleCompare: () => void;
  density: "detailed" | "compact";
}

function ModelCard({
  model,
  isCompared,
  onToggleCompare,
  density,
}: ModelCardProps) {
  const [activeTab, setActiveTab] = useState<"pitfalls" | "strengths" | "weaknesses">("pitfalls");
  const verdict = useMemo(() => getModelComprehensiveVerdict(model), [model]);

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-200 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-md ${
        isCompared ? "border-[#E03E1A] ring-1 ring-[#E03E1A]/20" : "border-zinc-200/80 hover:border-zinc-300"
      }`}
    >
      <div>
        {/* Card Header: 家族 + 梯队 + 综合评分 + 厂商 */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold border ${getFamilyBadge(model.家族系列)}`}>
              {model.家族系列}
            </span>
            <span className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold border ${getTierBadge(model.梯队评级)}`}>
              {model.梯队评级}
            </span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold bg-amber-500/10 text-amber-800 border border-amber-500/25">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              <span>综合 {verdict.score}</span>
            </span>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            {model.厂商}
          </span>
        </div>

        {/* Title & Positioning */}
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-bold text-zinc-950 group-hover:text-[#E03E1A] transition-colors leading-snug">
            {model.模型名称}
          </h3>
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-[11px] text-zinc-500">
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600 font-bold">
            {model.模型定位}
          </span>
          <span>• 上下文 {model.上下文窗口}</span>
          <span>• 输出 {model.最大输出}</span>
        </div>

        {/* Benchmarks Matrix Pill Box */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-3 font-mono text-center">
          <div className="flex flex-col justify-center">
            <div className="text-[10px] uppercase text-zinc-400 font-bold">Arena 总分</div>
            <div className="text-sm font-black text-zinc-900 mt-0.5">
              {model.LMSYS总榜Elo ? `${model.LMSYS总榜Elo}` : "—"}
            </div>
            <div className="text-[9.5px] text-zinc-400">
              {model.LMSYS代码Elo ? `代码 ${model.LMSYS代码Elo}` : ""}
            </div>
          </div>
          <div className="flex flex-col justify-center border-x border-zinc-200/50 px-1">
            <div className="text-[10px] uppercase text-zinc-400 font-bold">SWE-bench</div>
            <div className="text-sm font-black text-[#E03E1A] mt-0.5">
              {model.SWE_bench_Verified ? `${model.SWE_bench_Verified}%` : "—"}
            </div>
            <div className="text-[9.5px] text-zinc-400">真实代码缺陷</div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-[10px] uppercase text-zinc-400 font-bold">AIME 奥数</div>
            <div className="text-sm font-black text-blue-600 mt-0.5">
              {model.AIME_2024 ? `${model.AIME_2024}%` : "—"}
            </div>
            <div className="text-[9.5px] text-zinc-400">
              {model.GPQA_Diamond ? `GPQA ${model.GPQA_Diamond}%` : ""}
            </div>
          </div>
        </div>

        {/* 掌柜综合评价与研判断言 */}
        {density === "compact" ? (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-amber-200/50 bg-amber-50/40 px-2.5 py-1.5 text-xs text-zinc-700">
            <Sparkles className="h-3.5 w-3.5 text-[#E03E1A] shrink-0" />
            <span className="font-bold text-zinc-900 shrink-0 text-[11px]">断言:</span>
            <span className="text-[#E03E1A] font-semibold text-[11px] truncate">{verdict.tagline}</span>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50/50 via-white to-orange-50/30 p-2.5 sm:p-3 shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-900">
              <Sparkles className="h-3.5 w-3.5 text-[#E03E1A] shrink-0" />
              <span>综合断言:</span>
              <span className="text-[#E03E1A] font-black">{verdict.tagline}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600 leading-relaxed font-sans line-clamp-2" title={verdict.summary}>
              {verdict.summary}
            </p>
          </div>
        )}

        {/* 详细模式：微型三态分段器 (优势 / 短板 / 避坑) */}
        {density === "detailed" && (
          <div className="mt-3.5">
            {/* 分段器 Tab 控制条 */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100/90 p-1 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setActiveTab("pitfalls")}
                className={`flex items-center justify-center gap-1 py-1 px-1 rounded-lg font-bold transition-all text-center ${
                  activeTab === "pitfalls"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
                }`}
              >
                <Flame className="h-3 w-3 shrink-0" />
                <span>避坑 ({verdict.pitfalls?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("strengths")}
                className={`flex items-center justify-center gap-1 py-1 px-1 rounded-lg font-bold transition-all text-center ${
                  activeTab === "strengths"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
                }`}
              >
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>优势 ({verdict.strengths?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("weaknesses")}
                className={`flex items-center justify-center gap-1 py-1 px-1 rounded-lg font-bold transition-all text-center ${
                  activeTab === "weaknesses"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
                }`}
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>短板 ({verdict.weaknesses?.length || 0})</span>
              </button>
            </div>

            {/* 激活 Tab 面板 */}
            <div className="mt-2 min-h-[96px]">
              {activeTab === "pitfalls" && (
                <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-2.5 text-zinc-700">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1 font-mono text-[10.5px]">
                    <Flame className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>实操避坑指北 (ENGINEERING PITFALLS)</span>
                  </div>
                  <ul className="space-y-1 text-zinc-700 text-[11px] leading-relaxed">
                    {verdict.pitfalls?.map((p, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold shrink-0 mt-0.5">⚡</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === "strengths" && (
                <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-2.5 text-zinc-700">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1 font-mono text-[10.5px]">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>核心优势 (STRENGTHS)</span>
                  </div>
                  <ul className="space-y-1 text-zinc-700 text-[11.5px] leading-relaxed">
                    {verdict.strengths?.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{s}</span>
                      </li>
                    )) || <li>{model.核心优势}</li>}
                  </ul>
                </div>
              )}

              {activeTab === "weaknesses" && (
                <div className="rounded-xl bg-rose-50/70 border border-rose-200/80 p-2.5 text-zinc-700">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5 mb-1 font-mono text-[10.5px]">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>明显短板与局限 (WEAKNESSES)</span>
                  </div>
                  <ul className="space-y-1 text-zinc-700 text-[11.5px] leading-relaxed">
                    {verdict.weaknesses?.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-600 font-bold shrink-0 mt-0.5">•</span>
                        <span>{w}</span>
                      </li>
                    )) || <li>{model.短板风险}</li>}
                  </ul>
                </div>
              )}
            </div>

            {/* 推荐场景 */}
            <div className="mt-2.5 font-mono text-[11px] text-zinc-500 truncate" title={model.推荐场景}>
              <span className="font-bold text-zinc-700">推荐场景: </span>
              <span>{model.推荐场景}</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Pricing & Compare Action */}
      <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between font-mono text-xs">
        <div className="flex items-baseline gap-1">
          <span className="text-zinc-400 text-[10px]">输入</span>
          <span className="font-bold text-zinc-900">
            ${model.输入价格_美元.toFixed(2)}
          </span>
          <span className="text-zinc-400 text-[10px]">/ 输出</span>
          <span className="font-bold text-zinc-900">
            ${model.输出价格_美元.toFixed(2)}
          </span>
          <span className="text-zinc-400 text-[9px]">/1M</span>
        </div>

        <button
          onClick={onToggleCompare}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            isCompared
              ? "bg-[#E03E1A] text-white"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
          }`}
        >
          <Scale className="h-3 w-3" />
          <span>{isCompared ? "已选" : "对比"}</span>
        </button>
      </div>
    </article>
  );
}

export default function LlmBenchmarksExplorer({ records }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string>("全部");
  const [selectedPositioning, setSelectedPositioning] = useState<string>("全部");
  const [sortKey, setSortKey] = useState<SortKey>("综合评分");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [density, setDensity] = useState<"detailed" | "compact">("detailed");
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [showVerdictGuide, setShowVerdictGuide] = useState<boolean>(true);

  // 所有家族选项
  const families = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.家族系列) set.add(r.家族系列);
    });
    return ["全部", ...Array.from(set)];
  }, [records]);

  // 所有定位选项
  const positionings = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.模型定位) set.add(r.模型定位);
    });
    return ["全部", ...Array.from(set)];
  }, [records]);

  // 过滤与排序
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (selectedFamily !== "全部" && r.家族系列 !== selectedFamily) return false;
        if (selectedPositioning !== "全部" && r.模型定位 !== selectedPositioning) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          r.模型名称.toLowerCase().includes(q) ||
          r.厂商.toLowerCase().includes(q) ||
          (r.核心优势 && r.核心优势.toLowerCase().includes(q)) ||
          (r.推荐场景 && r.推荐场景.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        let valA: number = 0;
        let valB: number = 0;
        if (sortKey === "综合评分") {
          valA = getModelComprehensiveVerdict(a).score;
          valB = getModelComprehensiveVerdict(b).score;
        } else {
          valA = (a[sortKey] as number) ?? 0;
          valB = (b[sortKey] as number) ?? 0;
        }
        if (valA !== valB) {
          if (sortAsc) return valA > valB ? 1 : -1;
          return valA < valB ? 1 : -1;
        }
        // 二级决胜仲裁：按代码工程能力 SWE-bench 降序，再按 LMSYS Elo 降序
        const sweA = a.SWE_bench_Verified || 0;
        const sweB = b.SWE_bench_Verified || 0;
        if (sweA !== sweB) return sweB - sweA;
        return (b.LMSYS总榜Elo || 0) - (a.LMSYS总榜Elo || 0);
      });
  }, [records, selectedFamily, selectedPositioning, searchQuery, sortKey, sortAsc]);

  // 切换对比
  const toggleCompare = (name: string) => {
    if (compareList.includes(name)) {
      setCompareList(compareList.filter((n) => n !== name));
    } else {
      if (compareList.length >= 4) {
        alert("单次最多选择 4 款模型进行并排对比");
        return;
      }
      setCompareList([...compareList, name]);
    }
  };

  // 对比选中的模型记录
  const comparedRecords = useMemo(() => {
    return compareList.map((name) => records.find((r) => r.模型名称 === name)!).filter(Boolean);
  }, [compareList, records]);


  return (
    <div className="space-y-6 pb-20">
      {/* ── 顶部 Header 看板 ────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-gradient-to-b from-[#FFFDF9] via-white to-zinc-50/50 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
              <span className="rounded bg-zinc-950 px-2 py-0.5 text-[10px] text-white">
                MODULE 06
              </span>
              <span>LLM BENCHMARK OBSERVATORY · 大模型实测天梯</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-zinc-950">
              大模型实测天梯榜
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-zinc-600 max-w-3xl leading-relaxed">
              汇集全球前沿旗舰（GPT-6 Astra / GPT-5.6 Sol / Claude Fable 5 & Opus 4.6 / Gemini 3.0 / DeepSeek R1 / 智谱 GLM-5.2 / 通义千问）真实测评基准：涵盖 LMSYS Arena 盲测、SWE-bench Verified 真实代码修复率、AIME 数学奥赛与官方价格横评。
            </p>
          </div>

          {/* 右侧核心荣誉标牌 */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-3.5 shadow-2xs font-mono text-center min-w-[120px]">
              <div className="text-[10px] uppercase text-zinc-400 font-bold">Arena 竞技榜首</div>
              <div className="text-base font-black text-emerald-600 mt-0.5">GPT-6 Astra</div>
              <div className="text-[11px] text-zinc-500 font-bold">1486.2 Elo</div>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-3.5 shadow-2xs font-mono text-center min-w-[120px]">
              <div className="text-[10px] uppercase text-zinc-400 font-bold">长程代码 SOTA</div>
              <div className="text-base font-black text-orange-600 mt-0.5">Claude Fable 5</div>
              <div className="text-[11px] text-zinc-500 font-bold">77.8% SWE-bench</div>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-3.5 shadow-2xs font-mono text-center min-w-[120px]">
              <div className="text-[10px] uppercase text-zinc-400 font-bold">超重满血旗舰</div>
              <div className="text-base font-black text-[#E03E1A] mt-0.5">Claude Opus 4.6</div>
              <div className="text-[11px] text-zinc-500 font-bold">75.4% 代码修复</div>
            </div>
          </div>
        </div>

        {/* 快捷指标说明胶囊 */}
        <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-2 sm:gap-4 font-mono text-[11px] text-zinc-500">
          <span className="font-bold text-zinc-700 flex items-center gap-1">
            <Info className="h-3.5 w-3.5 text-zinc-400" />
            实测基准口径:
          </span>
          <span>• LMSYS Arena (真实人类盲测 Elo 对决)</span>
          <span>• SWE-bench Verified (真实 GitHub 缺陷修复率)</span>
          <span>• AIME 2024 (美国数学邀请赛真题)</span>
          <span>• GPQA Diamond (博士级专家科学真题)</span>
          <span>• MATH-500 (高等数理逻辑题)</span>
        </div>
      </section>

      {/* ── 掌柜综合研判与选型断言看板 ──────────────────────────── */}
      <section className="rounded-3xl border border-zinc-200/90 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/20 p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#E03E1A] to-amber-500 text-white shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-zinc-950 tracking-tight">
                  掌柜综合研判 · 2026 选型客观评价
                </h2>
                <span className="rounded-md bg-amber-100 text-amber-900 border border-amber-300/60 px-2 py-0.5 font-mono text-[10px] font-black">
                  VERDICT & BUYING GUIDE
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                抛开营销滤镜，结合真实盲测、GitHub 实战缺陷修复与中转站实操避坑经验的定性断言
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowVerdictGuide(!showVerdictGuide)}
            className="flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-200/80 bg-white shadow-2xs transition-all"
          >
            <span>{showVerdictGuide ? "收起指南" : "展开研判"}</span>
            {showVerdictGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {showVerdictGuide && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
            {/* 1. 代码工程 */}
            <div className="rounded-2xl border border-orange-200/70 bg-white/90 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-orange-800">
                  <span className="text-sm">💻</span>
                  <span>代码工程与 Agent 桂冠</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 text-[10px] font-bold border border-orange-200">
                  SWE 77%+
                </span>
              </div>
              <div className="text-zinc-900 font-bold text-sm font-sans">
                Claude Fable 5 & Claude Opus 4.6
              </div>
              <p className="text-zinc-600 font-sans text-[11.5px] leading-relaxed">
                在多文件联动重构、全栈开发与长流程 Agent 自动化中表现断崖领先。若预算有限或日常敏捷编码，首推 <strong>Claude 3.7 Sonnet (Thinking)</strong>（真实解决率 70.3%）。
              </p>
            </div>

            {/* 2. 超算数理与奥赛 */}
            <div className="rounded-2xl border border-emerald-200/70 bg-white/90 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <span className="text-sm">🧮</span>
                  <span>超算推理与数理奥赛天花板</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  AIME 92.4%
                </span>
              </div>
              <div className="text-zinc-900 font-bold text-sm font-sans">
                GPT-6 Astra & OpenAI o3-mini
              </div>
              <p className="text-zinc-600 font-sans text-[11.5px] leading-relaxed">
                <strong>GPT-6 Astra</strong> 在极其严谨的逻辑推导与自纠错上登顶；而 <strong>o3-mini</strong> 凭借亲民价格与 87.3% 的 AIME 成绩，成为纯算法/数学题的平民首选。
              </p>
            </div>

            {/* 3. 200万超长长文本 */}
            <div className="rounded-2xl border border-blue-200/70 bg-white/90 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-blue-800">
                  <span className="text-sm">📚</span>
                  <span>全模态与 200万 超长文本</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                  2M 上下文
                </span>
              </div>
              <div className="text-zinc-900 font-bold text-sm font-sans">
                Google Gemini 3.0 Pro & 2.5 Pro
              </div>
              <p className="text-zinc-600 font-sans text-[11.5px] leading-relaxed">
                200 万 token 针大海捞针命中率仍超 99.5%，音频、视频与全量仓库代码整库跨模块分析的绝对王者，召回稳定性显著优于传统分片 RAG。
              </p>
            </div>

            {/* 4. 性价比屠夫 */}
            <div className="rounded-2xl border border-cyan-200/70 bg-white/90 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-cyan-800">
                  <span className="text-sm">💰</span>
                  <span>高并发高吞吐性价比屠夫</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 text-[10px] font-bold border border-cyan-200">
                  $0.14 起
                </span>
              </div>
              <div className="text-zinc-900 font-bold text-sm font-sans">
                DeepSeek-V3 / R1 & Gemini 2.0 Flash
              </div>
              <p className="text-zinc-600 font-sans text-[11.5px] leading-relaxed">
                <strong>DeepSeek-V3</strong> 以 $0.14 单价抗击万物；<strong>R1 满血版</strong>以 $0.55 实现顶级推理；<strong>Gemini 2.0 Flash</strong> 毫秒级 TTFT 适合高频实时对话。
              </p>
            </div>

            {/* 5. 国产政企推理 */}
            <div className="rounded-2xl border border-purple-200/70 bg-white/90 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-purple-800">
                  <span className="text-sm">🇨🇳</span>
                  <span>国产深层逻辑与政企合规</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                  国产首选
                </span>
              </div>
              <div className="text-zinc-900 font-bold text-sm font-sans">
                智谱 GLM-5.2 & Qwen 2.5 Max
              </div>
              <p className="text-zinc-600 font-sans text-[11.5px] leading-relaxed">
                中文复杂政策、金融研报剖析与国内合规场景最强两巨头。本地离线私有化则首推 <strong>Qwen 2.5 Coder 32B</strong>。
              </p>
            </div>

            {/* 6. 全模型工程落地与调用踩坑金律 */}
            <div className="rounded-2xl border border-rose-200/70 bg-rose-50/30 p-4 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-rose-800">
                  <span className="text-sm">⚡</span>
                  <span>实操踩坑指北 · 通用避坑金律</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                  工程必读
                </span>
              </div>
              <div className="text-zinc-900 font-bold text-sm font-sans">
                思考截断 · 温度陷阱 · 超时与真伪
              </div>
              <p className="text-zinc-600 font-sans text-[11.5px] leading-relaxed">
                ① <strong>思考模型切勿乱设 temp=0</strong>（Claude 3.7 需固定 1.0，DeepSeek-R1 建议 0.6，否则逻辑退化死循环）；② <strong>max_tokens 需放宽至 8K~16K</strong>（防思考占满预算截断）；③ <strong>TTFT 长首字超时需调至 60s+</strong> 并剥离 &lt;think&gt; 标签防 JSON 解析崩溃。
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── 筛选、检索与视图控制栏 ────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        {/* 家族分类选项卡 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="font-mono text-xs font-bold text-zinc-400 shrink-0 mr-1">
            家族:
          </span>
          {families.map((fam) => {
            const active = selectedFamily === fam;
            return (
              <button
                key={fam}
                onClick={() => setSelectedFamily(fam)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-xs font-bold transition-all ${
                  active
                    ? "bg-zinc-950 text-white shadow-xs"
                    : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                }`}
              >
                <span>{fam}</span>
                {fam !== "全部" && (
                  <span className="text-[10px] opacity-70">
                    ({records.filter((r) => r.家族系列 === fam).length})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 检索、定位过滤与排序操作栏 */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-zinc-100 font-mono text-xs">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索模型名、厂商、擅长领域或场景..."
              className="w-full pl-9.5 pr-8 py-2 rounded-xl border border-zinc-200 bg-zinc-50/60 text-zinc-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E03E1A]/20 focus:border-[#E03E1A] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* 右侧下拉选择与控制 */}
          <div className="flex flex-wrap items-center gap-2 text-zinc-600">
            {/* 定位筛选 */}
            <select
              value={selectedPositioning}
              onChange={(e) => setSelectedPositioning(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-1.5 text-zinc-700 text-xs focus:outline-none focus:border-[#E03E1A]"
            >
              {positionings.map((p) => (
                <option key={p} value={p}>
                  {p === "全部" ? "全部定位类型" : p}
                </option>
              ))}
            </select>

            {/* 排序维度 */}
            <select
              value={sortKey}
              onChange={(e) => {
                const k = e.target.value as SortKey;
                setSortKey(k);
                setSortAsc(k === "输入价格_美元"); // 价格默认从小到大
              }}
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-1.5 text-zinc-700 text-xs focus:outline-none focus:border-[#E03E1A]"
            >
              <option value="综合评分">排位: 掌柜综合实力指数 (推荐)</option>
              <option value="LMSYS总榜Elo">排位: LMSYS 竞技场 Elo</option>
              <option value="SWE_bench_Verified">排位: SWE-bench 代码缺陷率</option>
              <option value="AIME_2024">排位: AIME 数学奥赛能力</option>
              <option value="GPQA_Diamond">排位: GPQA 博士级科学准确率</option>
              <option value="MATH_500">排位: MATH-500 初高等数学</option>
              <option value="输入价格_美元">排位: 官方输入价格 ($/1M)</option>
            </select>

            {/* 升序/降序切换 */}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              title={sortAsc ? "当前从小到大（升序）" : "当前从大到小（降序）"}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-50/60 px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>{sortAsc ? "升序" : "降序"}</span>
            </button>

            {/* 视图切换 */}
            <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100/80 p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "grid" ? "bg-white shadow-2xs text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
                }`}
                title="网格卡片视图"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "table" ? "bg-white shadow-2xs text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
                }`}
                title="全维表格视图"
              >
                <TableIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 密度切换（仅在网格视图有效） */}
            {viewMode === "grid" && (
              <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-100/80 p-0.5 text-xs font-mono">
                <button
                  onClick={() => setDensity("detailed")}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                    density === "detailed"
                      ? "bg-white shadow-2xs text-[#E03E1A]"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                  title="深度研判模式：显示优势/短板/避坑微型分段器"
                >
                  深度
                </button>
                <button
                  onClick={() => setDensity("compact")}
                  className={`px-2.5 py-1 rounded-lg transition-colors font-bold ${
                    density === "compact"
                      ? "bg-white shadow-2xs text-[#E03E1A]"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                  title="极简紧凑模式：仅保留核心指标与价格"
                >
                  紧凑
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 列表/网格货架渲染 ────────────────────────────────────────── */}
      {filteredRecords.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/60 p-12 text-center">
          <Brain className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <div className="font-bold text-zinc-700">未找到符合筛选条件的大模型</div>
          <div className="text-xs text-zinc-400 mt-1">请尝试更换检索关键词或清空家族过滤条件</div>
          <button
            onClick={() => {
              setSelectedFamily("全部");
              setSelectedPositioning("全部");
              setSearchQuery("");
            }}
            className="mt-4 rounded-xl bg-zinc-950 text-white px-4 py-2 text-xs font-mono font-bold hover:bg-[#E03E1A] transition-colors"
          >
            重置所有筛选
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecords.map((model) => (
            <ModelCard
              key={model.模型名称}
              model={model}
              isCompared={compareList.includes(model.模型名称)}
              onToggleCompare={() => toggleCompare(model.模型名称)}
              density={density}
            />
          ))}
        </div>
      ) : (
        /* ── 全维表格视图 ────────────────────────────────────────── */
        <div className="overflow-x-auto rounded-3xl border border-zinc-200/80 bg-white shadow-2xs">
          <table className="w-full border-collapse font-mono text-xs text-left">
            <thead>
              <tr className="border-b border-zinc-200/80 bg-zinc-50/80 text-zinc-500 uppercase text-[10.5px]">
                <th className="p-3.5 pl-5 font-bold">模型名称</th>
                <th className="p-3.5 font-bold">厂商/系列</th>
                <th className="p-3.5 font-bold">定位与梯队</th>
                <th className="p-3.5 font-bold text-center">综合评分</th>
                <th className="p-3.5 font-bold min-w-[240px]">掌柜综合断言</th>
                <th className="p-3.5 font-bold text-right">Arena 总分</th>
                <th className="p-3.5 font-bold text-right">代码 Elo</th>
                <th className="p-3.5 font-bold text-right">SWE-bench</th>
                <th className="p-3.5 font-bold text-right">AIME 奥数</th>
                <th className="p-3.5 font-bold text-right">GPQA 博士</th>
                <th className="p-3.5 font-bold text-right">MATH-500</th>
                <th className="p-3.5 font-bold text-right">上下文</th>
                <th className="p-3.5 font-bold text-right">输入 $/1M</th>
                <th className="p-3.5 font-bold text-right">输出 $/1M</th>
                <th className="p-3.5 pr-5 font-bold text-center">对比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRecords.map((m) => {
                const isCompared = compareList.includes(m.模型名称);
                const verdict = getModelComprehensiveVerdict(m);
                return (
                  <tr key={m.模型名称} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="p-3.5 pl-5 font-bold text-zinc-900">
                      {m.模型名称}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getFamilyBadge(m.家族系列)}`}>
                          {m.家族系列}
                        </span>
                        <span className="text-zinc-500 text-[11px]">{m.厂商}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getTierBadge(m.梯队评级)}`}>
                        {m.梯队评级}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-black text-xs bg-amber-50 text-amber-800 border border-amber-200">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        <span>{verdict.score}</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-sans text-xs text-zinc-700 max-w-[300px]">
                      <div className="font-bold text-zinc-900 line-clamp-1">{verdict.tagline}</div>
                      <div className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">{verdict.summary}</div>
                      {verdict.pitfalls && verdict.pitfalls.length > 0 && (
                        <div className="mt-1 text-[10.5px] text-amber-800 line-clamp-1 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/50">
                          <span className="font-bold">⚡ 避坑: </span>
                          <span>{verdict.pitfalls[0]}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-black text-zinc-900">
                      {m.LMSYS总榜Elo || "—"}
                    </td>
                    <td className="p-3.5 text-right text-zinc-700">
                      {m.LMSYS代码Elo || "—"}
                    </td>
                    <td className="p-3.5 text-right font-bold text-[#E03E1A]">
                      {m.SWE_bench_Verified ? `${m.SWE_bench_Verified}%` : "—"}
                    </td>
                    <td className="p-3.5 text-right font-bold text-blue-600">
                      {m.AIME_2024 ? `${m.AIME_2024}%` : "—"}
                    </td>
                    <td className="p-3.5 text-right text-zinc-700">
                      {m.GPQA_Diamond ? `${m.GPQA_Diamond}%` : "—"}
                    </td>
                    <td className="p-3.5 text-right text-zinc-700">
                      {m.MATH_500 ? `${m.MATH_500}%` : "—"}
                    </td>
                    <td className="p-3.5 text-right text-zinc-500">
                      {m.上下文窗口}
                    </td>
                    <td className="p-3.5 text-right font-bold text-zinc-900">
                      ${m.输入价格_美元.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-bold text-zinc-900">
                      ${m.输出价格_美元.toFixed(2)}
                    </td>
                    <td className="p-3.5 pr-5 text-center">
                      <button
                        onClick={() => toggleCompare(m.模型名称)}
                        className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                          isCompared
                            ? "bg-[#E03E1A] text-white"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                        }`}
                      >
                        {isCompared ? "✓ 已选" : "+ 对比"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 底部对比托盘 (Compare Floating Bar) ────────────────────────── */}
      {compareList.length > 0 && (
        <aside
          role="region"
          aria-label="对比托盘"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-zinc-200/80 bg-zinc-950/90 text-white px-5 py-3 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#E03E1A] animate-pulse" />
            <span className="font-mono text-xs font-bold">
              已选对比: {compareList.length} / 4 款
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {compareList.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-200 border border-zinc-700"
              >
                <span>{name.length > 14 ? `${name.slice(0, 14)}...` : name}</span>
                <button
                  onClick={() => toggleCompare(name)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-zinc-700">
            <button
              onClick={() => setShowCompareModal(true)}
              className="rounded-xl bg-[#E03E1A] px-3.5 py-1.5 font-mono text-xs font-bold text-white hover:bg-[#c93514] transition-colors flex items-center gap-1"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>展开横向对比</span>
            </button>
            <button
              onClick={() => setCompareList([])}
              className="text-zinc-400 hover:text-white text-xs font-mono px-1"
            >
              清空
            </button>
          </div>
        </aside>
      )}

      {/* ── 对比弹窗 (Compare Modal) ─────────────────────────────────── */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-900 text-white font-mono text-xs font-bold">
                  VS
                </span>
                <h3 className="text-lg font-black text-zinc-950">
                  大模型全参数横向深度比对
                </h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-zinc-400">
                    <th className="p-3 w-36 uppercase font-bold text-[10px]">对比维度</th>
                    {comparedRecords.map((r) => (
                      <th key={r.模型名称} className="p-3 min-w-[200px] text-zinc-900 font-bold text-sm">
                        {r.模型名称}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr className="bg-amber-50/60">
                    <td className="p-3 text-amber-900 font-bold">综合评测研判</td>
                    {comparedRecords.map((r) => {
                      const v = getModelComprehensiveVerdict(r);
                      return (
                        <td key={r.模型名称} className="p-3">
                          <div className="flex items-center gap-1 font-mono font-black text-amber-800 text-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            <span>综合评分 {v.score}</span>
                            <span className="text-[11px] font-normal text-amber-700 ml-1">({v.ratingLevel})</span>
                          </div>
                          <div className="text-[11px] font-bold text-zinc-900 mt-1">{v.tagline}</div>
                          <div className="text-xs text-zinc-600 font-sans mt-0.5 leading-relaxed">{v.summary}</div>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-3 text-zinc-400 font-bold">厂商与家族</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${getFamilyBadge(r.家族系列)}`}>
                          {r.家族系列}
                        </span>
                        <span className="ml-2 text-zinc-600">{r.厂商}</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-zinc-400 font-bold">定位与梯队</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${getTierBadge(r.梯队评级)}`}>
                          {r.梯队评级}
                        </span>
                        <div className="mt-1 text-zinc-500 text-[11px]">{r.模型定位}</div>
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-zinc-50/50">
                    <td className="p-3 text-zinc-400 font-bold">Arena 总分</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3 text-base font-black text-zinc-950">
                        {r.LMSYS总榜Elo || "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-zinc-400 font-bold">SWE-bench %</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3 text-base font-black text-[#E03E1A]">
                        {r.SWE_bench_Verified ? `${r.SWE_bench_Verified}%` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-zinc-50/50">
                    <td className="p-3 text-zinc-400 font-bold">AIME 奥数 %</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3 text-base font-black text-blue-600">
                        {r.AIME_2024 ? `${r.AIME_2024}%` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-zinc-400 font-bold">GPQA 博士科学</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3 font-bold text-zinc-800">
                        {r.GPQA_Diamond ? `${r.GPQA_Diamond}%` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-zinc-50/50">
                    <td className="p-3 text-zinc-400 font-bold">MATH-500 数学</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3 font-bold text-zinc-800">
                        {r.MATH_500 ? `${r.MATH_500}%` : "—"}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-zinc-400 font-bold">上下文 / 输出</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3 text-zinc-700">
                        {r.上下文窗口} / 最大 {r.最大输出}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-zinc-50/50">
                    <td className="p-3 text-zinc-400 font-bold">价格 (每 100万 Token)</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3">
                        <div className="font-bold text-zinc-950">
                          输入 ${r.输入价格_美元.toFixed(2)} / 输出 ${r.输出价格_美元.toFixed(2)}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-zinc-400 font-bold">核心优势 (Strengths)</td>
                    {comparedRecords.map((r) => {
                      const v = getModelComprehensiveVerdict(r);
                      return (
                        <td key={r.模型名称} className="p-3 text-zinc-700 leading-relaxed font-sans text-xs">
                          <ul className="space-y-1">
                            {v.strengths?.map((s, idx) => (
                              <li key={idx} className="flex items-start gap-1 text-emerald-800">
                                <span className="text-emerald-500 font-bold shrink-0">•</span>
                                <span>{s}</span>
                              </li>
                            )) || <li>{r.核心优势}</li>}
                          </ul>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-zinc-50/50">
                    <td className="p-3 text-zinc-400 font-bold">明显短板 (Weaknesses)</td>
                    {comparedRecords.map((r) => {
                      const v = getModelComprehensiveVerdict(r);
                      return (
                        <td key={r.模型名称} className="p-3 text-zinc-700 leading-relaxed font-sans text-xs">
                          <ul className="space-y-1">
                            {v.weaknesses?.map((w, idx) => (
                              <li key={idx} className="flex items-start gap-1 text-rose-800">
                                <span className="text-rose-500 font-bold shrink-0">•</span>
                                <span>{w}</span>
                              </li>
                            )) || <li>{r.短板风险}</li>}
                          </ul>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-3 text-zinc-400 font-bold">实操避坑 (Pitfalls)</td>
                    {comparedRecords.map((r) => {
                      const v = getModelComprehensiveVerdict(r);
                      return (
                        <td key={r.模型名称} className="p-3 text-zinc-700 leading-relaxed font-sans text-xs bg-amber-50/30">
                          <ul className="space-y-1.5">
                            {v.pitfalls?.map((p, idx) => (
                              <li key={idx} className="flex items-start gap-1 text-amber-900 text-[11px]">
                                <span className="text-amber-500 font-bold shrink-0">⚡</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="p-3 text-zinc-400 font-bold">推荐适用场景</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3 text-zinc-800 font-bold">
                        {r.推荐场景}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-100">
              <button
                onClick={() => setShowCompareModal(false)}
                className="rounded-xl bg-zinc-950 text-white px-5 py-2 font-mono text-xs font-bold hover:bg-[#E03E1A] transition-colors"
              >
                关闭横向对比
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
