"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Search,
  Sparkles,
  Tag,
  ArrowRight,
  SlidersHorizontal,
  CheckCircle2,
  ShieldCheck,
  Flame,
} from "lucide-react";
import type { ArticleRecord } from "@/lib/articles";
import { RubberStamp, BarcodeGraphic } from "@/components/store-goods-ui";

interface ArticlesExplorerProps {
  articles: ArticleRecord[];
  categories: { name: string; count: number }[];
  totalWords: number;
}

export default function ArticlesExplorer({
  articles,
  categories,
  totalWords,
}: ArticlesExplorerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updated" | "words">("updated");

  // 过滤与排序
  const filteredArticles = useMemo(() => {
    return articles
      .filter((art) => {
        // 分类筛选
        if (selectedCategory !== "全部" && art.category !== selectedCategory) {
          return false;
        }
        // 状态筛选
        if (selectedStatus === "stable" && art.status !== "stable") return false;
        if (selectedStatus === "in-review" && art.status !== "in-review") return false;

        // 搜索关键词
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = art.title.toLowerCase().includes(q);
          const matchSummary = art.summary.toLowerCase().includes(q);
          const matchTags = art.tags.some((t) => t.toLowerCase().includes(q));
          const matchSlug = art.slug.toLowerCase().includes(q);
          if (!matchTitle && !matchSummary && !matchTags && !matchSlug) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "words") {
          return b.wordCount - a.wordCount;
        }
        return b.updated > a.updated ? 1 : -1;
      });
  }, [articles, selectedCategory, selectedStatus, searchQuery, sortBy]);

  const allCategories = useMemo(() => {
    return [
      { name: "全部", count: articles.length },
      ...categories,
    ];
  }, [articles.length, categories]);

  return (
    <div className="space-y-8">
      {/* ── 专栏店堂抬头看板 ────────────────────────────────────────── */}
      <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-sm overflow-hidden relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3 font-mono text-[10px] font-bold">
              <span className="rounded-full bg-zinc-950 px-3 py-0.5 text-white uppercase tracking-wider">
                MODULE 04
              </span>
              <span className="rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 text-[#E03E1A] uppercase tracking-wider">
                DEEP ARTICLES & ESSAYS
              </span>
              <span className="text-zinc-400">
                OBSIDIAN 知识库直连同步 · 独立核验
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-950 tracking-tight leading-tight">
              深度专刊 <span className="text-[#E03E1A]">·</span> 调研手稿
            </h1>
            <p className="mt-2 text-zinc-600 text-sm sm:text-base max-w-2xl leading-relaxed">
              围绕单一现实工程或商业问题深挖，不堆砌资料清单，只保留真实证据、边界核验与独立行动判断。
            </p>
          </div>

          {/* 右侧统计看板小卡 */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 bg-gradient-to-br from-[#FAF8F5] to-[#F5F2EB] p-4 sm:p-5 rounded-2xl border border-zinc-200/80 shadow-2xs">
            <div className="text-center px-3 border-r border-zinc-200/80">
              <div className="font-mono text-2xl sm:text-3xl font-black text-zinc-950">
                {articles.length}
              </div>
              <div className="font-mono text-[10.5px] text-zinc-500 uppercase">
                在架篇数
              </div>
            </div>
            <div className="text-center px-3 border-r border-zinc-200/80">
              <div className="font-mono text-2xl sm:text-3xl font-black text-[#E03E1A]">
                {(totalWords / 10000).toFixed(1)}
                <span className="text-xs font-normal text-zinc-500"> 万</span>
              </div>
              <div className="font-mono text-[10.5px] text-zinc-500 uppercase">
                总沉淀字数
              </div>
            </div>
            <div className="text-center px-3">
              <div className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                100% 独立核验
              </div>
              <div className="font-mono text-[10.5px] text-zinc-500 mt-1 uppercase">
                七筛证据门禁
              </div>
            </div>
          </div>
        </div>

        {/* 装饰印章 */}
        <div className="absolute right-4 bottom-2 opacity-15 pointer-events-none hidden md:block">
          <RubberStamp
            text="手稿阅毕 · ARCHIVED"
            subtext="VAULT SYNCED"
            variant="dark"
            rotate={-8}
            size="lg"
          />
        </div>
      </section>

      {/* ── 筛选分类与检索货架 ──────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {allCategories.map((cat) => {
            const active = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-1.5 font-mono text-xs font-bold transition-all ${
                  active
                    ? "bg-zinc-950 text-white shadow-xs"
                    : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    active ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-600"
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Secondary Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-zinc-100 font-mono text-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索手稿标题、关键词或标签..."
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

          {/* Right Filters */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto text-zinc-500">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-1.5 text-zinc-700 text-xs focus:outline-none focus:border-[#E03E1A]"
            >
              <option value="all">全部状态</option>
              <option value="stable">已定稿 (Stable)</option>
              <option value="in-review">评审中 (In-review)</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-3 py-1.5 text-zinc-700 text-xs focus:outline-none focus:border-[#E03E1A]"
            >
              <option value="updated">最新更新</option>
              <option value="words">篇幅字数</option>
            </select>
          </div>
        </div>
      </section>

      {/* ── 文章列表卡片货架 ────────────────────────────────────────── */}
      {filteredArticles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/60 p-12 text-center">
          <BookOpen className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
          <div className="font-bold text-zinc-700">未找到符合筛选条件的专题文章</div>
          <div className="text-xs text-zinc-400 mt-1">请尝试清除检索词或切换分类</div>
          <button
            onClick={() => {
              setSelectedCategory("全部");
              setSearchQuery("");
              setSelectedStatus("all");
            }}
            className="mt-4 rounded-xl bg-zinc-950 text-white px-4 py-2 text-xs font-mono font-bold hover:bg-[#E03E1A] transition-colors"
          >
            重置所有筛选
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {filteredArticles.map((art) => {
            const isStable = art.status === "stable";
            const isAuthored = art.provenance === "authored";

            return (
              <article
                key={art.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-7 shadow-2xs hover:shadow-md hover:border-zinc-300 transition-all duration-200"
              >
                <div>
                  {/* Card Top Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 font-mono text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-zinc-100 px-2.5 py-0.5 font-bold text-zinc-700">
                        {art.category}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 font-bold ${
                          isStable
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                            : "bg-amber-50 text-amber-800 border border-amber-200/60"
                        }`}
                      >
                        {isStable ? "STABLE 定稿" : "IN-REVIEW 评审"}
                      </span>
                    </div>

                    <span className="text-zinc-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {art.updated}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight leading-snug group-hover:text-[#E03E1A] transition-colors">
                    <Link href={`/articles/${art.slug}`}>
                      {art.title}
                    </Link>
                  </h2>

                  {/* Summary */}
                  {art.summary && (
                    <p className="mt-3 text-zinc-600 text-sm leading-relaxed line-clamp-3 font-serif italic text-[14.5px]">
                      “{art.summary}”
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {art.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-md bg-zinc-50 border border-zinc-200/60 px-2 py-0.5 font-mono text-[10.5px] text-zinc-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Footer Bar */}
                <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between font-mono text-xs text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-zinc-400" />
                      {art.wordCount.toLocaleString()} 字
                    </span>
                    <span className="text-zinc-300">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      ~{art.readingTime} 分钟
                    </span>
                    <span className="text-zinc-300">·</span>
                    <span className="text-[10px] text-zinc-400">
                      {isAuthored ? "原创撰写" : "综合调研"}
                    </span>
                  </div>

                  <Link
                    href={`/articles/${art.slug}`}
                    className="inline-flex items-center gap-1 font-bold text-zinc-950 group-hover:text-[#E03E1A] group-hover:translate-x-0.5 transition-all"
                  >
                    <span>查阅全文</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
