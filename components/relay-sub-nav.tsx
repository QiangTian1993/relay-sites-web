"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Database, ShieldCheck } from "lucide-react";

export function RelaySubNav() {
  const pathname = usePathname();
  const isCompare = pathname === "/relay";
  const isTable = pathname?.startsWith("/table/relay_sites_tracker");
  const isDetector = pathname?.startsWith("/detector");

  return (
    <div className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md px-4 sm:px-6 py-2.5">
      <div className="mx-auto max-w-[1440px] flex items-center justify-between">
        <div className="inline-flex items-center gap-1 rounded-xl bg-zinc-100 p-1 border border-zinc-200/60 font-mono text-xs font-bold">
          <Link
            href="/relay"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-150 ${
              isCompare
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-white/60"
            }`}
          >
            <Activity className={`h-3.5 w-3.5 ${isCompare ? "text-[#E03E1A]" : "text-zinc-400"}`} />
            <span>按模型比价</span>
          </Link>
          <Link
            href="/table/relay_sites_tracker"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-150 ${
              isTable
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-white/60"
            }`}
          >
            <Database className={`h-3.5 w-3.5 ${isTable ? "text-[#E03E1A]" : "text-zinc-400"}`} />
            <span>全量站点大盘</span>
          </Link>
          <Link
            href="/detector"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all duration-150 ${
              isDetector
                ? "bg-white text-zinc-950 shadow-xs"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-white/60"
            }`}
          >
            <ShieldCheck className={`h-3.5 w-3.5 ${isDetector ? "text-[#E03E1A]" : "text-zinc-400"}`} />
            <span>模型质检中心</span>
          </Link>
        </div>

        <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-zinc-400">
          <span>MODULE 01 · AI 中转站多视角</span>
        </div>
      </div>
    </div>
  );
}
