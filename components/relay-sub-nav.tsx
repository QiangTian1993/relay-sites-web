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
    <div className="flex border-b-2 border-black bg-[#F8F8F6] font-mono text-xs font-black uppercase tracking-wider overflow-x-auto">
      <Link
        href="/relay"
        className={`flex items-center gap-2 border-r-2 border-black px-5 py-3 shrink-0 transition-colors ${
          isCompare ? "bg-black text-white" : "text-black hover:bg-black/10"
        }`}
      >
        <Activity className="h-4 w-4" />
        按模型比价
      </Link>
      <Link
        href="/table/relay_sites_tracker"
        className={`flex items-center gap-2 border-r-2 border-black px-5 py-3 shrink-0 transition-colors ${
          isTable ? "bg-black text-white" : "text-black hover:bg-black/10"
        }`}
      >
        站点档案库
      </Link>
      <Link
        href="/detector"
        className={`flex items-center gap-2 border-r-2 border-black px-5 py-3 shrink-0 transition-colors ${
          isDetector ? "bg-black text-white" : "text-black hover:bg-black/10"
        }`}
      >
        <ShieldCheck className="h-4 w-4 text-swiss-accent" />
        模型质检中心
      </Link>
    </div>
  );
}

