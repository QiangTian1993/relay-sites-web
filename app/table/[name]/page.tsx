// Swiss Style List Page —— 大标题 + 编号 + 顶部数据新鲜度栏（PRD F.06）

import { notFound } from "next/navigation";
import { loadTable } from "@/lib/data-loader";
import { getVisibleTable, VISIBLE_TABLES } from "@/lib/tables";
import { buildModelOfferSummaries } from "@/lib/relay-product";
import { NotionDataView } from "@/components/notion-data-view";
import { RelaySitesExplorer } from "@/components/relay-sites-explorer";
import { ToolsExplorer } from "@/components/explorer/tools-explorer";
import { FreshnessBanner } from "@/components/freshness-banner";
import { IconSites, IconTools } from "@/components/icons";
import { RelaySubNav } from "@/components/relay-sub-nav";
import type { Metadata } from "next";

export const dynamicParams = false;

export function generateStaticParams() {
  return VISIBLE_TABLES.map((t) => ({ name: t.id }));
}

interface Params {
  params: { name: string };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const table = getVisibleTable(params.name);
  if (!table) return {};
  return {
    title: `${table.displayName}大盘`,
    description: table.description,
    alternates: { canonical: `/table/${params.name}` },
  };
}

export default async function TableListPage({ params }: Params) {
  const table = getVisibleTable(params.name);
  if (!table) notFound();

  const TableIcon = table.id === "relay_sites_tracker" ? IconSites : IconTools;
  const data = await loadTable(table.id);
  if (!data) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-8 shadow-xs">
        <div className="flex items-start gap-4">
          <span className="rounded-lg bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 font-mono text-xs font-bold text-amber-800">
            NOTICE
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">数据未加载</h2>
            <p className="mt-1.5 font-mono text-xs text-zinc-600">
              请先在终端跑{" "}
              <code className="rounded-md border border-zinc-200 bg-white px-2 py-0.5 font-mono text-xs text-zinc-800 shadow-2xs">
                npm run fetch
              </code>{" "}
              拉取数据。
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (table.id === "relay_sites_tracker") {
    const [performanceData, modelData, groupsData] = await Promise.all([
      loadTable("relay_site_perf"),
      loadTable("model_rates"),
      loadTable("relay_site_groups"),
    ]);
    const modelOffers = buildModelOfferSummaries(modelData?.records ?? []);
    const modelSiteCount = new Set(modelOffers.map((offer) => offer.siteRecordId)).size;
    const groupRecords = groupsData?.records ?? [];

    return (
      <div className="pb-20">
        <RelaySubNav />
        <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md">
          <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
                <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">01</span>
                <span>MODULE 01 · 站点大盘</span>
              </div>
              <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">中转站档案库</h1>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500">按站点实体查接入条件、Provider、框架与覆盖情况；精确价格决策请进入模型比价。</p>
            </div>
            <div className="grid grid-cols-3 rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden divide-x divide-zinc-100">
              <ModuleMetric label="站点" value={data.records.length} />
              <ModuleMetric label="模型明细" value={modelSiteCount} />
              <ModuleMetric label="性能实测" value={performanceData?.records.length ?? 0} />
            </div>
          </div>
        </header>
        <FreshnessBanner fetchedAts={[data.fetchedAt, performanceData?.fetchedAt, groupsData?.fetchedAt]} />
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
          <RelaySitesExplorer records={data.records} performanceRecords={performanceData?.records ?? []} modelOffers={modelOffers} groupRecords={groupRecords} />
        </div>
      </div>
    );
  }

  if (table.id === "vibe_coding_tracker") {
    const toolCount = data.records.length;
    const activeCount = data.records.filter((r) => {
      const v = Array.isArray(r["我的状态"]) ? r["我的状态"][0] : r["我的状态"];
      return v === "在用";
    }).length;
    const scores = data.records.map((r) => Number(r["评分"]) || 0).filter((s) => s > 0);
    const avgScore = scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : "--";

    return (
      <div className="pb-20">
        <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md">
          <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
                <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white">02</span>
                <span>MODULE 02 · 编程工具</span>
              </div>
              <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">AI 编程工具</h1>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500">Vibe Coding 工具全景 · 按类型、平台、多 Agent 能力横向对比</p>
            </div>
            <div className="grid grid-cols-3 rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden divide-x divide-zinc-100">
              <ModuleMetric label="工具" value={toolCount} />
              <ModuleMetric label="在用" value={activeCount} />
              <ModuleMetric label="均分" value={avgScore} />
            </div>
          </div>
        </header>
        <FreshnessBanner fetchedAts={[data.fetchedAt]} />
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
          <ToolsExplorer records={data.records} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md">
        <div className="border-b border-zinc-100 bg-zinc-50/50">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2 font-mono text-xs text-zinc-500 sm:px-6">
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-white font-bold">03</span>
            <span>{table.id.toUpperCase()} / LIST</span>
            <span className="ml-auto text-zinc-400">
              UPDATED {new Date(data.fetchedAt).toLocaleString("zh-CN", { hour12: false })}
            </span>
          </div>
        </div>
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[3fr_2fr]">
          <div>
            <div className="flex items-start gap-4">
              <TableIcon className="h-10 w-10 shrink-0 text-zinc-900" />
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
                  {table.displayName}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-500">
                  {table.description}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden divide-x divide-y sm:divide-y-0 divide-zinc-100">
            <div className="p-4">
              <div className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400">RECORDS</div>
              <div className="mt-1 text-3xl font-extrabold text-zinc-900">{data.records.length}</div>
            </div>
            <div className="p-4">
              <div className="font-mono text-xs font-medium uppercase tracking-wider text-zinc-400">FIELDS</div>
              <div className="mt-1 text-3xl font-extrabold text-zinc-900">{table.fields.length}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Table */}
      <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
        <NotionDataView table={table} records={data.records} />
      </div>
    </div>
  );
}

function ModuleMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 text-center sm:text-left">
      <div className="font-mono text-xs uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-zinc-900">{value}</div>
    </div>
  );
}
