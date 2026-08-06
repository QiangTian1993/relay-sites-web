// GitHub Trending 采集 → 飞书 KB Bitable（github_trending 表）
// 用法：
//   npx tsx scripts/fetch-github-trending.ts [--since daily|weekly|monthly] [--lang <slug>|all] [--table-name github_trending] [--dry-run]
// 写路径：lark-cli subprocess（与 sync-remote-data.ts 一致；默认 user 身份，LARK_AS=bot 可覆盖）
// 目标 Base：FEISHU_BASE_TOKEN（fallback FEISHU_KB_TOKEN / KB_TOKEN）
// 幂等：以 (仓库, 周期) 为键 upsert；表不存在时自动创建
// 定时入口：.github/workflows/github-trending.yml（每日 08:00/21:00 daily 榜、每周日 weekly、每月 1 日 monthly，北京时间）

import { execFileSync } from "node:child_process";

// ============ CLI 参数 ============

const PERIODS = ["daily", "weekly", "monthly"] as const;
type Period = (typeof PERIODS)[number];

const args = process.argv.slice(2);
function argValue(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}
const since = (argValue("--since") ?? "daily") as Period;
if (!PERIODS.includes(since)) {
  throw new Error(`--since 必须是 ${PERIODS.join(" | ")}，收到: ${since}`);
}
const lang = (argValue("--lang") ?? "all").toLowerCase();
const tableName = argValue("--table-name") ?? "github_trending";
const DRY_RUN = args.includes("--dry-run");

const rawKbToken = process.env.FEISHU_BASE_TOKEN ?? process.env.FEISHU_KB_TOKEN ?? process.env.KB_TOKEN;
const KB_TOKEN = (rawKbToken && !rawKbToken.includes("…")) ? rawKbToken : "SchGbU6UDaT5q9sDjHTct79Sn9d";
// 默认走 bot（实测 user 身份对 github_trending 无写权限 91403；bot 有）
const LARK_AS = process.env.LARK_AS ?? "bot";

const TRENDING_URL =
  lang === "all"
    ? `https://github.com/trending?since=${since}`
    : `https://github.com/trending/${encodeURIComponent(lang)}?since=${since}`;

const NOW_MS = Date.now();
const NOW_ISO = new Date(NOW_MS).toISOString();

// ============ 工具函数 ============

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

function log(msg: string) {
  console.log(`[${NOW_ISO.slice(11, 19)}] ${msg}`);
}

function decodeHtml(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toInt(s: string | undefined): number | null {
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============ GitHub Trending 抓取与解析 ============

interface TrendingRepo {
  rank: number;
  repo: string; // owner/repo
  url: string;
  description: string;
  language: string;
  stars: number | null;
  forks: number | null;
  starsDelta: number | null;
  /** LLM 翻译的中文描述（无 key 或失败时为空） */
  chineseDescription?: string;
}

async function fetchTrendingPage(): Promise<string> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en",
  };
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(TRENDING_URL, {
        headers,
        signal: AbortSignal.timeout(30000),
        cache: "no-store",
      });
      if (res.status === 429 || res.status === 403) {
        lastErr = new Error(`GitHub HTTP ${res.status}（可能被限流）`);
      } else if (!res.ok) {
        lastErr = new Error(`GitHub HTTP ${res.status}`);
      } else {
        return await res.text();
      }
    } catch (e) {
      lastErr = e;
    }
    await sleep(3000 * attempt);
  }
  throw lastErr;
}

function parseRepos(html: string): TrendingRepo[] {
  if (!html.includes('<article class="Box-row"')) {
    throw new Error("页面结构异常：未找到 Box-row 仓库卡片（GitHub 可能改版）");
  }
  const chunks = html.split('<article class="Box-row"').slice(1);
  const repos: TrendingRepo[] = [];
  for (const chunk of chunks) {
    const repoMatch = chunk.match(/<h2 class="h3 lh-condensed">\s*<a[^>]*href="\/([^"]+)"/);
    if (!repoMatch) continue;
    const repo = repoMatch[1];
    const url = `https://github.com/${repo}`;
    const escapedRepo = escapeRegExp(repo);
    const descMatch = chunk.match(/<p class="col-9 color-fg-muted my-1[^"]*">([\s\S]*?)<\/p>/);
    const langMatch = chunk.match(/itemprop="programmingLanguage">([^<]+)<\/span>/);
    const starsMatch = chunk.match(
      new RegExp(`href="/${escapedRepo}/stargazers"[^>]*>[\\s\\S]*?<\\/svg>\\s*([\\d,]+)\\s*<\\/a>`),
    );
    const forksMatch = chunk.match(
      new RegExp(`href="/${escapedRepo}/(?:forks|network/members)"[^>]*>[\\s\\S]*?<\\/svg>\\s*([\\d,]+)\\s*<\\/a>`),
    );
    const deltaMatch = chunk.match(/([\d,]+)\s*stars (?:today|this week|this month)/);
    repos.push({
      rank: repos.length + 1,
      repo,
      url,
      description: descMatch ? decodeHtml(stripTags(descMatch[1])).slice(0, 500) : "",
      language: langMatch ? decodeHtml(langMatch[1].trim()) : "",
      stars: toInt(starsMatch?.[1]),
      forks: toInt(forksMatch?.[1]),
      starsDelta: toInt(deltaMatch?.[1]),
    });
  }
  return repos;
}

// ============ 功能分类（规则匹配仓库名+描述） ============

// 按规则顺序优先命中；关键词 \b 词边界匹配（小写）
const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "AI 应用",
    keywords: ["ai", "llm", "ai agent", "agentic", "agent", "agents", "gpt", "chatgpt", "claude", "copilot", "deepseek", "mcp", "rag", "prompt", "inference", "diffusion", "llama", "language model", "neural", "genai", "vision", "模型", "智能体", "大模型"],
  },
  {
    category: "开发者工具",
    keywords: ["cli", "command line", "command-line", "terminal", "debug", "lint", "compiler", "ide", "editor", "testing", "test runner", "ci", "build tool", "git", "github", "static analysis", "sdk", "api client", "devtool", "developer tool", "code quality", "package manager", "fuzzy finder", "status page"],
  },
  {
    category: "框架与运行时",
    keywords: ["framework", "runtime", "library", "react", "vue", "angular", "next.js", "svelte", "spring", "django", "rails", "flask", "fastapi", "engine", "programming language", "编译器", "组件库"],
  },
  {
    category: "数据与存储",
    keywords: ["database", "sql", "nosql", "redis", "postgres", "mysql", "mongodb", "vector", "data pipeline", "etl", "streaming", "kafka", "olap", "data warehouse", "embedded", "json", "数据"],
  },
  {
    category: "可视化与 UI",
    keywords: ["ui", "component", "chart", "dashboard", "visualization", "design system", "icon", "animation", "css", "tailwind", "figma", "界面"],
  },
  {
    category: "安全与网络",
    keywords: ["security", "vulnerability", "pentest", "exploit", "firewall", "proxy", "vpn", "network", "http", "dns", "scanner", "cryptography", "auth", "oauth", "privacy", "threat", "subdomain", "seo", "安全"],
  },
  {
    category: "运维与云",
    keywords: ["kubernetes", "k8s", "docker", "container", "devops", "monitoring", "observability", "deploy", "infrastructure", "terraform", "serverless", "cloud", "运维", "容器"],
  },
  {
    category: "学习与资源",
    keywords: ["tutorial", "learn", "book", "cheatsheet", "interview", "awesome", "roadmap", "course", "examples", "internship", "job", "algorithm", "教程", "学习", "面试"],
  },
  {
    category: "效率与产品",
    keywords: ["note", "notes", "browser", "document", "pdf", "video", "audio", "music", "productivity", "task", "todo", "calendar", "email", "download", "notification", "messaging", "communication", "publish", "publishing", "笔记", "写作", "效率"],
  },
  {
    category: "游戏与娱乐",
    keywords: ["game", "gaming", "emulator", "minecraft", "游戏"],
  },
  {
    category: "Web3 与区块链",
    keywords: ["bitcoin", "ethereum", "blockchain", "crypto", "web3", "defi", "nft", "链", "区块"],
  },
];

const CATEGORY_OTHER = "其他";

function categorize(repoName: string, description: string): string {
  const haystack = `${repoName} ${description}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      // 含空格的短语用 includes，单词用词边界
      const re = kw.includes(" ") ? new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) : new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(haystack)) return rule.category;
    }
  }
  return CATEGORY_OTHER;
}

// ============ 中文描述翻译（OpenAI 兼容 LLM，默认智谱 GLM-4-Flash 免费档） ============

const LLM_API_KEY = process.env.LLM_API_KEY ?? "";
const LLM_BASE_URL = (process.env.LLM_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4").replace(/\/+$/, "");
const LLM_MODEL = process.env.LLM_MODEL ?? "glm-4-flash";
const TRANSLATE_BATCH = 10;

async function translateBatch(descs: string[]): Promise<Array<string | null>> {
  if (descs.length === 0) return [];
  const prompt = [
    "你是翻译助手。下面每一行是一条 GitHub 仓库描述，请逐条翻译成简体中文。",
    "要求：",
    "- 每一条译文单独一行，不要编号，不要引号，不要 JSON",
    "- 技术名词、专有名词、库名保留原文",
    "- 保持简洁，不添加解释",
    `- 必须输出与输入行数一致的 ${descs.length} 行译文`,
    "",
    "待翻译：",
    ...descs,
    "",
    "译文：",
  ].join("\n");
  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(60000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`翻译 API HTTP ${res.status}`);
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "";

  // 解析优先级：JSON 数组 → 按行拆分
  const arr = content.match(/\[[\s\S]*\]/)?.[0];
  if (arr) {
    try {
      const parsed = JSON.parse(arr) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string") && parsed.length === descs.length) {
        return parsed;
      }
    } catch {
      // 落空走行拆分
    }
  }
  const lines = content
    .split("\n")
    .map((l) => l.trim().replace(/^[-*\d.\s]+/, "").replace(/^["'`]+|["'`]+$/g, ""))
    .filter(Boolean);
  if (lines.length !== descs.length) {
    throw new Error(`翻译响应行数 ${lines.length} != ${descs.length}`);
  }
  return lines;
}

/** 串行分批翻译；单批失败重试 2 次，仍失败返回 null 占位（保留英文原文） */
async function translateAll(descs: string[]): Promise<Array<string | null>> {
  const out: Array<string | null> = new Array(descs.length).fill(null);
  for (let start = 0; start < descs.length; start += TRANSLATE_BATCH) {
    const batch = descs.slice(start, start + TRANSLATE_BATCH);
    let result: Array<string | null> | null = null;
    for (let attempt = 1; attempt <= 3 && !result; attempt++) {
      try {
        result = await translateBatch(batch);
      } catch (e) {
        log(`  ⏸ 翻译批次 ${Math.floor(start / TRANSLATE_BATCH) + 1} 失败 (attempt ${attempt}): ${e instanceof Error ? e.message : e}`);
        if (attempt < 3) await sleep(2000 * attempt);
      }
    }
    if (result) out.splice(start, batch.length, ...result);
    await sleep(200); // 智谱 1 并发限制，串行节流
  }
  return out;
}

// ============ 飞书 lark-cli 封装（与 sync-remote-data.ts 同模式） ============

interface LarkJson {
  ok?: boolean;
  identity?: string;
  data?: {
    tables?: Array<{ id: string; name: string }>;
    table?: { id: string };
    record_id_list?: string[];
    fields?: string[];
    data?: unknown[][];
    has_more?: boolean;
    ignored_fields?: unknown[];
  };
  ignored_fields?: unknown[];
}

function runLark(args: string[], timeoutMs = 60000): LarkJson {
  // 将 "--as X" 的值统一替换为 LARK_AS，便于在 user/bot 间切换
  const resolved = args.map((arg, i) => (args[i - 1] === "--as" ? LARK_AS : arg));
  const out = execFileSync("lark-cli", resolved, {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: timeoutMs,
  });
  return JSON.parse(out) as LarkJson;
}

function is429Error(e: unknown): boolean {
  const msg = String(e);
  return msg.includes("429") || msg.includes("QPS") || msg.includes("rate limit") || msg.includes("over frequency");
}

async function withRetry<T>(fn: () => T, label: string): Promise<T> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return fn();
    } catch (e) {
      if (is429Error(e) && attempt < maxRetries) {
        const backoff = Math.min(20000, 2000 * Math.pow(2, attempt - 1));
        log(`  ⏸ ${label} 429 限流，退避 ${backoff / 1000}s (attempt ${attempt}/${maxRetries})`);
        await sleep(backoff);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`unreachable: ${label}`);
}

async function larkFindTable(name: string): Promise<string | null> {
  const j = await withRetry(() => runLark([
    "base", "+table-list",
    "--as", "user",
    "--base-token", KB_TOKEN,
    "--format", "json",
  ]), "table-list");
  if (!j.ok) throw new Error(`lark table-list failed: ${JSON.stringify(j).slice(0, 300)}`);
  const tables = j.data?.tables ?? [];
  return tables.find((t) => t.name === name)?.id ?? null;
}

// lark-cli 建表字段 JSON（与 2026-08-06 人工建表 schema 一致）
const CREATE_TABLE_FIELDS = [
  { type: "text", name: "仓库" },
  { type: "number", name: "排名", style: { type: "plain", precision: 0, thousands_separator: true } },
  { type: "text", name: "链接", style: { type: "url" } },
  { type: "text", name: "描述" },
  { type: "text", name: "中文描述" },
  { type: "text", name: "语言" },
  { type: "text", name: "榜单" },
  {
    type: "select",
    name: "功能分类",
    options: CATEGORY_RULES.map((r, i) => ({ name: r.category, hue: "Blue", lightness: "Light" })).concat([
      { name: CATEGORY_OTHER, hue: "Gray", lightness: "Light" },
    ]),
  },
  { type: "number", name: "总星数", style: { type: "plain", precision: 0, thousands_separator: true } },
  { type: "number", name: "周期内新增星数", style: { type: "plain", precision: 0, thousands_separator: true } },
  { type: "number", name: "Fork 数", style: { type: "plain", precision: 0, thousands_separator: true } },
  {
    type: "select",
    name: "周期",
    options: [
      { name: "daily", hue: "Blue", lightness: "Light" },
      { name: "weekly", hue: "Orange", lightness: "Light" },
      { name: "monthly", hue: "Purple", lightness: "Light" },
    ],
  },
  { type: "datetime", name: "采集时间" },
];

function larkCreateTable(name: string): string {
  const j = runLark([
    "base", "+table-create",
    "--as", "user",
    "--base-token", KB_TOKEN,
    "--name", name,
    "--fields", JSON.stringify(CREATE_TABLE_FIELDS),
    "--format", "json",
  ]);
  if (!j.ok) throw new Error(`lark table-create failed: ${JSON.stringify(j).slice(0, 300)}`);
  const tableId = j.data?.table?.id;
  if (!tableId) throw new Error("建表成功但未返回 table id");
  return tableId;
}

function larkListAll(tableId: string): Array<{ id: string; fields: Record<string, unknown> }> {
  const records: Array<{ id: string; fields: Record<string, unknown> }> = [];
  let offset = 0;
  while (true) {
    const j = runLark([
      "base", "+record-list",
      "--as", "user",
      "--base-token", KB_TOKEN,
      "--table-id", tableId,
      "--limit", "200",
      "--offset", String(offset),
      "--format", "json",
    ]);
    if (!j.ok) throw new Error(`lark record-list failed: ${JSON.stringify(j).slice(0, 300)}`);
    const ids: string[] = j.data?.record_id_list ?? [];
    const fields: string[] = j.data?.fields ?? [];
    const data: unknown[][] = j.data?.data ?? [];
    records.push(...data.map((row, i) => ({
      id: ids[i],
      fields: Object.fromEntries(fields.map((field, fieldIndex) => [field, row[fieldIndex]])),
    })));
    if (!j.data?.has_more || data.length === 0) break;
    offset += data.length;
  }
  return records;
}

function larkBatchCreate(tableId: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const fieldNames = Object.keys(rows[0]);
  const j = runLark([
    "base", "+record-batch-create",
    "--as", "user",
    "--base-token", KB_TOKEN,
    "--table-id", tableId,
    "--json", JSON.stringify({
      fields: fieldNames,
      rows: rows.map((row) => fieldNames.map((field) => row[field] ?? null)),
    }),
  ]);
  if (!j.ok) throw new Error(`lark batch create failed: ${JSON.stringify(j).slice(0, 300)}`);
  const ignoredFields = j.data?.ignored_fields ?? j.ignored_fields ?? [];
  if (ignoredFields.length > 0) {
    throw new Error(`lark ignored fields: ${JSON.stringify(ignoredFields)}`);
  }
}

function larkBatchUpdate(tableId: string, rows: Array<{ record_id: string; fields: Record<string, unknown> }>) {
  if (rows.length === 0) return;
  const updateRecords: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    // 过滤空值（含空字符串），避免把已有字段（如中文描述）清空
    updateRecords[row.record_id] = Object.fromEntries(
      Object.entries(row.fields).filter(([, value]) => value !== null && value !== undefined && value !== ""),
    );
  }
  const j = runLark([
    "base", "+record-batch-update",
    "--as", "user",
    "--base-token", KB_TOKEN,
    "--table-id", tableId,
    "--json", JSON.stringify({ update_records: updateRecords }),
  ]);
  if (!j.ok) throw new Error(`lark batch update failed: ${JSON.stringify(j).slice(0, 300)}`);
  const ignoredFields = j.data?.ignored_fields ?? j.ignored_fields ?? [];
  if (ignoredFields.length > 0) {
    throw new Error(`lark ignored fields: ${JSON.stringify(ignoredFields)}`);
  }
}

// 北京时间字符串（lark-cli datetime CellValue 格式）
function formatFeishuDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

// ============ Main ============

function toFields(repo: TrendingRepo): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    排名: repo.rank,
    仓库: repo.repo,
    链接: repo.url,
    描述: repo.description,
    语言: repo.language,
    功能分类: categorize(repo.repo, repo.description),
    榜单: lang, // 榜单来源（all / 语言 slug）
    总星数: repo.stars,
    周期内新增星数: repo.starsDelta,
    "Fork 数": repo.forks,
    周期: since,
    采集时间: formatFeishuDate(new Date(NOW_MS)),
  };
  // 中文描述为空时省略字段（更新路径避免覆盖已有译文；无 LLM key 时保持纯英文）
  if (repo.chineseDescription) fields["中文描述"] = repo.chineseDescription;
  return fields;
}

async function main() {
  log(`采集 GitHub Trending: lang=${lang} since=${since} → ${TRENDING_URL}`);
  const html = await fetchTrendingPage();
  const repos = parseRepos(html);
  if (repos.length < 5) {
    throw new Error(`解析结果异常：仅 ${repos.length} 个仓库（低于阈值 5），疑似页面结构变化，中止写入`);
  }
  log(`解析到 ${repos.length} 个仓库`);

  if (DRY_RUN) {
    for (const r of repos) {
      console.log(`  #${r.rank} ${r.repo} (${r.language || "-"}) ★${r.stars ?? "-"} +${r.starsDelta ?? "-"} ⑂${r.forks ?? "-"} ${r.description.slice(0, 60)}`);
    }
    console.log(`[dry-run] 未写入飞书`);
    return;
  }

  log(`查找飞书表 ${tableName} ...`);
  let tableId = await larkFindTable(tableName);
  if (!tableId) {
    log(`表不存在，自动创建 ${tableName} ...`);
    tableId = larkCreateTable(tableName);
    log(`已创建表 ${tableId}`);
  }

  const existing = await withRetry(() => larkListAll(tableId), "record-list");
  const existingByKey = new Map<string, string>();
  const cachedZhByKey = new Map<string, { desc: string; zh: string }>();
  for (const rec of existing) {
    const repo = String(rec.fields["仓库"] ?? "");
    const period = String(rec.fields["周期"] ?? "");
    const board = String(rec.fields["榜单"] ?? "");
    if (!repo) continue;
    // 键 = 仓库 + 周期 + 榜单（同一仓库在 all 榜与语言榜排名独立）
    existingByKey.set(`${repo}::${period}::${board}`, rec.id);
    const zh = String(rec.fields["中文描述"] ?? "");
    // 中文描述与原文相同视为未翻译（早期版本误写），不缓存
    if (zh && zh !== String(rec.fields["描述"] ?? "")) cachedZhByKey.set(`${repo}::${period}`, { desc: String(rec.fields["描述"] ?? ""), zh });
  }
  log(`表内已有 ${existing.length} 条记录`);

  // 中文描述翻译：已有译文且描述未变则复用，否则走 LLM（无 key 时跳过）
  if (LLM_API_KEY) {
    const toTranslate = repos.filter((r) => {
      if (!r.description) return false;
      const cached = cachedZhByKey.get(`${r.repo}::${since}`);
      return !(cached && cached.desc === r.description);
    });
    if (toTranslate.length > 0) {
      log(`翻译 ${toTranslate.length} 条描述（${LLM_MODEL}）...`);
      const results = await translateAll(toTranslate.map((r) => r.description));
      toTranslate.forEach((r, i) => {
        if (results[i]) r.chineseDescription = results[i];
      });
    }
  }

  const toCreate: Record<string, unknown>[] = [];
  const toUpdate: Array<{ record_id: string; fields: Record<string, unknown> }> = [];
  for (const repo of repos) {
    const key = `${repo.repo}::${since}::${lang}`;
    const recordId = existingByKey.get(key);
    const fields = toFields(repo);
    if (recordId) toUpdate.push({ record_id: recordId, fields });
    else toCreate.push(fields);
  }

  if (toCreate.length > 0) {
    log(`批量新建 ${toCreate.length} 条 ...`);
    await withRetry(() => larkBatchCreate(tableId, toCreate), "batch-create");
  }
  if (toUpdate.length > 0) {
    log(`批量更新 ${toUpdate.length} 条 ...`);
    await withRetry(() => larkBatchUpdate(tableId, toUpdate), "batch-update");
  }
  log(`完成: 新建 ${toCreate.length} / 更新 ${toUpdate.length} / 表 ${tableId}`);
}

main().catch((err) => {
  console.error(`[${NOW_ISO}] 失败:`, err instanceof Error ? err.message : err);
  process.exit(1);
});
