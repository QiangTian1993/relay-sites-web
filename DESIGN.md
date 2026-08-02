# DESIGN.md - relay-sites-web 设计规范与系统指南

本文档记录 `relay-sites-web` (信息杂货铺) 项目的设计哲学、国际主义平面设计风格 (Swiss International Typographic Style) 规范、设计 Token、组件系统与 UI/UX 交互准则，供开发者与 AI Agent 共同遵循。

---

## 1. 项目定位与架构哲学 (Product & Architectural Philosophy)

### 1.1 核心定位：“信息杂货铺 (Information General Store)”
网站核心定位为 **“信息杂货铺”**，旨在将 AI 世界的实用情报（模型比价、编程工具、开源热榜、个人技能库等）收集成册，以高信息密度、高可读性、极简美观的形式呈现给开发者与运维用户。

### 1.2 页面层级与导航原则
- **首页 (`/`)**：顶层 Module 货架大类入口。仅暴露一级大类（如 `Module 01 AI 中转站`、`Module 02 AI 编程工具`），保持主入口清晰精炼，不直接展开二级多视图。
- **子模块内部**：在具体的子模块页面头部（Header / Sub-nav）提供该分类下的多视角视图切换。例如：
  - **Module 01 AI 中转站**：
    - `按模型比价` (`/relay`)：**Model-Centric** 视角，计算折算价、7 天可用率与 TTFT 延迟。
    - `全量站点大盘` (`/table/relay_sites_tracker`)：**Site-Centric** 视角，展示 165+ 站点底表原始列、Provider 及对比托盘。

---

## 2. 视觉设计风格：瑞士平面设计 (Swiss Style)

本项目深度践行 **Swiss International Typographic Style (瑞士/国际主义平面设计风格)**。抛弃无意义的圆角、渐变阴影和浮夸修饰，以严格的几何网格、极致的对比与高信息密度造就工业级美感。

### 2.1 核心四大美学支柱
1. **绝对几何直角 (Border Radius Zero)**：全站所有容器、卡片、按钮、Input、Badge、Modal 的圆角恒定为 `0` (`rounded-none`)。
2. **强对比网格与粗线条 (Bold Grid & Black Borders)**：使用 `border-2 border-black` 作为主要分界线与框线，形成结构严谨的框架结构。
3. **排版为王 (Typography-First Hierarchy)**：
   - 标题与模块编号采用特粗无衬线字体 (Inter Heavy/Black)。
   - 数据、指标、标签、分类统一采用等宽字体 (JetBrains Mono)。
   - 模块编号大字化（如 `01`, `02`）形成强烈的视线引导。
4. **严格限制的三色色板 (Strict Tri-Color Palette)**：
   - 以黑 (`#000000`)、白 (`#FFFFFF`)、瑞士红 (`#FF3000`) 为核心，辅以软灰 (`#F2F2F2` / `#F8F8F6`) 作为底色。

### 2.2 探针数据展示降权准则 (De-emphasized Probe Data)
由于实测探针与可用率数据（TTFT、7D可用率、TPS）均来自第三方测试，仅作参考，不属于第一方核心事实：
- **视觉弱化**：探针数字、图标与可用率进度条在 UI 视觉上保持低调调柔处理（使用 `text-black/40` 或 `opacity-75` 灰度）。
- **取消强告警**：不再在站点卡片和列表摘要中弹出刺眼的红色探针过期告警徽章。
- **清晰标识**：所有探针展示区域均标注 `(第三方实测，仅供参考)`，避免用户误解。

---

## 3. 设计 Token 规范 (Design Tokens)

所有设计 Token 统一定义在 [`tailwind.config.ts`](file:///Users/ian-mbp/%E5%B7%A5%E4%BD%9C/project/relay-sites-web/tailwind.config.ts) 与 [`app/globals.css`](file:///Users/ian-mbp/%E5%B7%A5%E4%BD%9C/project/relay-sites-web/app/globals.css) 中。

### 3.1 颜色系统 (Color Palette)

| Token 名称 | 十六进制 / 值 | 作用与适用场景 |
| :--- | :--- | :--- |
| `swiss.bg` | `#FFFFFF` | 主页面与卡片默认背景色 |
| `swiss.fg` | `#000000` | 默认文字颜色、边框颜色 (`border-black`) |
| `swiss.muted` | `#F2F2F2` | 软灰背景、Hover 背景、禁用/待上线模块背景 |
| `swiss.accent` | `#FF3000` | 瑞士红（品牌高亮、选中项、警示、Primary Hover） |
| `swiss.border` | `#000000` | 经典黑框边框 |
| `swiss.success` | `#000000` | 降价/正常状态（保持瑞士纯黑体系，或搭配灰底） |
| `swiss.warning` | `#FF3000` | 涨价/高风险/异常状态（瑞士红） |

### 3.2 字体排版 (Typography)

| 字体族 (Font Family) | 变量 | 对应字体 | 应用场景 |
| :--- | :--- | :--- | :--- |
| `sans` | `var(--font-inter)` | Inter / System UI / 微软雅黑 | 页面主标题、大字 Header、段落正文 |
| `mono` | `var(--font-jetbrains-mono)` | JetBrains Mono / Monospace | 数字、数据表格单元格、Tag、小标、按钮 |

- **字距 (Letter Spacing)**:
  - 标题: `tracking-tightest` (`-0.05em`)
  - 标签/分类: `tracking-wider` (`0.05em`) 或 `tracking-[0.2em]` / `tracking-ultra` (`0.3em`)
- **文本选中与 Focus**:
  - `::selection`: 背景 `#FF3000`，文字 `#FFFFFF`
  - `:focus-visible`: `outline: 2px solid #FF3000; outline-offset: 2px`

### 3.3 几何纹理与装饰元素 (Swiss Textures)

定义于 [`app/globals.css`](file:///Users/ian-mbp/%E5%B7%A5%E4%BD%9C/project/relay-sites-web/app/globals.css) 中的 Swiss 专属纹理与效果 Class：

1. **`.swiss-grid`**：24px 几何网格背景（3% 黑色透明度）
2. **`.swiss-dots`**：16px 径向点阵矩阵
3. **`.swiss-diagonal`**：45° 间隔 10px 的斜线阴影
4. **`.swiss-noise`**：SVG 细微噪点叠加（混合模式 multiply, 1.5% 质感 opacity）
5. **`.plus-rotate`**：组件/折叠 Hover 时 `+` 号图标顺时针旋转 90°
6. **`.swiss-highlight`**：`box-shadow: inset 4px 0 0 0 #ff3000;` 4px 瑞士红侧边突出显示

---

## 4. UI 组件与交互规范 (Component Guidelines)

### 4.1 头部全局导航 (Root Layout Navigation)
- **品牌 Logo 块**：左侧 `bg-black text-white` 方块，包含 `GitCompareArrows` 图标与 `RELAY INDEX` 字样，Hover 时转为 `bg-swiss-accent`。
- **导航 Tab**：等宽字体大写 `font-mono text-xs font-black uppercase`，右侧带 `border-r-2 border-black`，Hover 时反转为 `hover:bg-black hover:text-white`。

### 4.2 二级子导航 (RelaySubNav)
- 放置于二级页面顶部，用于在同大类下的多个视图间自由切换。
- 当前激活视图使用 `bg-black text-white`，未激活视图使用 `hover:bg-black/10`。

### 4.3 模块块与编号列 (NumCol & Module Card)
- **编号左列 (`NumCol`)**：每个 Module 卡片左侧固定宽度（56px / 72px）列，展示巨幅等宽数字（`01`, `02`）。
  - `accent` 变体：`bg-swiss-accent`（瑞士红背景 + 白字）
  - `dark` 变体：`bg-black`（黑底 + 白字）
  - `muted` 变体：`bg-swiss-muted`（灰底 + 暗字，表示未激活/未开放）

### 4.4 统计方块阵列 (Stat Box Array)
- 数据指标使用无缝拼接网格：`inline-flex flex-wrap border-l-2 border-t-2 border-black`。
- 子方块统一带有 `border-r-2 border-b-2 border-black px-5 py-4`。
- 数字部分：`font-mono text-3xl font-black tabular-nums`；标签部分：`font-mono text-[9px] uppercase tracking-widest text-black/40`。

### 4.5 按钮规范 (Buttons)
- **Primary Button**：
  ```tsx
  <Link className="flex items-center justify-between border-2 border-black px-4 py-2.5 font-mono text-xs font-black bg-black text-white hover:bg-swiss-accent hover:border-swiss-accent">
    <span>比价工具</span>
    <ArrowRight className="h-3.5 w-3.5" />
  </Link>
  ```
- **Secondary Button**：
  ```tsx
  <Link className="flex items-center justify-between border-2 border-black px-4 py-2.5 font-mono text-xs font-black bg-white text-black hover:bg-black hover:text-white">
    <span>全量站点</span>
    <ArrowRight className="h-3.5 w-3.5" />
  </Link>
  ```

### 4.6 状态与风控徽章 (Badges)
组件定义于 [`components/badges.tsx`](file:///Users/ian-mbp/%E5%B7%A5%E4%BD%9C/project/relay-sites-web/components/badges.tsx)：
- **ChangeBadge (价格变动)**：
  - 涨价 `↑`：`border border-swiss-warning bg-swiss-warningBg text-swiss-warning`
  - 降价 `↓`：`border border-swiss-success bg-swiss-successBg text-swiss-success`
- **RiskBadge (风控/跑路预警)**：
  - 高风险：`border-swiss-warning bg-swiss-warningBg text-swiss-warning`（如连续失败 ≥ 5 次或 24h 可用率 < 50%）
  - 观察状态：`border-swiss-fg/40`
- **FreshnessBadge (数据新鲜度)**：
  - 实测数据 3 天内：`border-swiss-success`
  - 数据过期：`border-swiss-warning`

### 4.7 响应式网格与边框收敛规则 (Responsive Layout & Border Collapse)
- **网格分割收敛**：在大屏 (lg/md) 上使用垂直分割线（如 `md:border-r-2 border-black`），在移动端切为堆叠布局时，需使用 `md:border-r-2 border-b-2 md:border-b-0` 动态折叠边框，避免出现双重重叠边框或线段断裂。
- **Touch Targets**：在移动端，按钮与可点击选项需维持至少 `py-2.5` / `min-h-[40px]` 的轻触点击区域。

### 4.8 动画与可访问性 (Motion & Accessibility)
- **极简平移淡入**：仅使用微小 Y 轴位移（8px）与短时长（0.3s）淡入淡出（`.swiss-fade-in`），禁止过度弹跳或复杂贝塞尔曲线。
- **减弱动画适配 (Reduced Motion)**：自动应用 `@media (prefers-reduced-motion: reduce)` 规则，将过渡与动画时长重置为 `0.01ms`。

---

## 5. 数据驱动与扩展规范 (Data Architecture Guidelines)

### 5.1 零代码扩展新表 (Zero-Code Table Onboarding)
新增表结构时，只需在 [`lib/tables.ts`](file:///Users/ian-mbp/%E5%B7%A5%E4%BD%9C/project/relay-sites-web/lib/tables.ts) 中注册 `TableConfig`，无需编写或改动任何前端 UI 逻辑，通用组件层 (`DataTable` / `DataDetail` / `CellRenderer`) 会自动适配生成表单、过滤器、排序与详情卡片。

### 5.2 动态路由与 Slug 双向兼容 (Routing Rule)
详情页路由位于 [`app/table/[name]/[id]/page.tsx`](file:///Users/ian-mbp/%E5%B7%A5%E4%BD%9C/project/relay-sites-web/app/table/%5Bname%5D/%5Bid%5D/page.tsx)：
- `generateStaticParams()` 必须同时为飞书底表 `__id`（如 `recvqm...`）与业务主键 `site_id`（如 `biuapi`）生成静态参数。
- 页面导出 `export const dynamicParams = true;`，确保任意合法的站点 Slug 或 ID 均可即时渲染，杜绝 404 错误。

---

## 6. 开发与维护注意事项 (Agent & Developer Checklists)

1. ❌ **严禁使用非瑞士风格圆角**：容器、卡片、按钮严禁使用 `rounded-md`、`rounded-lg` 或 `rounded-full`（仅允许 Status Indicator 圆点等微视觉指示符使用圆形）。
2. ❌ **严禁引入杂乱色彩**：页面主色调必须收敛在黑/白/灰/瑞士红。切勿擅自引入浅蓝、紫、绿等杂色渐变。
3. ❌ **严禁破坏 Module 01 视图分工**：
   - `/relay` 保持 Model-Centric 视角（开发者选站/比价）。
   - `/table/relay_sites_tracker` 保持 Site-Centric 视角（运维全量检索）。
4. 💡 **字体优先使用类名与 token**：
   - 正文/标题用 default sans (`Inter`)。
   - 任何涉及数字、英文编码、版本号、状态、徽标的均需显式指定 `font-mono` (`JetBrains Mono`) 与 `tabular-nums`。
