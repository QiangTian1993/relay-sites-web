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

  // For groups with related_models_json, include their explicitly bound models
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
    defaultModel: models.find((model) => model.name === "gpt-5.6-sol")?.name ?? models.find((model) => model.name === "gpt-5.5")?.name ?? models[0]?.name ?? "",
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

// ============================================================================
// 算法引擎：价格梯队、全网排位、公式拆解与模型家族矩阵
// ============================================================================

export type PriceTier = "T1" | "T2" | "T3";

export interface PriceTierInfo {
  tier: PriceTier;
  label: string;
  badgeClass: string;
  tagColor: string;
  description: string;
}

export interface PriceDistributionStats {
  count: number;
  min: number;
  p20: number;
  p50: number;
  p70: number;
  max: number;
  iqr: number;
  spreadRatio: number;
}

export interface PriceFormulaBreakdown {
  basePrice: number;
  basePriceType: "input_rate" | "output_rate" | "per_call";
  groupName: string;
  groupRate: number;
  effectivePrice: number;
  formulaText: string;
  hasGroupDiscount: boolean;
  isDerivedSource: boolean;
  applicableGroupsCount: number;
  optimalGroupRemark?: string;
}

export interface FamilyModelSummary {
  modelName: string;
  displayName: string;
  shortLabel: string;
  tagline: string;
  siteCount: number;
  lowestPrice: number | null;
  lowestPriceSite: { id: string; name: string; domain: string } | null;
  medianPrice: number | null;
  avgP50: number | null;
  priceUnit: "multiplier" | "cny_per_call";
}

export interface ModelFamilyGroup {
  familyId: string;
  familyName: string;
  vendor: "OpenAI" | "Anthropic" | "DeepSeek" | "Google" | "Other";
  description: string;
  benchmarkModel: string;
  totalSitesCovered: number;
  overallLowestPrice: number | null;
  subModels: FamilyModelSummary[];
}

export interface ModelFamilyConfig {
  familyId: string;
  familyName: string;
  vendor: ModelFamilyGroup["vendor"];
  description: string;
  benchmarkModel: string;
  matcher: (modelName: string) => boolean;
  subModelTaglines?: Record<string, { shortLabel: string; tagline: string }>;
}

export const PRESET_MODEL_FAMILIES: ModelFamilyConfig[] = [
  {
    familyId: "gpt-5.6-series",
    familyName: "GPT-5.6 旗舰矩阵",
    vendor: "OpenAI",
    description: "最新一代推理与编码旗舰，各站混用高发区，支持全维度比价与指纹质检",
    benchmarkModel: "gpt-5.6-sol",
    matcher: (name) => /^gpt-5\.6/i.test(name),
    subModelTaglines: {
      "gpt-5.6-sol": { shortLabel: "Sol 旗舰", tagline: "满血推理 · 编程旗舰" },
      "gpt-5.6-terra": { shortLabel: "Terra 极速", tagline: "高性价比 · 均衡推理" },
      "gpt-5.6-luna": { shortLabel: "Luna 轻量", tagline: "极低单价 · 基础对话" },
      "gpt-5.6": { shortLabel: "标准版", tagline: "通用泛用型" },
    },
  },
  {
    familyId: "gpt-5.4-series",
    familyName: "GPT-5.4 / 5.5 系列",
    vendor: "OpenAI",
    description: "高并发日常生产主力模型",
    benchmarkModel: "gpt-5.4",
    matcher: (name) => /^gpt-5\.[45]/i.test(name),
    subModelTaglines: {
      "gpt-5.4": { shortLabel: "5.4 主力", tagline: "高频对话与编码" },
      "gpt-5.4-mini": { shortLabel: "5.4 Mini", tagline: "极速紧凑版" },
      "gpt-5.5": { shortLabel: "5.5 升级版", tagline: "深度推演版" },
    },
  },
  {
    familyId: "claude-3-7-series",
    familyName: "Claude 3.7 系列",
    vendor: "Anthropic",
    description: "混合思考与超长上下文主力，代码补全第一梯队",
    benchmarkModel: "claude-3-7-sonnet",
    matcher: (name) => /^claude-3-7/i.test(name),
    subModelTaglines: {
      "claude-3-7-sonnet": { shortLabel: "Sonnet 3.7", tagline: "混合思考旗舰" },
    },
  },
  {
    familyId: "claude-3-5-series",
    familyName: "Claude 3.5 系列",
    vendor: "Anthropic",
    description: "经典高性价比代码模型与 Haiku 轻量模型",
    benchmarkModel: "claude-3-5-sonnet",
    matcher: (name) => /^claude-3-5/i.test(name),
    subModelTaglines: {
      "claude-3-5-sonnet-20241022": { shortLabel: "Sonnet 新版", tagline: "满血 1022 编程主力" },
      "claude-3-5-sonnet": { shortLabel: "Sonnet 经典", tagline: "经典代码模型" },
      "claude-3-5-haiku": { shortLabel: "Haiku 极速", tagline: "超低延迟快速响应" },
    },
  },
  {
    familyId: "deepseek-series",
    familyName: "DeepSeek R1 / V3 系列",
    vendor: "DeepSeek",
    description: "国产高性价比满血开源旗舰，极低倍率竞争区",
    benchmarkModel: "deepseek-r1",
    matcher: (name) => /^deepseek/i.test(name),
    subModelTaglines: {
      "deepseek-r1": { shortLabel: "R1 深度思考", tagline: "满血数学与代码推演" },
      "deepseek-v3": { shortLabel: "V3 全能基座", tagline: "超高性价比主力" },
    },
  },
  {
    familyId: "gemini-2-series",
    familyName: "Google Gemini 2.0 系列",
    vendor: "Google",
    description: "超快响应、多模态与超长上下文",
    benchmarkModel: "gemini-2.0-flash",
    matcher: (name) => /^gemini-2/i.test(name),
    subModelTaglines: {
      "gemini-2.0-flash": { shortLabel: "2.0 Flash", tagline: "毫秒级响应" },
      "gemini-2.0-pro": { shortLabel: "2.0 Pro", tagline: "超强多模态推理" },
    },
  },
];

/**
 * 解析 Offer 的计费公式与最优命中分组
 */
export function resolveOfferFormula(
  offer: RelayV1Offer,
  siteGroups: RelayV1Group[],
): PriceFormulaBreakdown {
  const isImage = offer.modelType === "image";
  const basePrice = isImage
    ? (offer.perCallPrice ?? 0)
    : (offer.inputRate ?? offer.outputRate ?? 0);

  const basePriceType: PriceFormulaBreakdown["basePriceType"] = isImage
    ? "per_call"
    : offer.inputRate != null
    ? "input_rate"
    : "output_rate";

  if (siteGroups.length === 0 || basePrice <= 0) {
    const formattedBase = isImage ? `¥${basePrice}` : `${basePrice}×`;
    return {
      basePrice,
      basePriceType,
      groupName: "标准基准",
      groupRate: 1.0,
      effectivePrice: basePrice,
      formulaText: `${formattedBase}`,
      hasGroupDiscount: false,
      isDerivedSource: Boolean(offer.priceSource),
      applicableGroupsCount: 0,
    };
  }

  // 筛选适用分组
  const candidateGroups =
    offer.enabledGroups && offer.enabledGroups.length > 0
      ? siteGroups.filter((g) => offer.enabledGroups.includes(g.name))
      : siteGroups;

  let optimalGroup: RelayV1Group | null = null;
  let minRate = Number.POSITIVE_INFINITY;

  for (const group of candidateGroups) {
    if (group.rateMin != null && group.rateMin > 0 && group.rateMin < minRate) {
      minRate = group.rateMin;
      optimalGroup = group;
    }
  }

  // 未指定分组时优先 default
  if (!optimalGroup && (!offer.enabledGroups || offer.enabledGroups.length === 0)) {
    const defaultGroup = siteGroups.find((g) => g.name.toLowerCase() === "default");
    if (defaultGroup && defaultGroup.rateMin != null && defaultGroup.rateMin > 0) {
      optimalGroup = defaultGroup;
      minRate = defaultGroup.rateMin;
    }
  }

  const groupRate = Number.isFinite(minRate) ? minRate : 1.0;
  const groupName = optimalGroup ? optimalGroup.name : "默认";
  const effectivePrice = basePrice * groupRate;
  const hasGroupDiscount = Math.abs(groupRate - 1.0) > 1e-5;

  const baseText = isImage ? `¥${basePrice}` : `${basePrice}×`;
  const rateText = `${groupRate}×`;
  const effectiveText = isImage
    ? `¥${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(effectivePrice)}`
    : `${new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(effectivePrice)}×`;

  const formulaText = hasGroupDiscount
    ? `基准 ${baseText} × [${groupName} ${rateText}] = ${effectiveText}`
    : `基准 ${baseText}`;

  return {
    basePrice,
    basePriceType,
    groupName,
    groupRate,
    effectivePrice,
    formulaText,
    hasGroupDiscount,
    isDerivedSource: Boolean(offer.priceSource),
    applicableGroupsCount: candidateGroups.length,
    optimalGroupRemark: optimalGroup?.remark,
  };
}

function calculatePercentileValue(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedAsc[base + 1] !== undefined) {
    return sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]);
  }
  return sortedAsc[base];
}

export function computePriceDistributionStats(prices: number[]): PriceDistributionStats {
  const validPrices = prices.filter((p) => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  const n = validPrices.length;

  if (n === 0) {
    return { count: 0, min: 0, p20: 0, p50: 0, p70: 0, max: 0, iqr: 0, spreadRatio: 1 };
  }

  const min = validPrices[0];
  const max = validPrices[n - 1];
  const p20 = calculatePercentileValue(validPrices, 0.20);
  const p50 = calculatePercentileValue(validPrices, 0.50);
  const p70 = calculatePercentileValue(validPrices, 0.70);
  const p25 = calculatePercentileValue(validPrices, 0.25);
  const p75 = calculatePercentileValue(validPrices, 0.75);
  const iqr = p75 - p25;
  const spreadRatio = min > 0 ? max / min : 1;

  return { count: n, min, p20, p50, p70, max, iqr, spreadRatio };
}

export function assignPriceTier(price: number, stats: PriceDistributionStats): PriceTierInfo {
  if (stats.count < 3 || stats.max - stats.min < 1e-6) {
    return {
      tier: "T2",
      label: "稳健主流",
      badgeClass: "border-black bg-white text-black",
      tagColor: "#111111",
      description: "价格处于全网基准水平",
    };
  }

  if (price <= stats.p20 + 1e-6) {
    return {
      tier: "T1",
      label: "极限低价",
      badgeClass: "border-black bg-black text-white",
      tagColor: "#059669",
      description: `全网前 20% 极致低价 (≤ ${stats.p20.toFixed(4)}×)`,
    };
  }

  if (price > stats.p70 + 1e-6) {
    return {
      tier: "T3",
      label: "官号高溢",
      badgeClass: "border-black/30 bg-[#f4f4f0] text-black/60",
      tagColor: "#7c3aed",
      description: `高规格官号/高SLA溢价档 (> ${stats.p70.toFixed(4)}×)`,
    };
  }

  return {
    tier: "T2",
    label: "稳健主流",
    badgeClass: "border-black bg-white text-black",
    tagColor: "#4b5563",
    description: "处于全网中位均衡区间",
  };
}

export function aggregateModelFamilies(
  sites: RelayV1Site[],
  families: ModelFamilyConfig[] = PRESET_MODEL_FAMILIES,
): ModelFamilyGroup[] {
  return families.map((family) => {
    const modelMap = new Map<
      string,
      {
        siteCount: number;
        offers: Array<{ site: RelayV1Site; effectivePrice: number; modelType: RelayV1Offer["modelType"] }>;
      }
    >();

    const siteIdSet = new Set<string>();

    for (const site of sites) {
      for (const offer of site.offers) {
        if (!family.matcher(offer.modelName)) continue;
        siteIdSet.add(site.id);
        const formula = resolveOfferFormula(offer, site.groups);
        if (formula.effectivePrice <= 0) continue;

        const current = modelMap.get(offer.modelName) ?? { siteCount: 0, offers: [] };
        current.siteCount += 1;
        current.offers.push({
          site,
          effectivePrice: formula.effectivePrice,
          modelType: offer.modelType,
        });
        modelMap.set(offer.modelName, current);
      }
    }

    const subModels: FamilyModelSummary[] = [...modelMap.entries()]
      .map(([modelName, data]) => {
        const sorted = [...data.offers].sort((a, b) => a.effectivePrice - b.effectivePrice);
        const best = sorted[0] || null;
        const prices = sorted.map((item) => item.effectivePrice);
        const stats = computePriceDistributionStats(prices);

        const latencies = data.offers
          .map((o) => o.site.performance?.ttftP50Ms)
          .filter((t): t is number => t != null && t > 0);
        const avgP50 = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;

        const tagInfo = family.subModelTaglines?.[modelName] ?? {
          shortLabel: modelName.replace(new RegExp(`^${family.vendor}-?`, "i"), ""),
          tagline: "通用标准版",
        };

        return {
          modelName,
          displayName: modelName,
          shortLabel: tagInfo.shortLabel,
          tagline: tagInfo.tagline,
          siteCount: data.siteCount,
          lowestPrice: best ? best.effectivePrice : null,
          lowestPriceSite: best
            ? { id: best.site.id, name: best.site.name, domain: best.site.domain }
            : null,
          medianPrice: stats.p50 > 0 ? stats.p50 : null,
          avgP50,
          priceUnit: (best?.modelType === "image" ? "cny_per_call" : "multiplier") as "multiplier" | "cny_per_call",
        };
      })
      .sort((a, b) => b.siteCount - a.siteCount);

    const validLowest = subModels
      .map((m) => m.lowestPrice)
      .filter((p): p is number => p != null && p > 0);
    const overallLowestPrice = validLowest.length > 0 ? Math.min(...validLowest) : null;

    return {
      familyId: family.familyId,
      familyName: family.familyName,
      vendor: family.vendor,
      description: family.description,
      benchmarkModel: family.benchmarkModel,
      totalSitesCovered: siteIdSet.size,
      overallLowestPrice,
      subModels,
    };
  });
}
