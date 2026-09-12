import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Activity, BookOpen, Flame, Send, ShieldCheck, Store, Trophy, Wrench } from "lucide-react";
import SiteFooter from "@/components/site-footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "700", "900"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.xiuxai.com/relay-index/"),
  title: {
    default: "信息杂货铺 — Relay Index",
    template: "%s | 信息杂货铺",
  },
  description:
    "AI 中转站比价、编程工具横评、开源热榜。AI 世界实用情报，按模块收集成册。",
  keywords: [
    "AI 中转站",
    "模型比价",
    "GitHub 热榜",
    "AI 编程工具",
    "开源项目",
    "信息杂货铺",
  ],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://www.xiuxai.com/relay-index/",
    siteName: "信息杂货铺",
    title: "信息杂货铺 — Relay Index",
    description:
      "AI 中转站比价、编程工具横评、开源热榜。AI 世界实用情报，按模块收集成册。",
    images: [{ url: "https://www.xiuxai.com/relay-index/icon.svg" }],
  },
  twitter: {
    card: "summary",
    title: "信息杂货铺 — Relay Index",
    description: "AI 中转站比价、编程工具横评、开源热榜。",
    images: ["https://www.xiuxai.com/relay-index/icon.svg"],
  },
  alternates: {
    canonical: "https://www.xiuxai.com/relay-index/",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "信息杂货铺 — Relay Index",
  "alternateName": ["Relay Index", "信息杂货铺", "xiuxai", "xiuxai.com"],
  "url": "https://www.xiuxai.com/relay-index/",
  "description": "AI 中转站比价、编程工具横评、开源热榜。AI 世界实用情报，按模块收集成册。",
  "inLanguage": "zh-CN",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrains.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#FAF9F5] text-zinc-900 antialiased">
        {/* 温润小店屋檐细线 (Store Awning Strip) */}
        <div className="h-[2px] bg-gradient-to-r from-[#E03E1A] via-zinc-800 to-[#E03E1A]" />
        <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-[#FAF9F5]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between px-3 sm:px-6">
            {/* Storefront Sign / Logo */}
            <Link
              href="/"
              className="flex shrink-0 items-center gap-3 py-2.5 text-zinc-900 transition-colors hover:text-black group mr-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white shadow-xs group-hover:bg-[#E03E1A] transition-colors">
                <Store className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm tracking-tight leading-tight">信息杂货铺</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-[#E03E1A] border border-orange-200/60 px-1.5 py-0.2 font-mono text-[8.5px] font-bold uppercase leading-none">
                    24H 营业
                  </span>
                </div>
                <span className="font-mono text-[9px] text-zinc-400 tracking-wider leading-none mt-0.5">
                  GENERAL STORE · V1
                </span>
              </div>
            </Link>

            <div className="flex min-w-0 flex-1 items-center justify-between ml-2 sm:ml-4">
              {/* Shelf Category Navigation */}
              <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-2">
                <Link
                  href="/relay"
                  className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 transition-all group"
                >
                  <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[9px] text-zinc-500 font-mono group-hover:border-zinc-300 group-hover:text-zinc-800 shadow-2xs">
                    01
                  </span>
                  <Activity className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-900" />
                  <span>AI 中转站</span>
                </Link>
                <Link
                  href="/detector"
                  className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 transition-all group"
                >
                  <span className="rounded border border-orange-200/80 bg-orange-50 px-1.5 py-0.5 text-[9px] text-[#E03E1A] font-mono shadow-2xs">
                    05
                  </span>
                  <ShieldCheck className="h-3.5 w-3.5 text-[#E03E1A]" />
                  <span>模型质检</span>
                </Link>
                <Link
                  href="/table/vibe_coding_tracker"
                  className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 transition-all group"
                >
                  <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[9px] text-zinc-500 font-mono group-hover:border-zinc-300 group-hover:text-zinc-800 shadow-2xs">
                    02
                  </span>
                  <Wrench className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-900" />
                  <span>编程工具</span>
                </Link>
                <Link
                  href="/modules/github_trending"
                  className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 transition-all group"
                >
                  <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[9px] text-zinc-500 font-mono group-hover:border-zinc-300 group-hover:text-zinc-800 shadow-2xs">
                    03
                  </span>
                  <Flame className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-900" />
                  <span>开源热榜</span>
                </Link>
                <Link
                  href="/articles"
                  className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 transition-all group"
                >
                  <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[9px] text-zinc-500 font-mono group-hover:border-zinc-300 group-hover:text-zinc-800 shadow-2xs">
                    04
                  </span>
                  <BookOpen className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-900" />
                  <span>专题文章</span>
                </Link>
                <Link
                  href="/benchmarks"
                  className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60 transition-all group"
                >
                  <span className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[9px] text-zinc-500 font-mono group-hover:border-zinc-300 group-hover:text-zinc-800 shadow-2xs">
                    06
                  </span>
                  <Trophy className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-900" />
                  <span>模型测评</span>
                </Link>
              </nav>

              {/* Community Link */}
              <div className="flex items-center pl-2">
                <a
                  href="https://t.me/+ZMc2ZPruuQkyN2U1"
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-orange-200/80 bg-orange-50/80 px-3 py-1.5 font-mono text-xs font-bold text-[#E03E1A] hover:bg-orange-100 hover:border-orange-300 transition-all shadow-xs"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">TG 茶歇铺</span>
                  <span className="sm:hidden">社群</span>
                </a>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
