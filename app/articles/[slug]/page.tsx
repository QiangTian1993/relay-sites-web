import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllArticles,
  getArticleBySlug,
  getArticleAdjacent,
} from "@/lib/articles";
import ArticleReader from "@/components/article-reader";

export const dynamicParams = true;

interface PageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map((art) => ({ slug: art.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = await getArticleBySlug(params.slug);
  if (!article) {
    return { title: "文章未找到 — 信息杂货铺" };
  }

  return {
    title: `${article.title} — 专题文章`,
    description: article.summary.slice(0, 160),
    alternates: {
      canonical: `/articles/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.summary.slice(0, 160),
      type: "article",
      publishedTime: article.updated,
      authors: ["XIUXAI 知识库"],
      tags: article.tags,
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const article = await getArticleBySlug(params.slug);
  if (!article) {
    notFound();
  }

  const { prev, next } = await getArticleAdjacent(article.slug);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: article.title,
    description: article.summary,
    datePublished: article.updated,
    dateModified: article.verified || article.updated,
    wordCount: article.wordCount,
    articleSection: article.category,
    keywords: article.tags.join(", "),
    url: `https://www.xiuxai.com/relay-index/articles/${article.slug}`,
    author: {
      "@type": "Organization",
      name: "XIUXAI 信息杂货铺",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <ArticleReader
          article={article}
          prev={prev}
          next={next}
        />
      </div>
    </>
  );
}
