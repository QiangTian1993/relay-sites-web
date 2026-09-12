import fs from "node:fs";
import { execFileSync } from "node:child_process";

const envLocal = fs.readFileSync(".env.local", "utf-8");
const match = envLocal.match(/FEISHU_BASE_TOKEN=(.+)/);
if (!match) throw new Error("Could not find FEISHU_BASE_TOKEN in .env.local");
const KB_TOKEN = match[1].trim();

const MODEL_RATES_TABLE = "tbl5EDYdDtH8SlXM";
const LARK_AS = process.env.LARK_AS ?? "bot";
const BATCH_SIZE = 200;

function runLark(args: string[]) {
  const cmd = ["lark-cli", ...args, "--as", LARK_AS, "--base-token", KB_TOKEN, "--format", "json"];
  const out = execFileSync(cmd[0], cmd.slice(1), {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });
  return JSON.parse(out);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== 1. 拉取 relay.qizhang.org 最新分组与模型关联数据 ===");
  const qzRes = await fetch("https://relay.qizhang.org/api/sites");
  if (!qzRes.ok) throw new Error(`HTTP ${qzRes.status} from qizhang`);
  const qzJson = (await qzRes.json()) as { sites: any[] };

  // 映射 key -> Map(model_name -> Set(group_names))
  const qzSiteModelGroupsMap = new Map<string, Map<string, Set<string>>>();

  for (const site of qzJson.sites) {
    const modelMap = new Map<string, Set<string>>();
    for (const g of (site.groupRows || [])) {
      const groupName = String(g.name).trim();
      for (const item of (g.related_models || [])) {
        const modelName = String(item).split(" × ")[0].trim();
        if (!modelMap.has(modelName)) modelMap.set(modelName, new Set());
        modelMap.get(modelName)!.add(groupName);
      }
    }
    qzSiteModelGroupsMap.set(site.id, modelMap);
    if (site.host) {
      const host = site.host.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
      qzSiteModelGroupsMap.set(host, modelMap);
    }
    if (site.name) qzSiteModelGroupsMap.set(site.name, modelMap);
  }

  console.log("=== 2. 读取本地站点索引与飞书 model_rates 全量记录 ===");
  const tracker = JSON.parse(fs.readFileSync("data/relay_sites_tracker.json", "utf-8"));
  const recIdToSite = new Map<string, any>();
  tracker.forEach((s: any) => {
    recIdToSite.set(s.__id, s);
    if (s["站点ID"]) recIdToSite.set(s["站点ID"], s);
  });

  let offset = 0;
  const records: { id: string; fields: Record<string, any> }[] = [];
  while (true) {
    const res = runLark([
      "base", "+record-list",
      "--table-id", MODEL_RATES_TABLE,
      "--limit", String(BATCH_SIZE),
      "--offset", String(offset),
    ]);
    const ids: string[] = res.data?.record_id_list ?? [];
    const fields: string[] = res.data?.fields ?? [];
    const rows: any[][] = res.data?.data ?? [];
    rows.forEach((row, i) => {
      records.push({
        id: ids[i],
        fields: Object.fromEntries(fields.map((f, idx) => [f, row[idx]])),
      });
    });
    if (!res.data?.has_more || rows.length === 0) break;
    offset += rows.length;
  }
  console.log(`✓ 已从飞书拉取 ${records.length} 条 model_rates 记录`);

  console.log("=== 3. 扫描差异并极速批量更新 (record-batch-update) ===");
  const updatesMap: Record<string, { enable_groups: string }> = {};
  let updateCount = 0;

  for (const r of records) {
    const rawSiteId = String(r.fields.site_id ?? "");
    const modelName = String(r.fields.model_name ?? "").trim();
    if (!modelName) continue;

    const siteObj = recIdToSite.get(rawSiteId);
    const siteName = siteObj ? (siteObj["名称"] || siteObj["站点ID"]) : r.fields.site_name;
    const siteSlug = siteObj ? siteObj["站点ID"] : null;
    const host = siteObj ? String(siteObj["域名"] ?? "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase() : null;

    const modelMap = (siteSlug && qzSiteModelGroupsMap.get(siteSlug)) || (host && qzSiteModelGroupsMap.get(host)) || (siteName && qzSiteModelGroupsMap.get(siteName));

    if (modelMap && modelMap.has(modelName)) {
      const expectedGroups = Array.from(modelMap.get(modelName)!).sort().join(", ");
      const currentGroups = String(r.fields.enable_groups || "").split(",").map(s => s.trim()).filter(Boolean).sort().join(", ");

      if (expectedGroups !== currentGroups) {
        updatesMap[r.id] = { enable_groups: expectedGroups };
        updateCount++;
      }
    }
  }

  console.log(`需要批量更新 enable_groups 的记录共 ${updateCount} 条`);

  const recordEntries = Object.entries(updatesMap);
  for (let i = 0; i < recordEntries.length; i += BATCH_SIZE) {
    const batchEntries = recordEntries.slice(i, i + BATCH_SIZE);
    const update_records: Record<string, { enable_groups: string }> = {};
    batchEntries.forEach(([id, fields]) => {
      update_records[id] = fields;
    });

    const res = runLark([
      "base", "+record-batch-update",
      "--table-id", MODEL_RATES_TABLE,
      "--json", JSON.stringify({ update_records }),
    ]);

    if (!res.ok) {
      console.error(`  ✗ 批次 ${i / BATCH_SIZE + 1} 失败:`, res);
    } else {
      console.log(`  ✓ 已更新批次 ${i / BATCH_SIZE + 1}: ${Math.min(i + BATCH_SIZE, recordEntries.length)}/${recordEntries.length} 条`);
    }
    await sleep(600);
  }

  console.log("\n✓ 全量站点的模型分组关联已全部批量更新至飞书！");
}

main().catch(console.error);
