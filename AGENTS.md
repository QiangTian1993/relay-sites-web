# AGENTS.md

本文档记录 `relay-sites-web` 项目的设计规范、架构决策与后续开发注意事项，供 AI Agent 和人类开发者共同遵循。

---

## 1. 项目定位与页面层级规范

* **首页定位**：网站核心定位为 **“信息杂货铺 (Information General Store)”**。首页（`/`）是全局的主货架与大类导航入口。
* **层级原则**：
  * **主入口/首页**：仅暴露顶层 Module 模块大类（如 Module 01 AI 中转站、Module 02 AI 编程工具等），不直接摆放特定模块内部的二级多视图入口。
  * **子模块内部**：在具体的子模块页面头部（Header / Sub-nav）提供该分类下的视图/子分类切换。

---

## 2. Module 01: AI 中转站模块结构规约

AI 中转站模块包含两个互补但视角不同的视图，统一通过 [`components/relay-sub-nav.tsx`](file:///Users/ian-mbp/%E5%B7%A5%E4%BD%9C/project/relay-sites-web/components/relay-sub-nav.tsx) 进行二级子导航切换：

1. **按模型比价 (Relay Pricing Observatory)**
   * **路由**：`/relay`
   * **核心视角**：**按目标模型切入 (Model-Centric)**
   * **适用场景**：买家/开发者选站。计算基础倍率 × 分组最低倍率后的真实折算价，结合 7 天可用率、TTFT P50 延迟与风险预警（如“随时拉闸”）进行决策。
2. **全量站点大盘 (Sites Directory & Inventory)**
   * **路由**：`/table/relay_sites_tracker`
   * **核心视角**：**按站点实体切入 (Site-Centric)**
   * **适用场景**：运维/选型/情报查阅。呈现全量 165+ 站点的底表原始列（域名、框架 `sub2api`/`newapi`、包含的 Provider、注册/验证限制、对比托盘 Compare Tray）。

---

## 3. 路由与动态参数规范

* **双向 Slug 兼容**：详情页路由 [`app/table/[name]/[id]/page.tsx`](file:///Users/ian-mbp/%E5%B7%A5%E4%BD%9C/project/relay-sites-web/app/table/%5Bname%5D/%5Bid%5D/page.tsx) 的 `generateStaticParams()` 必须同时生成飞书底表 `__id`（如 `recvqm...`）与业务主键 `站点ID` / `site_id`（如 `biuapi`）。
* **动态参数许可**：设置 `export const dynamicParams = true;`，确保通过任何合法的站点 ID 或 Slug 均可动态无缝渲染，避免产生 404。

---

## 4. 数据同步与性能探针机制

* **数据流向**：`飞书 KB Bitable (knowledge-base-2026)` / `市场数据源` → `scripts/fetch-data.ts` → `data/*.json` 本地缓存 + 探针实测数据自动生成 → 前端展示。
* **数据命令**：
  * **抓取飞书数据 & 自动更新全站探针**：`npm run fetch`（使用 `lark-cli` 应用 Bot 身份 `cli_aa819ef0aa785bb4` 自动抓取各表数据并触发全量 165+ 站点的并发网络延迟/可用率打点，更新 `data/relay_site_perf.json`）。
  * **采集 GitHub 热榜 → 飞书**：`npm run trending`（本地手动）；定时由本机 **launchd**（`~/Library/LaunchAgents/com.relay-sites.github-trending.plist` → `scripts/cron-runner.sh` 分发）驱动：每日 08:00/21:00 抓 daily 榜 6 个语言、每周日 08:00 追加 weekly、每月 1 日 08:00 追加 monthly（均为北京时间），日志在 `~/logs/github-trending-YYYYMM.log`。写入飞书 `github_trending` 表（`tbl4UDd9AP1Fzlfz`），键为 (仓库, 周期) 幂等 upsert，脚本会自动建表兜底。写路径走 lark-cli subprocess，默认 bot 身份（user 身份实测无写权限），`LARK_AS` 可覆盖。`.github/workflows/github-trending.yml` 为可选备胎（需 GitHub 账户 Actions 解锁 + secrets：FEISHU_APP_ID/FEISHU_APP_SECRET/FEISHU_BASE_TOKEN）。
  * **同步市场数据至飞书**：`npx tsx scripts/sync-remote-data.ts`
