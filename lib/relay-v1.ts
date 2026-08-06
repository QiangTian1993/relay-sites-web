import type { KeyedRecord } from "./types";

export type ChangeDirection = "up" | "down" | null;
export type RiskLevel = "high" | "medium" | "low";
export type RelayV1OfferSource = "model_rate" | "related_group" | "family_group";

export interface RelayV1Offer {
  id: string;
  modelName: string;
  modelType: "text" | "image" | "unknown";
  inputRate: number | null;
  outputRate: number | null;
  cacheRate: number | null;
  createCacheRate: number | null;
  perCallPrice: number | null;
  enabledGroups: string[];
  fetchedAt: string;
  priceSource?: RelayV1OfferSource;
}

export interface RelayV1Group {
  id: string;
  name: string;
  rateValues: string;
  rateMin: number | null;
  rateMax: number | null;
  remark: string;
  changeDirection: ChangeDirection;
  changeDelta: number;
  updatedAt: string;
  relatedModels: string[];
  riskLevel: RiskLevel;
  riskReason: string;
}

export interface RelayV1Performance {
  availability7d: number | null;
  availability24h: number | null;
  successRate: number | null;
  ttftP50Ms: number | null;
  latencyP95Ms: number | null;
  tpsAvg: number | null;
  consecutiveFailures: number;
  lastProbeAt: string;
}

export interface SiteFeatureTags {
  hasInvoice: boolean;
  hasRefund: boolean;
  isPurePro: boolean;
  noVerify: boolean;
  hasCfFast: boolean;
  tagList: string[];
}

export function extractSiteTags(site: RelayV1Site): SiteFeatureTags {
  const note = (site.note || "").toLowerCase();
  const groupRemarks = site.groups.map(g => (g.remark || "").toLowerCase()).join(" ");
  const text = `${note} ${groupRemarks}`;

  const hasInvoice = text.includes("开票");
  const hasRefund = text.includes("退款");
  const isPurePro = text.includes("纯血") || text.includes("官网") || text.includes("pro池");
  const noVerify = text.includes("免验证");
  const hasCfFast = text.includes("cf-fast") || text.includes("优选");

  const tagList: string[] = [];
  if (hasInvoice) tagList.push("可开发票");
  if (hasRefund) tagList.push("退款保障");
  if (isPurePro) tagList.push("官网/纯血Pro");
  if (noVerify) tagList.push("免验证");
  if (hasCfFast) tagList.push("优选线路");

  return {
    hasInvoice,
    hasRefund,
    isPurePro,
    noVerify,
    hasCfFast,
    tagList,
  };
}

export interface RelayV1Site {
  id: string;
  siteKey: string;
  name: string;
  domain: string;
  providers: string[];
  framework: string[];
  minimumRate: number | null;
  note: string;
  lastChecked: string;
  offers: RelayV1Offer[];
  groups: RelayV1Group[];
  performance: RelayV1Performance | null;
}

export interface RelayModelOption {
  name: string;
  siteCount: number;
  type: RelayV1Offer["modelType"];
}

export interface RelayV1Data {
  sites: RelayV1Site[];
  models: RelayModelOption[];
  defaultModel: string;
  latestUpdatedAt: string;
  totals: {
    sites: number;
    groups: number;
    offers: number;
    measuredSites: number;
    changedGroups: number;
    riskyGroups: number;
  };
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((item) => item.trim()).filter(Boolean);
}

function relationId(record: KeyedRecord): string {
  const relation = record.site;
  if (!Array.isArray(relation)) return "";
  const first = relation[0];
  if (!first || typeof first !== "object") return "";
  // Native Feishu API: { record_ids: string[], table_id, text, ... }
  const obj = first as Record<string, unknown>;
  if ("record_ids" in obj && Array.isArray(obj.record_ids) && obj.record_ids.length > 0) {
    return String(obj.record_ids[0]);
  }
  // Legacy lark-cli format: { id: string }
  if ("id" in obj) return String(obj.id ?? "");
  return "";
}

function modelType(value: unknown): RelayV1Offer["modelType"] {
  const first = Array.isArray(value) ? value[0] : value;
  return first === "text" || first === "image" ? first : "unknown";
}

function parseRelatedModels(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
function parseRelatedModel(value: string): { name: string; inputRate: number } | null {
  const match = value.match(/^(.+?)\s*[×x]\s*(-?(?:\d+\.?\d*|\.\d+))\s*x?\s*$/i);
  if (!match) return null;
  const name = match[1].trim();
  const inputRate = Number(match[2]);
  if (!name || !Number.isFinite(inputRate)) return null;
  return { name, inputRate };
}


function parseChangeDirection(value: unknown): ChangeDirection {

  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "up" || raw === "down" ? raw : null;
}
interface ModelBaseline {
  name: string;
  inputRate: number;
  outputRate: number | null;
  occurrences: number;
}

function modeNumber(values: number[]): number | null {
  if (values.length === 0) return null;
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

function buildModelBaselines(
  modelRateRecords: KeyedRecord[],
  groupsBySite: Map<string, RelayV1Group[]>,
): Map<string, ModelBaseline> {
  const inputs = new Map<string, { name: string; input: number[]; output: number[] }>();
  const add = (name: string, inputRate: number | null, outputRate: number | null) => {
    if (!name || inputRate == null) return;
    const key = name.toLocaleLowerCase();
    const current = inputs.get(key) ?? { name, input: [], output: [] };
    current.input.push(inputRate);
    if (outputRate != null) current.output.push(outputRate);
    inputs.set(key, current);
  };

  for (const record of modelRateRecords) {
    add(String(record.model_name ?? "").trim(), numberOrNull(record.rate_input), numberOrNull(record.rate_output));
  }
  for (const groups of groupsBySite.values()) {
    for (const group of groups) {
      for (const relatedModel of group.relatedModels) {
        const parsed = parseRelatedModel(relatedModel);
        if (parsed) add(parsed.name, parsed.inputRate, null);
      }
    }
  }

  return new Map(
    [...inputs.entries()]
      .map(([key, value]) => [key, {
        name: value.name,
        inputRate: modeNumber(value.input) ?? 0,
        outputRate: modeNumber(value.output),
        occurrences: value.input.length,
      }] as const)
      .filter(([, baseline]) => baseline.inputRate > 0),
  );
}

function isOpenAIGroup(name: string): boolean {
  const normalized = name.toLocaleLowerCase();
  if (/claude|anthropic|kiro|cc[-_ ]/.test(normalized)) return false;
  return /codex|gpt|openai|chatgpt|(^|[^a-z])(pro|plus)([^a-z]|$)/.test(normalized);
}

function isOpenAIModel(name: string): boolean {
  return /^(?:gpt-|o[1-4](?:[-.]|$)|codex|chatgpt-)/i.test(name);
}

export function assessRemarkRisk(remark: string): { level: RiskLevel; reason: string } {
  const normalized = remark.replace(/\s+/g, " ").trim();
  if (!normalized) return { level: "low", reason: "" };

  const highSignals = ["封号", "不退款", "随时拉闸", "随时会停", "跑路", "停止服务", "高风险"];
  const mediumSignals = ["不稳定", "限制客户端", "不可外接", "禁止", "禁蒸馏", "禁探针", "模型限制", "稳定性较弱", "会停"];
  const high = highSignals.find((signal) => normalized.includes(signal));
  if (high) return { level: "high", reason: high };
  const medium = mediumSignals.find((signal) => normalized.includes(signal));
  if (medium) return { level: "medium", reason: medium };
  return { level: "low", reason: "" };
}

function newestDate(values: string[]): string {
  const valid = values
    .map((value) => ({ value, time: Date.parse(value.replace(" ", "T")) }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time);
  return valid[0]?.value ?? "";
}

export function buildRelayV1Data(
  siteRecords: KeyedRecord[],
  modelRateRecords: KeyedRecord[],
  groupRecords: KeyedRecord[],
  performanceRecords: KeyedRecord[],
): RelayV1Data {
  const siteRecordIds = new Set(siteRecords.map((record) => String(record.__id ?? "")).filter(Boolean));
  const siteIdByBusinessKey = new Map<string, string>();
  const siteIdByName = new Map<string, string>();
  const siteIdByHost = new Map<string, string>();
  for (const record of siteRecords) {
    const recordId = String(record.__id ?? "");
    const businessKey = String(record["站点ID"] ?? "").trim();
    const name = String(record["名称"] ?? "").trim();
    const host = String(record["域名"] ?? "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
    if (!recordId) continue;
    if (businessKey) siteIdByBusinessKey.set(businessKey, recordId);
    if (name) siteIdByName.set(name, recordId);
    if (host) siteIdByHost.set(host, recordId);
  }

  const resolveModelRateSiteId = (record: KeyedRecord): string => {
    const rawSiteId = String(record.site_id ?? "").trim();
    if (siteRecordIds.has(rawSiteId)) return rawSiteId;
    return siteIdByBusinessKey.get(rawSiteId)
      ?? siteIdByName.get(String(record.site_name ?? "").trim())
      ?? siteIdByHost.get(String(record.source_domain ?? "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase())
      ?? rawSiteId;
  };

  const offersBySite = new Map<string, RelayV1Offer[]>();
  for (const record of modelRateRecords) {
    const siteId = resolveModelRateSiteId(record);
    const modelName = String(record.model_name ?? "").trim();
    if (!siteId || !modelName) continue;
    const offer: RelayV1Offer = {
      id: String(record.__id ?? `${siteId}:${modelName}`),
      modelName,
      modelType: modelType(record.model_type),
      inputRate: numberOrNull(record.rate_input),
      outputRate: numberOrNull(record.rate_output),
      cacheRate: numberOrNull(record.rate_cache),
      createCacheRate: numberOrNull(record.rate_create_cache),
      perCallPrice: numberOrNull(record.model_price),
      enabledGroups: String(record.enable_groups ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      fetchedAt: String(record.fetched_at ?? ""),
    };
    const current = offersBySite.get(siteId) ?? [];
    current.push(offer);
    offersBySite.set(siteId, current);
  }

  const groupsBySite = new Map<string, RelayV1Group[]>();
  for (const record of groupRecords) {
    const siteId = relationId(record);
    if (!siteId) continue;
    const remark = String(record.remark ?? "").trim();
    const risk = assessRemarkRisk(remark);
    const group: RelayV1Group = {
      id: String(record.__id ?? ""),
      name: String(record.group_name ?? "未命名分组"),
      rateValues: String(record.rate_values ?? ""),
      rateMin: numberOrNull(record.rate_min),
      rateMax: numberOrNull(record.rate_max),
      remark,
      changeDirection: parseChangeDirection(record.change_direction),
      changeDelta: numberOrNull(record.change_delta) ?? 0,
      updatedAt: String(record.updated_at ?? ""),
      relatedModels: parseRelatedModels(record.related_models_json),
      riskLevel: risk.level,
      riskReason: risk.reason,
    };
    const current = groupsBySite.get(siteId) ?? [];
    current.push(group);
    groupsBySite.set(siteId, current);
  }
  const modelBaselines = buildModelBaselines(modelRateRecords, groupsBySite);
  const commonOpenAIModels = [...modelBaselines.values()]
    .filter((baseline) => baseline.occurrences >= 5 && isOpenAIModel(baseline.name) && !/image/i.test(baseline.name));

  const exactModelsBySite = new Map<string, Set<string>>();
  for (const [siteId, offers] of offersBySite) {
    exactModelsBySite.set(siteId, new Set(offers.map((offer) => offer.modelName.toLocaleLowerCase())));
  }

  // Some market snapshots expose model names and their base ratios only through
  // each group's related_models_json. For groups without that list, infer the
  // common OpenAI model family from the group name and use the mode of observed
  // model ratios as the generic baseline. The UI still applies the group rate.
  for (const [siteId, groups] of groupsBySite) {
    const exactModels = exactModelsBySite.get(siteId) ?? new Set<string>();
    const fallbackOffers = new Map<string, RelayV1Offer>();
    for (const group of groups) {
      if (group.rateMin == null) continue;
      for (const relatedModel of group.relatedModels) {
        const parsed = parseRelatedModel(relatedModel);
        if (!parsed) continue;
        const normalizedName = parsed.name.toLocaleLowerCase();
        if (exactModels.has(normalizedName)) continue;
        const existing = fallbackOffers.get(normalizedName);
        if (existing) {
          if (!existing.enabledGroups.includes(group.name)) existing.enabledGroups.push(group.name);
          continue;
        }
        fallbackOffers.set(normalizedName, {
          id: `${group.id}:${parsed.name}`,
          modelName: parsed.name,
          modelType: "unknown",
          inputRate: parsed.inputRate,
          outputRate: null,
          cacheRate: null,
          createCacheRate: null,
          perCallPrice: null,
          enabledGroups: [group.name],
          fetchedAt: group.updatedAt,
          priceSource: "related_group",
        });
      }
      if (group.relatedModels.length === 0 && isOpenAIGroup(group.name)) {
        for (const baseline of commonOpenAIModels) {
          const normalizedName = baseline.name.toLocaleLowerCase();
          if (exactModels.has(normalizedName)) continue;
          const existing = fallbackOffers.get(normalizedName);
          if (existing) {
            if (!existing.enabledGroups.includes(group.name)) existing.enabledGroups.push(group.name);
            continue;
          }
          fallbackOffers.set(normalizedName, {
            id: `${group.id}:${baseline.name}`,
            modelName: baseline.name,
            modelType: "text",
            inputRate: baseline.inputRate,
            outputRate: baseline.outputRate,
            cacheRate: null,
            createCacheRate: null,
            perCallPrice: null,
            enabledGroups: [group.name],
            fetchedAt: group.updatedAt,
            priceSource: "family_group",
          });
        }
      }
    }
    if (fallbackOffers.size > 0) {
      offersBySite.set(siteId, [...(offersBySite.get(siteId) ?? []), ...fallbackOffers.values()]);
    }
  }


  const performanceBySite = new Map<string, RelayV1Performance>();
  const performanceByKey = new Map<string, RelayV1Performance>();
  const performanceByHost = new Map<string, RelayV1Performance>();

  for (const record of performanceRecords) {
    const perfData: RelayV1Performance = {
      availability7d: numberOrNull(record.availability_7d),
      availability24h: numberOrNull(record.availability_24h),
      successRate: numberOrNull(record.success_rate),
      ttftP50Ms: numberOrNull(record.ttft_p50_ms),
      latencyP95Ms: numberOrNull(record.latency_p95_ms),
      tpsAvg: numberOrNull(record.tps_avg),
      consecutiveFailures: numberOrNull(record.consecutive_failures) ?? 0,
      lastProbeAt: String(record.last_probe_at ?? ""),
    };

    const siteId = relationId(record);
    if (siteId) performanceBySite.set(siteId, perfData);
    if (record.site_id) performanceByKey.set(String(record.site_id), perfData);
    if (record.host) performanceByHost.set(String(record.host).replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase(), perfData);
  }

  const sites: RelayV1Site[] = siteRecords.map((record) => {
    const id = String(record.__id ?? "");
    const siteKey = String(record["站点ID"] ?? "");
    const domainHost = String(record["域名"] ?? "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();

    return {
      id,
      siteKey,
      name: String(record["名称"] ?? "未命名站点"),
      domain: String(record["域名"] ?? ""),
      providers: stringArray(record["支持的 provider"]),
      framework: stringArray(record["框架"]),
      minimumRate: numberOrNull(record["最低倍率"]),
      note: String(record["备注"] ?? ""),
      lastChecked: String(record["最后检查"] ?? ""),
      offers: offersBySite.get(id) ?? [],
      groups: (groupsBySite.get(id) ?? []).sort((a, b) => {
        const relevantChange = Number(Boolean(b.changeDirection)) - Number(Boolean(a.changeDirection));
        return relevantChange || (a.rateMin ?? Number.POSITIVE_INFINITY) - (b.rateMin ?? Number.POSITIVE_INFINITY);
      }),
      performance: performanceBySite.get(id) ?? performanceByKey.get(siteKey) ?? performanceByHost.get(domainHost) ?? null,
    };
  });

  const modelSites = new Map<string, Set<string>>();
  const modelTypes = new Map<string, RelayV1Offer["modelType"]>();
  for (const site of sites) {
    for (const offer of site.offers) {
      const set = modelSites.get(offer.modelName) ?? new Set<string>();
      set.add(site.id);
      modelSites.set(offer.modelName, set);
      modelTypes.set(offer.modelName, offer.modelType);
    }
  }
  const models = [...modelSites.entries()]
    .map(([name, siteIds]) => ({ name, siteCount: siteIds.size, type: modelTypes.get(name) ?? "unknown" }))
    .sort((a, b) => b.siteCount - a.siteCount || a.name.localeCompare(b.name));

  const allDates = [
    ...siteRecords.map((record) => String(record["最后检查"] ?? "")),
    ...modelRateRecords.map((record) => String(record.fetched_at ?? "")),
    ...groupRecords.map((record) => String(record.updated_at ?? "")),
    ...performanceRecords.map((record) => String(record.last_probe_at ?? "")),
  ];

  return {
    sites,
    models,
    defaultModel: models.find((model) => model.name === "gpt-5.5")?.name ?? models[0]?.name ?? "",
    latestUpdatedAt: newestDate(allDates),
    totals: {
      sites: sites.length,
      groups: groupRecords.length,
      offers: sites.reduce((total, site) => total + site.offers.length, 0),
      measuredSites: performanceBySite.size,
      changedGroups: groupRecords.filter((record) => parseChangeDirection(record.change_direction)).length,
      riskyGroups: [...groupsBySite.values()].flat().filter((group) => group.riskLevel !== "low").length,
    },
  };
}
