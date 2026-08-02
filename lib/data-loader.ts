// 数据加载器 —— 服务端专用（勿在 client component 中 import）
// 优先读本地 data/*.json（npm run fetch 产出），缺失时回退飞书 API
// 进程级 TTL 缓存；instrumentation.ts 可在启动时预热
//
// 注意：fs/path 用 require 惰性加载，避免 Next 把本模块编进 edge/client 时炸掉

import "server-only";
import { TABLES, getTable, type TableConfig } from "./tables";
import type { KeyedRecord } from "./types";
import { fetchTableRecords } from "./feishu-client";

export {
  inferOptions,
  matchesSearch,
  toNumber,
  toStringArray,
  truncate,
  formatNumber,
} from "./record-utils";

export type { KeyedRecord } from "./types";

export interface TableData {
  table: TableConfig;
  records: KeyedRecord[];
  /** 数据时间（ISO 8601）：本地 JSON 用文件 mtime，飞书用拉取时刻 */
  fetchedAt: string;
  /** 实际数据源，便于排查首开耗时 */
  source: "local" | "feishu";
}

type DataSourceMode = "auto" | "local" | "feishu";

const TTL_MS = 1800 * 1000; // 30 分钟

interface CacheEntry {
  data: TableData | null;
  expiresAt: number;
}

const _cache = new Map<string, CacheEntry>();
const _inflight = new Map<string, Promise<TableData | null>>();

function nodeFs(): typeof import("fs/promises") {
  // Node 22+：走 builtin，webpack 不会尝试打包
  const getBuiltin = (process as NodeJS.Process & {
    getBuiltinModule?: (id: string) => unknown;
  }).getBuiltinModule;
  if (typeof getBuiltin === "function") {
    return getBuiltin("fs/promises") as typeof import("fs/promises");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-eval
  return eval("require")("fs/promises") as typeof import("fs/promises");
}

function nodePath(): typeof import("path") {
  const getBuiltin = (process as NodeJS.Process & {
    getBuiltinModule?: (id: string) => unknown;
  }).getBuiltinModule;
  if (typeof getBuiltin === "function") {
    return getBuiltin("path") as typeof import("path");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports, no-eval
  return eval("require")("path") as typeof import("path");
}

function dataDir() {
  return nodePath().join(process.cwd(), "data");
}

function dataSourceMode(): DataSourceMode {
  const raw = (process.env.DATA_SOURCE ?? "auto").toLowerCase();
  if (raw === "local" || raw === "feishu" || raw === "auto") return raw;
  return "auto";
}

async function loadFromLocal(tableId: string): Promise<TableData | null> {
  const table = getTable(tableId);
  if (!table) return null;

  const path = nodePath();
  const fs = nodeFs();
  const filePath = path.join(dataDir(), `${tableId}.json`);
  try {
    const [raw, fileStat] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      fs.stat(filePath),
    ]);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`expected array in ${path.basename(filePath)}`);
    }
    return {
      table,
      records: parsed as KeyedRecord[],
      fetchedAt: fileStat.mtime.toISOString(),
      source: "local",
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.warn(`[data-loader] local ${tableId} unusable:`, err instanceof Error ? err.message : err);
    }
    return null;
  }
}

async function loadFromFeishu(tableId: string): Promise<TableData | null> {
  const table = getTable(tableId);
  if (!table || table.tableId.startsWith("TBD")) return null;

  const baseToken =
    process.env.FEISHU_BASE_TOKEN ??
    process.env.FEISHU_KB_TOKEN ??
    process.env.KB_TOKEN;
  if (!baseToken) throw new Error("FEISHU_BASE_TOKEN env var is required");

  const records = await fetchTableRecords(baseToken, table.tableId);
  return {
    table,
    records,
    fetchedAt: new Date().toISOString(),
    source: "feishu",
  };
}

/** 加载一张表的全量记录（命中缓存直接返回，过期时重新拉取）。*/
export async function loadTable(tableId: string): Promise<TableData | null> {
  const entry = _cache.get(tableId);
  if (entry && Date.now() < entry.expiresAt) {
    // 如果是本地 JSON 文件数据源，校验 mtime 是否更新过
    if (entry.data?.source === "local") {
      try {
        const path = nodePath();
        const fs = nodeFs();
        const filePath = path.join(dataDir(), `${tableId}.json`);
        const stat = await fs.stat(filePath);
        if (stat.mtime.toISOString() === entry.data.fetchedAt) {
          return entry.data;
        }
        // mtime 变了，缓存失效，重新加载
      } catch {
        return entry.data;
      }
    } else {
      return entry.data;
    }
  }

  const existing = _inflight.get(tableId);
  if (existing) return existing;

  const promise = fetchAndCache(tableId).finally(() => _inflight.delete(tableId));
  _inflight.set(tableId, promise);
  return promise;
}

async function fetchAndCache(tableId: string): Promise<TableData | null> {
  const mode = dataSourceMode();
  let data: TableData | null = null;

  if (mode !== "feishu") {
    data = await loadFromLocal(tableId);
  }

  if (!data && mode !== "local") {
    try {
      data = await loadFromFeishu(tableId);
    } catch (err) {
      console.error(`[data-loader] feishu ${tableId} failed:`, err instanceof Error ? err.message : err);
      data = null;
    }
  }

  _cache.set(tableId, { data, expiresAt: Date.now() + TTL_MS });
  return data;
}

/** 加载所有表（首页用）。*/
export async function loadAllTables(tables: TableConfig[] = TABLES): Promise<TableData[]> {
  const results = await Promise.all(tables.map((t) => loadTable(t.id)));
  return results.filter((d): d is TableData => d !== null);
}

/** 预热常用表到进程缓存（instrumentation / 健康检查用）。*/
export async function warmTables(
  tableIds: string[] = [
    "relay_sites_tracker",
    "relay_site_groups",
    "relay_site_perf",
    "model_rates",
    "vibe_coding_tracker",
  ],
): Promise<void> {
  await Promise.all(tableIds.map((id) => loadTable(id).catch(() => null)));
}
