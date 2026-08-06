import type { MetadataRoute } from "next";
import { loadTable } from "@/lib/data-loader";

const BASE = "https://www.xiuxai.com/relay-index";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/relay`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/modules/github_trending`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE}/table/vibe_coding_tracker`, changeFrequency: "weekly", priority: 0.6 },
  ];

  // relay 站点详情页 Top 100（按最低倍率，避免薄内容稀释权重）
  const sites = await loadTable("relay_sites_tracker");
  const ranked = (sites?.records ?? [])
    .map((r) => ({ r, rate: Number(r["最低倍率"] ?? Infinity) }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 100);
  for (const { r } of ranked) {
    const id = String(r.__id ?? "");
    if (id) {
      entries.push({
        url: `${BASE}/table/relay_sites_tracker/${encodeURIComponent(id)}`,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  // vibe coding 工具详情页（全部）
  const tools = await loadTable("vibe_coding_tracker");
  for (const r of tools?.records ?? []) {
    const id = String(r.__id ?? "");
    if (id) {
      entries.push({
        url: `${BASE}/table/vibe_coding_tracker/${encodeURIComponent(id)}`,
        changeFrequency: "monthly",
        priority: 0.4,
      });
    }
  }

  return entries;
}
