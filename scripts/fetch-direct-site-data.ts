// 第一方直连采集脚本 —— 直接并发请求 167+ 站点的免登录公开 API (/api/pricing, /api/user/self/pricing, /api/v1/pricing 等)
// 用法：
//   npx tsx scripts/fetch-direct-site-data.ts [--sync-feishu]
// 说明：
//   直连抓取每个中转站的原生分组倍率、模型倍率、补全系数与组-模型映射，
//   生成/更新本地 data/relay_site_groups.json 与 data/model_rates.json，
//   彻底摆脱对三方行情站 (qizhang.org) 的单点依赖！

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// ============ 常量与配置 ============

const DATA_DIR = path.join(process.cwd(), "data");
const LOG_DIR = "/tmp";
const CONCURRENCY = 15;
const TIMEOUT_MS = 4000;
const LARK_AS = process.env.LARK_AS ?? "bot";

const rawKbToken = process.env.FEISHU_BASE_TOKEN ?? process.env.FEISHU_KB_TOKEN ?? process.env.KB_TOKEN;
const KB_TOKEN = (rawKbToken && !rawKbToken.includes("…")) ? rawKbToken : "SchGbU6UDaT5q9sDjHTct79Sn9d";

const TABLE_GROUPS = "tblIZtZllNUaSuud"; // relay_site_groups
const TABLE_RATES = "tbl5EDYdDtH8SlXM";  // model_rates

const SYNC_FEISHU = process.argv.includes("--sync-feishu") || process.env.SYNC_FEISHU === "1";

const ENDPOINTS = [
  "/api/pricing",
  "/api/user/self/pricing",
  "/api/v1/pricing",
  "/api/v1/user/pricing",
  "/api/v1/public/pricing",
  "/api/models",
];

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ============ 类型定义 ============

interface SiteRecord {
  __id: string;
  站点ID?: string;
  名称?: string;
  域名?: string;
  框架?: string;
  [k: string]: unknown;
}

interface RawModelItem {
  model_name?: string;
  model?: string;
  model_ratio?: number;
  completion_ratio?: number;
  cache_ratio?: number;
  create_cache_ratio?: number;
  model_price?: number;
  enable_groups?: string[] | string;
  type?: string | number;
}

interface DirectFetchResult {
  siteId: string;
  siteName: string;
  host: string;
  siteRecordId: string;
  success: boolean;
  endpoint?: string;
  groupRatio: Record<string, number>;
  models: RawModelItem[];
  groupModelsMap: Record<string, string[]>;
}

// ============ 工具函数 ============

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function runLark(args: string[], timeoutMs = 30000) {
  const cmd = ["lark-cli", ...args, "--as", LARK_AS, "--base-token", KB_TOKEN, "--format", "json"];
  const out = execFileSync(cmd[0], cmd.slice(1), {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: timeoutMs,
  });
  return JSON.parse(out);
}

// ============ 核心直连抓取函数 ============

async function fetchSitePricing(site: SiteRecord): Promise<DirectFetchResult> {
  const rawDomain = site["域名"] || "";
  const host = String(rawDomain).replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim().toLowerCase();
  const siteId = (site["站点ID"] as string) || site.__id;
  const siteName = (site["名称"] as string) || siteId;

  const fallbackResult: DirectFetchResult = {
    siteId,
    siteName,
    host,
    siteRecordId: site.__id,
    success: false,
    groupRatio: {},
    models: [],
    groupModelsMap: {},
  };

  if (!host) return fallbackResult;

  for (const ep of ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(`https://${host}${ep}`, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "application/json",
        },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);

      if (!res || !res.ok) continue;

      const json = await res.json().catch(() => null);
      if (!json) continue;

      // 提取 group_ratio
      const rawGroupRatio = json?.group_ratio || json?.data?.group_ratio || {};
      const groupRatio: Record<string, number> = {};
      if (typeof rawGroupRatio === "object" && rawGroupRatio !== null) {
        for (const [gName, gVal] of Object.entries(rawGroupRatio)) {
          const valNum = Number(gVal);
          if (!isNaN(valNum)) {
            groupRatio[gName.trim()] = valNum;
          }
        }
      }

      // 提取 models 列表
      const rawModels = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.data?.data)
        ? json.data.data
        : Array.isArray(json?.models)
        ? json.models
        : [];

      const models: RawModelItem[] = [];
      const groupModelsMap: Record<string, Set<string>> = {};

      // 初始化 groupModelsMap 键
      Object.keys(groupRatio).forEach((g) => {
        groupModelsMap[g] = new Set<string>();
      });

      for (const item of rawModels) {
        if (typeof item !== "object" || item === null) continue;
        const mName = String(item.model_name || item.model || "").trim();
        if (!mName) continue;

        models.push({
          model_name: mName,
          model_ratio: Number(item.model_ratio ?? item.ratio ?? 1),
          completion_ratio: Number(item.completion_ratio ?? 1),
          cache_ratio: item.cache_ratio != null ? Number(item.cache_ratio) : undefined,
          create_cache_ratio: item.create_cache_ratio != null ? Number(item.create_cache_ratio) : undefined,
          model_price: Number(item.model_price ?? 0),
          enable_groups: item.enable_groups,
          type: item.type,
        });

        // 收集每个分组包含的模型
        let gList: string[] = [];
        if (Array.isArray(item.enable_groups)) {
          gList = item.enable_groups.map((g: unknown) => String(g).trim());
        } else if (typeof item.enable_groups === "string" && item.enable_groups) {
          gList = item.enable_groups.split(",").map((g) => g.trim());
        } else {
          // 未指定 enable_groups 则默认适用于所有已知分组
          gList = Object.keys(groupRatio);
        }

        gList.forEach((g) => {
          if (!groupModelsMap[g]) groupModelsMap[g] = new Set<string>();
          groupModelsMap[g].add(mName);
        });
      }

      const finalGroupModelsMap: Record<string, string[]> = {};
      for (const [g, set] of Object.entries(groupModelsMap)) {
        finalGroupModelsMap[g] = Array.from(set).sort();
      }

      if (Object.keys(groupRatio).length > 0 || models.length > 0) {
        return {
          siteId,
          siteName,
          host,
          siteRecordId: site.__id,
          success: true,
          endpoint: ep,
          groupRatio,
          models,
          groupModelsMap: finalGroupModelsMap,
        };
      }
    } catch {
      // ignore & try next endpoint
    }
  }

  return fallbackResult;
}

// ============ Main 流程 ============

async function main() {
  const startTime = Date.now();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(LOG_DIR, { recursive: true });

  log("🚀 开始并发直连抓取全量中转站原生 /api/pricing 数据...");

  const trackerFile = path.join(DATA_DIR, "relay_sites_tracker.json");
  if (!fs.existsSync(trackerFile)) {
    throw new Error(`找不到 ${trackerFile}，请先运行 npm run fetch 导出中转站主表`);
  }

  const sites: SiteRecord[] = JSON.parse(fs.readFileSync(trackerFile, "utf-8"));
  log(`📋 已加载 ${sites.length} 个中转站档案`);

  const results: DirectFetchResult[] = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.min(CONCURRENCY, sites.length) }, async () => {
    while (cursor < sites.length) {
      const idx = cursor++;
      const res = await fetchSitePricing(sites[idx]);
      results.push(res);
    }
  });

  await Promise.all(workers);

  const successResults = results.filter((r) => r.success);
  log(
    `✓ 直连完成: 成功抓取 ${successResults.length} / ${sites.length} 站 (${((successResults.length / sites.length) * 100).toFixed(1)}%)`
  );

  // 1. 构建全新/更新的 relay_site_groups 记录
  const existingGroupsFile = path.join(DATA_DIR, "relay_site_groups.json");
  let existingGroups: any[] = fs.existsSync(existingGroupsFile)
    ? JSON.parse(fs.readFileSync(existingGroupsFile, "utf-8"))
    : [];

  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

  // 用 Map 按 (site_id + group_name) 索引已有组
  const groupKeyMap = new Map<string, any>();
  existingGroups.forEach((g) => {
    const key = `${g.site_id || g.site_name}::${g.group_name}`.toLowerCase();
    groupKeyMap.set(key, g);
  });

  let newGroupsCount = 0;
  let updatedGroupsCount = 0;

  const updatedGroupsList: any[] = [...existingGroups];

  for (const res of successResults) {
    for (const [gName, gRate] of Object.entries(res.groupRatio)) {
      const key = `${res.siteId}::${gName}`.toLowerCase();
      const modelsList = res.groupModelsMap[gName] || [];

      const record = {
        site_id: res.siteId,
        site_name: res.siteName,
        group_name: gName,
        rate_min: gRate,
        rate_max: gRate,
        rate_values: `${gRate}x`,
        rate_source: "direct_pricing",
        related_model_count: modelsList.length,
        related_models_json: JSON.stringify(modelsList),
        updated_at: nowStr,
        site: [{ id: res.siteRecordId }],
      };

      const existing = groupKeyMap.get(key);
      if (existing) {
        Object.assign(existing, record);
        updatedGroupsCount++;
      } else {
        const newRecord = { __id: `direct_grp_${res.siteId}_${gName}`, ...record };
        updatedGroupsList.push(newRecord);
        groupKeyMap.set(key, newRecord);
        newGroupsCount++;
      }
    }
  }

  fs.writeFileSync(existingGroupsFile, JSON.stringify(updatedGroupsList, null, 2));
  log(`💾 已更新本地 data/relay_site_groups.json (共 ${updatedGroupsList.length} 条分组记录, 直连新增 ${newGroupsCount}, 更新 ${updatedGroupsCount})`);

  // 2. 构建全新/更新的 model_rates 记录
  const existingRatesFile = path.join(DATA_DIR, "model_rates.json");
  let existingRates: any[] = fs.existsSync(existingRatesFile)
    ? JSON.parse(fs.readFileSync(existingRatesFile, "utf-8"))
    : [];

  const rateKeyMap = new Map<string, any>();
  existingRates.forEach((r) => {
    const key = `${r.site_id || r.site_name}::${r.model_name}`.toLowerCase();
    rateKeyMap.set(key, r);
  });

  let newRatesCount = 0;
  let updatedRatesCount = 0;
  const updatedRatesList: any[] = [...existingRates];
  const nowMs = Date.now();

  for (const res of successResults) {
    for (const m of res.models) {
      if (!m.model_name) continue;
      const key = `${res.siteId}::${m.model_name}`.toLowerCase();

      const isImage = ["dall-e", "midjourney", "gpt-image", "flux", "suno", "luma", "ideogram", "runway"].some(
        (sub) => m.model_name!.toLowerCase().includes(sub)
      );
      const modelType = isImage ? "image" : "text";

      const enableGroupsStr = Array.isArray(m.enable_groups)
        ? m.enable_groups.join(", ")
        : typeof m.enable_groups === "string"
        ? m.enable_groups
        : Object.keys(res.groupRatio).join(", ");

      const record = {
        site_id: res.siteId,
        site_name: res.siteName,
        source_domain: res.host,
        model_name: m.model_name,
        model_type: modelType,
        rate_input: m.model_ratio,
        rate_output: m.model_ratio * (m.completion_ratio ?? 1),
        rate_cache: m.cache_ratio ?? null,
        rate_create_cache: m.create_cache_ratio ?? null,
        model_price: (m.model_price ?? 0) > 0 ? m.model_price : null,
        enable_groups: enableGroupsStr,
        fetched_at: nowMs,
        site: [{ id: res.siteRecordId }],
      };

      const existing = rateKeyMap.get(key);
      if (existing) {
        Object.assign(existing, record);
        updatedRatesCount++;
      } else {
        const newRecord = { __id: `direct_rate_${res.siteId}_${m.model_name.replace(/[^a-zA-Z0-9]/g, "_")}`, ...record };
        updatedRatesList.push(newRecord);
        rateKeyMap.set(key, newRecord);
        newRatesCount++;
      }
    }
  }

  fs.writeFileSync(existingRatesFile, JSON.stringify(updatedRatesList, null, 2));
  log(`💾 已更新本地 data/model_rates.json (共 ${updatedRatesList.length} 条模型记录, 直连新增 ${newRatesCount}, 更新 ${updatedRatesCount})`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\n🎉 第一方直连采集流程全部完成！总耗时: ${elapsed} 秒。`);
}

main().catch((err) => {
  console.error("FATAL ERROR in fetch-direct-site-data:", err);
  process.exit(1);
});
