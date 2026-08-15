// 全站 footer：站点信息

export default function SiteFooter() {
  return (
    <footer className="border-t-2 border-black bg-black text-white">
      <div className="mx-auto max-w-[1600px]">
        <div className="p-6 md:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40 mb-2">
            RELAY INDEX · 信息杂货铺
          </p>
          <p className="text-sm text-white/55 leading-relaxed max-w-xl">
            AI 世界的实用情报收集成册 —— 模型比价、编程工具、开源热榜。
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-widest text-white/35">
            <span>© 2026 Relay Index</span>
            <span>·</span>
            <span>Made with ♥ for developers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}


