// 顶部数据新鲜度栏 —— PRD F.06
// fresh < 30min / stale 30-60min / critical > 60min
// hover 显示具体时间 + 数据源

"use client";

import { useState } from "react";
import { IconCalendar, IconCircleAlert, IconCircleCheck, IconCircleDot } from "./icons";
import { calcFreshness, latestFetchTime } from "@/lib/freshness";

export function FreshnessBanner({ fetchedAts }: { fetchedAts: Array<string | Date | null | undefined> }) {
  const [hover, setHover] = useState(false);
  const latest = latestFetchTime(fetchedAts);
  const info = calcFreshness(latest);
  const Icon = info.level === "fresh" ? IconCircleCheck : info.level === "missing" ? IconCircleDot : IconCircleAlert;
  return (
    <div
      className="relative border-b border-zinc-200/70 bg-zinc-50/70 px-5 py-2 font-sans text-xs text-zinc-600 sm:px-6"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium text-[11px] ${
            info.level === "fresh"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
              : info.level === "stale"
              ? "bg-amber-50 text-amber-700 border border-amber-200/60"
              : info.level === "critical"
              ? "bg-rose-50 text-rose-700 border border-rose-200/60"
              : "bg-zinc-100 text-zinc-500 border border-zinc-200/60"
          }`}
        >
          <Icon className="h-3 w-3" />
          {info.level === "fresh" ? "数据新鲜" : info.level === "stale" ? "数据略旧" : info.level === "critical" ? "数据过期" : "无数据"}
        </span>
        <span>
          最后更新 <b className="font-semibold text-zinc-900">{info.label}</b>
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-zinc-400 text-[11px]">
          <IconCalendar className="h-3.5 w-3.5" />
          数据源：飞书 KB (第三方实测仅供参考)
        </span>
      </div>
      {hover && info.iso && (
        <div className="absolute right-5 top-full z-30 mt-1.5 w-64 rounded-xl border border-zinc-200/90 bg-white p-3 font-sans text-xs text-zinc-800 shadow-xl sm:right-6 backdrop-blur-md">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">TIMESTAMP</div>
          <div className="mt-1 font-mono text-xs font-bold text-zinc-900">{formatFullTime(info.iso)}</div>
          <div className="mt-1 text-[11px] text-zinc-500">共 {fetchedAts.filter(Boolean).length} 张表同步</div>
        </div>
      )}
    </div>
  );
}

function formatFullTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}