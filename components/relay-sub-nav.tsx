"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Database } from "lucide-react";

export function RelaySubNav() {
  const pathname = usePathname();
  const isCompare = pathname === "/relay";
  const isTable = pathname?.startsWith("/table/relay_sites_tracker");

  return (
    <div className="flex border-b-2 border-black bg-[#F8F8F6] font-mono text-xs font-black uppercase tracking-wider">
      <Link
        href="/relay"
        className={`flex items-center gap-2 border-r-2 border-black px-5 py-3 transition-colors ${
          isCompare ? "bg-black text-white" : "text-black hover:bg-black/10"
        }`}
      >
        <Activity className="h-4 w-4" />
        按模型比价
      </Link>
      <Link
        href="/table/relay_sites_tracker"
        className={`flex items-center gap-2 border-r-2 border-black px-5 py-3 transition-colors ${
          isTable ? "bg-black text-white" : "text-black hover:bg-black/10"
        }`}
      >
        <Database className="h-4 w-4" />
        全量站点大盘
      </Link>
    </div>
  );
}
