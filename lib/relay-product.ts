import type { KeyedRecord } from "./types";

export interface ModelOfferSummary {
  siteRecordId: string;
  name: string;
  type: "text" | "image" | "unknown";
  inputRate: number | null;
  outputRate: number | null;
  cacheRate: number | null;
  createCacheRate: number | null;
  perCallPrice: number | null;
  group: string;
}

export interface AccessSignals {
  registration: "open" | "closed" | "unknown";
  verification: "none" | "email" | "unknown";
  monitor: "on" | "off" | "unknown";
}

export function parseAccessSignals(note: string): AccessSignals {
  return {
    registration: note.includes("注册开") ? "open" : note.includes("注册关") ? "closed" : "unknown",
    verification: note.includes("免验证") ? "none" : note.includes("邮箱验证") ? "email" : "unknown",
    monitor: note.includes("监控开") ? "on" : note.includes("监控关") ? "off" : "unknown",
  };
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function modelType(value: unknown): ModelOfferSummary["type"] {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "text" || raw === "image" ? raw : "unknown";
}

export function buildModelOfferSummaries(records: KeyedRecord[]): ModelOfferSummary[] {
  return records.flatMap((record) => {
    const siteRecordId = String(record.site_id ?? "");
    const name = String(record.model_name ?? "").trim();
    if (!siteRecordId || !name) return [];

    return [{
      siteRecordId,
      name,
      type: modelType(record.model_type),
      inputRate: nullableNumber(record.rate_input),
      outputRate: nullableNumber(record.rate_output),
      cacheRate: nullableNumber(record.rate_cache),
      createCacheRate: nullableNumber(record.rate_create_cache),
      perCallPrice: nullableNumber(record.model_price),
      group: String(record.enable_groups ?? ""),
    }];
  });
}

export function matchesModel(offer: ModelOfferSummary, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || offer.name.toLocaleLowerCase().includes(normalized);
}

export function modelOfferSortValue(offer: ModelOfferSummary): number | null {
  if (offer.type === "image") return offer.perCallPrice;
  return offer.inputRate ?? offer.outputRate;
}

export function modelOfferLabel(offer: ModelOfferSummary): string {
  if (offer.type === "image") {
    return offer.perCallPrice == null ? "按次价格未知" : `¥${offer.perCallPrice}/次`;
  }
  if (offer.inputRate == null && offer.outputRate == null) return "倍率未知";
  const input = offer.inputRate == null ? "--" : `${offer.inputRate}x`;
  const output = offer.outputRate == null ? "--" : `${offer.outputRate}x`;
  return `输入 ${input} / 输出 ${output}`;
}
