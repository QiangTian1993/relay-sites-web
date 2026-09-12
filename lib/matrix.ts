// Provider 矩阵 —— parse "分组倍率" 字符串 → provider × site 倍率表
// 复用：纯函数，客户端/服务端都能用

import type { KeyedRecord } from "./types";

/** 9 个 provider 按热度（支持站点数）降序 */
export const PROVIDERS = [
  "OpenAI",
  "Claude",
  "xAI",
  "Gemini",
  "GLM",
  "DeepSeek",
  "Kimi",
  "Doubao",
  "Qwen",
] as const;

export type Provider = (typeof PROVIDERS)[number];

/** 矩阵单元 */
export interface MatrixCell {
  /** 倍率数字（如 0.05 → 0.05x） */
  rate: number | null;
  /** 原始字符串（备用） */
  raw: string | null;
}

/** 矩阵：site id → provider → cell */
export type Matrix = Record<string, Record<Provider, MatrixCell>>;

/** 空 cell */
const emptyCell: MatrixCell = { rate: null, raw: null };

/** 列表和矩阵统一倍率精度，避免原始浮点数占满单元格。 */
export function formatRate(rate: number | null): string {
  if (rate == null) return "--";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(rate)}x`;
}

function parseProviderPart(part: string): { provider: Provider; rate: number; raw: string } | null {
  const match = part.trim().match(/^(\S+)\s+(.+)$/);
  if (!match) return null;
  const provider = match[1] as Provider;
  if (!PROVIDERS.includes(provider)) return null;

  const rates = [...match[2].matchAll(/(\d*\.?\d+)x/g)]
    .map((item) => Number(item[1]))
    .filter(Number.isFinite);
  if (rates.length === 0) return null;
  return { provider, rate: Math.min(...rates), raw: part.trim() };
}

/** 从 "OpenAI 0.07x/0.2x | Claude 0.055x" 解析各 Provider 的最低倍率。 */
function parseRates(raw: string | null | undefined): Partial<Record<Provider, MatrixCell>> {
  if (!raw) return {};
  const out: Partial<Record<Provider, MatrixCell>> = {};
  for (const part of raw.split("|")) {
    const parsed = parseProviderPart(part);
    if (!parsed) continue;
    out[parsed.provider] = { rate: parsed.rate, raw: parsed.raw };
  }
  return out;
}

/** 构建矩阵（基于 records） */
export function buildMatrix(records: KeyedRecord[]): Matrix {
  const matrix: Matrix = {};
  for (const r of records) {
    const id = String(r.__id);
    const parsed = parseRates(r["分组倍率"] as string | null);
    // 初始化所有 provider 为空 cell
    const row: Record<Provider, MatrixCell> = {
      OpenAI: { ...emptyCell },
      Claude: { ...emptyCell },
      xAI: { ...emptyCell },
      Gemini: { ...emptyCell },
      GLM: { ...emptyCell },
      DeepSeek: { ...emptyCell },
      Kimi: { ...emptyCell },
      Doubao: { ...emptyCell },
      Qwen: { ...emptyCell },
    };
    for (const [p, c] of Object.entries(parsed)) {
      row[p as Provider] = c;
    }
    matrix[id] = row;
  }
  return matrix;
}

/** 按"最低倍率"升序排序的 records */
export function sortByLowestRate(records: KeyedRecord[]): KeyedRecord[] {
  return [...records].sort((a, b) => {
    const av = typeof a["最低倍率"] === "number" ? (a["最低倍率"] as number) : Infinity;
    const bv = typeof b["最低倍率"] === "number" ? (b["最低倍率"] as number) : Infinity;
    return av - bv;
  });
}

/** 倍率颜色分级（用于单元格底色） */
export function rateTier(rate: number | null): {
  label: string;
  classes: string;
  weight: string;
} {
  if (rate == null) {
    return { label: "—", classes: "text-zinc-300", weight: "font-normal" };
  }
  if (rate < 0.1) {
    return { label: formatRate(rate), classes: "text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded px-1.5 py-0.5 font-bold", weight: "font-bold" };
  }
  if (rate < 0.3) {
    return { label: formatRate(rate), classes: "text-indigo-700 bg-indigo-50 border border-indigo-200/60 rounded px-1.5 py-0.5 font-bold", weight: "font-bold" };
  }
  if (rate < 0.6) {
    return { label: formatRate(rate), classes: "text-zinc-800 bg-zinc-100 rounded px-1.5 py-0.5 font-semibold", weight: "font-medium" };
  }
  if (rate < 1) {
    return { label: formatRate(rate), classes: "text-zinc-600 font-medium", weight: "font-mono" };
  }
  return { label: formatRate(rate), classes: "text-zinc-400", weight: "font-mono" };
}
/** 从 "OpenAI 0.07x | Claude 0.055x | Gemini 1x" 提取特定 provider 的倍率
 * 找不到该 provider 或格式不匹配 → null
 */
export function parseRateForProvider(value: unknown, provider: string): string | null {
  const rate = getRateForProvider(value, provider);
  return rate == null ? null : formatRate(rate);
}

export function getRateForProvider(value: unknown, provider: string): number | null {
  if (typeof value !== "string" || !value || !provider) return null;
  for (const part of value.split("|")) {
    const parsed = parseProviderPart(part);
    if (parsed?.provider === provider) return parsed.rate;
  }
  return null;
}

/** 分块（block）—— 一个 provider 的一块（如 "OpenAI 块"） */
export interface ProviderBlock {
  provider: Provider;
  /** 支持该 provider 的站点数 */
  count: number;
  /** 该 provider 下支持的站点（按倍率升序） */
  rows: Array<{
    siteId: string;
    siteName: string;
    /** 倍率数字（null 表示不支持） */
    rate: number | null;
    /** 原始字符串 */
    raw: string | null;
  }>;
}

/** 把 9 个 provider 分成 3 个块（每块 3 列），按热度顺序（PROVIDERS 已是热度排序）
 *  - Block 1: OpenAI / Claude / xAI
 *  - Block 2: Gemini / GLM / DeepSeek
 *  - Block 3: Kimi / Doubao / Qwen
 */
export function buildBlocks(records: KeyedRecord[]): ProviderBlock[] {
  const matrix = buildMatrix(records);
  // 按 PROVIDERS 顺序分 3 块（每块 3 列）
  const blockSize = 3;
  const blocks: ProviderBlock[] = [];
  for (let i = 0; i < PROVIDERS.length; i += blockSize) {
    const blockProviders = PROVIDERS.slice(i, i + blockSize);
    for (const provider of blockProviders) {
      // 收集该 provider 下所有有倍率数据的站点
      const rows: ProviderBlock["rows"] = [];
      for (const r of records) {
        const cell = matrix[r.__id][provider];
        if (cell.rate == null) continue;
        const siteName = String(r["名称"] ?? r.__id);
        rows.push({
          siteId: r.__id,
          siteName,
          rate: cell.rate,
          raw: cell.raw,
        });
      }
      // 按倍率升序（最便宜在前）
      rows.sort((a, b) => (a.rate ?? Infinity) - (b.rate ?? Infinity));
      blocks.push({
        provider,
        count: rows.length,
        rows,
      });
    }
  }
  return blocks;
}
