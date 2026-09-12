// 全站 footer：站点信息
import Link from "next/link";
import { Store } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200/80 bg-zinc-950 text-zinc-300 rounded-t-3xl mt-12">
      <div className="mx-auto max-w-[1440px]">
        <div className="p-6 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pb-8 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900">
                  <Store className="h-3.5 w-3.5 text-[#E03E1A]" />
                </div>
                <span className="font-mono text-xs font-black tracking-widest uppercase text-white">
                  信息杂货铺 · XIUXAI GENERAL STORE
                </span>
                <span className="border border-white/20 px-1.5 py-0.2 font-mono text-[8px] uppercase tracking-widest text-white/60">
                  24H AUTO
                </span>
              </div>
              <p className="text-sm text-white/65 leading-relaxed max-w-lg">
                把 AI 世界的实用情报收集成册，分门别类摆齐上架 ——
                模型比价、42 款编程利器全景、GitHub 开源每日生鲜、在线硬探针质检。
              </p>
              <div className="mt-3 text-[11px] font-mono text-white/40">
                本铺声明：中转站倍率数据与网络探针均基于公开接口实测采样，仅供开发者技术选型与防坑参考。
              </div>
            </div>

            <div className="flex flex-col md:items-end justify-between h-full font-mono text-xs">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-white/70">
                <Link href="/relay" className="hover:text-amber-400 transition-colors">
                  01 · AI 中转站
                </Link>
                <Link href="/detector" className="hover:text-amber-400 transition-colors">
                  05 · 模型质检
                </Link>
                <Link href="/table/vibe_coding_tracker" className="hover:text-amber-400 transition-colors">
                  02 · 编程工具
                </Link>
                <Link href="/modules/github_trending" className="hover:text-amber-400 transition-colors">
                  03 · 开源热榜
                </Link>
                <a
                  href="https://t.me/+ZMc2ZPruuQkyN2U1"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                >
                  TG 茶歇铺 ↗
                </a>
              </div>
              <div className="mt-6 md:mt-0 font-mono text-[9px] uppercase tracking-widest text-white/35">
                NO. 8848-AI-STORE · TELEMETRY ACTIVE
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-widest text-white/40">
            <div className="flex items-center gap-2">
              <span>© 2026 信息杂货铺 (RELAY INDEX)</span>
              <span>·</span>
              <span>EST. 2026</span>
            </div>
            <div>MADE WITH ♥ FOR DEVELOPERS</div>
          </div>
        </div>
      </div>
    </footer>
  );
}



