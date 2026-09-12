import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import LlmBenchmarksExplorer from "@/components/llm-benchmarks-explorer";
import type { ModelBenchmarkRecord } from "@/scripts/sync-llm-benchmarks";
import { BENCHMARK_MODELS } from "@/scripts/sync-llm-benchmarks";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "大模型评测天梯榜 — 信息杂货铺",
  description:
    "主流大模型（Claude / GPT / Gemini / GLM / DeepSeek / 通义千问）实测评分、LMSYS 竞技场天梯、SWE-bench Verified 代码缺陷率、AIME 数学奥赛与官方价格横评。",
  alternates: { canonical: "/benchmarks" },
};

function loadBenchmarks(): ModelBenchmarkRecord[] {
  const filePath = path.join(process.cwd(), "data/llm_benchmarks.json");
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return BENCHMARK_MODELS;
    }
  }
  return BENCHMARK_MODELS;
}

export default function BenchmarksPage() {
  const records = loadBenchmarks();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "大模型评测天梯榜",
    description:
      "主流大模型（Claude 3.7 / OpenAI o3 / Gemini 2.5 / DeepSeek R1 / 智谱 GLM / 通义千问）实测评分、LMSYS 竞技场天梯与工程基准横评。",
    url: "https://www.xiuxai.com/relay-index/benchmarks",
    hasPart: records.map((m) => ({
      "@type": "Thing",
      name: m.模型名称,
      description: `${m.厂商} ${m.家族系列} 系列，${m.模型定位}，Arena Elo ${m.LMSYS总榜Elo}，SWE-bench ${m.SWE_bench_Verified}%。`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-[1560px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <LlmBenchmarksExplorer records={records} />
      </div>
    </>
  );
}
