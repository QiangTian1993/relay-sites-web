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
  * **第一方直连采集中转站 API**：`npm run fetch:direct`（`tsx scripts/fetch-direct-site-data.ts`，以 15 并发受控 Worker 直连全量中转站免登录公开接口 `/api/pricing`，解析原生分组倍率、模型倍率、补全系数与组-模型映射，更新 `data/relay_site_groups.json` 和 `data/model_rates.json`，摆脱对三方行情站单点依赖）。
  * **采集 GitHub 热榜 → 飞书**：`npm run trending`（本地手动）；定时由本机 **launchd**（`~/Library/LaunchAgents/com.relay-sites.github-trending.plist` → `scripts/cron-runner.sh` 分发）驱动：每日 08:00/21:00 抓 daily 榜 14 个语言、每周日 08:00 追加 weekly、每月 1 日 08:00 追加 monthly（均为北京时间），日志在 `~/logs/github-trending-YYYYMM.log`。写入飞书 `github_trending` 表（`tbl4UDd9AP1Fzlfz`），**键为 (仓库, 周期, 榜单) 幂等 upsert**（榜单=all/语言 slug，排名按榜独立，避免跨榜覆盖），脚本会自动建表兜底。写路径走 lark-cli subprocess，默认 bot 身份（user 身份实测无写权限），`LARK_AS` 可覆盖。描述中文化走 LLM 翻译（OpenAI 兼容：`LLM_API_KEY`/`LLM_BASE_URL`/`LLM_MODEL`，默认智谱 glm-4-flash 免费档），已有译文且描述未变自动复用缓存。`.github/workflows/github-trending.yml` 为可选备胎（需 GitHub 账户 Actions 解锁 + secrets）。
  * **同步市场数据至飞书**：`npx tsx scripts/sync-remote-data.ts`
  * **中转站模型混用检测**：`./scripts/gpt56-detector.sh`（本地 Web UI，检测 GPT-5.6 Sol/Terra/Luna 混用：Juice 指纹/输出完整性/提示覆盖；第三方工具 gpt56_api_detector v4.0.1，见 `scripts/gpt56-detector/README.md`）
  * **比价归一化口径**：`lib/relay-v1.ts` 的基准解析为三层——官方表 `OFFICIAL_MODEL_BENCHMARKS` → 全网众数推断（`buildInferredBenchmarks`，≥5 站才启用，标注 `benchmarkSource: inferred`）→ generic 1.0 兜底。报价 ≥ 基准 10× 判 `suspectedPointsScale`（积分制/一口价站等异构口径），不参与价格梯队与分布统计，UI 标"口径存疑"；offer 的 `enable_groups` 与分组表按 trim+小写归一匹配，全部未命中时回退全量分组并标 `groupMatchFailed`（当前数据约 299 条系分组表同步滞后所致）。
  * **在线质检中心（Module 05 `/detector`）**：用户提交 baseUrl+Key 后由服务端 `POST /api/detect` 发射探针（档位矩阵 quick=3发 / standard=8发 / full=15发），**响应为 NDJSON 流**（`{type:"log"|...}` 逐行实时推送，末行为 `{type:"result",record}` 或 `{type:"error"}`；`X-Accel-Buffering: no` 防 nginx 缓冲），评分与归档逻辑见 `app/api/detect/route.ts` + `lib/qc-store.ts`。要点：
    * **安全**：目标地址过 `lib/net-guard.ts` SSRF 校验（仅公网 http/https，DNS 解析后逐 IP 复核，拒绝跟随重定向）；单 IP 限流 8 次/10 分钟（`DETECT_RATE_LIMIT_MAX` 可调）；**无公开写接口**——`GET /api/qc` 只读，写入统一收敛在 detect 路由且仅当关联大盘站点时落盘。
    * **出站代理**：部分中转站屏蔽云机房 IP（如 aihub.top，TCP 层即超时）。探针支持 `QC_OUTBOUND_PROXY` 环境变量（undici ProxyAgent），部署时经宿主机 clash `host.docker.internal:7890` 出境；**前提是 `/etc/clash/config.yaml` 的 rules 里加了对应 `DOMAIN-SUFFIX,<域名>,PROXY` 规则并 reload**（clash 默认 MATCH,DIRECT，不加规则等于没走）。clash 节点订阅由 proxy-providers 自动更新；切换节点用 controller API `PUT :9090/proxies/PROXY`。
    * **诚实性约定**：零证据不得输出 PASS（`insufficient_evidence` 封顶 55 分）；行为分布无实测样本时展示官方基线并标记 `probabilitiesEstimated`；指纹为精确整数匹配（非子串）；篡改判定要求计数题回包全部命中强制 40 签名。非 GPT-5.6 家族只做完整性/Prompt 覆盖检查。
    * **行为指纹打分（trusted-fingerprint-v3）**：行为题使用 gpt56-detector 官方题面（随机国家/随机鸟/草莓数 r，SHA256 已对齐基线），答案经 behavior_label/b80_exact_3 归一后按冻结分布 (`lib/baselines/trusted_fingerprint_v3.json`) 算平均对数似然 → softmax 匹配度；**强指向门禁** = 样本完成率≥90% 且计划与官方契约一致（quick/standard=low 档 3发、full=medium 档 10发）且恰好一个模型严格超过档位阈值 (policy v4.1.1: low sol .54/terra .58/luna .77)。匹配度是"相对接近度"，不是路由概率。
    * **元数据取证**：采集每路探针的 usage 键名 / model 回显 / 顶层字段。OpenAI 协议响应中出现 Anthropic 命名（input_tokens/cache_creation_input_tokens/stop_reason 等）→ `usage_residue_cross_provider` 直判 FAIL；model 回显家族与申报冲突 → 扣 10 分。
    * **持久化**：本地 JSON 为主存储（消毒 + 原子写 + 进程内写锁）。生产环境容器通过 `QC_DATA_PATH=/app/data-qc/relay_site_qc.json` 写独立挂载卷 `qc-volume`，部署重建不丢历史；rsync 排除该卷与本文件。
    * **飞书灾备**：`npm run qc:backup`（本地 → 飞书 `relay_site_qc_backup` 表，按 站点ID 幂等 upsert、较旧记录跳过）；`npm run qc:restore -- --yes` 反向恢复。完整记录以"完整记录JSON"字段保真。

---

## 5. 部署

* **线上地址**：`https://www.xiuxai.com/relay-index/`（子路径，`trailingSlash: true`）
* **服务器**：`124.222.88.183`（腾讯云，root，ssh 免密；shell 为 zsh，命令输出顶部有腾讯云扫码横幅需过滤）
* **形态**：nginx（`/etc/nginx/conf.d/xiuxai.conf`）`location ^~ /relay-index/` 反代 → Docker 容器 `relay-sites-web`（127.0.0.1:3000）
* **一键部署**：`./scripts/deploy.sh`（数据 fetch → rsync → 质检卷备份 → 服务器 docker 构建 → 容器重启 → 本地+公网健康检查）；数据没变时 `--skip-fetch` 跳过拉取
* **手动流程**（脚本等价）：
  1. 本地 `npm run fetch`（更新 `data/*.json`，含探针；**部署机不联网拉飞书**，数据必须随包上传）
  2. `rsync -az --delete -e "ssh -o BatchMode=yes" --exclude node_modules --exclude .next --exclude .git --exclude .omx --exclude .staging --exclude ".env*" --exclude .DS_Store --exclude "*.log" --exclude tsconfig.tsbuildinfo --exclude "data/relay_site_qc.json" --exclude qc-volume --exclude backups ./ root@124.222.88.183:/opt/relay-sites-web/`
  3. 服务器：`cd /opt/relay-sites-web && docker build --build-arg NEXT_PUBLIC_BASE_PATH=/relay-index -t relay-sites-web:relay-index .`
  4. 服务器：`mkdir -p qc-volume && chown -R 1001:1001 qc-volume && docker rm -f relay-sites-web && docker run -d --name relay-sites-web --restart unless-stopped -p 127.0.0.1:3000:3000 -v /opt/relay-sites-web/qc-volume:/app/data-qc -e QC_DATA_PATH=/app/data-qc/relay_site_qc.json relay-sites-web:relay-index`
  5. 验证：`curl -sL https://www.xiuxai.com/relay-index/` 200、`/modules/github_trending/` 200（注意斜杠重定向）
* **注意**：`data/*.json` 不入 git（gitignore），每次部署前本地先 `npm run fetch`；服务器 `/opt/relay-sites-web` 非 git 仓库，是 rsync 镜像。
