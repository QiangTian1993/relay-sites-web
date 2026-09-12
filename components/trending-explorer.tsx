"use client";

// GitHub 热榜浏览组件 —— 周期 / 语言分类 / 搜索 / 排序 / 飙升榜
// 数据来自飞书 github_trending 表（scripts/fetch-github-trending.ts 定时采集）
// 榜单口径：GitHub Trending 官方榜；飙升榜 = 按周期内新增星数降序

import { useMemo, useState } from "react";
import { ArrowUpRight, Flame, Info, Search, Star, GitFork, Clock } from "lucide-react";
import type { KeyedRecord } from "@/lib/types";
import { matchesSearch, toNumber, toStringArray, formatNumber } from "@/lib/record-utils";

type Period = "daily" | "weekly" | "monthly";
type View = "rank" | "soar";
type SortKey = "rank" | "stars" | "delta" | "forks";

interface Props {
  records: KeyedRecord[];
  fetchedAt?: string;
}

function repoLink(v: unknown): string {
  const s = String(v ?? "");
  const m = s.match(/\]\((https?:\/\/[^)]+)\)/);
  return m ? m[1] : s;
}

function periodOf(record: KeyedRecord): string {
  return toStringArray(record["周期"])[0] ?? "";
}

const PERIOD_ORDER: Period[] = ["daily", "weekly", "monthly"];

export default function TrendingExplorer({ records, fetchedAt }: Props) {
  const availablePeriods = useMemo(() => {
    const set = new Set<Period>();
    for (const r of records) {
      const p = periodOf(r) as Period;
      if (p === "daily" || p === "weekly" || p === "monthly") set.add(p);
    }
    return PERIOD_ORDER.filter((p) => set.has(p));
  }, [records]);

  const [period, setPeriod] = useState<Period>(availablePeriods[0] ?? "daily");
  const [view, setView] = useState<View>("rank");
  const [board, setBoard] = useState("all");
  const [category, setCategory] = useState("all");
  const [lang, setLang] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rank");

  // 榜单（官方 all 榜 + 各语言榜）
  const boards = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      const b = String(Array.isArray(r["榜单"]) ? r["榜单"][0] : r["榜单"] ?? "").trim();
      if (b) set.add(b);
    }
    return Array.from(set).sort((a, b) => (a === "all" ? -1 : b === "all" ? 1 : a.localeCompare(b)));
  }, [records]);

  // 功能分类（含当前周期计数）
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      if (periodOf(r) !== period) continue;
      const c = String(Array.isArray(r["功能分类"]) ? r["功能分类"][0] : r["功能分类"] ?? "").trim();
      if (!c) continue;
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [records, period]);

  // 语言（次要筛选）
  const languages = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      const l = String(r["语言"] ?? "").trim();
      if (l) set.add(l);
    }
    return Array.from(set).sort();
  }, [records]);

  const filtered = useMemo(() => {
    const rows = records.filter((r) => {
      if (periodOf(r) !== period) return false;
      const boardOf = String(Array.isArray(r["榜单"]) ? r["榜单"][0] : r["榜单"] ?? "");
      if (board === "merged") return true;
      if (board !== "all" && boardOf !== board) return false;
      if (board === "all" && boardOf !== "all") return false;
      if (category !== "all" && String(Array.isArray(r["功能分类"]) ? r["功能分类"][0] : r["功能分类"] ?? "") !== category) return false;
      if (lang !== "all" && String(r["语言"] ?? "") !== lang) return false;
      return matchesSearch(r, query, ["仓库", "描述", "中文描述", "语言"]);
    });
    const deltaOf = (r: KeyedRecord) => toNumber(r["周期内新增星数"]) ?? 0;
    const starsOf = (r: KeyedRecord) => toNumber(r["总星数"]) ?? 0;
    const forksOf = (r: KeyedRecord) => toNumber(r["Fork 数"]) ?? 0;
    const rankOf = (r: KeyedRecord) => toNumber(r["排名"]) ?? 999;
    const by: Record<SortKey, (a: KeyedRecord, b: KeyedRecord) => number> = {
      rank: (a, b) => rankOf(a) - rankOf(b),
      stars: (a, b) => starsOf(b) - starsOf(a),
      delta: (a, b) => deltaOf(b) - deltaOf(a),
      forks: (a, b) => forksOf(b) - forksOf(a),
    };
    const sorted = [...rows].sort(by[view === "soar" ? "delta" : sortBy]);
    return view === "soar" ? sorted.filter((r) => deltaOf(r) > 0) : sorted;
  }, [records, period, board, category, lang, query, sortBy, view]);

  const stats = useMemo(() => {
    const deltaTotal = filtered.reduce((acc, r) => acc + (toNumber(r["周期内新增星数"]) ?? 0), 0);
    const starsTotal = filtered.reduce((acc, r) => acc + (toNumber(r["总星数"]) ?? 0), 0);
    return { deltaTotal, starsTotal, langCount: new Set(filtered.map((r) => String(r["语言"] ?? ""))).size };
  }, [filtered]);

  const periodLabel: Record<Period, string> = {
    daily: "今日榜",
    weekly: "本周榜",
    monthly: "本月榜",
  };
  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "rank", label: "榜单位次" },
    { key: "delta", label: "周期新增" },
    { key: "stars", label: "总星数" },
    { key: "forks", label: "Fork" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="rounded-full bg-zinc-900 px-3 py-0.5 font-mono text-[10px] font-bold text-white uppercase tracking-wider">
                MODULE 03
              </span>
              <span className="rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 font-mono text-[10px] font-bold text-[#E03E1A] uppercase tracking-wider">
                GITHUB TRENDING REPOS
              </span>
              <span className="text-zinc-400 font-mono text-[10px] hidden sm:inline">
                每日 08:00 / 21:00 定时采收
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 mb-2">
              开源热榜与趋势大盘
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-2xl font-normal">
              覆盖 14 个主流语言、11 个功能分类，提供今日 / 本周 / 本月三个时间窗。
              热榜看开源风向，飙升榜看增长最快的黑马项目。
            </p>
          </div>

          <div className="flex flex-col md:items-end justify-center rounded-2xl bg-zinc-50 border border-zinc-200/60 p-4 font-mono text-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5" /> 最近同步时间
            </div>
            <div className="font-bold text-zinc-800 text-sm">{fetchedAt ?? "刚刚已同步"}</div>
          </div>
        </div>

        {/* Info notice pill */}
        <div className="mt-6 pt-5 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-[#E03E1A] shrink-0" />
            <span>
              数据采自 GitHub Trending 官方榜，支持按 AI 应用 / 开发者工具等二次分类筛选并附 LLM 自动中文译文。
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
            <span>14 语言分类</span>
            <span>·</span>
            <span>幂等合并</span>
          </div>
        </div>
      </section>

      {/* ── Filters & Stats Bar ─────────────────────────────────── */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 视图切换 (热榜 / 飙升榜) */}
          <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60 font-mono text-xs font-bold">
            {([["rank", "官方热榜"], ["soar", "飙升榜"]] as Array<[View, string]>).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  view === v
                    ? "bg-white text-zinc-950 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {v === "soar" && <Flame className="h-3.5 w-3.5 text-[#E03E1A]" />}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* 周期切换 (今日 / 本周 / 本月) */}
          <div className="inline-flex rounded-xl bg-zinc-100 p-1 border border-zinc-200/60 font-mono text-xs font-bold">
            {availablePeriods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  period === p
                    ? "bg-white text-zinc-950 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                {periodLabel[p]}
              </button>
            ))}
          </div>

          {/* 榜单与语言下拉 */}
          <div className="flex items-center gap-2">
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs"
            >
              <option value="all">官方全语言榜</option>
              <option value="merged">全部合并</option>
              {boards.filter((b) => b !== "all").map((b) => (
                <option key={b} value={b}>{`${b} 榜`}</option>
              ))}
            </select>

            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 font-mono text-xs font-bold text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-2xs"
            >
              <option value="all">ALL 语言</option>
              {languages.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索仓库、描述或关键字..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-9 pr-3 py-1.5 text-xs font-mono text-zinc-800 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* 功能分类 Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-zinc-100">
          <button
            onClick={() => setCategory("all")}
            className={`px-3 py-1 rounded-full font-mono text-xs font-bold transition-all ${
              category === "all"
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
            }`}
          >
            全部 <span className="opacity-60 text-[10px]">({records.filter((r) => periodOf(r) === period).length})</span>
          </button>
          {categoryStats.map(([c, count]) => (
            <button
              key={c}
              onClick={() => setCategory(c === category ? "all" : c)}
              className={`px-3 py-1 rounded-full font-mono text-xs font-bold transition-all ${
                category === c
                  ? "bg-[#E03E1A] text-white shadow-xs"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
              }`}
            >
              {c} <span className="opacity-60 text-[10px]">({count})</span>
            </button>
          ))}
        </div>

        {/* Stats Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-100">
          {[
            { label: "收录仓库数", value: filtered.length, unit: "个" },
            { label: "覆盖语言", value: stats.langCount, unit: "种" },
            { label: "周期新增星数", value: stats.deltaTotal, unit: "★", accent: true },
            { label: "总星数大盘", value: stats.starsTotal, unit: "★" },
          ].map(({ label, value, unit, accent }) => (
            <div key={label} className="rounded-2xl border border-zinc-200/70 bg-zinc-50/50 p-3.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                {label}
              </div>
              <div className={`font-mono text-xl sm:text-2xl font-black tabular-nums mt-1 ${accent ? "text-[#E03E1A]" : "text-zinc-900"}`}>
                {formatNumber(value)} <span className="text-xs font-normal text-zinc-400">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Repository List ─────────────────────────────────────── */}
      <section className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-16 text-center shadow-xs">
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-400 mb-2">NO DATA</p>
            <p className="text-sm text-zinc-600">
              {records.length === 0
                ? "热榜数据尚未采集 —— 运行 npm run trending 或等待定时任务写入飞书 github_trending 表。"
                : view === "soar"
                  ? "当前筛选条件下没有带增量的仓库。"
                  : "当前筛选条件下没有匹配的项目。"}
            </p>
          </div>
        ) : (
          filtered.map((r, idx) => {
            const rank = toNumber(r["排名"]) ?? 0;
            const stars = toNumber(r["总星数"]);
            const delta = toNumber(r["周期内新增星数"]);
            const forks = toNumber(r["Fork 数"]);
            const langText = String(r["语言"] ?? "").trim();
            const categoryText = String(Array.isArray(r["功能分类"]) ? r["功能分类"][0] : r["功能分类"] ?? "").trim();
            const zhDesc = String(Array.isArray(r["中文描述"]) ? r["中文描述"][0] : r["中文描述"] ?? "").trim();
            const desc = (zhDesc || String(r["描述"] ?? "").trim()).slice(0, 160);
            const href = repoLink(r["链接"]);
            const isSoar = view === "soar";

            return (
              <div
                key={String(r.__id)}
                className="group rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 hover:border-zinc-300 hover:shadow-xs transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left: Rank & Repo Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Rank Badge */}
                  <div className="shrink-0 flex flex-col items-center justify-center">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-sm ${
                        isSoar
                          ? "bg-orange-50 text-[#E03E1A] border border-orange-200/80"
                          : rank === 1
                            ? "bg-[#E03E1A] text-white shadow-xs"
                            : rank <= 3
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-600 border border-zinc-200/60"
                      }`}
                    >
                      {isSoar ? `#${idx + 1}` : rank}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-base text-zinc-900 hover:text-[#E03E1A] flex items-center gap-1 transition-colors truncate"
                      >
                        <span>{String(r["仓库"] ?? "")}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-zinc-400 group-hover:text-[#E03E1A] transition-colors shrink-0" />
                      </a>

                      {langText && (
                        <button
                          onClick={() => setLang(langText === lang ? "all" : langText)}
                          className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.2 font-mono text-[10px] font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
                        >
                          {langText}
                        </button>
                      )}

                      {categoryText && (
                        <span className="rounded-full border border-orange-100 bg-orange-50/60 px-2 py-0.2 font-mono text-[10px] font-bold text-[#E03E1A]">
                          {categoryText}
                        </span>
                      )}
                    </div>

                    {desc && (
                      <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">
                        {desc}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Metrics */}
                <div className="flex items-center gap-4 shrink-0 sm:border-l sm:border-zinc-100 sm:pl-5 font-mono text-xs">
                  {/* Delta */}
                  {delta !== null && delta > 0 && (
                    <div className="rounded-lg bg-orange-50 border border-orange-200/60 px-2.5 py-1 text-center">
                      <div className="font-bold text-[#E03E1A] text-sm tabular-nums flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        <span>+{formatNumber(delta)}</span>
                      </div>
                      <div className="text-[8.5px] uppercase tracking-wider text-orange-800/70 mt-0.5">
                        周期新增
                      </div>
                    </div>
                  )}

                  {/* Stars */}
                  <div className="text-right">
                    <div className="font-bold text-zinc-800 text-sm tabular-nums flex items-center gap-1 justify-end">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>{stars !== null ? formatNumber(stars) : "—"}</span>
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-zinc-400 mt-0.5 flex items-center gap-1 justify-end">
                      <GitFork className="h-2.5 w-2.5" />
                      <span>{forks !== null ? formatNumber(forks) : "—"} forks</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
