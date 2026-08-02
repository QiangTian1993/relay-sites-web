# 技术方案 v1 — 中转站聚合产品

**项目代号**: relay-aggregator-v1
**文档版本**: v1.0 (2026-07-26)
**配套 PRD**: [prd-v1-relay-aggregator.md](../01-prd/prd-v1-relay-aggregator.md)
**作者**: 小珠（自执行）

---

## 1. 架构总览

### 1.1 现状

```
[强哥 OpenClaw (me)]
     │
     │ (cron 5min) scripts/fetch-data.ts
     ▼
[飞书 KB] ─── relay_sites_tracker / vibe_coding_tracker / model_rates
     │
     │ (本地 JSON 缓存)
     ▼
[relay-sites-web Next.js 14]
     │ (Swiss design, Tailwind, App Router)
     ▼
[用户浏览器]
```

### 1.2 目标架构

```
[qz API]
  ├─ /api/sites                (cron 5min) ──► [scripts/sync-qz-data.ts]
  └─ /api/performance-summary  (cron 5min) ──►          │
                                                         │ bot 身份
                                                         ▼
                                                  [飞书 KB]
                                                  ├─ relay_sites_tracker (已有)
                                                  ├─ relay_site_groups    (NEW)
                                                  └─ relay_site_perf      (NEW)
                                                         │
                                                         │ (cron 5min)
                                                         ▼
                                                  [scripts/fetch-data.ts]
                                                         │
                                                         ▼
                                                  [relay-sites-web/data/*.json]
                                                         │
                                                         ▼
                                                  [Next.js 14 ISR 渲染]
                                                         │
                                                         ▼
                                                  [用户浏览器]
```

### 1.3 关键决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 数据回流 | qz → KB → 本地 JSON | 数据可在 KB 编辑，与现有流程一致 |
| UI 框架 | Next.js 14 + App Router（已有） | 零迁移成本 |
| 样式 | Tailwind + Swiss design tokens（已有）| 强哥定的设计语言 |
| 实时性 | ISR 5min revalidate | 与 cron 同步，无需 WebSocket |
| 状态管理 | React Server Components（无需 client store）| 数据驱动 UI |
| 部署 | Next.js standalone / Vercel（待定） | 现成 |

---

## 2. 数据层

### 2.1 新建 KB 表（飞书 Base）

#### 表 1: `relay_site_groups`

| 字段 | 类型 | 说明 |
|---|---|---|
| `site_id` | text | 链接到 relay_sites_tracker |
| `site_name` | text | 冗余存，方便查询 |
| `group_name` | text | 分组名（如 "Claude Az 官Key渠道"）|
| `rate_min` | number | 最低倍率 |
| `rate_max` | number | 最高倍率 |
| `rate_values` | longtext | 完整倍率列表 "0.05x,0.1x,0.15x" |
| `rate_source` | single-select | group / model / system |
| `related_model_count` | number | 相关模型数 |
| `related_models_json` | longtext | 相关模型数组 JSON |
| `remark` | longtext | 分组备注 |
| `change_direction` | single-select | up / down / flat |
| `change_delta` | number | 变化百分比 |
| `updated_at` | date | 更新时间 |

预计行数：~150 站 × 平均 8 组 = 1200 行

#### 表 2: `relay_site_perf`

| 字段 | 类型 | 说明 |
|---|---|---|
| `site_id` | text | 链接到 relay_sites_tracker |
| `site_name` | text | 冗余存 |
| `host` | url | 域名 |
| `success_rate` | number | 成功率（%）|
| `ttft_p50_ms` | number | 首字延迟 P50 |
| `latency_p95_ms` | number | 总延迟 P95 |
| `tps_avg` | number | 输出速度 |
| `availability_24h` | number | 24h 可用率 |
| `availability_7d` | number | 7d 可用率 |
| `consecutive_failures` | number | 连续失败次数 |
| `last_probe_at` | date | 最后探针时间 |

预计行数：~42 站（qz 测过的）

### 2.2 表创建步骤

由于飞书 Base 没有 schema create API，需**手动在飞书 UI 创建**：
1. 打开 KB base
2. 新建表 `relay_site_groups`，按上表加字段
3. 新建表 `relay_site_perf`，按上表加字段
4. 拿到 2 个 `table_id`，填入 `lib/tables.ts`

---

## 3. 代码结构

### 3.1 新增文件

```
relay-sites-web/
├── scripts/
│   └── sync-qz-data.ts            # NEW: qz → KB 同步脚本
├── lib/
│   ├── qz-types.ts                # NEW: qz API 类型定义
│   └── tables.ts                  # MOD: 加 2 个 entry
├── app/
│   ├── page.tsx                   # MOD: 加模型比价视图
│   ├── sites/
│   │   └── [id]/
│   │       └── page.tsx           # MOD: 加分组 + 性能面板
│   ├── models/                    # NEW
│   │   └── [name]/
│   │       └── page.tsx
│   └── components/
│       ├── site-groups.tsx        # NEW
│       ├── site-perf.tsx          # NEW
│       ├── price-change-badge.tsx # NEW
│       ├── risk-signals.tsx       # NEW
│       └── filter-sidebar.tsx     # NEW
├── data/
│   ├── relay_site_groups.json     # NEW (after fetch)
│   └── relay_site_perf.json       # NEW (after fetch)
```

### 3.2 关键模块设计

#### 3.2.1 `lib/qz-types.ts`

```typescript
export interface QzSite {
  id: string;
  name: string;
  host: string;
  framework: string;
  groupRows: QzGroupRow[];
  sync: {
    consecutiveFailures: number;
    lastSuccessAt: string;
    settings: {
      registrationEnabled: boolean;
      emailVerifyEnabled: boolean;
      topupEnabled: boolean;
    };
    counts: {
      modelsAvailable: number;
      textModels: number;
      imageModels: number;
      videoModels: number;
    };
  };
  monitorRows?: QzMonitorRow[];
  sponsor?: { enabled: boolean; priority: number; label: string };
}

export interface QzGroupRow {
  name: string;
  rate_multiplier: string;
  rate_multiplier_min: number;
  rate_multiplier_max: number;
  rate_multiplier_values: string[];
  related_model_count: number;
  related_models: string[];
  remark: string;
  change?: { rate: { direction: 'up' | 'down' | 'flat'; delta: number } };
}

export interface QzMonitorRow {
  name: string;
  provider: string;
  primary_model: string;
  availability: number;
  availability24h: number;
  availability7d: number;
  latencyMs: number;
  status: string;
  remark?: string;
}

export interface QzPerfSummary {
  generatedAt: string;
  summary: { successRate: number; ttftP50Ms: number; latencyP95Ms: number; tpsAvg: number };
  sites: Record<string, { name: string; host: string; ok: boolean; tier: string; groups: Record<string, any> }>;
}
```

#### 3.2.2 `scripts/sync-qz-data.ts`

伪代码：

```typescript
import { TABLES } from "../lib/tables";
import type { QzSite, QzPerfSummary } from "../lib/qz-types";

const QZ_BASE = "https://relay.qizhang.org";

async function fetchSites(): Promise<QzSite[]> {
  const r = await fetch(`${QZ_BASE}/api/sites`);
  const j = await r.json();
  return j.sites;
}

async function fetchPerf(): Promise<QzPerfSummary> {
  const r = await fetch(`${QZ_BASE}/api/performance-summary`);
  return await r.json();
}

async function upsertGroups(sites: QzSite[]) {
  const tableId = TABLES.find(t => t.id === "relay_site_groups").tableId;
  for (const site of sites) {
    for (const g of site.groupRows) {
      const fields = {
        site_id: site.id,
        site_name: site.name,
        group_name: g.name,
        rate_min: g.rate_multiplier_min,
        rate_max: g.rate_multiplier_max,
        rate_values: g.rate_multiplier_values.join(","),
        related_model_count: g.related_model_count,
        related_models_json: JSON.stringify(g.related_models),
        remark: g.remark,
        change_direction: g.change?.rate.direction ?? "flat",
        change_delta: g.change?.rate.delta ?? 0,
      };
      await larkUpsert(tableId, fields);
      await sleep(0.6); // QPS 限流
    }
  }
}

async function upsertPerf(perf: QzPerfSummary) {
  // 类似，省略
}

async function main() {
  const sites = await fetchSites();
  const perf = await fetchPerf();
  await upsertGroups(sites);
  await upsertPerf(perf);
}
```

#### 3.2.3 `lib/tables.ts` 扩展

在 `TABLES` 数组末尾加：

```typescript
{
  id: "relay_site_groups",
  tableId: "TBD_grp",  // 强哥创建后填
  displayName: "站点分组倍率",
  description: "每个站的具体分组 + 倍率明细（来自 qz groupRows）",
  primaryKey: "site_name",
  titleField: "group_name",
  subtitleField: "site_name",
  color: "emerald",
  fields: [
    { key: "site_name", label: "站点", type: "text", searchable: true, primary: true },
    { key: "group_name", label: "分组名", type: "text", searchable: true, sortable: true, primary: true },
    { key: "rate_min", label: "最低倍率", type: "number", sortable: true, formatHint: "rate" },
    { key: "rate_max", label: "最高倍率", type: "number", sortable: true, formatHint: "rate" },
    { key: "rate_values", label: "完整倍率", type: "longtext" },
    { key: "related_model_count", label: "模型数", type: "number", sortable: true },
    { key: "related_models_json", label: "模型列表", type: "longtext" },
    { key: "remark", label: "备注", type: "longtext" },
    { key: "change_direction", label: "变化", type: "single-select", filterable: true },
    { key: "change_delta", label: "幅度%", type: "number", sortable: true },
    { key: "updated_at", label: "更新时间", type: "date", sortable: true },
  ],
},
{
  id: "relay_site_perf",
  tableId: "TBD_perf",
  displayName: "站点性能",
  description: "qz 实测的性能数据（成功率 / TTFT / P95 / TPS）",
  primaryKey: "site_name",
  titleField: "site_name",
  color: "blue",
  fields: [
    { key: "site_name", label: "站点", type: "text", searchable: true, primary: true },
    { key: "host", label: "域名", type: "url" },
    { key: "success_rate", label: "成功率", type: "number", sortable: true, formatHint: "rate" },
    { key: "ttft_p50_ms", label: "TTFT P50", type: "number", sortable: true },
    { key: "latency_p95_ms", label: "P95 延迟", type: "number", sortable: true },
    { key: "tps_avg", label: "TPS", type: "number", sortable: true },
    { key: "availability_24h", label: "24h 可用率", type: "number", sortable: true, formatHint: "rate" },
    { key: "availability_7d", label: "7d 可用率", type: "number", sortable: true, formatHint: "rate" },
    { key: "consecutive_failures", label: "连续失败", type: "number", sortable: true },
    { key: "last_probe_at", label: "最后探针", type: "date", sortable: true },
  ],
},
```

---

## 4. UI 实施

### 4.1 实施阶段

| 阶段 | 内容 | 工时估计 |
|---|---|---|
| **Phase 1: 数据层** | 建 KB 表 + sync 脚本 + backfill | 1-2 小时 |
| **Phase 2: 基础 UI** | 列表页 + 详情页框架 + Swiss 化 | 2-3 小时 |
| **Phase 3: 核心功能** | 分组表 + 性能面板 + 筛选器 | 3-4 小时 |
| **Phase 4: 高级功能** | 比价视图 + 涨价提示 + 风控预警 | 2-3 小时 |
| **Phase 5: 打磨** | 移动端 + 暗色 + 性能优化 | 1-2 小时 |

**总工时：~10-15 小时**

### 4.2 Phase 1 详细步骤（立即执行）

1. **建 KB 表** — 强哥在飞书 UI 手动建 2 张表，告诉我 table_id
2. **写 `lib/qz-types.ts`** — qz API 类型定义
3. **改 `lib/tables.ts`** — 加 2 个 TABLES entry（先 TBD）
4. **写 `scripts/sync-qz-data.ts`** — 同步脚本
5. **backfill 151 站 groupRows** — 一次性写入
6. **验证** — `npm run fetch` 拉新数据 → 前端展示

### 4.3 Phase 2-5 暂略，待 Phase 1 验收后再展开

---

## 5. 验证与回滚

### 5.1 验证清单

| 阶段 | 验证项 |
|---|---|
| 数据层 | 抽样 5 站 groupRows 与 qz 一致 |
| 数据层 | 42 站 perf 数据正确 |
| UI | 列表页加载 < 1s |
| UI | 详情页分组展开/折叠流畅 |
| 同步 | cron 5min 后数据自动更新 |

### 5.2 回滚方案

| 风险 | 回滚 |
|---|---|
| KB 表 schema 错了 | 删表重建（飞书支持）|
| sync 脚本写错数据 | 改脚本 + 重跑（幂等 upsert）|
| UI 改了现有页面 | git revert |

---

## 6. 时间表（今天能做的）

| 时间 | 任务 |
|---|---|
| 10:47 | 写技术方案 ✓ |
| 10:50 | 等强哥建 KB 表 + 给 table_id |
| 11:00 | 写 sync-qz-data.ts + lib/qz-types.ts + 改 tables.ts |
| 11:30 | backfill 151 站 groupRows 到 KB |
| 12:00 | 验证 fetch-data 拉新数据 |
| 12:30 | 报告 + 等强哥 review UI 阶段 |

---

**下一步**：等强哥建好 2 张 KB 表 → 我立刻写 sync 脚本 + backfill