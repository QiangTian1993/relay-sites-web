import { Suspense } from "react";
import type { Metadata } from "next";
import { loadTable } from "@/lib/data-loader";
import { getAllQCRecords } from "@/lib/qc-store";
import DetectorUI from "@/components/detector-ui";
import { ShieldCheck, Activity, Terminal, ArrowRight } from "lucide-react";
import Link from "next/link";
import { RelaySubNav } from "@/components/relay-sub-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "模型真实性质检中心 — GPT-5.6 / Juice 指纹混用探针",
  description: "AI 中转站模型真实性在线质检：无须可信端检测 GPT-5.6 Sol/Terra/Luna Juice 结构指纹、输出完整性、提示词覆盖风险与行为分布匹配。",
};

export default async function DetectorPage() {
  const [sitesData, initialQCRecords] = await Promise.all([
    loadTable("relay_sites_tracker"),
    getAllQCRecords(),
  ]);

  const sitesList = (sitesData?.records ?? []).map((r) => ({
    siteId: String(r["站点ID"] ?? r.__id),
    name: String(r["名称"] ?? "未知站点"),
    domain: String(r["域名"] ?? ""),
  }));

  return (
    <div>
      {/* Header Sub Nav */}
      <RelaySubNav />

      {/* ── Hero Banner ───────────────────────────────────────────── */}
      <section className="border-b-2 border-black bg-white">
        <div className="p-8 md:p-12 relative overflow-hidden">
          <div className="relative z-10 max-w-4xl">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-black text-white px-3 py-1 font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-swiss-accent" />
                MODULE 05 · MODEL QUALITY OBSERVATORY
              </span>
              <span className="border border-swiss-accent/40 bg-swiss-accent/5 px-2.5 py-1 font-mono text-xs font-bold text-swiss-accent">
                在线探针试射
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black leading-tight text-black mb-4">
              模型真实性与<span className="text-swiss-accent">混用质检中心</span>
            </h1>

            <p className="text-sm md:text-base text-black/70 leading-relaxed mb-6 max-w-3xl">
              针对 GPT-5.6 (Sol / Terra / Luna)、GPT-4o 与 Claude 系列的真实性在线硬探针检测。
              内置 Juice 内部预算结构指纹比对、确定性行为题概率匹配、32/48 前缀改写与代理隐蔽提示覆盖检测。
            </p>

            <div className="flex flex-wrap items-center gap-6 font-mono text-xs text-black/60 uppercase tracking-wider border-t border-black/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-emerald-500 rounded-full" />
                <span>无须任何可信端支持</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-swiss-accent rounded-full" />
                <span>零 Key 落盘安全机制</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 bg-black rounded-full" />
                <span>自动同步大盘看板</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Detector Section */}
      <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
        <Suspense fallback={<div className="border-2 border-black p-8 font-mono text-sm">正在加载质检中心...</div>}>
          <DetectorUI initialQCRecords={initialQCRecords} sitesList={sitesList} />
        </Suspense>
      </div>
    </div>
  );
}
