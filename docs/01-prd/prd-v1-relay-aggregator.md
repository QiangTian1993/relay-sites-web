# PRD v1 — 中转站聚合产品

**项目代号**: relay-aggregator-v1
**文档版本**: v1.0 (2026-07-26)
**作者**: 小珠
**状态**: 待强哥 review

---

## 1. 背景与目标

### 1.1 问题

当前个人开发者和终端用户在选择 AI 中转站时缺乏数据支撑：

- **价格不透明**：每个站的分组倍率、隐藏组、促销组各异，肉眼比价几乎不可能
- **稳定性盲区**：站是不是要挂了、风控严不严重、跑路风险——只能凭口碑
- **决策成本高**：每开一个新项目就要重新调研一轮中转站
- **现有参考站（qizhang.org / helpaio.com）的局限**：
  - qizhang.org：实测数据准（42 站），但分组明细要逐站展开，无跨站比价
  - helpaio.com：评测聚合，站点覆盖窄（15+ 站）
  - 两者都不是"以选站为目标的决策工具"

### 1.2 目标

**用户 30 秒内找到适合自己场景的中转站**。

具体可衡量：

| 指标 | 目标 |
|---|---|
| 选站时间 | < 30 秒（vs 当前 5-15 分钟调研）|
| 数据新鲜度 | < 5 分钟延迟 |
| 跨站比价准确度 | 100%（与 qz /api/sites 抽样一致）|
| 站点覆盖 | ≥ 90% 已收录（≥ 150 / 165）|

### 1.3 非目标（v1 不做）

- 个人收藏 / 关注的站
- 导出 CSV / API
- 站长自助认领
- 个性化推荐
- 充值 / 支付集成
- 用户系统 / 登录

---

## 2. 用户与场景

### 2.1 用户画像

| 用户 | 占比 | 核心痛点 |
|---|---|---|
| 个人开发者（强哥本人） | 主 | 跨项目选站决策；监控自己用的站 |
| 终端用户（接 API 的人） | 次 | 比价 + 稳定性验证 |
| 站长 | 极少数（v2）| 自助更新 + 看运营数据 |

### 2.2 核心场景

**场景 A：跨项目选站**
> 强哥接了个新需求要用 GPT-5.6 + Claude 4.5，需求稳定 + 便宜 + 模型全。

**场景 B：单项目比价**
> 强哥现在用 A 站，听说 B 站更便宜，想知道真实差价 + 是否影响性能。

**场景 C：风险监控**
> 强哥用的站最近涨价 / 连续失败，需要知道是否要换。

**场景 D：模型横向对比**
> 强哥想看 GPT-5.6 在所有站的价格分布，决定要不要去便宜的站试。

---

## 3. 核心功能

### 3.1 🟥 MUST（v1 必做）

#### F.01 跨站比价（按模型查所有站）

**用户故事**：作为开发者，我想选 GPT-5.6，立刻看到所有站的价格排序。

**交互**：
- 顶部模型选择器（搜索 + 分类）
- 下方价格表：站名 / 分组 / 倍率 / 24h 可用率 / 状态
- 默认按倍率升序，可切换其他维度

**验收**：
- 选择模型后 ≤ 1s 渲染
- 价格与 qz /api/sites 100% 一致（抽样 5 站）
- 支持的模型 ≥ 100 个

#### F.02 关键指标排序

**用户故事**：我想按可用率 / 倍率 / 首字延迟排序找站。

**交互**：
- 表格列可点击排序
- 顶部有 4 个排序快捷入口：「最便宜 / 最稳定 / 最快 / 综合推荐」

**验收**：
- 4 种排序模式全覆盖
- 排序结果与 qz 数据一致

#### F.03 7 天可用率 + 趋势

**用户故事**：我想知道这个站最近一周是不是稳定，24h 数据太短。

**交互**：
- 数字显示 + sparkline（小折线图）
- 24h / 7d 切换
- 颜色编码：≥ 95% 绿 / 90-95% 黄 / < 90% 红

**验收**：
- 至少 7 天数据点
- 颜色阈值与全站一致
- 仅展示 qz 测过的站（42 站），其余显示「未测」

#### F.04 分组列表 + 倍率明细

**用户故事**：我想看这个站具体有哪些分组，每个分组什么倍率。

**交互**：
- 站点详情页分组表：分组名 / 倍率（min-max）/ 备注 / 相关模型数
- 按 provider 折叠/展开
- 分组名 hover 显示完整描述

**验收**：
- 所有 165 站都有分组列表（来自 qz groupRows）
- 折叠/展开状态保存到 localStorage
- 备注正确显示（含 emoji / 中文）

#### F.05 筛选器

**用户故事**：我想按 provider / 倍率区间 / 可用率门槛过滤。

**交互**：
- 左侧 sidebar 筛选面板：
  - Provider 多选（OpenAI / Claude / Gemini / xAI / DeepSeek / Qwen / GLM / Kimi / 豆包 / Hunyuan）
  - 倍率区间 slider（0-2x）
  - 可用率门槛（≥ 90% / ≥ 95% / ≥ 98%）
- 实时过滤（输入即筛）
- 顶部显示「共 N 站符合条件」

**验收**：
- 3 类筛选可叠加
- 筛选结果数正确
- 移动端可折叠

#### F.06 数据更新时间

**用户故事**：我想知道这个数据是不是新鲜的。

**交互**：
- 顶部固定栏：「数据更新于 X 分钟前」
- hover 显示具体时间 + 数据源
- 超过 30 分钟标黄，超过 1 小时标红

**验收**：
- 全站统一时间戳
- 时间显示用相对时间（X 分钟前）
- 数据陈旧时明确提示

### 3.2 🟨 SHOULD（v1 推荐做）

#### F.07 涨价降价提示

**用户故事**：我想知道这个站的分组最近有没有涨价 / 降价。

**交互**：
- 分组列表行尾 badge：
  - 涨：红 badge `+10%`
  - 降：绿 badge `-15%`
- badge 点击显示历史曲线（v2）

**验收**：
- 来自 qz `groupRows[].change.rate.direction`
- 涨/降/持平 3 态
- delta% 显示精确值

#### F.08 性能数据（首字延迟 + 输出速度）

**用户故事**：我想看这个站实际响应快不快。

**交互**：
- 站点详情页性能面板：
  - TTFT P50（ms）
  - P95 总延迟（ms）
  - 输出速度（tokens/s）
- 三维雷达图 / 柱状图对比（同 provider 其他站）

**验收**：
- 仅展示 qz 测过的 42 站
- 缺失数据明确标「未测」
- 性能数据来源：qz /api/performance-summary

#### F.09 风控 + 跑路预警

**用户故事**：我想知道这个站是不是要出事了。

**交互**：
- 站点卡片 / 详情页风险信号：
  - 连续失败次数 >3 → 红色警示
  - `topupEnabled=false` → 「不接受新充值」badge
  - `emailVerifyEnabled=true` → 「注册需邮箱验证」灰色 tag
- 顶部风险汇总：全网 N 站异常 / M 站关闭充值

**验收**：
- 风险信号至少 3 类
- 数据来自 qz `sync.consecutiveFailures` / `sync.settings.topupEnabled`
- 严重风险显示在首页置顶

---

## 4. 页面结构

### 4.1 信息架构

```
首页 (/)
├── 模型比价视图（默认）
│   ├── 顶部模型选择器
│   ├── 价格表（按模型查所有站）
│   └── 筛选器 sidebar
├── 站点列表视图（/sites）
│   ├── 全站表格（按指标排序）
│   └── 筛选器
├── 模型列表视图（/models）— v1.1
└── 风险面板（首页置顶）— F.09

站点详情页 (/sites/[id])
├── Header：站名 / 域名 / 注册链接
├── 关键指标卡：最低倍率 / 7 天可用率 / TTFT / TPS / 风险信号
├── 分组列表（F.04）
├── 性能面板（F.08，仅已测）
├── 历史趋势：可用率曲线 + 倍率曲线
└── 数据来源 + 更新时间

模型详情页 (/models/[name])
├── Header：模型名 + 厂商 logo
├── 跨站价格表（按倍率排序）
├── 模型能力 / 上下文长度
└── 实测样本（来自 qz monitorRows）
```

### 4.2 导航

- **顶部 nav**：首页 / 站点列表 / 模型列表 / 关于
- **首页 hero**：实时数据状态 + 快速入口（4 个排序模式）
- **筛选器**：左侧 sidebar（桌面）/ 顶部 drawer（移动）

---

## 5. 数据流

### 5.1 数据源

| 数据 | 来源 | 频率 |
|---|---|---|
| 站点列表 + 分组 + 倍率 | qizhang.org `/api/sites` | cron 5 分钟 |
| 性能数据（42 站）| qizhang.org `/api/performance-summary` | cron 5 分钟 |
| per-model 真实数据 | 飞书 KB `model_rates`（已存在）| cron 5 分钟 |

### 5.2 存储（飞书 KB 3 张表）

```
relay_sites_tracker (已有, 165 站)
  - 名称 / 域名 / 框架 / 支持的 provider / 分组倍率 / 最低倍率
  - 备注 / 最后检查

relay_site_groups (新建)
  - site_id (link → relay_sites_tracker)
  - group_name (text)
  - rate_min (number)
  - rate_max (number)
  - rate_values (text, 存 "0.05x,0.1x,0.15x" 这种)
  - rate_source (single-select: group / model)
  - related_model_count (number)
  - related_models_json (longtext)
  - remark (longtext)
  - change_direction (single-select: up / down / flat)
  - change_delta (number, %)
  - updated_at (date)

relay_site_perf (新建, 42 站)
  - site_id (link → relay_sites_tracker)
  - success_rate (number, %)
  - ttft_p50_ms (number)
  - latency_p95_ms (number)
  - tps_avg (number)
  - availability_24h (number, %)
  - availability_7d (number, %)
  - consecutive_failures (number)
  - last_probe_at (date)
```

### 5.3 同步脚本

`scripts/sync-qz-data.ts`（新建）：
- 每 5 分钟跑一次
- 拉 qz `/api/sites` + `/api/performance-summary`
- 增量 upsert 到 2 张新表（bot 身份）
- 失败重试 3 次
- 写入日志到 `/tmp/sync-qz.log`

**与现有 `scripts/fetch-data.ts` 的关系**：
- `fetch-data.ts` 拉飞书 KB → 本地 JSON（前端读）
- `sync-qz-data.ts` 拉 qz → 飞书 KB（数据回流）
- 两者并行，前端不感知

---

## 6. UI / 设计

### 6.1 沿用现有设计系统

- **Swiss design system**（强哥 2026-07-25 定）
- 严格色板（白 / 黑 / 灰 / Swiss Red #FF3000）
- 0 圆角
- 2-4px 粗边框
- Inter + JetBrains Mono
- 编号 section（F.01 / F.02 / 99. INDEX）

### 6.2 新增视觉元素

- **数字徽章**（badges）：绿/黄/红三色 + 数字
- **sparkline**：纯 SVG，1.5px 线条
- **risk signal** icon：lucide-react `AlertTriangle` / `Ban` / `Info`
- **价格变化箭头**：lucide-react `ArrowUp` / `ArrowDown`，绿/红

### 6.3 响应式

- 桌面（≥ 1024px）：3 列布局（筛选器 / 主表 / 详情）
- 平板（768-1024px）：2 列
- 移动（< 768px）：单列 + drawer 筛选

---

## 7. 验收标准

### 7.1 性能

- 首页首屏 < 1s（Next.js 静态生成 + ISR）
- 数据新鲜度 < 5 分钟（cron 频率）
- 单页加载 < 500KB JS（gzip）

### 7.2 数据准确度

- 抽样 5 站与 qz `/api/sites` 100% 一致
- 抽样 5 站与 qz `/api/performance-summary` 100% 一致
- 跨站比价：3 个模型 × 5 个站 = 15 个数据点全对

### 7.3 兼容性

- Chrome / Safari / Firefox 最新版
- 移动端 iOS Safari + Android Chrome
- 暗色模式（基于现有 theme）

### 7.4 可维护性

- 新增 1 张 KB 表 = 加 1 个 entry 到 `lib/tables.ts`
- 抓取脚本失败有明确日志 + 告警
- 数据 schema 变更走 PR review

---

## 附录 A：风险与开放问题

| 风险 | 缓解 |
|---|---|
| qz API 挂了 / 限流 | cron 加 retry + 备用数据源（手动编辑 KB）|
| 飞书 KB 限流 | bot 身份 + sleep 0.6s/req（已验证）|
| 站长投诉收录 | 备注字段可编辑；v2 加站长认领 / 申诉 |
| 模型名不一致（gpt-5.6 / GPT-5.6 / gpt5.6）| vendor_id 统一 + 别名表 |

## 附录 B：v2 路线图（v1 不做）

- 个人收藏 / 关注的站
- 导出 CSV / API（给高级用户接入工具链）
- 站长自助认领 + 自助更新（数据来源分摊）
- 个性化推荐（基于历史选择）
- 风控订阅（Telegram 通知涨价 / 掉线）
- 多语言（中英双语）

---

**下一步**：强哥 review 后 → 写技术方案 → Codex 执行