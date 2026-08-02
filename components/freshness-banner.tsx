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
      className={`relative border-b-2 border-swiss-fg px-5 py-2 font-mono text-sm sm:px-6 ${info.bgColor}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 font-black uppercase tracking-widest ${info.color}`}>
          <Icon className="h-4 w-4" />
          {info.level === "fresh" ? "数据新鲜" : info.level === "stale" ? "数据略旧" : info.level === "critical" ? "数据过期" : "无数据"}
        </span>
        <span className="text-swiss-fg/70">
          最后更新 <b className={`font-black ${info.color}`}>{info.label}</b>
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 text-swiss-fg/45">
          <IconCalendar className="h-3.5 w-3.5" />
          数据源：飞书 KB (第三方实测仅供参考)
        </span>
      </div>
      {hover && info.iso && (
        <div className="absolute right-5 top-full z-30 mt-1 border-2 border-swiss-fg bg-swiss-bg px-3 py-2 font-mono text-sm text-swiss-fg shadow-lg sm:right-6">
          <div className="font-black uppercase tracking-widest text-swiss-fg/55">TIMESTAMP</div>
          <div className="mt-1 text-swiss-fg">{formatFullTime(info.iso)}</div>
          <div className="mt-1 text-swiss-fg/45">共 {fetchedAts.filter(Boolean).length} 张表同步</div>
        </div>
      )}
    </div>
  );
}

function formatFullTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}