// 通用 ModuleCard —— 所有 KB 模块卡片的统一容器
// 设计：4 metrics + 2 mini panels + 底部 CTA
// 加新模块 = 传不同 metrics + miniPanels 即可，不改本组件

import Link from "next/link";
import { IconArrowRight, IconSites, IconTools } from "./icons";
import type { ModuleMetric, ModuleMiniPanel } from "@/lib/modules";

interface Props {
  number: string;
  title: string;
  subtitle: string;
  iconKind: "sites" | "tools" | "github" | "skill";
  href: string;
  metrics: ModuleMetric[];
  miniPanels: ModuleMiniPanel[];
  /** 占位模式：模块未启用，显示"数据待接入" */
  placeholder?: boolean;
}

const ICON_MAP = {
  sites: IconSites,
  tools: IconTools,
  github: IconSites, // TODO: 后续加 IconGithub
  skill: IconSites, // TODO: 后续加 IconSkill
} as const;

export function ModuleCard({ number, title, subtitle, iconKind, href, metrics, miniPanels, placeholder = false }: Props) {
  const Icon = ICON_MAP[iconKind];
  return (
    <section className={`flex flex-col border-2 border-swiss-fg bg-swiss-bg ${placeholder ? "opacity-55" : ""}`}>
      {/* Header */}
      <header className="flex items-center gap-3 border-b-2 border-swiss-fg bg-swiss-fg px-4 py-4 text-swiss-bg sm:px-5 sm:py-5">
        <span className="bg-swiss-accent px-2 py-1 font-mono text-sm font-black text-swiss-bg sm:text-sm">{number}</span>
        <Icon className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black leading-none tracking-tighter sm:text-3xl">{title}</h2>
          <p className="mt-1 truncate font-mono text-sm text-swiss-bg/70">{subtitle}</p>
        </div>
        {placeholder && (
          <span className="ml-auto border border-swiss-bg/40 px-2 py-1 font-mono text-sm font-black uppercase tracking-widest text-swiss-bg/70">
            即将上线
          </span>
        )}
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-4 border-b-2 border-swiss-fg">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`p-3 sm:p-4 ${i < metrics.length - 1 ? "border-r border-swiss-fg" : ""}`}
          >
            <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/50 sm:text-sm">{m.label}</div>
            <div className={`mt-2 font-mono text-xl font-black leading-none tracking-tighter sm:text-2xl ${m.tone ?? ""}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Mini panels */}
      {placeholder ? (
        <div className="flex flex-1 items-center justify-center p-6 font-mono text-sm text-swiss-fg/45">
          数据待接入
        </div>
      ) : (
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {miniPanels.map((panel) => (
              <MiniBox key={panel.label} label={panel.label} tone={panel.tone}>
                {panel.content}
              </MiniBox>
            ))}
          </div>
        </div>
      )}

      {/* Footer CTA */}
      <Link
        href={href}
        className="group flex items-center justify-between border-t-2 border-swiss-fg bg-swiss-muted px-4 py-2.5 font-mono text-sm font-black uppercase tracking-widest transition-colors hover:bg-swiss-fg hover:text-swiss-bg"
      >
        <span>查看全部 {title}</span>
        <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </section>
  );
}

function MiniBox({ label, tone, children }: { label: string; tone: "default" | "warning" | "danger" | "info"; children: React.ReactNode }) {
  const toneClass = tone === "warning" ? "border-swiss-warning" : tone === "danger" ? "border-swiss-warning" : tone === "info" ? "border-swiss-fg/30" : "border-swiss-fg/30";
  return (
    <div className={`border-2 ${toneClass} p-3 sm:p-4`}>
      <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/55 sm:text-sm">{label}</div>
      <div className="mt-2 sm:mt-3">{children}</div>
    </div>
  );
}