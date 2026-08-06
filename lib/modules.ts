// KB 模块注册表 —— 加新模块 = 在 MODULES 数组加一条 entry
// 每个模块：metadata + 数据加载函数 + 速览渲染
// 当前 2 个 active（中转站 + 编程工具），预留 github_trending / skill_collection

export type ModuleId = "relay_sites" | "vibe_coding" | "github_trending" | "skill_collection";

export type ModuleTone = "default" | "warning" | "danger" | "info";

export interface ModuleMetric {
  label: string;
  value: string;
  /** 自定义颜色 class（swiss-fg / swiss-success / swiss-warning / swiss-accent） */
  tone?: string;
}

export interface ModuleMiniPanel {
  label: string;
  tone: ModuleTone;
  /** 简短的渲染内容（li 列表 / bar 分布 / 简单说明） */
  content: React.ReactNode;
}

export interface ModuleData {
  metrics: ModuleMetric[];
  miniPanels: ModuleMiniPanel[];
}

export interface KbModule {
  id: ModuleId;
  number: string;
  title: string;
  subtitle: string;
  /** lucide icon name（从 components/icons 选） */
  icon: "sites" | "tools" | "github" | "skill";
  /** 跳转路径 */
  href: string;
  /** 是否启用（false = 占位卡，显示"数据待接入"） */
  enabled: boolean;
  /** 服务端数据加载（app/page.tsx 异步调用） */
  load?: () => Promise<ModuleData>;
}

// ============= 启用的模块 =============

export const MODULES: KbModule[] = [
  {
    id: "relay_sites",
    number: "01",
    title: "AI 中转站",
    subtitle: "OpenAI / Claude / Gemini / xAI 等 provider 维度的中转服务",
    icon: "sites",
    href: "/table/relay_sites_tracker",
    enabled: true,
  },
  {
    id: "vibe_coding",
    number: "02",
    title: "AI 编程工具",
    subtitle: "Cursor / Claude Code / Codex CLI / Cline 等 Vibe Coding 工具",
    icon: "tools",
    href: "/table/vibe_coding_tracker",
    enabled: true,
  },
  {
    id: "github_trending",
    number: "03",
    title: "GitHub 热榜",
    subtitle: "Trending repos（按语言 / 时间窗筛选）",
    icon: "github",
    href: "/modules/github_trending",
    enabled: true,
  },
  {
    id: "skill_collection",
    number: "04",
    title: "Skill 收集",
    subtitle: "个人工作流沉淀的 prompt / skill / snippet",
    icon: "skill",
    href: "/modules/skills",
    enabled: false,
  },
];

/** 取启用模块（首页渲染用） */
export function getEnabledModules(): KbModule[] {
  return MODULES.filter((m) => m.enabled);
}

/** 按 id 查找模块 */
export function getModule(id: ModuleId): KbModule | undefined {
  return MODULES.find((m) => m.id === id);
}