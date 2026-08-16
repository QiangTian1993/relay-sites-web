// 飞书 KB 表配置 —— 加新表 = 在 TABLES 数组里加一个 entry
// 重要：此文件保持为纯数据（无 JSX），特殊渲染逻辑放在 components/cell-renderer.tsx

export type FieldType =
  | "text"
  | "longtext"
  | "number"
  | "single-select"
  | "multi-select"
  | "url"
  | "date";

export interface TableField {
  /** 飞书表里的字段名（key） */
  key: string;
  /** 列表 / 详情页显示名 */
  label: string;
  /** 字段类型，决定默认渲染方式 */
  type: FieldType;
  /** 是否参与搜索（全文模糊匹配） */
  searchable?: boolean;
  /** 是否可过滤（select 类型支持按值过滤） */
  filterable?: boolean;
  /** 是否可排序 */
  sortable?: boolean;
  /** 列表列宽（Tailwind class，如 "w-32"） */
  width?: string;
  /** 详情页是否默认显示（false = 折叠在"更多字段"里） */
  primary?: boolean;
  /** 数字格式化提示 */
  formatHint?: "rate" | "thousands" | "ratio-percent" | "percent" | "currency-cny";
}

export interface TableConfig {
  /** 文件名 slug（用于 data/{id}.json 和路由） */
  id: string;
  /** 飞书 table_id（base/table 那个） */
  tableId: string;
  /** 中文显示名 */
  displayName: string;
  /** 描述（首页卡片副标题） */
  description: string;
  /** 主键字段名（用于 detail 路由 + 列表 title） */
  primaryKey: string;
  /** detail 页大标题字段 */
  titleField: string;
  /** 副标题字段（detail 页 header 副标） */
  subtitleField?: string;
  /** 字段定义（顺序 = 列表列顺序 = 详情字段顺序） */
  fields: TableField[];
  /** 首页主题色（Tailwind 颜色名） */
  color?: string;
  /** 是否仅供内部同步使用，不在网站中展示 */
  hidden?: boolean;
}

// ============================================================================
// 表配置 —— 加新表 = 在这里加一个 entry，UI 和 fetch 脚本自动适配
// ============================================================================

export const TABLES: TableConfig[] = [
  {
    id: "relay_sites_tracker",
    tableId: "tblxY3tOnccSAxyg",
    displayName: "中转站档案",
    description: "AI 中转站实体档案：Provider、接入条件、框架、原始倍率与性能覆盖",
    primaryKey: "站点ID",
    titleField: "名称",
    subtitleField: "域名",
    color: "emerald",
    fields: [
      { key: "名称", label: "名称", type: "text", searchable: true, sortable: true, primary: true },
      { key: "域名", label: "域名", type: "url", primary: true },
      { key: "支持的 provider", label: "支持的 Provider", type: "multi-select", filterable: true },
      { key: "分组倍率", label: "分组倍率", type: "text", primary: true },
      { key: "最低倍率", label: "最低倍率", type: "number", sortable: true, formatHint: "rate" },
      { key: "框架", label: "框架", type: "single-select", filterable: true },
      { key: "模型检测", label: "模型检测", type: "longtext", searchable: true },
      { key: "备注", label: "备注", type: "longtext" },
      { key: "最后检查", label: "最后检查", type: "date" },
    ],
  },
  {
    id: "vibe_coding_tracker",
    tableId: "tblNIf9J7dvQscDc",
    displayName: "AI 编程工具",
    description: "Vibe coding / AI 编程工具（Cursor/Claude Code/Cline 等）",
    primaryKey: "工具名",
    titleField: "工具名",
    color: "blue",
    fields: [
      { key: "工具名", label: "工具名", type: "text", searchable: true, sortable: true, primary: true },
      { key: "评分", label: "评分", type: "number", sortable: true },
      { key: "类型", label: "类型", type: "single-select", filterable: true, primary: true },
      { key: "厂商", label: "厂商", type: "text", searchable: true },
      { key: "支持的模型", label: "支持的模型", type: "multi-select", filterable: true },
      { key: "平台", label: "平台", type: "multi-select", filterable: true },
      { key: "适用场景", label: "适用场景", type: "multi-select", filterable: true },
      { key: "中文支持", label: "中文支持", type: "single-select", filterable: true },
      { key: "多Agent支持", label: "多 Agent 支持", type: "single-select", filterable: true },
      { key: "GitHub stars", label: "GitHub Stars", type: "number", sortable: true, formatHint: "thousands" },
      { key: "GitHub URL", label: "GitHub URL", type: "url" },
      { key: "定价", label: "定价", type: "text" },
      { key: "活动权益", label: "活动权益", type: "longtext", searchable: true },
      { key: "活动链接", label: "活动链接", type: "url" },
      { key: "活动期限", label: "活动期限", type: "text", searchable: true },
      { key: "链接", label: "官网", type: "url", primary: true },
      { key: "产品定位", label: "产品定位", type: "longtext" },
      { key: "目标用户", label: "目标用户", type: "longtext" },
      { key: "使用建议", label: "使用建议", type: "longtext" },
      { key: "竞品对比", label: "竞品对比", type: "longtext" },
      { key: "核心优势", label: "核心优势", type: "longtext" },
      { key: "主要劣势", label: "主要劣势", type: "longtext" },
      { key: "备注", label: "备注", type: "longtext" },
      { key: "我的状态", label: "我的状态", type: "single-select", filterable: true },
    ],
  },
  {
    id: "model_rates",
    hidden: true,
    // 强哥需要在飞书 base 手动创建这个表后填入 tableId
    // 临时占位：先用 "TBD"，fetch-data.ts 检测到 "TBD" 会跳过飞书同步
    tableId: "tbl5EDYdDtH8SlXM",
    displayName: "模型倍率",
    description: "各中转站的详细模型倍率（文本按量/图像按次）— per-model 粒度，支持生图 vs 文本区分",
    primaryKey: "model_name",
    titleField: "model_name",
    subtitleField: "site_name",
    color: "accent",
    fields: [
      { key: "site_id", label: "站点 ID", type: "text", searchable: true, sortable: true },
      { key: "site_name", label: "站点名", type: "text", searchable: true, sortable: true, primary: true },
      { key: "source_domain", label: "源域名", type: "text", searchable: true, sortable: true },
      { key: "model_name", label: "模型名", type: "text", searchable: true, sortable: true, primary: true },
      { key: "model_type", label: "模型类型", type: "single-select", filterable: true, sortable: true, primary: true },
      { key: "rate_input", label: "Input 倍率", type: "number", sortable: true, formatHint: "rate" },
      { key: "rate_output", label: "Output 倍率", type: "number", sortable: true, formatHint: "rate" },
      { key: "rate_cache", label: "Cache 倍率", type: "number", sortable: true, formatHint: "rate" },
      { key: "rate_create_cache", label: "Cache 写入倍率", type: "number", sortable: true, formatHint: "rate" },
      { key: "model_price", label: "按次价格", type: "number", sortable: true, formatHint: "currency-cny" },
      { key: "enable_groups", label: "启用分组", type: "text", searchable: true },
      { key: "fetched_at", label: "获取时间", type: "date", sortable: true },
    ],
  },
  // === v1 新增（PRD-v1-relay-aggregator）===
  {
    id: "relay_site_groups",
    hidden: true,
    // 2026-07-26 由小珠通过 lark-cli +table-create 自动创建
    tableId: "tblIZtZllNUaSuud",
    displayName: "站点分组倍率",
    description: "每个站当前的分组与倍率明细（来自 qizhang.org groupRows）",
    primaryKey: "site_name",
    titleField: "group_name",
    subtitleField: "site_name",
    color: "emerald",
    fields: [
      { key: "site_id", label: "站点 ID", type: "text", searchable: true, sortable: true },
      { key: "site_name", label: "站点", type: "text", searchable: true, sortable: true, primary: true },
      { key: "group_name", label: "分组名", type: "text", searchable: true, sortable: true, primary: true },
      { key: "rate_min", label: "最低倍率", type: "number", sortable: true, formatHint: "rate" },
      { key: "rate_max", label: "最高倍率", type: "number", sortable: true, formatHint: "rate" },
      { key: "rate_values", label: "完整倍率", type: "longtext" },
      { key: "rate_source", label: "倍率来源", type: "single-select", filterable: true },
      { key: "related_model_count", label: "模型数", type: "number", sortable: true },
      { key: "related_models_json", label: "模型列表 JSON", type: "longtext" },
      { key: "remark", label: "备注", type: "longtext" },
      { key: "change_direction", label: "变化方向", type: "single-select", filterable: true },
      { key: "change_delta", label: "变化幅度%", type: "number", sortable: true, formatHint: "rate" },
      { key: "updated_at", label: "更新时间", type: "date", sortable: true },
    ],
  },
  {
    id: "relay_site_perf",
    hidden: true,
    // 2026-07-26 由小珠通过 lark-cli +table-create 自动创建
    tableId: "tblgFmai5SmdDNIZ",
    displayName: "站点性能",
    description: "全网并发打点网络性能实测（成功率 / TTFT / P95 / TPS / 可用率）",
    primaryKey: "site_name",
    titleField: "site_name",
    color: "blue",
    fields: [
      { key: "site_id", label: "站点 ID", type: "text", searchable: true, sortable: true },
      { key: "site_name", label: "站点", type: "text", searchable: true, sortable: true, primary: true },
      { key: "host", label: "域名", type: "url" },
      { key: "success_rate", label: "成功率", type: "number", sortable: true, formatHint: "ratio-percent" },
      { key: "ttft_p50_ms", label: "TTFT P50 (ms)", type: "number", sortable: true },
      { key: "latency_p95_ms", label: "P95 延迟 (ms)", type: "number", sortable: true },
      { key: "tps_avg", label: "TPS", type: "number", sortable: true },
      { key: "availability_24h", label: "24h 可用率", type: "number", sortable: true, formatHint: "percent" },
      { key: "availability_7d", label: "7d 可用率", type: "number", sortable: true, formatHint: "percent" },
      { key: "consecutive_failures", label: "连续失败次数", type: "number", sortable: true },
      { key: "last_probe_at", label: "最后探针", type: "date", sortable: true },
    ],
  },
  {
    id: "github_trending",
    hidden: true,
    // 2026-08-06 由 fetch-github-trending.ts 采集脚本创建（lark-cli +table-create）
    // 定时任务：.github/workflows/github-trending.yml（每日 08:00/21:00 daily、每周日 weekly、每月 1 日 monthly）
    tableId: "tbl4UDd9AP1Fzlfz",
    displayName: "GitHub 热榜",
    description: "GitHub Trending 定时采集（周期 × 语言），主键 (仓库, 周期)",
    primaryKey: "仓库",
    titleField: "仓库",
    subtitleField: "语言",
    color: "gray",
    fields: [
      { key: "排名", label: "排名", type: "number", sortable: true },
      { key: "仓库", label: "仓库", type: "text", searchable: true, sortable: true, primary: true },
      { key: "链接", label: "链接", type: "url" },
      { key: "描述", label: "描述", type: "longtext", searchable: true },
      { key: "中文描述", label: "中文描述", type: "longtext", searchable: true, primary: true },
      { key: "语言", label: "语言", type: "text", filterable: true, sortable: true },
      { key: "功能分类", label: "功能分类", type: "single-select", filterable: true },
      { key: "总星数", label: "总星数", type: "number", sortable: true, formatHint: "thousands" },
      { key: "周期内新增星数", label: "周期内新增星数", type: "number", sortable: true, formatHint: "thousands" },
      { key: "Fork 数", label: "Fork 数", type: "number", sortable: true, formatHint: "thousands" },
      { key: "周期", label: "周期", type: "single-select", filterable: true },
      { key: "采集时间", label: "采集时间", type: "date", sortable: true },
    ],
  },
];

export const VISIBLE_TABLES = TABLES.filter((table) => !table.hidden);

// ============================================================================
// Helpers
// ============================================================================

export function getTable(id: string): TableConfig | undefined {
  return TABLES.find((t) => t.id === id);
}

export function getVisibleTable(id: string): TableConfig | undefined {
  return VISIBLE_TABLES.find((t) => t.id === id);
}

export function getFieldLabel(table: TableConfig, key: string): string {
  return table.fields.find((f) => f.key === key)?.label ?? key;
}
