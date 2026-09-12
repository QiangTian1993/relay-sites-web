// 专栏与专题文章数据加载器
import fs from "node:fs";
import path from "node:path";
export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface ArticleRecord {
  id: string;
  slug: string;
  aliases: string[];
  file: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  wordCount: number;
  readingTime: number;
  status: "stable" | "in-review" | "draft";
  updated: string;
  verified?: string;
  provenance: "authored" | "source-synthesis" | "mixed";
  reviewedBy?: string;
  history?: string;
  toc: TocItem[];
  html: string;
  markdown: string;
}

let _cachedArticles: ArticleRecord[] | null = null;

function loadLocalArticles(): ArticleRecord[] {
  if (_cachedArticles) return _cachedArticles;

  const contentFile = path.join(process.cwd(), "content/articles.json");
  const dataFile = path.join(process.cwd(), "data/articles.json");

  let raw = "";
  if (fs.existsSync(contentFile)) {
    raw = fs.readFileSync(contentFile, "utf-8");
  } else if (fs.existsSync(dataFile)) {
    raw = fs.readFileSync(dataFile, "utf-8");
  }

  if (!raw) return [];

  try {
    const list = JSON.parse(raw) as ArticleRecord[];
    _cachedArticles = list;
    return list;
  } catch {
    return [];
  }
}

export async function getAllArticles(): Promise<ArticleRecord[]> {
  return loadLocalArticles();
}

export async function getArticleBySlug(slug: string): Promise<ArticleRecord | null> {
  const articles = loadLocalArticles();
  const target = decodeURIComponent(slug).toLowerCase().trim();

  // 1. 精确匹配 slug
  let found = articles.find((a) => a.slug.toLowerCase() === target);
  if (found) return found;

  // 2. 匹配 aliases（支持中文文件名或原始文件名）
  found = articles.find((a) =>
    a.aliases.some((alias) => alias.toLowerCase() === target)
  );
  if (found) return found;

  // 3. 匹配 title
  found = articles.find((a) => a.title.toLowerCase() === target);
  if (found) return found;

  return null;
}

export async function getArticleAdjacent(
  slug: string
): Promise<{ prev: ArticleRecord | null; next: ArticleRecord | null }> {
  const articles = loadLocalArticles();
  const current = await getArticleBySlug(slug);
  if (!current) return { prev: null, next: null };

  const idx = articles.findIndex((a) => a.id === current.id);
  if (idx === -1) return { prev: null, next: null };

  const prev = idx > 0 ? articles[idx - 1] : null;
  const next = idx < articles.length - 1 ? articles[idx + 1] : null;

  return { prev, next };
}

export async function getArticlesSummary() {
  const articles = loadLocalArticles();
  const totalCount = articles.length;
  const totalWords = articles.reduce((acc, a) => acc + a.wordCount, 0);

  const categoryMap = new Map<string, number>();
  for (const a of articles) {
    categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + 1);
  }

  const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  return {
    totalCount,
    totalWords,
    categories,
    latestUpdated: articles[0]?.updated || "—",
  };
}
