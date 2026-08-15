// AI 编程工具详情页 —— Swiss 风格
// 结构：Hero / 4 卡指标 / 定价 + 中文 + stars / 评测(sticky TOC + 4 卡片) / 01-04 细节 section
//
// Phase 2 新增：评测 section 用 sticky TOC 导航 + 4 张大卡片展示 KB 里新填的
// 4 字段（产品定位 / 目标用户 / 使用建议 / 竞品对比）。老的 01-04 section
// 保留作为细节补充，不进 TOC。

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
  const scoreToneClass = row.scoreTone === "high" ? "bg-swiss-accent text-swiss-bg" : row.scoreTone === "medium" ? "bg-swiss-fg text-swiss-bg" : "bg-swiss-fg/15 text-swiss-fg/40";
  const allPlatforms = row.platforms.length > 0 ? row.platforms.join(" · ") : "未知";
  const allTypes = row.types.length > 0 ? row.types.join(" · ") : "未知";
  const allModels = row.supportedModels.length > 0 ? row.supportedModels.join(" · ") : "未知";

  // scroll spy：当前在 viewport 里的 review section（用于 TOC 高亮）
  const [activeReviewId, setActiveReviewId] = useState<string>(REVIEW_SECTIONS[0].id);
  useEffect(() => {
    const handler = () => {
      const offset = 120; // hero + 一些 breathing room
      let current = REVIEW_SECTIONS[0].id;
      for (const s of REVIEW_SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        // 顶部已经滑过 offset 的最后一个 section 算 active
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
      <header className="border-b-2 border-swiss-fg swiss-grid">
        <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-6 sm:py-8">
          <Link href="/table/vibe_coding_tracker" className="inline-flex min-h-11 items-center gap-2 font-mono text-sm font-black uppercase tracking-widest hover:text-swiss-accent">
            <IconArrowLeft className="h-4 w-4" /> 返回工具列表
          </Link>
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="font-mono text-sm uppercase tracking-widest text-swiss-fg/50">工具详情</div>
              <h1 className="mt-2 break-words text-5xl font-black leading-none tracking-tighter sm:text-7xl">{row.name}</h1>
              <div className="mt-3 font-mono text-base text-swiss-fg/65">{row.vendor}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-block border-2 px-3 py-1 font-mono text-base font-black ${scoreToneClass}`}>
                  {row.scoreLabel}
                </span>
                <span className="inline-flex items-center gap-0.5 border border-swiss-fg px-2 py-1 font-mono text-sm font-black">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <IconStar key={i} className={`h-4 w-4 ${i < row.score ? "text-swiss-fg" : "text-swiss-fg/15"}`} />
                  ))}
                </span>
                {row.stars != null && row.stars > 0 && (
                  <a href={row.githubUrl ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 border border-swiss-fg bg-swiss-bg px-3 py-1 font-mono text-sm font-black hover:bg-swiss-fg hover:text-swiss-bg">
                    <IconStar className="h-4 w-4 fill-swiss-fg" />
                    {formatStars(row.stars)} stars
                    <IconExternal className="h-3.5 w-3.5" />
                  </a>
                )}
                {row.myState === "在用" && <span className="inline-flex items-center gap-1 border border-swiss-accent bg-swiss-accent px-2 py-1 font-mono text-sm font-black text-swiss-bg"><IconCircleCheck className="h-4 w-4" />在用</span>}
                {row.myState === "待调研" && <span className="inline-flex items-center gap-1 border border-swiss-fg/40 px-2 py-1 font-mono text-sm font-black">待调研</span>}
                {row.myState === "弃用" && <span className="inline-flex items-center gap-1 border border-swiss-fg/40 px-2 py-1 font-mono text-sm font-black text-swiss-fg/55">弃用</span>}
              </div>
            </div>
            {row.url && extractUrl(row.url) && (
              <a href={extractUrl(row.url)!} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 bg-swiss-fg px-5 text-base font-black text-swiss-bg transition-colors hover:bg-swiss-accent">
                访问工具 <IconArrowRight className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 4 卡指标 */}
      <section className="border-b-2 border-swiss-fg">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 px-5 sm:px-6 lg:grid-cols-4">
          <Metric label="类型" value={allTypes} />
          <Metric label="平台" value={allPlatforms} />
          <Metric label="支持模型" value={allModels} />
          <Metric label="多 Agent" value={row.multiAgent} />
        </div>
      </section>

      {/* 定价 + 中文支持 + GitHub stars（附加信息） */}
      <section className="border-b-2 border-swiss-fg">
        <div className="mx-auto grid max-w-[1600px] grid-cols-2 px-5 py-6 sm:px-6 sm:py-8 lg:grid-cols-4">
          <Attribute label="定价机制" value={row.pricing} />
          <Attribute label="中文体验" value={row.chinese} />
          <Attribute label="GitHub Stars" value={row.stars != null ? formatStars(row.stars) : "非开源 / 未标注"} />
          <Attribute label="团队协作/DevBox" value={row.types.some(t => /IDE|Agent/i.test(t)) ? "支持远程环境" : "单机客户端"} />
        </div>
      </section>
      {row.activityBenefit && (
        <section className="border-b-2 border-swiss-fg bg-swiss-muted/40">
          <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-6 sm:py-8">
            <div className="border-l-4 border-swiss-accent bg-white p-4 sm:p-5">
              <div className="font-mono text-xs font-black uppercase tracking-widest text-swiss-accent">活动权益</div>
              <p className="mt-2 font-mono text-sm leading-6 text-swiss-fg/80">{row.activityBenefit}</p>
              <div className="mt-3 flex flex-wrap gap-4 font-mono text-xs text-swiss-fg/50">
                {row.activityPeriod && <span>期限：{row.activityPeriod}</span>}
                {row.activityUrl && (
                  <a href={row.activityUrl} target="_blank" rel="noreferrer" className="font-black text-swiss-fg underline decoration-swiss-accent decoration-2 underline-offset-4 hover:text-swiss-accent">
                    查看活动说明 <IconExternal className="ml-1 inline h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}


      {/* 选型决策情报与对比看板 */}
      <section className="border-b-2 border-swiss-fg bg-swiss-bg">
        <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-6 sm:py-10">
          <div className="mb-4 font-mono text-xs font-black uppercase tracking-widest text-swiss-accent">
            🛠️ 开发者落地与选型决议
          </div>
          <div className="grid gap-4 md:grid-cols-3 font-mono text-xs">
            <div className="border-2 border-swiss-fg bg-white p-4">
              <div className="font-black text-sm text-swiss-fg uppercase tracking-wider mb-2">🎯 最佳推荐场景</div>
              <p className="text-swiss-fg/80 leading-relaxed text-xs">
                {row.targetUsers ? row.targetUsers : (row.useCases.length > 0 ? row.useCases.join(" · ") : "适合日常全栈开发辅助、自动化代码生成与复杂工程调试。")}
              </p>
            </div>

            <div className="border-2 border-swiss-fg bg-white p-4">
              <div className="font-black text-sm text-swiss-fg uppercase tracking-wider mb-2">⚖️ 核心避坑/注意要点</div>
              <p className="text-swiss-fg/80 leading-relaxed text-xs">
                {row.disadvantages ? row.disadvantages : "整体体验平稳，建议优先使用官方默认推荐模型或按需绑定自定义 API Key 以保障并发。"}
              </p>
            </div>

            <div className="border-2 border-swiss-fg bg-white p-4">
              <div className="font-black text-sm text-swiss-fg uppercase tracking-wider mb-2">📊 竞品替代与部署建议</div>
              <p className="text-swiss-fg/80 leading-relaxed text-xs">
                {row.competitor ? row.competitor : `可横向对比 ${row.name} 同类产品的免费额度、上下文窗口深度及多 Agent 协作流畅度表现。`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 快速终端/拓展接入命令 */}
      <section className="border-b-2 border-swiss-fg bg-swiss-bg p-5 sm:p-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="font-mono text-xs font-black uppercase tracking-widest text-swiss-accent mb-2">⚡ 快速安装 & 启动方式</div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-2 border-swiss-fg bg-swiss-muted/60 p-4 font-mono text-sm">
            <div className="min-w-0 flex-1 font-bold text-swiss-fg select-all break-all">
              {getInstallCmd(row.name)}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-swiss-fg/50 border border-swiss-fg/20 bg-white px-2 py-1">
              Terminal / Setup
            </span>
          </div>
        </div>
      </section>

      {/* 评测内容 —— sticky TOC + 4 卡片（Phase 2 新字段） */}
      <ReviewSection row={row} activeId={activeReviewId} />

      {/* 01 核心优势 */}
      {row.advantages && (
        <DetailSection number="01" title="核心优势">
          <p className="font-mono text-base leading-7 text-swiss-fg/85">{row.advantages}</p>
        </DetailSection>
      )}

      {/* 02 主要劣势 */}
      {row.disadvantages && (
        <DetailSection number="02" title="主要劣势">
          <p className="border-l-4 border-swiss-warning pl-4 font-mono text-base leading-7 text-swiss-fg/85">{row.disadvantages}</p>
        </DetailSection>
      )}

      {/* 03 适用场景 */}
      {row.useCases.length > 0 && (
        <DetailSection number="03" title="适用场景">
          <div className="flex flex-wrap gap-2">
            {row.useCases.map((uc) => (
              <span key={uc} className="border-2 border-swiss-fg bg-swiss-bg px-3 py-2 font-mono text-base font-black">
                {uc}
              </span>
            ))}
          </div>
        </DetailSection>
      )}

      {/* 04 备注 / 补充 */}
      {row.note && (
        <DetailSection number="04" title="补充说明">
          <p className="whitespace-pre-line font-mono text-base leading-7 text-swiss-fg/75">{row.note}</p>
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
    <section className="border-b-2 border-swiss-fg bg-swiss-muted/40">
      <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-baseline gap-3">
          <span className="bg-swiss-fg px-2 py-1 font-mono text-sm font-black text-swiss-bg">REVIEW</span>
          <h2 className="text-2xl font-black tracking-tighter sm:text-3xl">评测内容</h2>
          <span className="font-mono text-xs uppercase tracking-widest text-swiss-fg/50">
            {visibleSections.length} 个维度
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10">
          {/* Sticky TOC：桌面端 fixed-width 左栏，移动端横滑 pills */}
          <nav aria-label="评测目录" className="lg:sticky lg:top-6 lg:h-fit">
            <div className="mb-2 hidden font-mono text-xs uppercase tracking-widest text-swiss-fg/50 lg:block lg:px-3">
              目录 · JUMP
            </div>
            <ul className="flex gap-0 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l-2 lg:border-swiss-fg">
              {visibleSections.map((s) => {
                const isActive = activeId === s.id;
                return (
                  <li key={s.id} className="shrink-0">
                    <a
                      href={`#${s.id}`}
                      className={`group flex items-center gap-2 whitespace-nowrap px-3 py-2 font-mono text-sm font-bold uppercase tracking-wider transition-colors lg:whitespace-normal lg:border-l-2 lg:-ml-[2px] lg:py-3 ${
                        isActive
                          ? "border-swiss-fg bg-swiss-fg text-swiss-bg"
                          : "border-transparent text-swiss-fg/55 hover:bg-swiss-muted hover:text-swiss-fg lg:hover:bg-swiss-muted"
                      }`}
                    >
                      <span className={`font-black ${isActive ? "opacity-100" : "opacity-70"}`}>{s.number}</span>
                      <span>{s.title}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 卡片 */}
          <div className="space-y-5">
            {visibleSections.map((s) => (
              <article
                key={s.id}
                id={s.id}
                className="border-2 border-swiss-fg bg-swiss-bg p-5 scroll-mt-24 transition-shadow hover:shadow-[4px_4px_0_0_#000] sm:p-6"
              >
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="bg-swiss-fg px-2 py-1 font-mono text-sm font-black text-swiss-bg">
                    {s.number}
                  </span>
                  <h3 className="text-xl font-black tracking-tight">{s.title}</h3>
                </div>
                <p className="whitespace-pre-line font-mono text-base leading-7 text-swiss-fg/85">
                  {row[s.field]}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============== 子组件 ==============

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[112px] border-b border-r border-swiss-fg p-4 even:border-r-0 lg:border-b-0 lg:even:border-r lg:last:border-r-0">
      <div className="font-mono text-sm uppercase tracking-widest text-swiss-fg/50">{label}</div>
      <div className="mt-2 font-mono text-base font-black leading-snug">{value}</div>
    </div>
  );
}

function Attribute({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-r border-swiss-fg p-4 last:border-b-0 last:border-r-0 sm:border-b-2 sm:even:border-r-0 lg:border-b-0 lg:even:border-r-2 lg:last:border-r-0">
      <div className="font-mono text-sm uppercase tracking-widest text-swiss-fg/55">{label}</div>
      <div className="mt-1 font-mono text-base font-bold">{value}</div>
    </div>
  );
}

function DetailSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b-2 border-swiss-fg">
      <div className="mx-auto max-w-[1600px] px-5 py-8 sm:px-6 sm:py-10">
        <div className="mb-5 flex items-baseline gap-3">
          <span className="bg-swiss-fg px-2 py-1 font-mono text-sm font-black text-swiss-bg">{number}</span>
          <h2 className="text-2xl font-black tracking-tighter sm:text-3xl">{title}</h2>
        </div>
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