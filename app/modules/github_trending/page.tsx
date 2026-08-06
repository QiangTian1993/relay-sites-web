import type { Metadata } from "next";
import { loadTable } from "@/lib/data-loader";
import TrendingExplorer from "@/components/trending-explorer";

export const metadata: Metadata = {
  title: "开源热榜 — GitHub Trending",
  description: "GitHub Trending 定时采集：按语言、时间窗筛选热门仓库，掌握开源动态。",
  alternates: { canonical: "/modules/github_trending" },
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

  // ItemList 结构化数据（今日榜 Top 20，服务端注入）
  const dailyItems = records
    .filter((r) => Array.isArray(r["周期"]) ? r["周期"][0] === "daily" : r["周期"] === "daily")
    .filter((r) => String(Array.isArray(r["榜单"]) ? r["榜单"][0] : r["榜单"] ?? "") === "all")
    .slice(0, 20);
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "GitHub 今日热榜 Top 20",
    description: "GitHub Trending 每日定时采集的开源热门仓库",
    itemListElement: dailyItems.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: String(r["仓库"] ?? ""),
      url: String(r["链接"] ?? "").match(/\]\((https?:\/\/[^)]+)\)/)?.[1] ?? "",
      description: String(r["中文描述"] ?? r["描述"] ?? "").slice(0, 200),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <TrendingExplorer records={records} fetchedAt={latestSync ?? undefined} />
    </>
  );
}
