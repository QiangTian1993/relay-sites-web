// 质检记录 ↔ 飞书 Bitable 双向同步（relay_site_qc_backup 表）
// 用法：
//   npx tsx scripts/sync-qc-backup.ts            # 本地 data/relay_site_qc.json → 飞书备份（按 站点ID 幂等 upsert）
//   npx tsx scripts/sync-qc-backup.ts --restore  # 飞书 → 本地文件（需 --yes 实际写入）
//   可选: --file <path> 指定本地文件；--dry-run 只看不写；--yes 配合 --restore 落盘
// 身份：默认 bot（与 github_trending 写路径一致，bot 对该 Base 有写权限），LARK_AS 可覆盖
// 说明：本地 JSON 是主存储（运行时写入），飞书仅作灾备快照；完整记录以"完整记录JSON"字段保真

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { QCRecord } from "../lib/qc-store";

const args = process.argv.slice(2);
function argValue(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
}
const RESTORE = args.includes("--restore");
const DRY_RUN = args.includes("--dry-run");
const YES = args.includes("--yes");
const localFile = argValue("--file") ?? path.join(process.cwd(), "data", "relay_site_qc.json");

const rawKbToken = process.env.FEISHU_BASE_TOKEN ?? process.env.FEISHU_KB_TOKEN ?? process.env.KB_TOKEN;
const KB_TOKEN = (rawKbToken && !rawKbToken.includes("…")) ? rawKbToken : "SchGbU6UDaT5q9sDjHTct79Sn9d";
const LARK_AS = process.env.LARK_AS ?? "bot";
const TABLE_NAME = "relay_site_qc_backup";

function log(msg: string) {
  console.log(`[${new Date().toLocaleTimeString("zh-CN", { hour12: false })}] ${msg}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============ lark-cli 封装（与 fetch-github-trending.ts 同模式） ============

interface LarkJson {
  ok?: boolean;
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

function runLark(cmdArgs: string[], timeoutMs = 60000): LarkJson {
  const resolved = cmdArgs.map((arg, i) => (cmdArgs[i - 1] === "--as" ? LARK_AS : arg));
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
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return fn();
    } catch (e) {
      if (is429Error(e) && attempt < 3) {
        const backoff = Math.min(20000, 2000 * Math.pow(2, attempt - 1));
        log(`⏸ ${label} 429 限流，退避 ${backoff / 1000}s (${attempt}/3)`);
        await sleep(backoff);
        continue;
      }
      throw e;
    }
  }
  throw new Error(`unreachable: ${label}`);
}

async function larkFindTable(): Promise<string | null> {
  const j = await withRetry(() => runLark([
    "base", "+table-list",
    "--as", "user",
    "--base-token", KB_TOKEN,
    "--format", "json",
  ]), "table-list").catch(() => null);
  if (!j?.ok) throw new Error(`lark table-list failed: ${JSON.stringify(j).slice(0, 300)}`);
  return j.data?.tables?.find((t) => t.name === TABLE_NAME)?.id ?? null;
}

const CREATE_TABLE_FIELDS = [
  { type: "text", name: "站点ID" },
  { type: "text", name: "站点名称" },
  { type: "text", name: "域名" },
  { type: "text", name: "申报模型" },
  { type: "number", name: "综合评分", style: { type: "plain", precision: 0 } },
  { type: "number", name: "最新得分", style: { type: "plain", precision: 0 } },
  { type: "number", name: "累计轮次", style: { type: "plain", precision: 0 } },
  { type: "number", name: "通过率", style: { type: "plain", precision: 0 } },
  { type: "select", name: "结论", options: [
    { name: "PASS", hue: "Green", lightness: "Light" },
    { name: "WARNING", hue: "Orange", lightness: "Light" },
    { name: "FAIL", hue: "Red", lightness: "Light" },
  ]},
  { type: "text", name: "结论描述" },
  { type: "select", name: "置信度", options: [
    { name: "high", hue: "Blue", lightness: "Light" },
    { name: "medium", hue: "Purple", lightness: "Light" },
    { name: "low", hue: "Gray", lightness: "Light" },
  ]},
  { type: "number", name: "探针样本数", style: { type: "plain", precision: 0 } },
  { type: "datetime", name: "最后测试时间" },
  { type: "text", name: "结论代码" },
  { type: "text", name: "完整记录JSON" },
];

async function larkCreateTable(): Promise<string> {
  const j = runLark([
    "base", "+table-create",
    "--as", "user",
    "--base-token", KB_TOKEN,
    "--name", TABLE_NAME,
    "--fields", JSON.stringify(CREATE_TABLE_FIELDS),
    "--format", "json",
  ]);
  if (!j.ok) throw new Error(`lark table-create failed: ${JSON.stringify(j).slice(0, 300)}`);
  const tableId = j.data?.table?.id;
  if (!tableId) throw new Error("建表成功但未返回 table id");
  return tableId;
}

async function larkListAll(tableId: string): Promise<Array<{ id: string; fields: Record<string, unknown> }>> {
  const records: Array<{ id: string; fields: Record<string, unknown> }> = [];
  let offset = 0;
  while (true) {
    const j = await withRetry(() => runLark([
      "base", "+record-list",
      "--as", "user",
      "--base-token", KB_TOKEN,
      "--table-id", tableId,
      "--limit", "200",
      "--offset", String(offset),
      "--format", "json",
    ]), `record-list@${offset}`);
    if (!j.ok) throw new Error(`lark record-list failed: ${JSON.stringify(j).slice(0, 300)}`);
    const ids: string[] = j.data?.record_id_list ?? [];
    const fields: string[] = j.data?.fields ?? [];
    const rows: unknown[][] = j.data?.data ?? [];
    records.push(...rows.map((row, i) => ({
      id: ids[i],
      fields: Object.fromEntries(fields.map((f, fi) => [f, row[fi]])),
    })));
    if (!j.data?.has_more || rows.length === 0) break;
    offset += rows.length;
  }
  return records;
}

async function larkBatchCreate(tableId: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const fieldNames = Object.keys(rows[0]);
  const j = await withRetry(() => runLark([
    "base", "+record-batch-create",
    "--as", "user",
    "--base-token", KB_TOKEN,
    "--table-id", tableId,
    "--json", JSON.stringify({
      fields: fieldNames,
      rows: rows.map((row) => fieldNames.map((f) => row[f] ?? null)),
    }),
  ]), "batch-create");
  if (!j.ok) throw new Error(`lark batch-create failed: ${JSON.stringify(j).slice(0, 300)}`);
}

async function larkBatchUpdate(tableId: string, rows: Array<{ record_id: string; fields: Record<string, unknown> }>) {
  if (rows.length === 0) return;
  const updateRecords = Object.fromEntries(
    rows.map(({ record_id, fields }) => [
      record_id,
      Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined && v !== "")),
    ]),
  );
  const j = await withRetry(() => runLark([
    "base", "+record-batch-update",
    "--as", "user",
    "--base-token", KB_TOKEN,
    "--table-id", tableId,
    "--json", JSON.stringify({ update_records: updateRecords }),
  ]), "batch-update");
  if (!j.ok) throw new Error(`lark batch-update failed: ${JSON.stringify(j).slice(0, 300)}`);
}

function formatFeishuDate(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

// QCRecord → 飞书行字段（完整 JSON 保真，其余列便于人工浏览）
function toFields(r: QCRecord): Record<string, unknown> {
  return {
    站点ID: r.siteId,
    站点名称: r.siteName ?? "",
    域名: r.domain ?? "",
    申报模型: r.declaredModel,
    综合评分: r.score,
    最新得分: r.currentScore ?? r.score,
    累计轮次: r.historicalRounds ?? 1,
    通过率: r.passRate ?? 100,
    结论: r.verdict,
    结论描述: (r.verdictText ?? "").slice(0, 500),
    置信度: r.confidence ?? "low",
    探针样本数: r.totalSamples ?? r.sampleCount,
    最后测试时间: formatFeishuDate(new Date(r.testedAt)),
    结论代码: r.outcomeCode ?? "",
    完整记录JSON: JSON.stringify(r),
  };
}

// 飞书行 → QCRecord（从完整 JSON 还原；解析失败跳过）
function fromFields(fields: Record<string, unknown>): QCRecord | null {
  const raw = String(fields["完整记录JSON"] ?? "");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QCRecord;
    if (!parsed?.siteId || !parsed?.declaredModel) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readLocalRecords(): QCRecord[] {
  try {
    const content = fs.readFileSync(localFile, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalRecords(records: QCRecord[]) {
  const tmp = `${localFile}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(localFile), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(records, null, 2), "utf-8");
  fs.renameSync(tmp, localFile);
}

async function backup() {
  const records = readLocalRecords();
  log(`本地 ${localFile} 共 ${records.length} 条记录`);
  if (records.length === 0) {
    log("无记录可备份，退出");
    return;
  }
  if (DRY_RUN) {
    for (const r of records.slice(0, 10)) {
      console.log(`  ${r.siteId} | ${r.verdict} | ${r.score}分 | ${r.testedAt}`);
    }
    if (records.length > 10) console.log(`  ... 其余 ${records.length - 10} 条`);
    return;
  }

  let tableId = await larkFindTable();
  if (!tableId) {
    log(`表 ${TABLE_NAME} 不存在，自动创建...`);
    tableId = await larkCreateTable();
    log(`已创建表 ${tableId}`);
  }

  const existing = await larkListAll(tableId);
  const existingByKey = new Map<string, string>();
  for (const rec of existing) {
    const key = String(rec.fields["站点ID"] ?? "");
    if (key) existingByKey.set(key.toLowerCase(), rec.id);
  }
  log(`表内已有 ${existingByKey.size} 条记录`);

  // 仅当飞书记录比本地旧时更新（避免把灾备表回写覆盖成更老的数据）
  const toCreate: Record<string, unknown>[] = [];
  const toUpdate: Array<{ record_id: string; fields: Record<string, unknown> }> = [];
  let skipped = 0;
  for (const r of records) {
    const fields = toFields(r);
    const recordId = existingByKey.get(r.siteId.toLowerCase());
    if (!recordId) {
      toCreate.push(fields);
      continue;
    }
    const prev = existing.find((e) => e.id === recordId);
    const prevTime = Date.parse(String(prev?.fields["最后测试时间"] ?? ""));
    if (Number.isFinite(prevTime) && prevTime >= Date.parse(r.testedAt)) {
      skipped++;
      continue;
    }
    toUpdate.push({ record_id: recordId, fields });
  }

  log(`计划: 新建 ${toCreate.length} / 更新 ${toUpdate.length} / 跳过较旧 ${skipped}`);
  await larkBatchCreate(tableId, toCreate);
  await larkBatchUpdate(tableId, toUpdate);
  log(`✅ 备份完成: 表 ${TABLE_NAME} (${tableId})`);
}

async function restore() {
  const tableId = await larkFindTable();
  if (!tableId) {
    throw new Error(`表 ${TABLE_NAME} 不存在，无可恢复数据`);
  }
  const existing = await larkListAll(tableId);
  const restored: QCRecord[] = [];
  for (const rec of existing) {
    const record = fromFields(rec.fields);
    if (record) restored.push(record);
  }
  log(`飞书可还原 ${restored.length} 条记录`);
  if (DRY_RUN || !YES) {
    console.log("[dry-run/未加 --yes] 不写入本地。示例:", JSON.stringify(restored[0] ?? null).slice(0, 200));
    return;
  }
  writeLocalRecords(restored);
  log(`✅ 已写回 ${localFile}`);
}

async function main() {
  log(`QC 备份同步: ${RESTORE ? "飞书 → 本地 (restore)" : "本地 → 飞书 (backup)"} as=${LARK_AS}`);
  if (RESTORE) await restore();
  else await backup();
}

main().catch((err) => {
  console.error("失败:", err instanceof Error ? err.message : err);
  process.exit(1);
});
