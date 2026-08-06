import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { loadTable } from "@/lib/data-loader";
import { latestFetchTime, calcFreshness } from "@/lib/freshness";

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [sitesData, groupsData, perfData, toolsData, trendingData] = await Promise.all([
    loadTable("relay_sites_tracker"),
    loadTable("relay_site_groups"),
    loadTable("relay_site_perf"),
    loadTable("vibe_coding_tracker"),
    loadTable("github_trending"),
  ]);

  const siteCount = sitesData?.records.length ?? 0;
  const groupCount = groupsData?.records.length ?? 0;
  const perfCount = perfData?.records.length ?? 0;
  const toolCount = toolsData?.records.length ?? 0;
  const trendingCount = trendingData?.records.length ?? 0;

  const trendingLangs = new Set(
    (trendingData?.records ?? []).map((r) => {
      const raw = r["语言"];
      return String(Array.isArray(raw) ? raw[0] ?? "" : raw ?? "");
    }).filter(Boolean),
  ).size;

  const trendingDelta = (trendingData?.records ?? []).reduce((acc, r) => {
    const raw = r["周期内新增星数"];
    const n = typeof raw === "number" ? raw : Number(raw);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);

  const trendingLatestSync =
    (trendingData?.records ?? []).map((r) => {
      const t = Array.isArray(r["采集时间"]) ? String(r["采集时间"][0]) : String(r["采集时间"] ?? "");
      return t;
    }).filter(Boolean).sort().at(-1) ?? "—";

  const changedCount =
    groupsData?.records.filter((r) => {
      const raw = Array.isArray(r.change_direction) ? r.change_direction[0] : r.change_direction;
      return raw === "up" || raw === "down";
    }).length ?? 0;

  const toolsByType = toolsData?.records.reduce<Record<string, number>>((acc, r) => {
    const raw = r["类型"];
    const type = Array.isArray(raw) ? String(raw[0] ?? "其他") : String(raw ?? "其他");
    acc[type] = (acc[type] ?? 0) + 1;
    return acc;
  }, {}) ?? {};
  const topTypes = Object.entries(toolsByType).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const freshness = calcFreshness(
    latestFetchTime([sitesData?.fetchedAt, groupsData?.fetchedAt, toolsData?.fetchedAt]),
  );

  const toc = [
    { num: "01", title: "模型倍率与可用性比价", active: true, href: "#module-01" },
    { num: "02", title: "Vibe Coding 工具全景", active: true, href: "#module-02" },
    { num: "03", title: "开源热榜", active: true, href: "#module-03" },
    { num: "04", title: "个人技能库", active: false, href: "#module-04" },
  ];

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "信息杂货铺 — Relay Index",
    alternateName: "AI 中转站比价 / GitHub 热榜 / AI 编程工具",
    url: "https://www.xiuxai.com/relay-index/",
    description:
      "AI 世界的实用情报收集成册：AI 中转站模型比价、Vibe Coding 工具横评、GitHub 开源热榜，按模块收集成册。",
    inLanguage: "zh-CN",
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black bg-white">
        <div className="grid lg:grid-cols-[1fr_320px]">

          {/* Left: branding + decorative circles */}
          <div className="p-8 md:p-14 relative overflow-hidden">
            <svg
              className="absolute top-0 right-0 pointer-events-none"
              width="320" height="320"
              viewBox="0 0 320 320"
              aria-hidden="true"
            >
              <circle cx="320" cy="0" r="260" fill="none" stroke="black" strokeWidth="1.5" opacity="0.04" />
              <circle cx="320" cy="0" r="190" fill="none" stroke="black" strokeWidth="1" opacity="0.04" />
              <circle cx="320" cy="0" r="120" fill="none" stroke="black" strokeWidth="0.5" opacity="0.04" />
            </svg>

            <div className="relative z-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-black/40 mb-6 flex items-center gap-2">
                <span className="h-2 w-2 bg-swiss-accent inline-block animate-pulse" />
                Relay Index · Information General Store
              </p>
              <h1 className="text-[60px] md:text-[88px] font-black leading-[0.88] tracking-tightest mb-8">
                信息<br /><span className="text-swiss-accent">杂货铺</span>
              </h1>
              <p className="text-base text-black/65 max-w-lg leading-relaxed mb-8">
                把 AI 世界的实用情报收集成册——<br />
                模型比价、编程工具、开源热榜、个人技能库，<br />
                想查什么，进对应的货架。
              </p>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-black/40 uppercase tracking-wider">
                <span className="font-black text-black">4 大顶级 Modules</span>
                <span>·</span>
                <span className="font-black text-black">{(siteCount + groupCount + toolCount + trendingCount).toLocaleString()}+ 真实情报记录</span>
                <span>·</span>
                <span>已同步 {freshness.label}</span>
              </div>
            </div>
          </div>

          {/* Right: TOC Navigation */}
          <div
            className="hidden lg:flex flex-col border-l-2 border-black overflow-hidden bg-[#F4F4F0]"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.12) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          >
            <div className="p-6 border-b-2 border-black bg-white/90 backdrop-blur">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-black/40 pb-3 mb-1 border-b border-black/15">
                货架大目录 · Quick Jump
              </p>
              {toc.map(({ num, title, active, href }) => (
                active ? (
                  <a
                    key={num}
                    href={href}
                    className="flex items-center gap-3 py-3 border-b border-black/10 last:border-b-0 group transition-colors hover:text-swiss-accent"
                  >
                    <span className="font-mono text-xs font-black text-black/40 group-hover:text-swiss-accent shrink-0">{num}</span>
                    <span className="text-sm font-black leading-tight flex-1">{title}</span>
                    <span className="text-swiss-accent shrink-0 font-black text-xs">→</span>
                  </a>
                ) : (
                  <div
                    key={num}
                    className="flex items-center gap-3 py-3 border-b border-black/10 last:border-b-0 opacity-35"
                  >
                    <span className="font-mono text-xs font-black text-black/30 shrink-0">{num}</span>
                    <span className="text-sm font-black leading-tight flex-1">{title}</span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-black/40">Soon</span>
                  </div>
                )
              ))}
            </div>

            <div className="flex-1 flex flex-col justify-end p-6 bg-white/50">
              <div className="font-mono text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">
                DATABASE TELEMETRY
              </div>
              <div className="font-mono text-xl font-black text-black">
                {(siteCount + groupCount + toolCount + trendingCount).toLocaleString()} <span className="text-xs font-normal text-black/50">条实测记录已入库</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Accent rule before modules */}
      <div className="h-[3px] bg-swiss-accent" />

      {/* ── Module 01: AI 中转站 ──────────────────────────────────── */}
      <article id="module-01" className="border-b-2 border-black bg-white group transition-colors hover:bg-[#FAFAFA]">
        <div className="grid grid-cols-[56px_1fr] md:grid-cols-[72px_1fr_240px]">
          <NumCol num="01" variant="accent" />
          <div className="p-6 md:p-10 md:border-r-2 border-black">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/40">
                MODULE 01 · OpenAI / Claude / Gemini / xAI
              </p>
              <span className="border border-swiss-accent/40 bg-swiss-accent/5 px-2 py-0.5 font-mono text-[10px] font-bold text-swiss-accent">
                主数据大盘
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-3 group-hover:text-swiss-accent transition-colors">
              AI 中转站 — 模型倍率与可用性比价
            </h2>
            <p className="text-sm text-black/60 leading-relaxed max-w-3xl mb-6">
              多平台模型中转服务横向对比。同一个模型，不同站点的定价可能相差数倍——
              把倍率、分组计费、7 天可用率和网络延迟打点放进同一张决策表。
            </p>
            <div className="inline-flex flex-wrap border-l-2 border-t-2 border-black">
              {[
                { label: "SITES 收录", value: siteCount, accent: false },
                { label: "GROUPS 分组", value: groupCount, accent: false },
                { label: "PERF 探针", value: perfCount, accent: false },
                { label: "CHANGED 变动", value: changedCount, accent: true },
              ].map(({ label, value, accent }) => (
                <div
                  key={label}
                  className={`border-r-2 border-b-2 border-black px-6 py-4 ${accent ? "bg-swiss-accent/5" : "bg-white"}`}
                >
                  <div className={`font-mono text-3xl font-black tabular-nums ${accent ? "text-swiss-accent" : ""}`}>
                    {value.toLocaleString()}
                  </div>
                  <div className={`font-mono text-[9px] uppercase tracking-widest mt-1 ${accent ? "text-swiss-accent/70" : "text-black/40"}`}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex flex-col p-6 justify-center bg-[#FBFBF8] group-hover:bg-white transition-colors">
            <Btn href="/relay" label="进入 AI 中转站选型大盘" primary />
          </div>
        </div>
        <div className="md:hidden flex gap-3 border-t-2 border-black p-4">
          <Btn href="/relay" label="进入 AI 中转站选型大盘" primary />
        </div>
      </article>

      {/* ── Module 02: AI 编程工具 ────────────────────────────────── */}
      <article id="module-02" className="border-b-2 border-black bg-white group transition-colors hover:bg-[#FAFAFA]">
        <div className="grid grid-cols-[56px_1fr] md:grid-cols-[72px_1fr_240px]">
          <NumCol num="02" variant="dark" />
          <div className="p-6 md:p-10 md:border-r-2 border-black">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/40">
                MODULE 02 · IDE / CLI / 桌面端
              </p>
              <span className="border border-black/20 bg-black/5 px-2 py-0.5 font-mono text-[10px] font-bold text-black/70">
                工具生态图谱
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-3 group-hover:text-swiss-accent transition-colors">
              Vibe Coding 工具全景大盘
            </h2>
            <p className="text-sm text-black/60 leading-relaxed max-w-3xl mb-6">
              Cursor、Claude Code、Cline、Copilot……AI 编程工具越来越多。
              按类型、平台、多 Agent 支持能力横向对比，附产品定位与使用建议。
            </p>
            <div className="inline-flex flex-wrap border-l-2 border-t-2 border-black">
              <div className="border-r-2 border-b-2 border-black bg-white px-6 py-4">
                <div className="font-mono text-3xl font-black tabular-nums">{toolCount}</div>
                <div className="font-mono text-[9px] uppercase tracking-widest text-black/40 mt-1">TOOLS 收录</div>
              </div>
              {topTypes.map(([type, count]) => (
                <div key={type} className="border-r-2 border-b-2 border-black bg-white px-6 py-4">
                  <div className="font-mono text-3xl font-black tabular-nums">{count}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-black/40 mt-1 max-w-[100px] truncate">
                    {type}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex flex-col p-6 justify-center bg-[#FBFBF8] group-hover:bg-white transition-colors">
            <Btn href="/table/vibe_coding_tracker" label="探索 42 款 AI 编程工具" primary />
          </div>
        </div>
        <div className="md:hidden flex gap-3 border-t-2 border-black p-4">
          <Btn href="/table/vibe_coding_tracker" label="探索 42 款 AI 编程工具" primary />
        </div>
      </article>

      {/* ── Module 03: GitHub 热榜 ─────────────────────────────── */}
      <article id="module-03" className="border-b-2 border-black bg-white group transition-colors hover:bg-[#FAFAFA]">
        <div className="grid grid-cols-[56px_1fr] md:grid-cols-[72px_1fr_240px]">
          <NumCol num="03" variant="accent" />
          <div className="p-6 md:p-10 md:border-r-2 border-black">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/40">
                MODULE 03 · GitHub Trending Repos
              </p>
              <span className="border border-swiss-accent/40 bg-swiss-accent/5 px-2 py-0.5 font-mono text-[10px] font-bold text-swiss-accent">
                每日双更 · 定时采集
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-3 group-hover:text-swiss-accent transition-colors">
              开源热榜 — GitHub Trending 大盘
            </h2>
            <p className="text-sm text-black/60 leading-relaxed max-w-3xl mb-6">
              每日 08:00 / 21:00 自动采集 GitHub Trending，覆盖 daily / weekly / monthly
              时间窗与 6 种主流语言。星数增量一目了然，快速掌握开源动态。
            </p>
            <div className="inline-flex flex-wrap border-l-2 border-t-2 border-black">
              {[
                { label: "REPOS 收录", value: trendingCount, accent: false },
                { label: "LANGS 语言", value: trendingLangs, accent: false },
                { label: "★ 周期增量", value: trendingDelta, accent: true },
                { label: "SYNC 最近同步", value: trendingLatestSync, accent: false, text: true },
              ].map(({ label, value, accent, text }) => (
                <div
                  key={label}
                  className={`border-r-2 border-b-2 border-black px-6 py-4 ${accent ? "bg-swiss-accent/5" : "bg-white"}`}
                >
                  <div className={`font-mono font-black tabular-nums ${text ? "text-base md:text-lg" : "text-3xl"} ${accent ? "text-swiss-accent" : ""}`}>
                    {typeof value === "number" ? value.toLocaleString() : String(value).slice(5, 16)}
                  </div>
                  <div className={`font-mono text-[9px] uppercase tracking-widest mt-1 ${accent ? "text-swiss-accent/70" : "text-black/40"}`}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex flex-col p-6 justify-center bg-[#FBFBF8] group-hover:bg-white transition-colors">
            <Btn href="/modules/github_trending" label="进入开源热榜大盘" primary />
          </div>
        </div>
        <div className="md:hidden flex gap-3 border-t-2 border-black p-4">
          <Btn href="/modules/github_trending" label="进入开源热榜大盘" primary />
        </div>
      </article>

      {/* ── Module 04: Coming Soon ──────────────────────────────── */}
      {[
        {
          num: "04",
          id: "module-04",
          tag: "MODULE 04 · Prompt / Snippet",
          title: "个人技能库",
          desc: "积累和整理实用的 AI 工作流、提示词模板和可复用的代码片段。",
        },
      ].map(({ num, id, tag, title, desc }) => (
        <article key={num} id={id} className="border-b-2 border-black bg-swiss-muted/60">
          <div className="grid grid-cols-[56px_1fr]">
            <NumCol num={num} variant="muted" />
            <div className="p-6 md:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/35 mb-1.5">{tag}</p>
              <h2 className="text-xl md:text-2xl font-black mb-3 text-black/40">{title}</h2>
              <p className="text-sm text-black/40 leading-relaxed max-w-2xl">{desc}</p>
              <span className="inline-block mt-4 border border-dashed border-black/30 px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-black/40">
                筹备中 · Data Pending
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────

type NumColVariant = "accent" | "dark" | "muted";

function NumCol({ num, variant }: { num: string; variant: NumColVariant }) {
  const bg = variant === "accent" ? "bg-swiss-accent" : variant === "dark" ? "bg-black" : "bg-swiss-muted";
  const numColor =
    variant === "accent" || variant === "dark" ? "text-white/25" : "text-black/20";
  const statusColor =
    variant === "accent" || variant === "dark" ? "text-white/70" : "text-black/30";
  const status = variant === "muted" ? "—" : "ON";

  return (
    <aside className={`border-r-2 border-black flex flex-col items-center justify-between py-6 px-3 ${bg}`}>
      <span className={`font-mono text-4xl font-black leading-none select-none ${numColor}`}>{num}</span>
      <span className={`font-mono text-[8px] font-black uppercase tracking-widest ${statusColor}`}>{status}</span>
    </aside>
  );
}

function Btn({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 border-2 border-black px-4 py-2.5 font-mono text-xs font-black transition-colors ${
        primary
          ? "bg-black text-white hover:bg-swiss-accent hover:border-swiss-accent"
          : "bg-white text-black hover:bg-black hover:text-white"
      }`}
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
    </Link>
  );
}
