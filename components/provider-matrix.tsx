// Provider 分块视图 —— 9 个 provider 分 3 块垂直堆叠（每块 3 列）
// 解决之前"上下展示 20 行"过于冗长的问题

"use client";

import Link from "next/link";
import type { KeyedRecord } from "@/lib/types";
import { type ProviderBlock, buildBlocks, rateTier } from "@/lib/matrix";

interface Props {
  records: KeyedRecord[];
  basePath?: string; // 默认 "/table/relay_sites_tracker"
}

export function ProviderMatrix({ records, basePath = "/table/relay_sites_tracker" }: Props) {
  const blocks = buildBlocks(records);

  // 按块分组（每 3 个 provider 一块）
  const chunked: ProviderBlock[][] = [];
  for (let i = 0; i < blocks.length; i += 3) {
    chunked.push(blocks.slice(i, i + 3));
  }

  return (
    <div className="flex flex-col gap-6 bg-swiss-muted p-5 sm:p-6">
      {/* Header */}
      <header className="flex items-center gap-3 border-b-2 border-swiss-fg bg-swiss-muted swiss-dots px-3 py-2">
        <span className="bg-swiss-accent px-2 py-1 font-mono text-sm font-black uppercase tracking-ultra text-swiss-bg">
          04.
        </span>
        <span className="text-lg font-black uppercase tracking-tight text-swiss-fg">
          MATRIX / PROVIDER × SITE
        </span>
        <span className="ml-auto inline-flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-swiss-fg/60">
          <span className="bg-swiss-fg px-2 py-1 font-black text-swiss-bg">
            ∑
          </span>
          <span className="font-black text-swiss-fg">{records.length}</span>
          <span>SITES</span>
        </span>
      </header>

      {/* Provider 分块（每块 3 个 provider，每个 provider 一列） */}
      <div className="flex flex-col gap-6">
        {chunked.map((chunk, ci) => (
          <section key={ci} className="flex flex-col gap-3">
            {/* 块标题（块编号 + provider 列表） */}
            <div className="flex items-center gap-2 border-b border-swiss-fg/30 pb-2 font-mono text-sm uppercase tracking-widest text-swiss-fg/50">
              <span className="bg-swiss-fg px-2 py-0.5 text-sm font-black text-swiss-bg">
                BLOCK {String(ci + 1).padStart(2, "0")}
              </span>
              <span className="font-black text-swiss-fg">
                {chunk.map((b) => b.provider).join(" / ")}
              </span>
            </div>

            {/* 3 列卡片网格 */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {chunk.map((block) => (
                <ProviderColumn
                  key={block.provider}
                  block={block}
                  basePath={basePath}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** 单个 provider 列卡 */
function ProviderColumn({ block, basePath }: { block: ProviderBlock; basePath: string }) {
  return (
    <div className="flex flex-col border-2 border-swiss-fg bg-swiss-bg">
      {/* Provider header */}
      <div className="flex items-center justify-between gap-2 border-b-2 border-swiss-fg bg-swiss-fg px-3 py-2 font-mono text-sm uppercase tracking-ultra text-swiss-bg">
        <span className="font-black">{block.provider}</span>
        <span className="bg-swiss-bg px-1.5 py-0.5 text-sm font-black text-swiss-fg">
          {block.count} 有倍率
        </span>
      </div>

      {/* 站点列表（按倍率升序） */}
      <ul className="flex flex-col">
        {block.rows.length === 0 ? (
          <li className="px-3 py-4 text-center font-mono text-sm uppercase tracking-ultra text-swiss-fg/40">
            ∅ NO SITES
          </li>
        ) : (
          block.rows.slice(0, 7).map((row, ri) => {
            const tier = rateTier(row.rate);
            const isBest = ri === 0;
            return (
              <li
                key={row.siteId}
                className="group border-b border-swiss-fg/15 last:border-b-0"
              >
                <Link
                  href={`${basePath}/${encodeURIComponent(row.siteId)}`}
                  className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-swiss-fg hover:text-swiss-bg"
                >
                  {/* 排名 */}
                  <span className="font-mono text-sm uppercase tracking-widest text-swiss-fg/40 group-hover:text-swiss-bg/40">
                    {String(ri + 1).padStart(2, "0")}
                  </span>
                  {/* 站点名 */}
                  <span className="flex-1 truncate font-mono text-sm font-bold text-swiss-fg group-hover:text-swiss-bg">
                    {row.siteName}
                  </span>
                  {/* 倍率（rateTier 颜色 + isBest 高亮） */}
                  <span
                    className={`font-mono text-base font-black leading-none tracking-tighter ${tier.classes} ${isBest ? "ring-2 ring-swiss-accent ring-inset px-1.5" : ""}`}
                  >
                    {tier.label}
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>

      {/* 块底部：显示更多（如果有 > 7 行） */}
      {block.rows.length > 7 && (
        <div className="border-t border-swiss-fg/20 bg-swiss-muted/40 px-3 py-1.5 text-center font-mono text-sm uppercase tracking-widest text-swiss-fg/50">
          + {block.rows.length - 7} MORE
        </div>
      )}
    </div>
  );
}
