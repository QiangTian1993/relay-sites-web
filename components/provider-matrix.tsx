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
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-xs font-bold text-white shadow-2xs">
            04
          </span>
          <span className="text-base font-bold text-zinc-900 tracking-tight">
            PROVIDER × SITE 矩阵全览
          </span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50 px-3 py-1 font-mono text-xs text-zinc-600">
          <span>共支持</span>
          <span className="font-bold text-zinc-900">{records.length}</span>
          <span>站点</span>
        </div>
      </header>

      {/* Provider 分块（每块 3 个 provider，每个 provider 一列） */}
      <div className="flex flex-col gap-6">
        {chunked.map((chunk, ci) => (
          <section key={ci} className="flex flex-col gap-3">
            {/* 块标题（块编号 + provider 列表） */}
            <div className="flex items-center gap-2.5 px-1 font-mono text-xs uppercase tracking-wider text-zinc-400">
              <span className="rounded bg-zinc-200/80 px-1.5 py-0.5 font-bold text-zinc-700 text-[11px]">
                BLOCK {String(ci + 1).padStart(2, "0")}
              </span>
              <span className="font-semibold text-zinc-600">
                {chunk.map((b) => b.provider).join(" · ")}
              </span>
            </div>

            {/* 3 列卡片网格 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
    <div className="flex flex-col rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden transition-all hover:border-zinc-300">
      {/* Provider header */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/70 px-4 py-3">
        <span className="font-bold text-sm text-zinc-900 tracking-tight">{block.provider}</span>
        <span className="rounded-full border border-zinc-200/80 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-zinc-600 shadow-2xs">
          {block.count} 站支持
        </span>
      </div>

      {/* 站点列表（按倍率升序） */}
      <ul className="flex flex-col divide-y divide-zinc-100">
        {block.rows.length === 0 ? (
          <li className="px-4 py-8 text-center font-mono text-xs text-zinc-400">
            暂无站点支持
          </li>
        ) : (
          block.rows.slice(0, 7).map((row, ri) => {
            const tier = rateTier(row.rate);
            const isBest = ri === 0 && row.rate != null;
            return (
              <li
                key={row.siteId}
                className="group transition-colors hover:bg-zinc-50/80"
              >
                <Link
                  href={`${basePath}/${encodeURIComponent(row.siteId)}`}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs"
                >
                  {/* 排名 */}
                  <span className={`w-5 font-mono text-[11px] font-semibold ${isBest ? "text-[#E03E1A]" : "text-zinc-400"}`}>
                    {String(ri + 1).padStart(2, "0")}
                  </span>
                  {/* 站点名 */}
                  <span className="flex-1 truncate font-medium text-zinc-900 group-hover:text-[#E03E1A] transition-colors">
                    {row.siteName}
                  </span>
                  {/* 倍率 */}
                  <span
                    className={`font-mono text-xs ${tier.classes} ${isBest ? "ring-1 ring-[#E03E1A]/40" : ""}`}
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
        <div className="mt-auto border-t border-zinc-100 bg-zinc-50/50 px-4 py-2 text-center font-mono text-[11px] text-zinc-400">
          + {block.rows.length - 7} MORE SITES
        </div>
      )}
    </div>
  );
}
