// 全站 footer：站点信息 + 联系方式（QQ）
// 号码在 CONTACT 常量维护

import { MessageCircle } from "lucide-react";

export const CONTACT = {
  qq: "244439359",
};

export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-black bg-black text-white">
      <div className="mx-auto max-w-[1600px]">
        <div className="grid md:grid-cols-[1fr_auto]">
          {/* 品牌区 */}
          <div className="p-6 md:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">
              RELAY INDEX · 信息杂货铺
            </p>
            <p className="text-sm text-white/55 leading-relaxed max-w-xl">
              AI 世界的实用情报收集成册 —— 模型比价、编程工具、开源热榜。
              数据源：飞书 knowledge-base-2026 / GitHub Trending，定时采集。
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-white/35">
              <span>© 2026 Relay Index</span>
              <span>·</span>
              <span>Made with ♥ for developers</span>
            </div>
          </div>

          {/* 联系方式区 */}
          <div className="border-t-2 md:border-t-0 md:border-l-2 border-white/15 p-6 md:p-8 md:min-w-[260px]">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-swiss-accent mb-3">
              联系方式 · Contact
            </p>
            <div className="flex flex-col gap-2.5">
              <a
                href={`https://wpa.qq.com/msgrd?v=3&uin=${CONTACT.qq}&site=qq&menu=yes`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 text-sm font-black transition-colors hover:text-swiss-accent"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="font-mono">QQ：{CONTACT.qq}</span>
              </a>
            </div>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-white/30">
              交流 / 建议 / 合作
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
