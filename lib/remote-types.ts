// 远程探针与行情 API 接口类型定义
// 涵盖站点分组、计费倍率与可用性打点摘要

export interface MarketGroupRow {
  name: string;
  rate_multiplier: string;
  rate_multiplier_min: number | null;
  rate_multiplier_max: number | null;
  rate_multiplier_values: string[];
  rate_source?: string;
  rate_note?: string;
  remark?: string;
  related_model_count: number;
  related_models: string[];
  change?: {
    rate?: {
      direction: "up" | "down" | "flat";
      delta: number;
    };
  };
}

export interface MarketMonitorRow {
  name: string;
  provider: string;
  primary_model: string;
  canonical_group?: string;
  availability: number;
  availability24h: number;
  availability7d: number;
  latencyMs: number;
  pingMs?: number;
  status: string;
  remark?: string;
  source?: string;
  change?: {
    availability?: { direction: string; delta: number };
    latency?: { direction: string; delta: number };
  };
}

export interface MarketSyncSettings {
  siteName?: string;
  registrationEnabled: boolean;
  emailVerifyEnabled: boolean;
  channelMonitorEnabled: boolean;
  topupEnabled?: boolean;
  version?: string;
  currency?: string;
  product?: string;
  description?: string;
  merchantTelegram?: string;
  modelsCount?: number;
  themeTemplate?: string;
  stationSlug?: string;
}

export interface MarketSyncCounts {
  modelsAvailable?: number;
  textModels?: number;
  imageModels?: number;
  videoModels?: number;
  groupsAvailable: number;
  groupsEffective: number;
  groupRates: number;
  channelsAvailable: number;
  flattenedChannels: number;
  monitorsEffective: number;
}

export interface MarketSite {
  id: string;
  name: string;
  host: string;
  framework: string;
  tokenStatus?: string;
  groupStatus?: string;
  rateStatus?: string;
  channelStatus?: string;
  lastCheckedAt?: string;
  notes?: string;
  registerPath?: string;
  monitorPath?: string;
  groupRows: MarketGroupRow[];
  monitorRows?: MarketMonitorRow[];
  sponsor?: {
    enabled: boolean;
    priority?: number;
    label?: string;
  };
  sync: {
    status: string;
    consecutiveFailures: number;
    lastSuccessAt?: string;
    lastError?: string;
    errorCategory?: string;
    settings: MarketSyncSettings;
    counts: MarketSyncCounts;
  };
}

export interface MarketSitesResponse {
  title: string;
  subtitle: string;
  apiPrefix: string;
  apiFlow: string[];
  sites: MarketSite[];
}

export interface MarketPerfSite {
  host: string;
  name: string;
  framework: string;
  provider?: string;
  groupName?: string;
  rate?: string;
  executed: boolean;
  ok: boolean;
  tier: string;
  tierReason?: string;
  httpStatus?: number;
  modelRequested?: string;
  modelReturned?: string;
  probeGroupName?: string;
  errorType?: string;
  error?: string;
  summary?: {
    attempts: number;
    successes: number;
    successRate: number;
    ttftP50Ms: number | null;
    latencyP95Ms: number | null;
    tpsAvg: number | null;
  } | null;
  groups: Record<string, unknown>;
}

export interface MarketPerfSummaryResponse {
  generatedAt: string;
  mode: string;
  runs: number;
  stream: boolean;
  groupProbes: boolean;
  groups: unknown[];
  summary: {
    executedSites: number;
    usableSites: number;
    attempts: number;
    successes: number;
    successRate: number;
    successRatePct: number;
    ttftP50Ms: number | null;
    latencyP95Ms: number | null;
    tpsAvg: number | null;
  };
  groupSummary: Record<string, unknown>;
  sites: Record<string, MarketPerfSite>;
}

// === 派生的 KB record 类型 ===

export interface RelaySiteGroupRecord {
  __id: string;
  site_id: string;
  site_name: string;
  group_name: string;
  rate_min: number | null;
  rate_max: number | null;
  rate_values: string;
  rate_source?: string;
  related_model_count: number;
  related_models_json: string;
  remark: string;
  change_direction: "up" | "down" | "flat" | "";
  change_delta: number;
  updated_at: string;
}

export interface RelaySitePerfRecord {
  __id: string;
  site_id: string;
  site_name: string;
  host: string;
  success_rate: number;
  ttft_p50_ms: number | null;
  latency_p95_ms: number | null;
  tps_avg: number | null;
  availability_24h: number | null;
  availability_7d: number | null;
  consecutive_failures: number;
  last_probe_at: string;
}
