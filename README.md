# KB Viewer

飞书 KB（knowledge-base-2026）所有表的数据浏览器。

## 加新表（扩展性设计）

**只需改一个文件**：`lib/tables.ts`

```ts
export const TABLES: TableConfig[] = [
  // 已有：relay_sites_tracker, vibe_coding_tracker
  // 加新表：复制一个 config entry，填好 tableId/fields 即可
  {
    id: "my_new_table",
    tableId: "tblxxxxxxxxxx",
    displayName: "我的新表",
    description: "...",
    primaryKey: "ID",
    titleField: "名称",
    fields: [
      { key: "名称", label: "名称", type: "text", primary: true },
      // ...
    ],
  },
];
```

然后跑 `npm run fetch` 拉数据 → 完事。UI 自动适配新表（首页加卡片、列表加 tab、详情页 layout 自动 layout）。

## 字段类型

| type | 渲染方式 |
|---|---|
| `text` | 纯文本 |
| `longtext` | 截断显示（hover 全文） |
| `number` | 千分位 / 倍率后缀 |
| `single-select` | 彩色 tag |
| `multi-select` | 多个 tag |
| `url` | 可点击链接（自动识别 markdown 链接 / 裸域名） |
| `date` | YYYY-MM-DD 格式 |

## 启动

```bash
# 1. 安装依赖
npm install

# 2. 拉取数据（用 lark-cli 调飞书 API）
npm run fetch

# 3. 启动 dev server
npm run dev
# → http://localhost:3000
```

## 数据源

- 飞书 KB app: `knowledge-base-2026`
- 认证：`FEISHU_KB_TOKEN` 环境变量（默认 fallback 到 KB 自身的 token）
- 拉取策略：5 分钟一次 cron 跑 `npm run fetch` → 生成 `data/{tableId}.json`
- 前端只读 JSON 文件（快，无飞书 API 限流）

## 目录结构

```
.
├── app/                      # Next.js App Router
│   ├── layout.tsx           # 根布局 + top nav
│   ├── page.tsx             # 首页（所有表卡片）
│   ├── globals.css
│   └── table/[name]/
│       ├── page.tsx         # 列表页
│       └── [id]/page.tsx    # 详情页
├── components/              # React 组件
│   ├── data-table.tsx       # 通用表（搜索+过滤+排序+分页）
│   ├── data-detail.tsx      # 通用详情
│   ├── cell-renderer.tsx    # 按字段类型渲染
│   └── filter-bar.tsx       # 搜索 + select 过滤
├── lib/                     # 核心逻辑
│   ├── tables.ts            # 表配置（扩展性核心）
│   ├── data-loader.ts       # 读 JSON + 转 keyed
│   └── utils.ts             # 工具函数
├── data/                    # 抓取的 JSON（gitignore）
├── scripts/
│   └── fetch-data.ts        # 抓数据脚本（用 lark-cli）
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## 设计原则

- **加新表零代码改动** — 改 `lib/tables.ts` 一处即可
- **通用组件** — `DataTable` / `DataDetail` 接受任意 TableConfig + KeyedRecord[]
- **配置驱动** — 字段类型、显示格式、搜索/过滤/排序都从 config 推断
- **前后端解耦** — 抓数据是脚本，UI 是静态读取 JSON
