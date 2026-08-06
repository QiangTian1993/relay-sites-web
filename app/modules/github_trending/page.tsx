import type { Metadata } from "next";
import { loadTable } from "@/lib/data-loader";
import TrendingExplorer from "@/components/trending-explorer";

export const metadata: Metadata = {
  title: "开源热榜 — GitHub Trending · 信息杂货铺",
  description: "GitHub Trending 定时采集：按语言、时间窗筛选热门仓库，掌握开源动态。",
};

export const dynamic = "force-static";

export default async function GithubTrendingPage() {
  const data = await loadTable("github_trending");
  const records = data?.records ?? [];

  // 取最近一次采集时间（所有记录里最新的采集时间）
  let latestSync: string | null = null;
  for (const r of records) {
    const t = Array.isArray(r["采集时间"]) ? String(r["采集时间"][0]) : String(r["采集时间"] ?? "");
    if (t && (!latestSync || t > latestSync)) latestSync = t;
  }

  return <TrendingExplorer records={records} fetchedAt={latestSync ?? undefined} />;
}
