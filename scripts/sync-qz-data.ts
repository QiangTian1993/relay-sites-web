// 同步脚本：qizhang.org → 飞书 KB relay_site_groups + relay_site_perf
// 用 tsx 跑：npx tsx scripts/sync-qz-data.ts
// 频率：cron 5 分钟（与 fetch-data.ts 一致）
// 身份：bot（绕开 user 91403）
// QPS 限流：sleep 0.6s/req

import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { TABLES } from "../lib/tables";
import type {
  QzSitesResponse,
  QzSite,
  QzPerfSummaryResponse,
  RelaySiteGroupRecord,
} from "../lib/qz-types";

const QZ_BASE = "https://relay.qizhang.org";
const rawKbToken = process.env.FEISHU_BASE_TOKEN ?? process.env.FEISHU_KB_TOKEN ?? process.env.KB_TOKEN;
const KB_TOKEN = (rawKbToken && !rawKbToken.includes("…")) ? rawKbToken : "SchGbU6UDaT5q9sDjHTct79Sn9d";
// bot 需开通 base:record:*；当前默认走 user（可用 LARK_AS=bot 覆盖）
const LARK_AS = process.env.LARK_AS ?? "user";
const LOG_DIR = "/tmp";
const PAGE_SIZE = 200;
const DRY_RUN = process.env.SYNC_DRY_RUN === "1";
const DEBUG_DIFF = process.env.SYNC_DEBUG_DIFF === "1";

// ============ 工具函数 ============

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

// lark-cli upsert 单条
function runLark(args: string[], timeoutMs = 30000) {
  const resolved = args.map((arg, i) => (args[i - 1] === "--as" ? LARK_AS : arg));
  const out = execFileSync("lark-cli", resolved, {
    encoding: "utf-8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: timeoutMs,
  });
  return JSON.parse(out);
}

function is429Error(e: unknown): boolean {
  const msg = String(e);
  return msg.includes("429") || msg.includes("QPS") || msg.includes("rate limit") || msg.includes("over frequency");
}

async function larkUpsert(tableId: string, recordId: string | undefined, fields: Record<string, unknown>) {
  const args = [
    "base", "+record-upsert",
    "--as", "bot",
    "--base-token", KB_TOKEN,
    "--table-id", tableId,
    "--json", JSON.stringify(fields),
  ];
  if (recordId) args.push("--record-id", recordId);
  const maxRetries = 5;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const j = runLark(args);
      if (!j.ok) throw new Error(`lark upsert failed: ${JSON.stringify(j).slice(0, 200)}`);
      const ignoredFields = j.data?.ignored_fields ?? j.ignored_fields ?? [];
      if (ignoredFields.length > 0) {
        throw new Error(`lark ignored fields: ${JSON.stringify(ignoredFields)}`);
      }
      return j;
    } catch (e) {
      if (is429Error(e) && attempt < maxRetries) {
        const backoff = Math.min(30000, 2000 * Math.pow(2, attempt - 1));
        log(`  ⏸ 429 rate limit, backoff ${backoff / 1000}s (attempt ${attempt}/${maxRetries})`);
        await sleep(backoff);
        continue;
      }
      throw e;
    }
  }
  throw new Error("unreachable");
}

function larkBatchCreate(tableId: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const fields = Object.keys(rows[0]);
  const j = runLark([
    "base", "+record-batch-create",
    "--as", "bot",
    "--base-token", KB_TOKEN,
    "--table-id", tableId,
    "--json", JSON.stringify({
      fields,
      rows: rows.map((row) => fields.map((field) => row[field] ?? null)),
    }),
  ]);
  if (!j.ok) throw new Error(`lark batch create failed: ${JSON.stringify(j).slice(0, 300)}`);
  const ignoredFields = j.data?.ignored_fields ?? j.ignored_fields ?? [];
  if (ignoredFields.length > 0) {
    throw new Error(`lark ignored fields: ${JSON.stringify(ignoredFields)}`);
  }
}

function larkDeleteRecords(tableId: string, recordIds: string[]) {
  if (recordIds.length === 0) return;
  const j = runLark([
    "base", "+record-delete",
    "--as", "bot",
    "--base-token", KB_TOKEN,
    "--table-id", tableId,
    "--json", JSON.stringify({ record_id_list: recordIds }),
    "--yes",
  ]);
  if (!j.ok) throw new Error(`lark delete failed: ${JSON.stringify(j).slice(0, 300)}`);
}

function normalizeValue(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) return null;
  if (!Array.isArray(value)) return value;
  const normalized = value.map((item) => {
    if (item && typeof item === "object" && "id" in item) {
      return String((item as { id: unknown }).id);
    }
    return item;
  });
  if (normalized.length === 1 && typeof normalized[0] === "string") return normalized[0];
  return normalized;
}

function valuesEqual(current: unknown, desired: unknown): boolean {
  const normalizedCurrent = normalizeValue(current);
  const normalizedDesired = normalizeValue(desired);
  if (typeof normalizedCurrent === "number" && typeof normalizedDesired === "number") {
    return Math.abs(normalizedCurrent - normalizedDesired) <= 1e-12;
  }
  return JSON.stringify(normalizedCurrent) === JSON.stringify(normalizedDesired);
}

function fieldValuesEqual(field: string, current: unknown, desired: unknown): boolean {
  if (field === "related_models_json" && typeof current === "string" && typeof desired === "string") {
    try {
      const currentModels = JSON.parse(current);
      const desiredModels = JSON.parse(desired);
      if (Array.isArray(currentModels) && Array.isArray(desiredModels)) {
        return valuesEqual([...currentModels].sort(), [...desiredModels].sort());
      }
    } catch {
      // Fall through to the strict comparison for malformed legacy values.
    }
  }
  return valuesEqual(current, desired);
}

function fieldsEqual(
  current: Record<string, unknown>,
  desired: Record<string, unknown>,
  fields: string[]
) {
  return fields.every((field) => fieldValuesEqual(field, current[field], desired[field]));
}

function changedFields(
  current: Record<string, unknown>,
  desired: Record<string, unknown>,
  fields: string[]
) {
  return fields.filter((field) => !fieldValuesEqual(field, current[field], desired[field]));
}

function formatFeishuDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

async function createInBatches(tableId: string, rows: Record<string, unknown>[]) {
  for (let offset = 0; offset < rows.length; offset += PAGE_SIZE) {
    const batch = rows.slice(offset, offset + PAGE_SIZE);
    larkBatchCreate(tableId, batch);
    log(`  + batch create ${Math.min(offset + batch.length, rows.length)}/${rows.length}`);
    await sleep(600);
  }
}

// lark record-list（用于查已存在的 record_id）
function larkListAll(tableId: string): {
  records: { id: string; fields: Record<string, unknown> }[];
  fieldNames: Set<string>;
} {
  const records: { id: string; fields: Record<string, unknown> }[] = [];
  const fieldNames = new Set<string>();
  let offset = 0;

  while (true) {
    const j = runLark([
      "base", "+record-list",
      "--as", "bot",
      "--base-token", KB_TOKEN,
      "--table-id", tableId,
      "--limit", String(PAGE_SIZE),
      "--offset", String(offset),
      "--format", "json",
    ]);
    if (!j.ok) throw new Error(`lark list failed: ${JSON.stringify(j).slice(0, 200)}`);

    const ids: string[] = j.data?.record_id_list ?? [];
    const fields: string[] = j.data?.fields ?? [];
    const data: unknown[][] = j.data?.data ?? [];
    fields.forEach((field) => fieldNames.add(field));
    records.push(...data.map((row, i) => ({
      id: ids[i],
      fields: Object.fromEntries(fields.map((field, fieldIndex) => [field, row[fieldIndex]])),
    })));

    if (!j.data?.has_more || data.length === 0) break;
    offset += data.length;
  }

  return { records, fieldNames };
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

interface SiteIndex {
  recordIdBySiteId: Map<string, string>;
  recordIdByHost: Map<string, string>;
}

function loadSiteIndex(): SiteIndex {
  const table = TABLES.find((item) => item.id === "relay_sites_tracker");
  if (!table) throw new Error("relay_sites_tracker table config missing");

  const { records } = larkListAll(table.tableId);
  const recordIdBySiteId = new Map<string, string>();
  const recordIdByHost = new Map<string, string>();
  for (const record of records) {
    const siteId = asText(record.fields["站点ID"]);
    const host = asText(record.fields["域名"]);
    if (siteId) recordIdBySiteId.set(siteId, record.id);
    if (host) recordIdByHost.set(host, record.id);
  }
  log(`站点索引: site_id=${recordIdBySiteId.size}, host=${recordIdByHost.size}`);
  return { recordIdBySiteId, recordIdByHost };
}

// ============ 抓 qz 数据 ============

async function fetchQzSites(): Promise<QzSite[]> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      log(`GET ${QZ_BASE}/api/sites (attempt ${attempt})`);
      const r = await fetch(`${QZ_BASE}/api/sites`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as QzSitesResponse;
      log(`  → ${j.sites.length} 站`);
      return j.sites;
    } catch (e) {
      log(`  ✗ attempt ${attempt}: ${e}`);
      if (attempt === 3) throw e;
      await sleep(2000 * attempt);
    }
  }
  throw new Error("unreachable");
}

async function fetchQzPerf(): Promise<QzPerfSummaryResponse> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      log(`GET ${QZ_BASE}/api/performance-summary (attempt ${attempt})`);
      const r = await fetch(`${QZ_BASE}/api/performance-summary`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as QzPerfSummaryResponse;
      log(`  → ${Object.keys(j.sites).length} 站 perf`);
      return j;
    } catch (e) {
      log(`  ✗ attempt ${attempt}: ${e}`);
      if (attempt === 3) throw e;
      await sleep(2000 * attempt);
    }
  }
  throw new Error("unreachable");
}

// ============ 映射 ============

function siteGroupToRecord(site: QzSite, g: QzSite["groupRows"][number], now: string): Omit<RelaySiteGroupRecord, "__id"> {
  return {
    site_id: site.id,
    site_name: site.name,
    group_name: g.name,
    rate_min: g.rate_multiplier_min,
    rate_max: g.rate_multiplier_max,
    rate_values: (g.rate_multiplier_values ?? []).join(","),
    rate_source: g.rate_source ?? "",
    related_model_count: g.related_model_count,
    related_models_json: JSON.stringify(g.related_models ?? []),
    remark: g.remark ?? "",
    change_direction: (g.change?.rate?.direction ?? "") as RelaySiteGroupRecord["change_direction"],
    change_delta: g.change?.rate?.delta ?? 0,
    updated_at: now,
  };
}

// ============ Upsert 流 ============

async function upsertGroups(sites: QzSite[], siteIndex: SiteIndex) {
  const table = TABLES.find((t) => t.id === "relay_site_groups");
  if (!table || table.tableId.startsWith("TBD")) {
    log(`⏭ relay_site_groups: 跳过（tableId=${table?.tableId} 为 TBD，需强哥建表后填入）`);
    return { ok: 0, skip: 0 };
  }

  // 拉已有 records 做幂等 upsert（用 site_name + group_name 当业务键）
  log(`拉 relay_site_groups 已有 records...`);
  let existing: { id: string; fields: Record<string, unknown> }[] = [];
  let fieldNames = new Set<string>();
  try {
    const result = larkListAll(table.tableId);
    existing = result.records;
    fieldNames = result.fieldNames;
    log(`  → ${existing.length} 条已有`);
  } catch (e) {
    log(`  ✗ 拉取失败（表可能为空）: ${e}`);
  }
  const hasSiteId = fieldNames.has("site_id");
  const duplicateSiteNames = new Set(
    [...sites.reduce((counts, site) => counts.set(site.name, (counts.get(site.name) ?? 0) + 1), new Map<string, number>())]
      .filter(([, count]) => count > 1)
      .map(([name]) => name)
  );
  if (!hasSiteId && duplicateSiteNames.size > 0) {
    log(`  ⚠ 表缺少 site_id，将跳过同名站点：${[...duplicateSiteNames].join(", ")}`);
  }
  const keyToId = new Map<string, string>();
  const duplicateExistingKeys = new Set<string>();
  for (const r of existing) {
    const siteKey = hasSiteId ? asText(r.fields.site_id) : asText(r.fields.site_name);
    const groupName = asText(r.fields.group_name);
    if (siteKey && groupName) {
      const key = `${siteKey}|${groupName}`;
      if (keyToId.has(key)) duplicateExistingKeys.add(key);
      else keyToId.set(key, r.id);
    }
  }
  if (duplicateExistingKeys.size > 0) {
    log(`  ⚠ 已有 ${duplicateExistingKeys.size} 个重复业务键，请先清理重复记录`);
  }

  const now = formatFeishuDate(new Date());
  let ok = 0, skip = 0, unchanged = 0;
  let sourceDuplicates = 0;
  const creates: Record<string, unknown>[] = [];
  const seenSourceKeys = new Set<string>();
  const compareFields = [
    "site_id", "site_name", "group_name", "rate_min", "rate_max", "rate_values",
    "rate_source", "related_model_count", "related_models_json", "remark",
    "change_direction", "change_delta", "site",
  ];
  const totalSites = sites.length;
  let siteIdx = 0;
  const VERBOSE = process.env.SYNC_VERBOSE === "1";
  for (const site of sites) {
    siteIdx++;
    if (siteIdx % 5 === 0 || siteIdx === totalSites || VERBOSE) {
      log(`  ⏳ 进度 ${siteIdx}/${totalSites} (${site.name}, ${site.groupRows.length} groups) ok=${ok} unchanged=${unchanged} skip=${skip} creates=${creates.length}`);
    }
    if (!hasSiteId && duplicateSiteNames.has(site.name)) {
      skip += site.groupRows.length;
      continue;
    }
    for (const g of site.groupRows) {
      const key = `${hasSiteId ? site.id : site.name}|${g.name}`;
      if (seenSourceKeys.has(key)) {
        sourceDuplicates++;
        continue;
      }
      seenSourceKeys.add(key);
      const fields = siteGroupToRecord(site, g, now);
      if (!hasSiteId) delete (fields as Partial<typeof fields>).site_id;
      const siteRecordId = siteIndex.recordIdBySiteId.get(site.id) ?? siteIndex.recordIdByHost.get(site.host);
      if (siteRecordId && fieldNames.has("site")) {
        (fields as unknown as Record<string, unknown>).site = [{ id: siteRecordId }];
      }
      const existingId = keyToId.get(key);
      const desiredFields = fields as unknown as Record<string, unknown>;
      if (!existingId) {
        creates.push(desiredFields);
        continue;
      }
      const current = existing.find((record) => record.id === existingId)?.fields;
      if (current && fieldsEqual(current, desiredFields, compareFields)) {
        unchanged++;
        continue;
      }
      if (current && DEBUG_DIFF) {
        log(`  Δ ${site.name} / ${g.name}: ${changedFields(current, desiredFields, compareFields).join(", ")}`);
      }
      if (DRY_RUN) {
        ok++;
        continue;
      }
      try {
        await larkUpsert(table.tableId, existingId, desiredFields);
        ok++;
      } catch (e) {
        log(`  ✗ ${site.name} / ${g.name}: ${e}`);
        skip++;
      }
      await sleep(800); // QPS 限流（提防 1.0.79 SDK 偶发 429）
    }
  }
  if (DRY_RUN && creates.length > 0) log(`  + would create ${creates.length}`);
  if (!DRY_RUN) await createInBatches(table.tableId, creates);
  ok += creates.length;

  const sourceSiteIdsWithGroups = new Set(
    sites
      .filter((site) => site.groupRows.length > 0)
      .map((site) => hasSiteId ? site.id : site.name)
  );
  const staleRecords = existing.filter((record) => {
    const siteKey = hasSiteId ? asText(record.fields.site_id) : asText(record.fields.site_name);
    const groupName = asText(record.fields.group_name);
    return sourceSiteIdsWithGroups.has(siteKey) && groupName && !seenSourceKeys.has(`${siteKey}|${groupName}`);
  });
  const staleLimit = Math.max(20, Math.ceil(existing.length * 0.05));
  if (staleRecords.length > staleLimit) {
    log(`  ⚠ 跳过清理 ${staleRecords.length} 条过期记录：超过安全阈值 ${staleLimit}`);
  } else if (staleRecords.length > 0 && skip > 0) {
    log(`  ⚠ 跳过清理 ${staleRecords.length} 条过期记录：本轮有 ${skip} 条写入失败`);
  } else if (staleRecords.length > 0 && DRY_RUN) {
    log(`  - would delete stale ${staleRecords.length}`);
  } else {
    for (let offset = 0; offset < staleRecords.length; offset += PAGE_SIZE) {
      const batch = staleRecords.slice(offset, offset + PAGE_SIZE);
      larkDeleteRecords(table.tableId, batch.map((record) => record.id));
      log(`  - deleted stale ${Math.min(offset + batch.length, staleRecords.length)}/${staleRecords.length}`);
      await sleep(600);
    }
  }
  if (sourceDuplicates > 0) log(`  ↳ 忽略实时源重复业务键 ${sourceDuplicates} 条`);
  log(`✓ relay_site_groups upsert 完成: ok=${ok} unchanged=${unchanged} skip=${skip}`);
  return { ok, unchanged, skip };
}

async function upsertPerf(perf: QzPerfSummaryResponse, sites: QzSite[], siteIndex: SiteIndex) {
  const table = TABLES.find((t) => t.id === "relay_site_perf");
  if (!table || table.tableId.startsWith("TBD")) {
    log(`⏭ relay_site_perf: 跳过（tableId=${table?.tableId} 为 TBD）`);
    return { ok: 0, skip: 0 };
  }

  // 拉已有
  let existing: { id: string; fields: Record<string, unknown> }[] = [];
  let fieldNames = new Set<string>();
  try {
    const result = larkListAll(table.tableId);
    existing = result.records;
    fieldNames = result.fieldNames;
  } catch {}
  const hasSiteId = fieldNames.has("site_id");
  const keyToId = new Map<string, string>();
  for (const r of existing) {
    const key = hasSiteId ? asText(r.fields.site_id) : asText(r.fields.host);
    if (key) keyToId.set(key, r.id);
  }

  // host → id 反查
  const hostToId = new Map<string, string>();
  for (const s of sites) hostToId.set(s.host, s.id);

  const now = formatFeishuDate(perf.generatedAt || new Date());
  let ok = 0, skip = 0, unchanged = 0;
  const creates: Record<string, unknown>[] = [];
  const compareFields = [
    "site_id", "site_name", "host", "success_rate", "ttft_p50_ms", "latency_p95_ms",
    "tps_avg", "availability_24h", "availability_7d", "consecutive_failures",
    "last_probe_at", "site",
  ];
  for (const [host, p] of Object.entries(perf.sites)) {
    if (!p.ok) continue; // 只写 ok=true 的（成功测过）
    const siteId = hostToId.get(host) ?? host;
    // 找主 sites 数组补 monitorRows + consecutiveFailures
    const fullSite = sites.find((s) => s.host === host);
    const mon = fullSite?.monitorRows?.[0];
    const fields: Record<string, unknown> = {
      site_id: siteId,
      site_name: p.name,
      host,
      success_rate: p.summary?.successRate ?? 0,
      ttft_p50_ms: p.summary?.ttftP50Ms ?? null,
      latency_p95_ms: p.summary?.latencyP95Ms ?? null,
      tps_avg: p.summary?.tpsAvg ?? null,
      availability_24h: mon?.availability24h ?? null,
      availability_7d: mon?.availability7d ?? null,
      consecutive_failures: fullSite?.sync?.consecutiveFailures ?? 0,
      last_probe_at: now,
    };
    if (!hasSiteId) delete fields.site_id;
    const siteRecordId = siteIndex.recordIdBySiteId.get(siteId) ?? siteIndex.recordIdByHost.get(host);
    if (siteRecordId && fieldNames.has("site")) fields.site = [{ id: siteRecordId }];
    const existingId = keyToId.get(hasSiteId ? siteId : host);
    if (!existingId) {
      creates.push(fields);
      continue;
    }
    const current = existing.find((record) => record.id === existingId)?.fields;
    if (current && fieldsEqual(current, fields, compareFields)) {
      unchanged++;
      continue;
    }
    if (current && DEBUG_DIFF) {
      log(`  Δ ${p.name}: ${changedFields(current, fields, compareFields).join(", ")}`);
    }
    if (DRY_RUN) {
      ok++;
      continue;
    }
    try {
      larkUpsert(table.tableId, existingId, fields);
      ok++;
    } catch (e) {
      log(`  ✗ ${p.name}: ${e}`);
      skip++;
    }
    await sleep(600);
  }
  if (DRY_RUN && creates.length > 0) log(`  + would create ${creates.length}`);
  if (!DRY_RUN) await createInBatches(table.tableId, creates);
  ok += creates.length;
  log(`✓ relay_site_perf upsert 完成: ok=${ok} unchanged=${unchanged} skip=${skip}`);
  return { ok, unchanged, skip };
}

// ============ Main ============

async function main() {
  const start = Date.now();
  fs.mkdirSync(LOG_DIR, { recursive: true });

  log("=== sync-qz-data 开始 ===");

  // TBD 守卫
  const tbdTables = TABLES.filter((t) => t.id.startsWith("relay_site_") && t.tableId.startsWith("TBD"));
  if (tbdTables.length > 0) {
    log(`⏭ 跳过全部：${tbdTables.length} 个新表还是 TBD（${tbdTables.map((t) => t.id).join(", ")}）`);
    log(`   强哥在飞书 base 手动建表后，把 tableId 填到 lib/tables.ts 即可`);
    log(`=== sync-qz-data 结束 (skipped) ===`);
    return;
  }

  const sites = await fetchQzSites();
  const perf = await fetchQzPerf();
  const siteIndex = loadSiteIndex();

  const perfResult = await upsertPerf(perf, sites, siteIndex);
  const groupResult = await upsertGroups(sites, siteIndex);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log(`=== sync-qz-data 结束 (${elapsed}s) groups: ok=${groupResult.ok}/skip=${groupResult.skip}, perf: ok=${perfResult.ok}/skip=${perfResult.skip} ===`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
