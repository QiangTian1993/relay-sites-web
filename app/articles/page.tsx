import type { Metadata } from "next";
import { getAllArticles, getArticlesSummary } from "@/lib/articles";
import ArticlesExplorer from "@/components/articles-explorer";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "专题文章 — 信息杂货铺",
  description:
    "掌柜的随手杂记：折腾的、看到的、想到的，不拘一格，随手码字摆上货架。",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const articles = await getAllArticles();
  const summary = await getArticlesSummary();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "专题文章",
    description: "掌柜的随手杂记：折腾的、看到的、想到的，不拘一格，随手码字摆上货架。",
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
