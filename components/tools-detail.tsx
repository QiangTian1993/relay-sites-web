// AI 编程工具详情页 —— 现代精致开发者工具风格
// 结构：Hero / 4 卡指标 / 定价 + 中文 + stars / 评测(sticky TOC + 4 卡片) / 01-04 细节 section

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconArrowLeft, IconArrowRight, IconCircleCheck, IconExternal, IconStar } from "./icons";
import type { ToolRow } from "@/lib/tools-types";

/** 评测 TOC：4 个 Phase 2 新字段的 anchor 配置 */
const REVIEW_SECTIONS = [
  { id: "positioning", title: "产品定位", number: "05", field: "positioning" as const },
  { id: "target-users", title: "目标用户", number: "06", field: "targetUsers" as const },
  { id: "usage-tips", title: "使用建议", number: "07", field: "usageTips" as const },
  { id: "competitor", title: "竞品对比", number: "08", field: "competitor" as const },
];

export function ToolsDetail({ row }: { row: ToolRow }) {
  const scoreToneClass =
    row.scoreTone === "high"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : row.scoreTone === "medium"
      ? "bg-zinc-100 text-zinc-800 border-zinc-200"
      : "bg-zinc-50 text-zinc-400 border-zinc-200";
  const allPlatforms = row.platforms.length > 0 ? row.platforms.join(" · ") : "未知";
  const allTypes = row.types.length > 0 ? row.types.join(" · ") : "未知";
  const allModels = row.supportedModels.length > 0 ? row.supportedModels.join(" · ") : "未知";

  // scroll spy：当前在 viewport 里的 review section（用于 TOC 高亮）
  const [activeReviewId, setActiveReviewId] = useState<string>(REVIEW_SECTIONS[0].id);
  useEffect(() => {
    const handler = () => {
      const offset = 120; // hero + breathing room
      let current = REVIEW_SECTIONS[0].id;
      for (const s of REVIEW_SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top - offset <= 0) {
          current = s.id;
        }
      }
      setActiveReviewId(current);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="pb-20">
      {/* Hero */}
      <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href="/table/vibe_coding_tracker"
            className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-zinc-500 hover:text-[#E03E1A] transition-colors"
          >
            <IconArrowLeft className="h-4 w-4" /> 返回工具列表
          </Link>
          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase tracking-wider text-zinc-400">工具情报与评测</div>
              <h1 className="mt-2 break-words text-3xl font-extrabold text-zinc-900 tracking-tight sm:text-5xl">
                {row.name}
              </h1>
              <div className="mt-2 text-sm font-medium text-zinc-500">{row.vendor}</div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`inline-block rounded-full border px-3 py-0.5 font-mono text-xs font-bold ${scoreToneClass}`}>
                  {row.scoreLabel}
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs shadow-2xs">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <IconStar key={i} className={`h-3.5 w-3.5 ${i < row.score ? "text-amber-500 fill-amber-500" : "text-zinc-200"}`} />
                  ))}
                </span>
                {row.stars != null && row.stars > 0 && (
                  <a
                    href={row.githubUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 font-mono text-xs font-semibold text-zinc-700 shadow-2xs hover:border-zinc-300 transition-colors"
                  >
                    <IconStar className="h-3.5 w-3.5 fill-zinc-700 text-zinc-700" />
                    {formatStars(row.stars)} stars
                    <IconExternal className="h-3 w-3 text-zinc-400" />
                  </a>
                )}
                {row.myState === "在用" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-700">
                    <IconCircleCheck className="h-3.5 w-3.5" />在用
                  </span>
                )}
                {row.myState === "待调研" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-xs font-semibold text-amber-700">
                    待调研
                  </span>
                )}
                {row.myState === "弃用" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 font-mono text-xs font-semibold text-zinc-500">
                    弃用
                  </span>
                )}
              </div>
            </div>
            {row.url && extractUrl(row.url) && (
              <a
                href={extractUrl(row.url)!}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-zinc-800"
              >
                访问官网 <IconArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 4 卡指标 */}
      <section className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6">
        <div className="grid grid-cols-2 rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden divide-y divide-zinc-100 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          <Metric label="类型" value={allTypes} />
          <Metric label="平台" value={allPlatforms} />
          <Metric label="支持模型" value={allModels} />
          <Metric label="多 Agent" value={row.multiAgent} />
        </div>
      </section>

      {/* 定价 + 中文支持 + GitHub stars（附加信息） */}
      <section className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
        <div className="grid grid-cols-2 rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden divide-y divide-zinc-100 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          <Attribute label="定价机制" value={row.pricing} />
          <Attribute label="中文体验" value={row.chinese} />
          <Attribute label="GitHub Stars" value={row.stars != null ? formatStars(row.stars) : "非开源 / 未标注"} />
          <Attribute label="团队协作/DevBox" value={row.types.some(t => /IDE|Agent/i.test(t)) ? "支持远程环境" : "单机客户端"} />
        </div>
      </section>

      {/* 活动权益 */}
      {row.activityBenefit && (
        <section className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-5 sm:p-6 shadow-xs">
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-amber-800">活动权益</div>
            <p className="mt-2 font-sans text-sm leading-relaxed text-amber-950 font-medium">{row.activityBenefit}</p>
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs text-amber-700">
              {row.activityPeriod && <span>期限：{row.activityPeriod}</span>}
              {row.activityUrl && (
                <a
                  href={row.activityUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline underline-offset-4 hover:text-amber-900"
                >
                  查看活动说明 <IconExternal className="ml-1 inline h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 选型决策情报与对比看板 */}
      <section className="mx-auto max-w-[1600px] px-4 pt-6 sm:px-6">
        <div className="mb-3.5 flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
            🛠️ 开发者落地与选型决议
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3 font-sans text-xs">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
            <div className="font-bold text-xs text-zinc-900 uppercase tracking-wider mb-2">🎯 最佳推荐场景</div>
            <p className="text-zinc-600 leading-relaxed text-xs">
              {row.targetUsers ? row.targetUsers : (row.useCases.length > 0 ? row.useCases.join(" · ") : "适合日常全栈开发辅助、自动化代码生成与复杂工程调试。")}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
            <div className="font-bold text-xs text-zinc-900 uppercase tracking-wider mb-2">⚖️ 核心避坑/注意要点</div>
            <p className="text-zinc-600 leading-relaxed text-xs">
              {row.disadvantages ? row.disadvantages : "整体体验平稳，建议优先使用官方默认推荐模型或按需绑定自定义 API Key 以保障并发。"}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
            <div className="font-bold text-xs text-zinc-900 uppercase tracking-wider mb-2">📊 竞品替代与部署建议</div>
            <p className="text-zinc-600 leading-relaxed text-xs">
              {row.competitor ? row.competitor : `可横向对比 ${row.name} 同类产品的免费额度、上下文窗口深度及多 Agent 协作流畅度表现。`}
            </p>
          </div>
        </div>
      </section>

      {/* 快速终端/拓展接入命令 */}
      <section className="mx-auto max-w-[1600px] px-4 pt-4 sm:px-6">
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-900 p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">⚡ 快速安装 & 启动方式</span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">
              Terminal Setup
            </span>
          </div>
          <div className="font-mono text-xs sm:text-sm font-medium text-emerald-400 select-all break-all pt-1">
            {getInstallCmd(row.name)}
          </div>
        </div>
      </section>

      {/* 评测内容 —— sticky TOC + 4 卡片（Phase 2 新字段） */}
      <ReviewSection row={row} activeId={activeReviewId} />

      {/* 01 核心优势 */}
      {row.advantages && (
        <DetailSection number="01" title="核心优势">
          <p className="font-sans text-sm leading-relaxed text-zinc-700">{row.advantages}</p>
        </DetailSection>
      )}

      {/* 02 主要劣势 */}
      {row.disadvantages && (
        <DetailSection number="02" title="主要劣势">
          <p className="font-sans text-sm leading-relaxed text-amber-900 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60">{row.disadvantages}</p>
        </DetailSection>
      )}

      {/* 03 适用场景 */}
      {row.useCases.length > 0 && (
        <DetailSection number="03" title="适用场景">
          <div className="flex flex-wrap gap-2">
            {row.useCases.map((uc) => (
              <span key={uc} className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-xs font-semibold text-zinc-700 shadow-2xs">
                {uc}
              </span>
            ))}
          </div>
        </DetailSection>
      )}

      {/* 04 备注 / 补充 */}
      {row.note && (
        <DetailSection number="04" title="补充说明">
          <p className="whitespace-pre-line font-sans text-sm leading-relaxed text-zinc-600">{row.note}</p>
        </DetailSection>
      )}
    </div>
  );
}

// ============== 评测内容（sticky TOC + 4 卡片） ==============

function ReviewSection({ row, activeId }: { row: ToolRow; activeId: string }) {
  const visibleSections = REVIEW_SECTIONS.filter((s) => row[s.field]);
  if (visibleSections.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-xs font-bold text-white shadow-2xs">REVIEW</span>
        <h2 className="text-base font-bold text-zinc-900 tracking-tight sm:text-lg">深度评测维度</h2>
        <span className="font-mono text-xs text-zinc-400">
          ({visibleSections.length} 个维度)
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        {/* Sticky TOC */}
        <nav aria-label="评测目录" className="lg:sticky lg:top-20 lg:h-fit">
          <div className="mb-2 hidden font-mono text-xs uppercase tracking-wider text-zinc-400 lg:block lg:px-2">
            目录导航
          </div>
          <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible rounded-xl border border-zinc-200/80 bg-white p-2 shadow-sm">
            {visibleSections.map((s) => {
              const isActive = activeId === s.id;
              return (
                <li key={s.id} className="shrink-0">
                  <a
                    href={`#${s.id}`}
                    className={`group flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    }`}
                  >
                    <span className={isActive ? "text-zinc-300" : "text-zinc-400"}>{s.number}</span>
                    <span>{s.title}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 卡片 */}
        <div className="space-y-4">
          {visibleSections.map((s) => (
            <article
              key={s.id}
              id={s.id}
              className="rounded-2xl border border-zinc-200/80 bg-white p-6 scroll-mt-24 shadow-sm hover:border-zinc-300 transition-all"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs font-bold text-zinc-700">
                  {s.number}
                </span>
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">{s.title}</h3>
              </div>
              <p className="whitespace-pre-line font-sans text-sm leading-relaxed text-zinc-700">
                {row[s.field]}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============== 子组件 ==============

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="font-mono text-xs uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-1.5 font-mono text-sm font-bold text-zinc-900 leading-snug">{value}</div>
    </div>
  );
}

function Attribute({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="font-mono text-xs uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-1.5 font-mono text-sm font-semibold text-zinc-800">{value}</div>
    </div>
  );
}

function DetailSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-7">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-xs font-bold text-white shadow-2xs">{number}</span>
        <h2 className="text-base font-bold text-zinc-900 tracking-tight sm:text-lg">{title}</h2>
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 sm:p-6 shadow-sm">
        {children}
      </div>
    </section>
  );
}

/** 从 markdown 链接 [text](url) 或纯 url 提取 href */
function extractUrl(raw: string): string | null {
  const m = raw.match(/\((https?:\/\/[^)]+)\)/);
  if (m) return m[1];
  if (/^https?:\/\//.test(raw.trim())) return raw.trim();
  return null;
}

/** 格式化 stars（189816 → 189k / 1.2m） */
function formatStars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function getInstallCmd(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("claude code")) return "npm install -g @anthropic-ai/claude-code && claude";
  if (n.includes("aider")) return "pip install aider-chat && aider";
  if (n.includes("goose")) return "brew install goose";
  if (n.includes("continue")) return "VS Code / JetBrains Extension Store -> Search 'Continue'";
  if (n.includes("cline")) return "VS Code Extension Store -> Search 'Cline'";
  if (n.includes("cursor")) return "Download Cursor App from https://cursor.com";
  if (n.includes("windsurf")) return "Download Windsurf App from https://codeium.com/windsurf";
  if (n.includes("trae")) return "Download Trae IDE from https://trae.ai";
  return `Visit Official Website or Package Manager for ${name}`;
}