import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Activity, Flame, GitCompareArrows, Wrench } from "lucide-react";
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
  title: "信息杂货铺 — Relay Index",
  description: "AI 中转站比价、编程工具横评、开源热榜。AI 世界实用情报，按模块收集成册。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-swiss-bg text-swiss-fg antialiased swiss-noise">
        <header className="sticky top-0 z-40 border-b-2 border-black bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1600px] items-stretch">
            <Link href="/" className="flex shrink-0 items-center gap-3 border-r-2 border-black bg-black px-4 py-3 text-white transition-colors hover:bg-swiss-accent sm:px-6">
              <GitCompareArrows className="h-5 w-5" />
              <span className="font-black tracking-[-0.03em]">RELAY INDEX</span>
              <span className="hidden font-mono text-[10px] text-white/55 sm:inline">V1</span>
            </Link>
            <nav className="flex min-w-0 flex-1 overflow-x-auto">
              <Link href="/relay" className="flex shrink-0 items-center gap-2 border-r-2 border-black px-4 py-3 font-mono text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white">
                <Activity className="h-4 w-4" /> AI 中转站
              </Link>
              <Link href="/table/vibe_coding_tracker" className="flex shrink-0 items-center gap-2 border-r-2 border-black px-4 py-3 font-mono text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white">
                <Wrench className="h-4 w-4" /> 编程工具
              </Link>
              <Link href="/modules/github_trending" className="flex shrink-0 items-center gap-2 border-r-2 border-black px-4 py-3 font-mono text-xs font-black uppercase tracking-wider hover:bg-black hover:text-white">
                <Flame className="h-4 w-4" /> 开源热榜
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px]">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
