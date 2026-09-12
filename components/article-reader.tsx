"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  List,
  Share2,
  ShieldCheck,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import type { ArticleRecord } from "@/lib/articles";
import { RubberStamp } from "@/components/store-goods-ui";

interface ArticleReaderProps {
  article: ArticleRecord;
  prev: ArticleRecord | null;
  next: ArticleRecord | null;
}

export default function ArticleReader({
  article,
  prev,
  next,
}: ArticleReaderProps) {
  const [activeTocId, setActiveTocId] = useState<string>("");
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // 监听滚动计算进度条与 TOC Scroll-spy
  useEffect(() => {
    const handleScroll = () => {
      // 1. 进度条
      const totalScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (totalScroll / windowHeight) * 100)));
      }

      // 2. TOC 活跃章节判定
      const offset = 140;
      let currentActive = "";
      for (const item of article.toc) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= offset) {
          currentActive = item.id;
        }
      }
      if (currentActive) {
        setActiveTocId(currentActive);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [article.toc]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isStable = article.status === "stable";
  const isAuthored = article.provenance === "authored";

  return (
    <div className="relative min-h-screen">
      {/* ── 顶部阅读进度条 ────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 h-1 bg-[#E03E1A] z-50 transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* ── 顶部面包屑与快捷导航 ────────────────────────────────────── */}
      <nav className="mb-6 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            className="hover:text-zinc-900 transition-colors"
          >
            首页
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <Link
            href="/articles"
            className="hover:text-zinc-900 transition-colors"
          >
            深度专刊
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
          <span className="text-zinc-900 font-bold max-w-[200px] sm:max-w-xs truncate">
            {article.title}
          </span>
        </div>

        <Link
          href="/articles"
          className="inline-flex items-center gap-1 font-bold text-zinc-600 hover:text-[#E03E1A] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>返回专栏货架</span>
        </Link>
      </nav>

      {/* ── 主版心网格布局 ─────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-8 xl:gap-12 items-start">
        {/* Left: Article Main Sheet */}
        <main className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 lg:p-12 shadow-sm relative overflow-hidden">
          {/* Header Bar */}
          <header className="pb-8 mb-8 border-b border-zinc-200/80">
            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2 mb-4 font-mono text-xs">
              <span className="rounded-md bg-zinc-100 px-2.5 py-0.5 font-bold text-zinc-800">
                {article.category}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 font-bold ${
                  isStable
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                    : "bg-amber-50 text-amber-800 border border-amber-200/60"
                }`}
              >
                {isStable ? "STABLE 定稿" : "IN-REVIEW 评审中"}
              </span>
              <span className="rounded-md bg-zinc-50 border border-zinc-200/60 px-2 py-0.5 font-bold text-zinc-600">
                {isAuthored ? "原创沉淀 (AUTHORED)" : "综合调研 (SYNTHESIS)"}
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-950 tracking-tight leading-tight">
              {article.title}
            </h1>

            {/* Metadata strip */}
            <div className="mt-5 flex flex-wrap items-center gap-y-2 gap-x-4 font-mono text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                更新于 {article.updated}
              </span>
              {article.verified && (
                <>
                  <span className="text-zinc-300">/</span>
                  <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    核验于 {article.verified}
                  </span>
                </>
              )}
              <span className="text-zinc-300">/</span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-zinc-400" />
                {article.wordCount.toLocaleString()} 字
              </span>
              <span className="text-zinc-300">/</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                预计阅读 {article.readingTime} 分钟
              </span>
            </div>

            {/* Reviewer / History Details */}
            {(article.reviewedBy || article.history) && (
              <div className="mt-4 rounded-xl bg-zinc-50 border border-zinc-200/60 p-3 font-mono text-[11px] text-zinc-600 space-y-1">
                {article.reviewedBy && (
                  <div>
                    <span className="text-zinc-400 font-bold">评审人员/机制:</span>{" "}
                    {article.reviewedBy}
                  </div>
                )}
                {article.history && (
                  <div>
                    <span className="text-zinc-400 font-bold">修订版本脉络:</span>{" "}
                    {article.history}
                  </div>
                )}
              </div>
            )}
          </header>

          {/* Article Rendered Prose Content */}
          <div
            className="article-prose"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />

          {/* Bottom Footnote / Verification Stamp */}
          <footer className="mt-14 pt-8 border-t border-zinc-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs text-zinc-500">
            <div>
              <div className="font-bold text-zinc-800">
                XIUXAI KNOWLEDGE BASE · VERIFIED ARTICLE
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                源文件: 专题文章/{article.file} · 独立事实核验
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-bold text-zinc-700 hover:bg-zinc-950 hover:text-white hover:border-zinc-950 transition-all shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>链接已复制</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  <span>分享本文</span>
                </>
              )}
            </button>
          </footer>
        </main>

        {/* Right: Sticky Sidebar (TOC & Nav) */}
        <aside className="sticky top-6 space-y-5 hidden lg:block">
          {/* TOC Card */}
          {article.toc.length > 0 && (
            <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-zinc-100 font-mono text-xs font-bold text-zinc-950">
                <List className="h-4 w-4 text-[#E03E1A]" />
                <span>文章大纲 (TOC)</span>
              </div>

              <nav className="space-y-1 text-xs max-h-[calc(100vh-280px)] overflow-y-auto pr-1 scrollbar-thin">
                {article.toc.map((item) => {
                  const isActive = activeTocId === item.id;
                  const isH3 = item.level === 3;

                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`block py-1 rounded-md transition-colors leading-snug ${
                        isH3 ? "pl-5 text-zinc-500 text-[11.5px]" : "pl-2 font-medium text-zinc-700"
                      } ${
                        isActive
                          ? "bg-orange-50 font-bold text-[#E03E1A] border-l-2 border-[#E03E1A]"
                          : "hover:bg-zinc-50 hover:text-zinc-950"
                      }`}
                    >
                      {item.text}
                    </a>
                  );
                })}
              </nav>
            </div>
          )}

          {/* Adjacent Articles Navigator Card */}
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs font-mono text-xs space-y-3">
            <div className="font-bold text-zinc-400 text-[11px] uppercase tracking-wider pb-2 border-b border-zinc-100">
              前后手稿导航
            </div>

            {prev && (
              <div>
                <div className="text-[10px] text-zinc-400">上一篇手稿</div>
                <Link
                  href={`/articles/${prev.slug}`}
                  className="mt-0.5 block font-bold text-zinc-800 hover:text-[#E03E1A] transition-colors line-clamp-2"
                >
                  ← {prev.title}
                </Link>
              </div>
            )}

            {next && (
              <div className="pt-2">
                <div className="text-[10px] text-zinc-400">下一篇手稿</div>
                <Link
                  href={`/articles/${next.slug}`}
                  className="mt-0.5 block font-bold text-zinc-800 hover:text-[#E03E1A] transition-colors line-clamp-2"
                >
                  {next.title} →
                </Link>
              </div>
            )}

            <div className="pt-3 border-t border-zinc-100">
              <Link
                href="/articles"
                className="w-full text-center block rounded-xl bg-zinc-100 hover:bg-zinc-950 hover:text-white text-zinc-700 font-bold py-2 transition-colors"
              >
                查看全部专题文章
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* ── 底部前后翻页卡片（移动端 & 平板） ───────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4 mt-8">
        {prev ? (
          <Link
            href={`/articles/${prev.slug}`}
            className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all"
          >
            <div className="font-mono text-[11px] text-zinc-400 flex items-center gap-1 mb-1">
              <ArrowLeft className="h-3 w-3" /> 上一篇专题
            </div>
            <div className="font-bold text-zinc-900 group-hover:text-[#E03E1A] transition-colors line-clamp-2">
              {prev.title}
            </div>
          </Link>
        ) : (
          <div />
        )}

        {next && (
          <Link
            href={`/articles/${next.slug}`}
            className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all text-right"
          >
            <div className="font-mono text-[11px] text-zinc-400 flex items-center justify-end gap-1 mb-1">
              下一篇专题 <ArrowRight className="h-3 w-3" />
            </div>
            <div className="font-bold text-zinc-900 group-hover:text-[#E03E1A] transition-colors line-clamp-2">
              {next.title}
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
