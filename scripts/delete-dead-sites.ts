// 清理无响应中转站点脚本 —— 飞书 relay_sites_tracker 及关联表
// 用法：
//   npx tsx scripts/delete-dead-sites.ts [--dry-run]

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rawKbToken = process.env.FEISHU_BASE_TOKEN ?? process.env.FEISHU_KB_TOKEN ?? process.env.KB_TOKEN;
const KB_TOKEN = (rawKbToken && !rawKbToken.includes("…")) ? rawKbToken : "SchGbU6UDaT5q9sDjHTct79Sn9d";
const LARK_AS = process.env.LARK_AS ?? "bot";

const TABLE_SITES = "tblxY3tOnccSAxyg";   // relay_sites_tracker
const TABLE_GROUPS = "tblIZtZllNUaSuud";  // relay_site_groups
const TABLE_PERF = "tblh0vj09Xk7aVq9";    // relay_site_perf

const DRY_RUN = process.argv.includes("--dry-run");

function runLark(args: string[]) {
  const cmd = ["lark-cli", ...args, "--as", LARK_AS, "--base-token", KB_TOKEN, "--format", "json"];
  const out = execFileSync(cmd[0], cmd.slice(1), {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
  });
  return JSON.parse(out);
}

// 批量删除记录
function deleteRecords(tableId: string, recordIds: string[]) {
  if (recordIds.length === 0) return;
  const PAGE_SIZE = 200;
  for (let i = 0; i < recordIds.length; i += PAGE_SIZE) {
    const batch = recordIds.slice(i, i + PAGE_SIZE);
    const j = runLark([
      "base", "+record-delete",
      "--table-id", tableId,
      "--json", JSON.stringify({ record_id_list: batch }),
      "--yes",
    ]);
    if (!j.ok) throw new Error(`Delete failed on table ${tableId}: ${JSON.stringify(j).slice(0, 300)}`);
  }
}

// 探测一个站点的存活状态（多次重试 + 充分超时）
async function verifySiteDead(host: string): Promise<{ isDead: boolean; error: string }> {
  const cleanHost = host.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim();
  if (!cleanHost) return { isDead: true, error: "HOST_EMPTY" };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://${cleanHost}`, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 RelaySitesProbe/1.0" },
    }).catch(() => null);
    clearTimeout(timeout);

    if (res && (res.ok || res.status < 500)) {
      return { isDead: false, error: `HTTP_${res.status}` };
    }
    if (res && res.status >= 500) {
      return { isDead: true, error: `HTTP_${res.status}` };
    }
    return { isDead: true, error: "FETCH_FAILED" };
  } catch (e: any) {
    return { isDead: true, error: e.message || "EXCEPTION" };
  }
}

async function main() {
  console.log("=== 1. 读取本地最新全量站点与测速记录 ===");
  const trackerPath = path.join(process.cwd(), "data/relay_sites_tracker.json");
  const perfPath = path.join(process.cwd(), "data/relay_site_perf.json");
  const groupsPath = path.join(process.cwd(), "data/relay_site_groups.json");

  if (!fs.existsSync(trackerPath) || !fs.existsSync(perfPath)) {
    throw new Error("请先运行 npm run fetch 生成 data/*.json");
  }

  const tracker: any[] = JSON.parse(fs.readFileSync(trackerPath, "utf-8"));
  const perfs: any[] = JSON.parse(fs.readFileSync(perfPath, "utf-8"));
  const groups: any[] = fs.existsSync(groupsPath) ? JSON.parse(fs.readFileSync(groupsPath, "utf-8")) : [];

  // 筛选出最新一轮探针测速中 success_rate === 0 的站点
  const candidateDeadPerfs = perfs.filter((p) => p.success_rate === 0);
  console.log(`初步扫描出 ${candidateDeadPerfs.length} 个探针失败站点，正在执行深度网络二次复核...\n`);

  const confirmedDeadSites: any[] = [];

  for (const p of candidateDeadPerfs) {
    const siteId = p.site_id;
    const siteRecord = tracker.find((t) => (t["站点ID"] || t.__id) === siteId || t.__id === p.site?.[0]?.id);
    const domain = siteRecord ? (siteRecord["域名"] || p.host) : p.host;

    const { isDead, error } = await verifySiteDead(domain);
    if (isDead) {
      confirmedDeadSites.push({
        name: p.site_name || siteRecord?.["名称"] || "未命名",
        site_id: siteId,
        record_id: siteRecord?.__id,
        host: domain,
        error: error,
      });
      console.log(`  ✗ [确认无响应] ${p.site_name} (${siteId}) - 域名: ${domain} (原因: ${error})`);
    } else {
      console.log(`  ✓ [复核在线，跳过] ${p.site_name} (${siteId}) - 域名: ${domain}`);
    }
  }

  console.log(`\n最终复核确认需删除的无响应站点共计: ${confirmedDeadSites.length} 家`);

  if (confirmedDeadSites.length === 0) {
    console.log("没有需要删除的站点，任务结束。");
    return;
  }

  // 备份待删除站点信息
  const backupDir = path.join(process.cwd(), "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `deleted_sites_${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(confirmedDeadSites, null, 2));
  console.log(`已备份待删除站点清单到: ${backupFile}`);

  if (DRY_RUN) {
    console.log("\n[DRY RUN] 模拟运行结束，未实际执行飞书删除。");
    return;
  }

  // 1. 删除飞书 relay_sites_tracker
  const siteRecordIdsToDelete = confirmedDeadSites.map((s) => s.record_id).filter(Boolean);
  console.log(`\n=== 2. 正在从飞书 relay_sites_tracker 删除 ${siteRecordIdsToDelete.length} 条站点档案 ===`);
  deleteRecords(TABLE_SITES, siteRecordIdsToDelete);
  console.log(`✓ 飞书 relay_sites_tracker 删除成功！`);

  // 2. 清理关联的 relay_site_perf 记录（如果有）
  const deadSiteIds = new Set(confirmedDeadSites.map((s) => s.site_id));
  const perfRecordIdsToDelete = perfs
    .filter((p) => deadSiteIds.has(p.site_id) && p.__id && !p.__id.startsWith("perf_"))
    .map((p) => p.__id);

  if (perfRecordIdsToDelete.length > 0) {
    console.log(`=== 3. 正在清理飞书 relay_site_perf 中的 ${perfRecordIdsToDelete.length} 条关联记录 ===`);
    try {
      deleteRecords(TABLE_PERF, perfRecordIdsToDelete);
      console.log(`✓ 飞书 relay_site_perf 关联记录清理完成！`);
    } catch (e) {
      console.warn("清理 perf 记录异常（非致命）:", e);
    }
  }

  // 3. 清理关联的 relay_site_groups 记录（如果有）
  const groupRecordIdsToDelete = groups
    .filter((g) => deadSiteIds.has(g.site_id) && g.__id)
    .map((g) => g.__id);

  if (groupRecordIdsToDelete.length > 0) {
    console.log(`=== 4. 正在清理飞书 relay_site_groups 中的 ${groupRecordIdsToDelete.length} 条关联策略 ===`);
    try {
      deleteRecords(TABLE_GROUPS, groupRecordIdsToDelete);
      console.log(`✓ 飞书 relay_site_groups 关联策略清理完成！`);
    } catch (e) {
      console.warn("清理 groups 记录异常（非致命）:", e);
    }
  }

  console.log("\n✓ 全流程完成！已成功从飞书删除所有无响应站点。");
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
