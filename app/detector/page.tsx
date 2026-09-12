import { Suspense } from "react";
import type { Metadata } from "next";
import { loadTable } from "@/lib/data-loader";
import { getAllQCRecords, toArchiveRow } from "@/lib/qc-store";
import DetectorUI from "@/components/detector-ui";
import { ShieldCheck, Activity, Terminal, ArrowRight, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { RelaySubNav } from "@/components/relay-sub-nav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "模型真实性质检中心 — GPT-5.6 / Juice 指纹混用探针",
  description: "AI 中转站模型真实性在线质检：无须可信端检测 GPT-5.6 Sol/Terra/Luna Juice 结构指纹、输出完整性、提示词覆盖风险与行为分布匹配。",
};

export default async function DetectorPage() {
  const [sitesData, qcRecords] = await Promise.all([
    loadTable("relay_sites_tracker"),
    getAllQCRecords(),
  ]);

  const initialQCRecords = qcRecords.map(toArchiveRow);

  const sitesList = (sitesData?.records ?? []).map((r) => ({
    siteId: String(r["站点ID"] ?? r.__id),
    name: String(r["名称"] ?? "未知站点"),
    domain: String(r["域名"] ?? ""),
  }));

  return (
    <div className="min-h-screen bg-[#FAF9F5] pb-16">
      {/* Header Sub Nav */}
      <RelaySubNav />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ── Hero Banner ───────────────────────────────────────────── */}
        <section className="rounded-3xl border border-zinc-200/80 bg-white p-6 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="max-w-4xl relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="rounded-full bg-zinc-900 px-3 py-0.5 font-mono text-[10px] font-bold text-white uppercase tracking-wider">
                MODULE 05
              </span>
              <span className="rounded-full bg-orange-50 border border-orange-200/60 px-3 py-0.5 font-mono text-[10px] font-bold text-[#E03E1A] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                MODEL QUALITY OBSERVATORY
              </span>
              <span className="text-zinc-400 font-mono text-[10px] hidden sm:inline">
                在线探针试射 · 验真防套壳
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-950 mb-3">
              模型真实性与防混用质检中心
            </h1>

            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed mb-6 max-w-3xl font-normal">
              针对 GPT-5.6 (Sol / Terra / Luna)、GPT-4o 与 Claude 系列的真实性在线硬探针检测。
              内置 Juice 内部预算结构指纹比对、确定性行为题概率匹配、32/48 前缀改写与代理隐蔽提示覆盖检测。
            </p>

            <div className="flex flex-wrap items-center gap-6 font-mono text-xs text-zinc-500 border-t border-zinc-100 pt-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500 rounded-full" />
                <span>无须任何可信端支持</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-[#E03E1A] rounded-full" />
                <span>零 Key 落盘安全防护</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-zinc-700 rounded-full" />
                <span>实测结果自动归档大盘</span>
              </div>
            </div>
          </div>
        </section>

        {/* Main Interactive Detector Section */}
        <Suspense fallback={
          <div className="rounded-3xl border border-zinc-200/80 bg-white p-12 text-center font-mono text-sm text-zinc-500 shadow-xs">
            <Activity className="h-6 w-6 animate-spin mx-auto mb-2 text-[#E03E1A]" />
            <span>正在加载质检探针控制台...</span>
          </div>
        }>
          <DetectorUI initialQCRecords={initialQCRecords} sitesList={sitesList} />
        </Suspense>
      </div>
    </div>
  );
}
