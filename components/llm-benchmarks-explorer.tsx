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
  Info
} from "lucide-react";
import type { ModelBenchmarkRecord } from "@/lib/benchmarks";

interface Props {
  records: ModelBenchmarkRecord[];
}

type SortKey =
  | "LMSYS总榜Elo"
  | "SWE_bench_Verified"
  | "AIME_2024"
  | "GPQA_Diamond"
  | "MATH_500"
  | "输入价格_美元";

export default function LlmBenchmarksExplorer({ records }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<string>("全部");
  const [selectedPositioning, setSelectedPositioning] = useState<string>("全部");
  const [sortKey, setSortKey] = useState<SortKey>("LMSYS总榜Elo");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);

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
        const valA = a[sortKey] ?? 0;
        const valB = b[sortKey] ?? 0;
        if (sortAsc) return valA > valB ? 1 : -1;
        return valA < valB ? 1 : -1;
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
              汇集全球主流旗舰（Claude 3.7 / OpenAI o3 / Gemini 2.5 / DeepSeek R1 / 智谱 GLM / 通义千问）真实测评基准：涵盖 LMSYS Arena 盲测、SWE-bench Verified 真实代码缺陷率、AIME 数学奥赛与官方价格横评。
            </p>
          </div>

          {/* 右侧核心荣誉标牌 */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-3.5 shadow-2xs font-mono text-center min-w-[120px]">
              <div className="text-[10px] uppercase text-zinc-400 font-bold">Arena 竞技榜首</div>
              <div className="text-base font-black text-blue-600 mt-0.5">Gemini 2.5 Pro</div>
              <div className="text-[11px] text-zinc-500 font-bold">1466.2 Elo</div>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-3.5 shadow-2xs font-mono text-center min-w-[120px]">
              <div className="text-[10px] uppercase text-zinc-400 font-bold">代码实战 SOTA</div>
              <div className="text-base font-black text-[#E03E1A] mt-0.5">Claude 3.7 Sonnet</div>
              <div className="text-[11px] text-zinc-500 font-bold">70.3% SWE-bench</div>
            </div>
            <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-3.5 shadow-2xs font-mono text-center min-w-[120px]">
              <div className="text-[10px] uppercase text-zinc-400 font-bold">数学奥赛登顶</div>
              <div className="text-base font-black text-emerald-600 mt-0.5">OpenAI o3-mini</div>
              <div className="text-[11px] text-zinc-500 font-bold">87.3% AIME 2024</div>
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
          {filteredRecords.map((model) => {
            const isCompared = compareList.includes(model.模型名称);

            return (
              <article
                key={model.模型名称}
                className={`group relative flex flex-col justify-between rounded-3xl border transition-all duration-200 bg-white p-5 sm:p-6 shadow-2xs hover:shadow-md ${
                  isCompared ? "border-[#E03E1A] ring-1 ring-[#E03E1A]/20" : "border-zinc-200/80 hover:border-zinc-300"
                }`}
              >
                <div>
                  {/* Card Header: 家族 + 梯队 + 厂商 */}
                  <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-zinc-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold border ${getFamilyBadge(model.家族系列)}`}>
                        {model.家族系列}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold border ${getTierBadge(model.梯队评级)}`}>
                        {model.梯队评级}
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

                  {/* Strengths & Caveats */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="rounded-xl bg-emerald-50/60 border border-emerald-100/80 p-2.5 text-zinc-700 leading-relaxed">
                      <span className="font-bold text-emerald-800 mr-1 flex items-center gap-1">
                        <CheckCircle2 className="inline h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        核心优势:
                      </span>
                      <span className="text-zinc-600">{model.核心优势}</span>
                    </div>

                    <div className="rounded-xl bg-amber-50/60 border border-amber-100/80 p-2.5 text-zinc-700 leading-relaxed">
                      <span className="font-bold text-amber-800 mr-1 flex items-center gap-1">
                        <AlertTriangle className="inline h-3.5 w-3.5 text-amber-600 shrink-0" />
                        短板与踩坑:
                      </span>
                      <span className="text-zinc-600">{model.短板风险}</span>
                    </div>
                  </div>

                  {/* Best Used For */}
                  <div className="mt-3 font-mono text-[11px] text-zinc-500">
                    <span className="font-bold text-zinc-700">推荐场景: </span>
                    <span>{model.推荐场景}</span>
                  </div>
                </div>

                {/* Card Footer: Pricing & Compare Action */}
                <div className="mt-5 pt-3.5 border-t border-zinc-100 flex items-center justify-between font-mono text-xs">
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
                    onClick={() => toggleCompare(model.模型名称)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      isCompared
                        ? "bg-[#E03E1A] text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                    }`}
                  >
                    <Scale className="h-3 w-3" />
                    <span>{isCompared ? "已加入对比" : "对比"}</span>
                  </button>
                </div>
              </article>
            );
          })}
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

      {/* ── 浮动对比托盘与横向对照抽屉 ──────────────────────────────── */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border border-zinc-900 bg-zinc-950 px-5 py-3 text-white shadow-2xl font-mono text-xs animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-[#E03E1A]" />
            <span>已选 <strong className="text-white">{compareList.length}</strong> / 4 款模型</span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="flex items-center gap-1.5 max-w-xs sm:max-w-md overflow-x-auto scrollbar-none">
            {compareList.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300 shrink-0"
              >
                <span className="truncate max-w-[120px]">{name}</span>
                <button
                  onClick={() => toggleCompare(name)}
                  className="hover:text-white"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <button
            onClick={() => setShowCompareModal(true)}
            className="rounded-xl bg-[#E03E1A] px-3.5 py-1.5 font-bold text-white hover:bg-[#c93514] transition-colors"
          >
            横向深入对比
          </button>
          <button
            onClick={() => setCompareList([])}
            className="text-zinc-400 hover:text-white text-xs"
          >
            清空
          </button>
        </div>
      )}

      {/* ── 深入对比全屏弹窗 ────────────────────────────────────────── */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
              <div className="flex items-center gap-2 font-mono">
                <Scale className="h-5 w-5 text-[#E03E1A]" />
                <h2 className="text-xl font-black text-zinc-950">模型全维横评对比</h2>
                <span className="text-xs text-zinc-400">({comparedRecords.length} 款)</span>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="rounded-full p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 并排对比表格 */}
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
                    <td className="p-3 text-zinc-400 font-bold">核心优势</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3 text-zinc-700 leading-relaxed">
                        {r.核心优势}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-zinc-50/50">
                    <td className="p-3 text-zinc-400 font-bold">短板与踩坑</td>
                    {comparedRecords.map((r) => (
                      <td key={r.模型名称} className="p-3 text-zinc-600 leading-relaxed">
                        {r.短板风险}
                      </td>
                    ))}
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
