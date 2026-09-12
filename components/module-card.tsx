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
    <section className={`flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${placeholder ? "opacity-55" : ""}`}>
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-zinc-200/80 bg-zinc-900 px-5 py-4 text-white sm:px-6 sm:py-5">
        <span className="rounded-md bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300 border border-amber-500/30">{number}</span>
        <Icon className="h-6 w-6 shrink-0 sm:h-7 sm:w-7 text-white/80" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-none tracking-tight sm:text-2xl">{title}</h2>
          <p className="mt-1 truncate font-mono text-xs text-white/60">{subtitle}</p>
        </div>
        {placeholder && (
          <span className="ml-auto rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-white/70">
            即将上线
          </span>
        )}
      </header>

      {/* Metrics */}
      <div className="grid grid-cols-4 border-b border-zinc-100 bg-zinc-50/50">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`p-3.5 sm:p-4 ${i < metrics.length - 1 ? "border-r border-zinc-200/60" : ""}`}
          >
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">{m.label}</div>
            <div className={`mt-1.5 font-mono text-xl font-bold leading-none tracking-tight sm:text-2xl ${m.tone ?? "text-zinc-900"}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Mini panels */}
      {placeholder ? (
        <div className="flex flex-1 items-center justify-center p-8 font-mono text-xs text-zinc-400">
          数据待接入
        </div>
      ) : (
        <div className="flex-1 p-5">
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
        className="group flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        <span>查看全部 {title}</span>
        <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 text-zinc-400 group-hover:text-zinc-700" />
      </Link>
    </section>
  );
}

function MiniBox({ label, tone, children }: { label: string; tone: "default" | "warning" | "danger" | "info"; children: React.ReactNode }) {
  const toneClass = tone === "warning" ? "border-amber-200 bg-amber-50/40 text-amber-900" : tone === "danger" ? "border-rose-200 bg-rose-50/40 text-rose-900" : "border-zinc-200/70 bg-zinc-50/40 text-zinc-800";
  return (
    <div className={`rounded-xl border ${toneClass} p-3.5 sm:p-4`}>
      <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-2 text-xs">{children}</div>
    </div>
  );
}