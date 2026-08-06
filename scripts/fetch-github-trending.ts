// GitHub Trending 采集 → 飞书 KB Bitable（github_trending 表）
// 用法：
//   npx tsx scripts/fetch-github-trending.ts [--since daily|weekly|monthly] [--lang <slug>|all] [--table-name github_trending] [--dry-run]
// 认证：FEISHU_APP_ID + FEISHU_APP_SECRET → tenant_access_token（app/bot 身份，与 lark-cli --as bot 一致）
// 目标 Base：FEISHU_BASE_TOKEN（fallback FEISHU_KB_TOKEN / KB_TOKEN）
// 幂等：以 (仓库, 周期) 为键 upsert；表不存在时自动创建（REST 兜底 schema）
// 定时入口：.github/workflows/github-trending.yml（每日 08:00/21:00 daily 榜、每周日 weekly、每月 1 日 monthly，北京时间）

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

// ============ 飞书 Bitable REST（app/bot 身份） ============

const FEISHU_API = "https://open.feishu.cn/open-apis";
let _token: string | null = null;

async function tenantToken(): Promise<string> {
  if (_token) return _token;
  const appId = process.env.FEISHU_APP_ID;
  const appSecret = process.env.FEISHU_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("缺少环境变量 FEISHU_APP_ID / FEISHU_APP_SECRET");
  }
  const res = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`飞书鉴权 HTTP ${res.status}`);
  const json = (await res.json()) as { code: number; msg?: string; tenant_access_token?: string };
  if (json.code !== 0 || !json.tenant_access_token) {
    throw new Error(`飞书鉴权失败 (code ${json.code}): ${json.msg}`);
  }
  _token = json.tenant_access_token;
  return _token;
}

interface FeishuError {
  code: number;
  msg: string;
}

async function feishu(
  method: "GET" | "POST",
  url: string,
  body?: unknown,
  retriesLeft = 3,
): Promise<any> {
  const token = await tenantToken();
  const res = await fetch(`${FEISHU_API}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const json = (await res.json().catch(() => null)) as ({ code: number; msg?: string } & Record<string, any>) | null;
  if (!res.ok || !json || json.code !== 0) {
    const err: FeishuError = { code: json?.code ?? -1, msg: json?.msg ?? `HTTP ${res.status}` };
    if (json?.code === 429 && retriesLeft > 0) {
      const backoff = Math.min(20000, 2000 * Math.pow(2, 3 - retriesLeft));
      log(`  ⏸ 飞书 429 限流，退避 ${backoff / 1000}s`);
      await sleep(backoff);
      return feishu(method, url, body, retriesLeft - 1);
    }
    const hint =
      json?.code === 91403
        ? "（应用无该 Base 的写入权限：请在飞书多维表格分享设置中把应用添加为可编辑协作者）"
        : "";
    throw new Error(`飞书 ${method} ${url} 失败 (code ${err.code}): ${err.msg}${hint}`);
  }
  return json;
}

async function findTable(name: string): Promise<string | null> {
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ page_size: "100" });
    if (pageToken) params.set("page_token", pageToken);
    const json = await feishu("GET", `/bitable/v1/apps/${KB_TOKEN}/tables?${params.toString()}`);
    for (const t of json.data?.items ?? []) {
      if (t.name === name) return t.table_id;
    }
    pageToken = json.data?.has_more ? json.data.page_token : undefined;
  } while (pageToken);
  return null;
}

// REST 建表兜底 schema（字段类型：1=文本 2=数字 3=单选 5=日期）
const AUTO_CREATE_FIELDS = [
  { field_name: "仓库", type: 1 },
  { field_name: "排名", type: 2 },
  { field_name: "链接", type: 1 },
  { field_name: "描述", type: 1 },
  { field_name: "语言", type: 1 },
  { field_name: "总星数", type: 2 },
  { field_name: "周期内新增星数", type: 2 },
  { field_name: "Fork 数", type: 2 },
  {
    field_name: "周期",
    type: 3,
    property: { options: PERIODS.map((p) => ({ name: p })) },
  },
  { field_name: "采集时间", type: 5 },
];

async function createTable(name: string): Promise<string> {
  const json = await feishu("POST", `/bitable/v1/apps/${KB_TOKEN}/tables`, {
    table: { name, fields: AUTO_CREATE_FIELDS },
  });
  const tableId = json.data?.table_id;
  if (!tableId) throw new Error("建表成功但未返回 table_id");
  return tableId;
}

async function listRecords(tableId: string): Promise<Array<{ record_id: string; fields: Record<string, unknown> }>> {
  const records: Array<{ record_id: string; fields: Record<string, unknown> }> = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ page_size: "500" });
    if (pageToken) params.set("page_token", pageToken);
    const json = await feishu("GET", `/bitable/v1/apps/${KB_TOKEN}/tables/${tableId}/records?${params.toString()}`);
    for (const item of json.data?.items ?? []) {
      records.push({ record_id: item.record_id, fields: item.fields ?? {} });
    }
    pageToken = json.data?.has_more ? json.data.page_token : undefined;
  } while (pageToken);
  return records;
}

async function batchCreate(tableId: string, rows: Array<Record<string, unknown>>) {
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    await feishu("POST", `/bitable/v1/apps/${KB_TOKEN}/tables/${tableId}/records/batch_create`, {
      records: batch.map((fields) => ({ fields })),
    });
    await sleep(300);
  }
}

async function batchUpdate(tableId: string, rows: Array<{ record_id: string; fields: Record<string, unknown> }>) {
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    await feishu("POST", `/bitable/v1/apps/${KB_TOKEN}/tables/${tableId}/records/batch_update`, {
      records: batch,
    });
    await sleep(300);
  }
}

// ============ Main ============

function toFields(repo: TrendingRepo): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    排名: repo.rank,
    仓库: repo.repo,
    链接: repo.url,
    语言: repo.language,
    周期: since,
    采集时间: NOW_MS,
  };
  // 飞书 batch API 不接受 null 值字段，空值直接省略
  if (repo.description) fields["描述"] = repo.description;
  if (repo.stars !== null) fields["总星数"] = repo.stars;
  if (repo.forks !== null) fields["Fork 数"] = repo.forks;
  if (repo.starsDelta !== null) fields["周期内新增星数"] = repo.starsDelta;
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
  let tableId = await findTable(tableName);
  if (!tableId) {
    log(`表不存在，自动创建 ${tableName} ...`);
    tableId = await createTable(tableName);
    log(`已创建表 ${tableId}`);
  }

  const existing = await listRecords(tableId);
  const existingByKey = new Map<string, string>();
  for (const rec of existing) {
    const repo = String(rec.fields["仓库"] ?? "");
    const period = String(rec.fields["周期"] ?? "");
    if (repo) existingByKey.set(`${repo}::${period}`, rec.record_id);
  }
  log(`表内已有 ${existing.length} 条记录`);

  const toCreate: Array<Record<string, unknown>> = [];
  const toUpdate: Array<{ record_id: string; fields: Record<string, unknown> }> = [];
  for (const repo of repos) {
    const key = `${repo.repo}::${since}`;
    const recordId = existingByKey.get(key);
    const fields = toFields(repo);
    if (recordId) toUpdate.push({ record_id: recordId, fields });
    else toCreate.push(fields);
  }

  if (toCreate.length > 0) {
    log(`批量新建 ${toCreate.length} 条 ...`);
    await batchCreate(tableId, toCreate);
  }
  if (toUpdate.length > 0) {
    log(`批量更新 ${toUpdate.length} 条 ...`);
    await batchUpdate(tableId, toUpdate);
  }
  log(`完成: 新建 ${toCreate.length} / 更新 ${toUpdate.length} / 表 ${tableId}`);
}

main().catch((err) => {
  console.error(`[${NOW_ISO}] 失败:`, err instanceof Error ? err.message : err);
  process.exit(1);
});
