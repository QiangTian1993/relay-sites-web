import type { Metadata } from "next";
import { getAllArticles, getArticlesSummary } from "@/lib/articles";
import ArticlesExplorer from "@/components/articles-explorer";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "深度专刊 · 调研手稿 — 信息杂货铺",
  description:
    "围绕单一现实工程或商业问题深挖：AI Agent 架构、Skill 生态变现、多平台 API 选型、自托管运维与信息差变现深度报告。",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const articles = await getAllArticles();
  const summary = await getArticlesSummary();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "深度专刊 · 调研手稿",
    description: "围绕单一现实工程或商业问题深挖的调研手稿与分析报告。",
    url: "https://www.xiuxai.com/relay-index/articles",
    hasPart: articles.map((art) => ({
      "@type": "Article",
      headline: art.title,
      description: art.summary,
      datePublished: art.updated,
      url: `https://www.xiuxai.com/relay-index/articles/${art.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ArticlesExplorer
          articles={articles}
          categories={summary.categories}
          totalWords={summary.totalWords}
        />
      </div>
    </>
  );
}
