// 自动化同步脚本：Obsidian 知识库专题文章 → Web 静态数据
// 用法：npx tsx scripts/sync-obsidian-articles.ts

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const DEFAULT_VAULT_DIR = "/Users/ian-mbp/工作/project/agent-memory/专题文章";
const VAULT_DIR = process.env.OBSIDIAN_ARTICLES_DIR || DEFAULT_VAULT_DIR;

const OUTPUT_CONTENT_FILE = path.join(process.cwd(), "content/articles.json");
const OUTPUT_DATA_FILE = path.join(process.cwd(), "data/articles.json");

// 预定义 Slug 映射，保证 URL 语义化与持久化
const SLUG_MAP: Record<string, { slug: string; category: string; tags: string[] }> = {
  "别再把所有 AI 演示工具都叫 PPT Skill.md": {
    slug: "ai-presentation-tools-not-just-ppt-skill",
    category: "AI 工具与落地评测",
    tags: ["AI 演示", "PPT Skill", "DrawingML", "HTML Slides", "选型评测"],
  },
  "Agent 等于 LLM 加上下文加工具只是起点.md": {
    slug: "agent-llm-context-tools-engineering-start",
    category: "AI 架构与智能体",
    tags: ["Agent 架构", "状态机", "上下文工程", "Tool Call", "工程化"],
  },
  "Dokploy 是否值得小团队自托管.md": {
    slug: "dokploy-vps-self-hosted-evaluation",
    category: "AI 工具与落地评测",
    tags: ["Dokploy", "VPS", "Vercel 替代", "自托管", "DevOps"],
  },
  "开源 Skill 能不能直接拿来变现.md": {
    slug: "open-source-skills-monetization-license",
    category: "AI 架构与智能体",
    tags: ["开源协议", "License", "Skill 变现", "商业合规"],
  },
  "多平台数据 API 聚合服务，先核验来源再谈选型.md": {
    slug: "multi-platform-data-api-aggregation-risk",
    category: "AI 工具与落地评测",
    tags: ["数据 API", "API 聚合", "爬虫合规", "供应商风控"],
  },
  "IDE额度聚合器与外部调用风险.md": {
    slug: "ide-free-quota-aggregators-risks",
    category: "AI 工具与落地评测",
    tags: ["IDE 聚合器", "逆向接口", "封号风险", "大模型额度"],
  },
  "开源 AI 提示词库与 Skill 生态：模型能力拉平后，资源库是下一个竞争点？.md": {
    slug: "prompt-libraries-and-skill-ecosystem-competition",
    category: "AI 架构与智能体",
    tags: ["提示词库", "Skill 生态", "Prompt Engineering", "行业洞察"],
  },
  "虚拟资料信息差变现：模式拆解、真实收益与可持续性判断.md": {
    slug: "virtual-goods-monetization-model-breakdown",
    category: "商业化与调研",
    tags: ["虚拟资料", "信息差变现", "商业模式", "真实收益", "可持续性"],
  },
  "虚拟资料信息差变现：2026 深度调研报告.md": {
    slug: "virtual-goods-monetization-deep-research-2026",
    category: "商业化与调研",
    tags: ["深度报告", "虚拟资产", "信息差", "七筛证据", "市场扫描"],
  },
  "信息差变现候选方向全景扫描：2026 深度调研报告.md": {
    slug: "info-gap-monetization-landscape-scan-2026",
    category: "商业化与调研",
    tags: ["候选方向扫描", "商业调研", "证据分级", "微 SaaS", "出海变现"],
  },
  "外语流媒体音乐及资源汇总.md": {
    slug: "foreign-streaming-music-resources-audit",
    category: "商业化与调研",
    tags: ["流媒体音乐", "资源汇总", "版权边界", "情报整理"],
  },
};

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
  readingTime: number; // 分钟
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

// 格式化日期为 YYYY-MM-DD
function formatDate(val: unknown): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  const s = String(val).trim();
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
}

// 提取标题对应的锚点 ID
function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// 解析 Obsidian 语法并生成增强 HTML
function renderObsidianMarkdown(
  rawMarkdown: string,
  slugMap: Record<string, string>
): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];

  // 1. 替换相对文件链接 [xxx](./yyy.md) 为 /articles/slug
  let processed = rawMarkdown.replace(/\[([^\]]+)\]\(\.\/([^)]+)\)/g, (match, text, target) => {
    const filename = decodeURIComponent(target.replace(/^\.\//, ""));
    const targetSlug = slugMap[filename];
    if (targetSlug) {
      return `[${text}](/articles/${targetSlug})`;
    }
    return match;
  });

  // 2. 预处理 Obsidian Callout 语法 > [!type] Title
  processed = processed.replace(
    /^>\s*\[!([a-zA-Z]+)\](?:\s+([^\n]+))?\n((?:>.*\n?)*)/gm,
    (_, type, title, bodyLines) => {
      const cleanType = type.toLowerCase();
      const calloutTitle = title ? title.trim() : cleanType.toUpperCase();
      const cleanBody = bodyLines
        .split("\n")
        .map((line: string) => line.replace(/^>\s?/, ""))
        .join("\n")
        .trim();

      return `\n<div class="callout-card callout-${cleanType}" data-type="${cleanType}">
<div class="callout-header"><span class="callout-indicator">✦</span><strong class="callout-title">${calloutTitle}</strong></div>
<div class="callout-content">\n\n${cleanBody}\n\n</div>
</div>\n\n`;
    }
  );

  // 3. 配置 marked 自定义 renderer
  const renderer = new marked.Renderer();

  // 标题处理：提取目录 TOC 并打上锚点
  (renderer as any).heading = function (arg: any) {
    const depth = arg.depth || 2;
    const text = arg.tokens ? this.parser.parseInline(arg.tokens) : (arg.text || "");
    const plainText = arg.text || (arg.tokens ? arg.tokens.map((t: any) => t.raw || t.text).join("") : "");
    const id = slugifyHeading(plainText);

    if (depth >= 2 && depth <= 3) {
      toc.push({
        id,
        text: plainText.trim(),
        level: depth,
      });
    }

    return `<h${depth} id="${id}" class="heading-anchor group relative scroll-mt-24">
  <span>${text}</span>
  <a href="#${id}" class="heading-anchor-link opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-zinc-300 hover:text-[#E03E1A]" aria-label="锚点链接">#</a>
</h${depth}>\n`;
  };

  // 引用块增强
  (renderer as any).blockquote = function (arg: any) {
    const body = arg.tokens ? this.parser.parse(arg.tokens) : (arg.text || "");
    return `<blockquote class="my-6 border-l-4 border-[#E03E1A] bg-orange-50/30 pl-4 py-2 italic text-zinc-700 font-serif text-[15px] leading-relaxed rounded-r-xl">${body}</blockquote>\n`;
  };

  marked.setOptions({
    gfm: true,
    breaks: false,
    renderer,
  });

  let html = marked.parse(processed) as string;
  // 包装表格支持横向平滑滚动
  html = html.replace(/<table>/g, '<div class="table-container my-6 overflow-x-auto rounded-2xl border border-zinc-200/80 bg-white/60 p-1 shadow-2xs"><table class="w-full text-left text-xs border-collapse">');
  html = html.replace(/<\/table>/g, '</table></div>');
  return { html, toc };
}

async function main() {
  console.log("=== 开始同步 Obsidian 知识库专题文章 ===");
  console.log(`知识库源目录: ${VAULT_DIR}`);

  if (!fs.existsSync(VAULT_DIR)) {
    console.warn(`[WARN] 目录不存在: ${VAULT_DIR}`);
    if (fs.existsSync(OUTPUT_CONTENT_FILE)) {
      console.log(`[INFO] 已存在本地缓存 ${OUTPUT_CONTENT_FILE}，跳过实时拉取。`);
      return;
    }
    throw new Error(`无法找到 Obsidian 专题文章目录且无已有缓存: ${VAULT_DIR}`);
  }

  const files = fs
    .readdirSync(VAULT_DIR)
    .filter((f) => f.endsWith(".md") && f !== "index.md" && !f.includes("写作规范"));

  console.log(`扫描到 ${files.length} 篇专题文章候选。\n`);

  // 先建立 文件名 -> slug 映射
  const filenameToSlug: Record<string, string> = {};
  for (const f of files) {
    const defaultSlug =
      SLUG_MAP[f]?.slug ||
      f
        .replace(/\.md$/, "")
        .toLowerCase()
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, "-");
    filenameToSlug[f] = defaultSlug;
  }

  const articles: ArticleRecord[] = [];

  for (const file of files) {
    const fullPath = path.join(VAULT_DIR, file);
    const rawContent = fs.readFileSync(fullPath, "utf-8");
    const parsed = matter(rawContent);
    const data = parsed.data || {};
    if (data.type === "reference") continue;

    // 提取正文首个 # 一级标题作为文章名
    const h1Match = parsed.content.match(/^#\s+(.+)$/m);
    const title = h1Match ? h1Match[1].trim() : file.replace(/\.md$/, "");

    // 从正文中剥除 H1 标题，避免详情页重复渲染
    let bodyWithoutH1 = parsed.content.replace(/^#\s+[^\n]+\n*/m, "").trim();

    // 提取摘要：优先找首个引用块 > ... 或首段
    let summary = "";
    const quoteMatch = bodyWithoutH1.match(/^>\s+([^\n]+(?:\n>\s+[^\n]+)*)/);
    if (quoteMatch) {
      summary = quoteMatch[1].replace(/\n>\s+/g, " ").trim();
    } else {
      const firstParaMatch = bodyWithoutH1.match(/^([^#\n>][^\n]+)/m);
      summary = firstParaMatch ? firstParaMatch[1].trim() : "";
    }

    const wordCount = bodyWithoutH1.replace(/[#*`~\[\]\(\)\n\r\s]/g, "").length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 380));

    const meta = SLUG_MAP[file] || {
      slug: filenameToSlug[file],
      category: "行业调研与深度报告",
      tags: ["专题分析", "调研报告"],
    };

    const { html, toc } = renderObsidianMarkdown(bodyWithoutH1, filenameToSlug);

    const articleRecord: ArticleRecord = {
      id: `art_${meta.slug.replace(/[^a-zA-Z0-9]/g, "_")}`,
      slug: meta.slug,
      aliases: [
        file.replace(/\.md$/, ""),
        encodeURIComponent(file.replace(/\.md$/, "")),
      ],
      file,
      title,
      summary,
      category: meta.category,
      tags: meta.tags,
      wordCount,
      readingTime,
      status: (data.status as any) || "in-review",
      updated: formatDate(data.updated),
      verified: data.verified ? formatDate(data.verified) : undefined,
      provenance: (data.provenance as any) || "source-synthesis",
      reviewedBy: data["reviewed-by"] ? String(data["reviewed-by"]) : undefined,
      history: data.history ? String(data.history) : undefined,
      toc,
      html,
      markdown: bodyWithoutH1,
    };

    articles.push(articleRecord);
    console.log(
      `✓ [${articleRecord.category}] ${title} (${wordCount} 字, ~${readingTime} 分钟) -> /articles/${articleRecord.slug}`
    );
  }

  // 按照更新时间倒序排序
  articles.sort((a, b) => (b.updated > a.updated ? 1 : -1));

  // 写入 content/articles.json 与 data/articles.json
  fs.mkdirSync(path.dirname(OUTPUT_CONTENT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_CONTENT_FILE, JSON.stringify(articles, null, 2), "utf-8");

  fs.mkdirSync(path.dirname(OUTPUT_DATA_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_DATA_FILE, JSON.stringify(articles, null, 2), "utf-8");

  const totalWords = articles.reduce((sum, a) => sum + a.wordCount, 0);
  console.log(`\n🎉 同步完成！共处理 ${articles.length} 篇专题文章，总计 ${totalWords.toLocaleString()} 字。`);
  console.log(`输出文件:`);
  console.log(`  - ${OUTPUT_CONTENT_FILE}`);
  console.log(`  - ${OUTPUT_DATA_FILE}`);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
