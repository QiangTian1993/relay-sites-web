import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Flame,
  Layers,
  Package,
  Receipt,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Terminal,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import { loadTable } from "@/lib/data-loader";
import { getAllArticles } from "@/lib/articles";
import { latestFetchTime, calcFreshness } from "@/lib/freshness";
import {
  RubberStamp,
  BarcodeGraphic,
  ReceiptZigzag,
  ShelfHangtag,
  ShelfTicketButton,
} from "@/components/store-goods-ui";

export const dynamic = "force-static";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const [sitesData, groupsData, perfData, toolsData, trendingData, articles] = await Promise.all([
    loadTable("relay_sites_tracker"),
    loadTable("relay_site_groups"),
    loadTable("relay_site_perf"),
    loadTable("vibe_coding_tracker"),
    loadTable("github_trending"),
    getAllArticles(),
  ]);

  const siteCount = sitesData?.records.length ?? 0;
  const groupCount = groupsData?.records.length ?? 0;
  const perfCount = perfData?.records.length ?? 0;
  const toolCount = toolsData?.records.length ?? 0;
  const trendingCount = trendingData?.records.length ?? 0;
  const articlesCount = articles.length;

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

  const totalRecords = siteCount + groupCount + toolCount + trendingCount + articlesCount;

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "信息杂货铺 — Relay Index",
    alternateName: "AI 中转站比价 / GitHub 热榜 / AI 编程工具 / 深度专刊",
    url: "https://www.xiuxai.com/relay-index/",
    description:
      "AI 世界的实用情报收集成册：AI 中转站模型比价、Vibe Coding 工具横评、GitHub 开源热榜、深度专题研报，按模块摆齐上架。",
    inLanguage: "zh-CN",
  };

  return (
    <div className="relative min-h-screen bg-[#FAF9F5] text-zinc-900 pb-20">
      {/* Background Subtle Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 space-y-8">

        {/* ── 店招门楣跑马栏 (Storefront Marquee Ribbon) ───────────── */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono select-none shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/10 text-[#E03E1A] border border-orange-500/20">
              <Store className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-zinc-900 tracking-tight">XIUXAI INFORMATION GENERAL STORE</span>
            <span className="text-zinc-300 hidden md:inline">/</span>
            <span className="text-zinc-500 hidden md:inline">营业代号: NO. 8848-AI</span>
            <span className="text-zinc-300 hidden sm:inline">/</span>
            <span className="text-zinc-500 hidden sm:inline">AI 实用情报专门店</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>今日营业中</span>
            </span>
            <span className="text-zinc-200 hidden sm:inline">|</span>
            <span className="hidden sm:inline text-zinc-600">15 并发自动探针巡检 · 货真价实</span>
          </div>
        </div>

        {/* ── Hero: 货铺中堂与今日盘点小票 ───────────────────────────── */}
        <section className="rounded-3xl border border-zinc-200/80 bg-white overflow-hidden shadow-sm">
          <div className="grid lg:grid-cols-[1fr_400px]">

            {/* Left: Storefront Branding & Aisle Navigator */}
            <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                {/* Category Subhead & License Badge */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="rounded-full bg-zinc-950 px-3 py-0.5 font-mono text-[10px] font-bold text-white uppercase tracking-wider">
                    EST. 2026
                  </span>
                  <span className="rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 font-mono text-[10px] font-bold text-[#E03E1A] uppercase tracking-wider">
                    AI INTELLIGENCE PANTRY
                  </span>
                  <span className="text-zinc-400 font-mono text-[10px] hidden sm:inline">
                    自动化情报货栈 · 现货在架
                  </span>
                </div>

                {/* Main Signboard Title */}
                <div className="relative mb-6">
                  <h1 className="text-[44px] sm:text-[64px] lg:text-[76px] font-black leading-[0.94] tracking-tight text-zinc-950">
                    信息<span className="text-[#E03E1A]">杂货铺</span>
                  </h1>
                  <div className="mt-2.5 font-mono text-xs sm:text-sm font-bold tracking-widest text-zinc-400 uppercase">
                    INFORMATION GENERAL STORE · NO. 8848
                  </div>
                </div>

                {/* Lead Pitch */}
                <p className="text-zinc-600 text-sm sm:text-base leading-relaxed max-w-xl mb-8">
                  不搞虚头巴脑的宏大叙事。把真正能帮你降本提效的实测情报分门别类，按货架码齐——中转底价、编程武器、开源生鲜与深度手稿，实测验讫，明码标价。
                </p>

                {/* Quick Shelf Jump Links (Aisle Shortcuts) */}
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-zinc-100">
                  <span className="font-mono text-[11px] font-bold uppercase text-zinc-400 mr-1 flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    货架直达:
                  </span>
                  {[
                    { num: "01", name: "算力批发", href: "#aisle-01", count: `${siteCount}+ 站` },
                    { num: "02", name: "编程武器", href: "#aisle-02", count: `${toolCount} 款` },
                    { num: "03", name: "开源生鲜", href: "#aisle-03", count: "双更" },
                    { num: "04", name: "专题文章", href: "#aisle-04", count: `${articlesCount} 篇` },
                    { num: "05", name: "验货质检", href: "#aisle-05", count: "在线" },
                  ].map((aisle) => (
                    <a
                      key={aisle.num}
                      href={aisle.href}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition-all bg-zinc-50/80 text-zinc-700 border-zinc-200/80 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 shadow-2xs"
                    >
                      <span className="text-[#E03E1A]">
                        #{aisle.num}
                      </span>
                      <span>{aisle.name}</span>
                      <span className="text-[9px] opacity-60">({aisle.count})</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Today's Store Inventory Receipt (今日货栈盘点小票) */}
            <div className="hidden lg:flex flex-col border-l border-zinc-200/80 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6ED] to-[#FAF5EA] p-6 justify-between relative shadow-sm">
              <div>
                {/* Paper Clip / Terminal Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-dashed border-zinc-300 text-zinc-500 font-mono text-[10px] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-zinc-400" />
                    <span>POS TERM #01 · AUTOPROBE</span>
                  </span>
                  <span>EST. 2026</span>
                </div>

                {/* Receipt Title */}
                <div className="text-center mb-5">
                  <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-zinc-400 font-bold">
                    *** XIUXAI GENERAL STORE ***
                  </div>
                  <div className="font-mono text-base font-black tracking-wider text-zinc-950 mt-1">
                    今日货栈出入库盘点单
                  </div>
                  <div className="font-mono text-[9px] text-zinc-400 mt-0.5">
                    DATE: 2026-09-12 · INVENTORY COMPLETE
                  </div>
                </div>

                {/* Receipt Rows */}
                <div className="rounded-xl bg-white/80 border border-zinc-200/60 p-4 my-3 font-mono text-xs space-y-2.5 shadow-2xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-600">[01] 中转算力站点</span>
                    <span className="font-bold text-zinc-950">{siteCount} 家在架</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-600">[01] 计费策略分组</span>
                    <span className="font-bold text-zinc-950">{groupCount} 组核验</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-600">[01] 延迟测速探针</span>
                    <span className="font-bold text-zinc-950">{perfCount} 站测速</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-600">[02] 编程生产力武器</span>
                    <span className="font-bold text-zinc-950">{toolCount} 款收录</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-600">[03] 开源生鲜热榜</span>
                    <span className="font-bold text-zinc-950">{trendingCount} 仓双更</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-600">[04] 专题文章手记</span>
                    <span className="font-bold text-zinc-950">{articlesCount} 篇沉淀</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-600">[05] 假一赔十质检台</span>
                    <span className="font-bold text-[#E03E1A]">24H 在线验真</span>
                  </div>
                </div>

                {/* Receipt Totals */}
                <div className="pt-2 font-mono text-xs space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-zinc-600 uppercase">在架实测情报总计:</span>
                    <span className="text-xl font-black text-zinc-950">
                      {totalRecords.toLocaleString()} <span className="text-xs font-normal text-zinc-500">条</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-[10.5px] text-zinc-500 pt-1">
                    <span>货铺补货时效:</span>
                    <span className="font-bold text-zinc-800">{freshness.label}</span>
                  </div>
                  <div className="flex justify-between text-[10.5px] text-zinc-500">
                    <span>探针并发模式:</span>
                    <span className="font-bold text-zinc-800">15 并发受控 Worker</span>
                  </div>
                </div>

                {/* Barcode and Stamp */}
                <div className="mt-5 pt-3 border-t border-dashed border-zinc-300 flex flex-col items-center relative">
                  <BarcodeGraphic code="8848-XIUXAI-2026" height={32} />

                  {/* Overlaid Rubber Stamp */}
                  <div className="absolute right-0 bottom-1 pointer-events-none">
                    <RubberStamp
                      text="盘点验讫 · PASSED"
                      subtext="STORE AUDITED"
                      variant="red"
                      rotate={-7}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* Jagged Bottom Edge */}
              <div className="mt-4">
                <ReceiptZigzag fill="#FAF5EA" />
              </div>
            </div>

          </div>
        </section>

        {/* ── 货架横梁标尺 (Shelf Floor Rail) ────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-4 sm:px-6 py-2.5 flex items-center justify-between font-mono text-[10px] font-bold text-zinc-500 select-none overflow-x-auto shadow-2xs">
          <div className="flex items-center gap-4 shrink-0">
            <span className="flex items-center gap-1.5 text-zinc-900">
              <span className="h-2 w-2 rounded-full bg-[#E03E1A] inline-block" />
              <span>AISLE DIRECTORY · 货架分区</span>
            </span>
            <span>AISLE 01 算力批发</span>
            <span className="text-zinc-300">·</span>
            <span>AISLE 02 编程武器</span>
            <span className="text-zinc-300">·</span>
            <span>AISLE 03 开源生鲜</span>
            <span className="text-zinc-300">·</span>
            <span>AISLE 05 验货质检</span>
            <span className="text-zinc-300">·</span>
            <span>AISLE 04 库房备货</span>
          </div>
          <div className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-zinc-400 hidden md:inline">
            CAPACITY: 100% IN STOCK · ALL TELEMETRY ACTIVE
          </div>
        </div>

        {/* ── Aisle 01: AI 中转站 (第一货架 · 算力批发) ────────────────── */}
        <article
          id="aisle-01"
          className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 lg:p-10 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 relative group"
        >
          <span id="module-01" className="sr-only">module-01</span>
          
          {/* Aisle Hanging Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-5 mb-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-zinc-950 text-white px-3 py-1 font-mono text-xs font-black">
                AISLE 01
              </span>
              <span className="font-bold text-sm text-zinc-900">
                第一货架 · 算力批发 & 模型倍率
              </span>
              <span className="rounded-full bg-orange-50 text-[#E03E1A] border border-orange-200/60 px-2.5 py-0.5 font-mono text-[10px] font-bold">
                SKU: MOD-01-RELAY
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-3 py-0.5 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>现货在架</span>
              </span>
              <RubberStamp
                text="延迟/可用率实测"
                subtext="TTFT P50 MONITORED"
                variant="red"
                rotate={-2}
                size="sm"
                className="hidden sm:inline-flex"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 mb-3 group-hover:text-[#E03E1A] transition-colors tracking-tight">
                AI 中转站 — 模型倍率与可用性比价
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed max-w-3xl mb-6">
                多平台模型中转服务横向对比。同一个模型，不同站点的定价可能相差数倍 ——
                把基础倍率 × 分组最低折算价、7 天可用率和网络延迟打点放进同一张货架清单，剔除异构虚标。
              </p>

              {/* Goods Hangtags */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ShelfHangtag
                  sku="0101"
                  label="SITES 合作站"
                  value={siteCount}
                  note="家全量站点入库"
                />
                <ShelfHangtag
                  sku="0102"
                  label="GROUPS 费率组"
                  value={groupCount}
                  note="条原生分组策略"
                />
                <ShelfHangtag
                  sku="0103"
                  label="PERF 实测探针"
                  value={perfCount}
                  note="站点网络打点"
                />
                <ShelfHangtag
                  sku="0104"
                  label="CHANGED 调价变动"
                  value={changedCount}
                  note="近期调价波动"
                  accent
                />
              </div>
            </div>

            {/* Shelf Claim Ticket Action */}
            <div className="flex flex-col justify-center">
              <ShelfTicketButton
                href="/relay"
                label="进架挑选中转站"
                sublabel="查看 165+ 家站点折后价与探针大盘"
                skuCode="TICKET #01-RELAY"
                primary
              />
            </div>
          </div>
        </article>

        {/* ── Aisle 02: Vibe Coding 工具 (第二货架 · 编程装备) ────────── */}
        <article
          id="aisle-02"
          className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 lg:p-10 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 relative group"
        >
          <span id="module-02" className="sr-only">module-02</span>
          
          {/* Aisle Hanging Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-5 mb-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-zinc-950 text-white px-3 py-1 font-mono text-xs font-black">
                AISLE 02
              </span>
              <span className="font-bold text-sm text-zinc-900">
                第二货架 · AI 编程生产力武器
              </span>
              <span className="rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200 px-2.5 py-0.5 font-mono text-[10px] font-bold">
                SKU: MOD-02-VIBE
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 text-blue-800 border border-blue-200/60 px-3 py-0.5 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span>装备就绪</span>
              </span>
              <RubberStamp
                text="42 款全景图谱"
                subtext="TOOLKIT INDEXED"
                variant="dark"
                rotate={2}
                size="sm"
                className="hidden sm:inline-flex"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 mb-3 group-hover:text-[#E03E1A] transition-colors tracking-tight">
                Vibe Coding 工具全景大盘
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed max-w-3xl mb-6">
                Cursor、Claude Code、Cline、Copilot、Aider……AI 编程工具百花齐放。
                按客户端形态、适用场景、多 Agent 协作能力深度分类，附产品定位与选型建议。
              </p>

              {/* Goods Hangtags */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ShelfHangtag
                  sku="0201"
                  label="TOOLS 收录"
                  value={toolCount}
                  note="款编程利器在架"
                />
                {topTypes.map(([type, count], idx) => (
                  <ShelfHangtag
                    key={type}
                    sku={`020${idx + 2}`}
                    label={type}
                    value={count}
                    note="款同门类方案"
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <ShelfTicketButton
                href="/table/vibe_coding_tracker"
                label="进架挑选编程武器"
                sublabel="探索 42 款 AI 编程利器"
                skuCode="TICKET #02-VIBE"
                primary
              />
            </div>
          </div>
        </article>

        {/* ── Aisle 03: GitHub 开源热榜 (第三货架 · 开源生鲜) ─────────── */}
        <article
          id="aisle-03"
          className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 lg:p-10 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 relative group"
        >
          <span id="module-03" className="sr-only">module-03</span>
          
          {/* Aisle Hanging Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-5 mb-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-zinc-950 text-white px-3 py-1 font-mono text-xs font-black">
                AISLE 03
              </span>
              <span className="font-bold text-sm text-zinc-900">
                第三货架 · GitHub 开源每日生鲜
              </span>
              <span className="rounded-full bg-orange-50 text-[#E03E1A] border border-orange-200/60 px-2.5 py-0.5 font-mono text-[10px] font-bold">
                SKU: MOD-03-TREND
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 px-3 py-0.5 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>每日双更</span>
              </span>
              <RubberStamp
                text="早八晚九双更"
                subtext="DAILY HARVEST"
                variant="red"
                rotate={-3}
                size="sm"
                className="hidden sm:inline-flex"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 mb-3 group-hover:text-[#E03E1A] transition-colors tracking-tight">
                开源热榜 — GitHub Trending 大盘
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed max-w-3xl mb-6">
                每日 08:00 / 21:00 准时采收 GitHub Trending，覆盖 daily / weekly / monthly
                时间窗与 14 种主流语言。星数增量一目了然，附 LLM 自动翻译与中文释义。
              </p>

              {/* Goods Hangtags */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ShelfHangtag
                  sku="0301"
                  label="REPOS 现货"
                  value={trendingCount}
                  note="个热门仓库在架"
                />
                <ShelfHangtag
                  sku="0302"
                  label="LANGS 语种"
                  value={trendingLangs}
                  note="种主流编程语言"
                />
                <ShelfHangtag
                  sku="0303"
                  label="★ 周期增量"
                  value={trendingDelta}
                  note="周期内新增星数"
                  accent
                />
                <ShelfHangtag
                  sku="0304"
                  label="SYNC 最近采收"
                  value={String(trendingLatestSync).slice(5, 16)}
                  note="自动双更批次"
                  isText
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <ShelfTicketButton
                href="/modules/github_trending"
                label="进架看今日新鲜项目"
                sublabel="开源趋势与中英释义速览"
                skuCode="TICKET #03-TREND"
                primary
              />
            </div>
          </div>
        </article>

        {/* ── Aisle 05: 模型真实性质检中心 (验货质检台) ────────────────── */}
        <article
          id="aisle-05"
          className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 lg:p-10 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-300 relative group"
        >
          <span id="module-05" className="sr-only">module-05</span>
          
          {/* Aisle Hanging Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-5 mb-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-zinc-950 text-white px-3 py-1 font-mono text-xs font-black">
                AISLE 05
              </span>
              <span className="font-bold text-sm text-zinc-900">
                质检五区 · 模型真伪硬探针检测
              </span>
              <span className="rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 px-2.5 py-0.5 font-mono text-[10px] font-bold">
                SKU: MOD-05-QC
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-50 text-purple-800 border border-purple-200/60 px-3 py-0.5 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                <span>假一赔十</span>
              </span>
              <RubberStamp
                text="官方基线对齐"
                subtext="BASELINE ACCURACY"
                variant="dark"
                rotate={2}
                size="sm"
                className="hidden sm:inline-flex"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 mb-3 group-hover:text-[#E03E1A] transition-colors tracking-tight">
                模型真实性与防混用质检中心
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed max-w-3xl mb-6">
                针对 GPT-5.6 (Sol/Terra/Luna)、GPT-4o、Claude 真实性的在线硬探针检测。
                检测 Juice 结构指纹、固有行为概率分布与隐藏提示覆盖，提供透明的质量校验与防混用测评。
              </p>

              {/* Quality Inspection Feature Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 flex items-start gap-2.5">
                  <span className="text-[#E03E1A] font-black text-sm">⚡</span>
                  <div>
                    <div className="font-bold text-zinc-900">Juice 结构指纹核对</div>
                    <div className="text-[10.5px] text-zinc-500 mt-0.5">
                      官方题面精确整数匹配与 40 签名强制拦截
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 flex items-start gap-2.5">
                  <span className="text-zinc-900 font-black text-sm">📊</span>
                  <div>
                    <div className="font-bold text-zinc-900">固有行为分布 Softmax</div>
                    <div className="text-[10.5px] text-zinc-500 mt-0.5">
                      三道行为基线多样本对数似然打分，门禁严格判定
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 flex items-start gap-2.5">
                  <span className="text-emerald-700 font-black text-sm">🔒</span>
                  <div>
                    <div className="font-bold text-zinc-900">零 Key 落盘安全机制</div>
                    <div className="text-[10.5px] text-zinc-500 mt-0.5">
                      纯内存单次探针推流，严格 net-guard SSRF 物理防线
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-3.5 flex items-start gap-2.5">
                  <span className="text-[#E03E1A] font-black text-sm">🛡️</span>
                  <div>
                    <div className="font-bold text-zinc-900">Cross-Provider 残留取证</div>
                    <div className="text-[10.5px] text-zinc-500 mt-0.5">
                      usage 键名、model 回显异常与跨厂家混用即时报警
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <ShelfTicketButton
                href="/detector"
                label="进入质检验货台"
                sublabel="现场投递 Key 免费测速验真"
                skuCode="TICKET #05-QC"
                primary
              />
            </div>
          </div>
        </article>

        {/* ── Aisle 04: 专题文章 · 掌柜手记货架 ──────────────────────── */}
        <article
          id="aisle-04"
          className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden"
        >
          <span id="module-04" className="sr-only">module-04</span>
          
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-zinc-950 text-white px-3 py-0.5 font-mono text-xs font-bold">
                AISLE 04
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                SKU: MOD-04-ARTICLES · 掌柜手记
              </span>
            </div>
            <RubberStamp
              text="实操核验 · VERIFIED"
              subtext="OBSIDIAN VAULT"
              variant="amber"
              rotate={-3}
              size="sm"
            />
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-center">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#E03E1A]" />
                <span className="font-mono text-xs font-bold text-[#E03E1A] uppercase tracking-wider">
                  独立事实核验 · 拒绝资料清单堆砌
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 mb-3 tracking-tight">
                专题文章 · 掌柜手记
              </h2>
              <p className="text-zinc-600 text-sm sm:text-base leading-relaxed max-w-2xl mb-6 font-normal">
                源自本地 Obsidian 知识库。一篇文章只回答一个主要现实问题并给出清楚的中心判断——涵盖 Agent 架构设计、Skill 变现合规、多平台 API 选型风险、Dokploy VPS 运维与 2026 信息差变现深度报告。
              </p>

              {/* 3 Featured Articles Quick View */}
              <div className="grid sm:grid-cols-3 gap-3">
                {articles.slice(0, 3).map((art) => (
                  <Link
                    key={art.id}
                    href={`/articles/${art.slug}`}
                    className="group flex flex-col justify-between rounded-2xl border border-zinc-200/70 bg-zinc-50/60 hover:bg-white hover:border-zinc-300 p-3.5 transition-all shadow-2xs"
                  >
                    <div>
                      <div className="font-mono text-[10px] font-bold text-zinc-400 mb-1">
                        {art.category}
                      </div>
                      <div className="text-xs font-bold text-zinc-900 group-hover:text-[#E03E1A] transition-colors line-clamp-2 leading-snug">
                        {art.title}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-200/50 font-mono text-[10.5px] text-zinc-400 flex items-center justify-between">
                      <span>{art.wordCount.toLocaleString()} 字</span>
                      <span className="text-[#E03E1A] group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <ShelfTicketButton
                href="/articles"
                label="翻阅全部专题文章"
                sublabel={`在架 ${articlesCount} 篇 · ${(articles.reduce((sum, a) => sum + a.wordCount, 0) / 10000).toFixed(1)}万字实操沉淀`}
                skuCode="TICKET #04-ARTICLES"
                primary
              />
            </div>
          </div>
        </article>

      </div>
    </div>
  );
}
