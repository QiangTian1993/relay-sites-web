"use client";

// GitHub 热榜浏览组件 —— 周期 / 语言 / 搜索 / 排序 筛选
// 数据来自飞书 github_trending 表（scripts/fetch-github-trending.ts 定时采集）

import { useMemo, useState } from "react";
import { ArrowUpRight, Flame, Search } from "lucide-react";
import type { KeyedRecord } from "@/lib/types";
import { inferOptions, matchesSearch, toNumber, toStringArray, formatNumber } from "@/lib/record-utils";

type Period = "daily" | "weekly" | "monthly";
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

export default function TrendingExplorer({ records, fetchedAt }: Props) {
  const availablePeriods = useMemo(() => {
    const set = new Set<Period>();
    for (const r of records) {
      const p = periodOf(r) as Period;
      if (p === "daily" || p === "weekly" || p === "monthly") set.add(p);
    }
    return (["daily", "weekly", "monthly"] as Period[]).filter((p) => set.has(p));
  }, [records]);

  const [period, setPeriod] = useState<Period>(availablePeriods[0] ?? "daily");
  const [lang, setLang] = useState("all");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rank");

  const languages = useMemo(
    () => inferOptions(records, "语言").filter((l) => l.length > 0),
    [records],
  );

  const filtered = useMemo(() => {
    const rows = records.filter((r) => {
      if (periodOf(r) !== period) return false;
      if (lang !== "all" && String(r["语言"] ?? "") !== lang) return false;
      return matchesSearch(r, query, ["仓库", "描述", "语言"]);
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
    return [...rows].sort(by[sortBy]);
  }, [records, period, lang, query, sortBy]);

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
    <div>
      {/* ── Header ─────────────────────────────────────────────── */}
      <section className="border-b-2 border-black bg-black text-white">
        <div className="grid md:grid-cols-[1fr_auto]">
          <div className="p-6 md:p-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3">
              MODULE 03 · GitHub Trending Repos · 定时采集
            </p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-3">
              开源热榜<span className="text-swiss-accent">.</span>
            </h1>
            <p className="text-sm text-white/60 leading-relaxed max-w-2xl">
              GitHub Trending 每日 08:00 / 21:00 自动采集（daily 榜 6 个语言，周日 weekly、每月 1 日 monthly），
              按时间窗与语言筛选，掌握开源动态。
            </p>
          </div>
          <div className="hidden md:flex flex-col justify-between border-l-2 border-white/15 p-6">
            <div className="font-mono text-[9px] uppercase tracking-widest text-white/40">LAST SYNC</div>
            <div className="font-mono text-xl font-black">{fetchedAt ?? "—"}</div>
          </div>
        </div>
      </section>

      {/* ── Filters ────────────────────────────────────────────── */}
      <section className="border-b-2 border-black bg-white">
        <div className="flex flex-wrap items-center gap-3 p-4 md:p-5">
          {/* 周期 */}
          <div className="flex border-2 border-black">
            {availablePeriods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 font-mono text-xs font-black uppercase tracking-wider transition-colors ${
                  period === p ? "bg-black text-white" : "bg-white text-black hover:bg-swiss-accent/10"
                }`}
              >
                {periodLabel[p]}
              </button>
            ))}
          </div>

          {/* 语言 */}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="border-2 border-black bg-white px-3 py-2 font-mono text-xs font-black uppercase tracking-wider focus:outline-none focus:bg-swiss-accent/10"
          >
            <option value="all">ALL 语言</option>
            {languages.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* 搜索 */}
          <div className="flex min-w-[220px] flex-1 items-center gap-2 border-2 border-black px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-black/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索仓库 / 描述..."
              className="w-full bg-transparent font-mono text-xs focus:outline-none"
            />
          </div>

          {/* 排序 */}
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-black/40 mr-1">SORT</span>
            {sortOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-2.5 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider transition-colors ${
                  sortBy === opt.key ? "bg-swiss-accent text-black" : "text-black/50 hover:text-black"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap border-t-2 border-black">
          {[
            { label: "REPOS", value: filtered.length },
            { label: "LANGS", value: stats.langCount },
            { label: "周期新增 ★", value: stats.deltaTotal, accent: true },
            { label: "累计星数 ★", value: stats.starsTotal },
          ].map(({ label, value, accent }) => (
            <div key={label} className={`border-r-2 border-black px-5 py-3 ${accent ? "bg-swiss-accent/10" : ""}`}>
              <div className={`font-mono text-xl font-black tabular-nums ${accent ? "text-swiss-accent" : ""}`}>
                {formatNumber(value)}
              </div>
              <div className="font-mono text-[8px] uppercase tracking-widest text-black/40 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── List ───────────────────────────────────────────────── */}
      <section className="bg-[#FBFBF8]">
        {filtered.length === 0 ? (
          <div className="p-16 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-black/40 mb-2">NO DATA</p>
            <p className="text-sm text-black/60">
              {records.length === 0
                ? "热榜数据尚未采集 —— 运行 npm run trending 或等待定时任务写入飞书 github_trending 表。"
                : "当前筛选条件下没有记录。"}
            </p>
          </div>
        ) : (
          <ul className="divide-y-2 divide-black">
            {filtered.map((r) => {
              const rank = toNumber(r["排名"]) ?? 0;
              const stars = toNumber(r["总星数"]);
              const delta = toNumber(r["周期内新增星数"]);
              const forks = toNumber(r["Fork 数"]);
              const langText = String(r["语言"] ?? "").trim();
              const desc = String(r["描述"] ?? "").trim();
              const href = repoLink(r["链接"]);
              return (
                <li key={String(r.__id)} className="group grid grid-cols-[44px_1fr] md:grid-cols-[56px_1fr_160px_120px] items-stretch hover:bg-white transition-colors">
                  {/* 排名 */}
                  <div className={`flex items-center justify-center border-r-2 border-black py-4 ${
                    rank <= 3 ? "bg-swiss-accent/15" : ""
                  }`}>
                    <span className={`font-mono text-2xl md:text-3xl font-black tabular-nums ${
                      rank === 1 ? "text-swiss-accent" : rank <= 3 ? "text-black" : "text-black/25"
                    }`}>
                      {rank}
                    </span>
                  </div>

                  {/* 仓库主体 */}
                  <div className="px-4 md:px-6 py-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="font-black text-base md:text-lg leading-tight hover:text-swiss-accent flex items-center gap-1.5"
                      >
                        {String(r["仓库"] ?? "")}
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      {langText && (
                        <span className="border border-black/20 bg-black/5 px-2 py-0.5 font-mono text-[10px] font-bold text-black/70">
                          {langText}
                        </span>
                      )}
                    </div>
                    {desc && (
                      <p className="text-xs text-black/55 leading-relaxed max-w-3xl">{desc}</p>
                    )}
                  </div>

                  {/* 星数 / fork */}
                  <div className="hidden md:flex flex-col justify-center border-l-2 border-black/10 px-4">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-lg font-black tabular-nums">{stars !== null ? formatNumber(stars) : "—"}</span>
                      {delta !== null && delta > 0 && (
                        <span className="font-mono text-[10px] font-black tabular-nums text-swiss-accent">
                          +{formatNumber(delta)}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-black/35 mt-0.5">
                      ★ {forks !== null ? formatNumber(forks) : "—"} ⑂
                    </div>
                  </div>

                  {/* 采集时间 */}
                  <div className="hidden md:flex flex-col justify-center border-l-2 border-black/10 px-4">
                    <div className="font-mono text-[10px] text-black/45">{String(r["采集时间"] ?? "")}</div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-black/30 mt-0.5">
                      {periodLabel[period]}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Footer note ────────────────────────────────────────── */}
      <section className="border-t-2 border-black bg-swiss-muted/60 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-black/40">
          <span className="flex items-center gap-1.5"><Flame className="h-3 w-3 text-swiss-accent" /> 每日 08:00 / 21:00 自动刷新</span>
          <span>· 数据源 GitHub Trending</span>
          <span>· 写入飞书 knowledge-base-2026 / github_trending</span>
        </div>
      </section>
    </div>
  );
}
