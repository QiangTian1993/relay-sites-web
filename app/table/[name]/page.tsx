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
      <div className="border-2 border-swiss-accent bg-swiss-bg p-8 swiss-dots">
        <div className="flex items-start gap-4">
          <span className="bg-swiss-accent px-3 py-1 font-mono text-sm font-black uppercase text-swiss-bg">
            ! ERR
          </span>
          <div>
            <h2 className="text-2xl font-black tracking-tight">数据未加载</h2>
            <p className="mt-2 font-mono text-sm text-swiss-fg/70">
              请先在终端跑{" "}
              <code className="border-2 border-swiss-fg bg-swiss-muted px-2 py-0.5 font-mono text-sm">
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
        <header className="border-b-2 border-swiss-fg swiss-grid">
          <div className="mx-auto grid max-w-[1600px] gap-6 px-5 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <div className="font-mono text-sm font-black uppercase tracking-widest text-swiss-fg/50">MODULE 01</div>
              <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">中转站选站</h1>
              <p className="mt-3 text-sm text-swiss-fg/60">按目标模型、价格、性能和接入状态缩小候选范围。</p>
            </div>
            <div className="grid grid-cols-3 border-y-2 border-swiss-fg lg:border-2">
              <ModuleMetric label="站点" value={data.records.length} />
              <ModuleMetric label="模型明细" value={modelSiteCount} />
              <ModuleMetric label="性能实测" value={performanceData?.records.length ?? 0} />
            </div>
          </div>
        </header>
        <FreshnessBanner fetchedAts={[data.fetchedAt, performanceData?.fetchedAt, groupsData?.fetchedAt]} />
        <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-6 sm:py-8">
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
        <header className="border-b-2 border-black">
          <div className="mx-auto grid max-w-[1600px] gap-6 px-5 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div>
              <div className="font-mono text-sm font-black uppercase tracking-widest text-black/50">MODULE 02</div>
              <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">AI 编程工具</h1>
              <p className="mt-3 text-sm text-black/60">Vibe Coding 工具全景 · 按类型、平台、多 Agent 能力横向对比</p>
            </div>
            <div className="grid grid-cols-3 border-y-2 border-black lg:border-2">
              <ModuleMetric label="工具" value={toolCount} />
              <ModuleMetric label="在用" value={activeCount} />
              <ModuleMetric label="均分" value={avgScore} />
            </div>
          </div>
        </header>
        <FreshnessBanner fetchedAts={[data.fetchedAt]} />
        <div className="mx-auto max-w-[1600px] px-5 py-6 sm:px-6 sm:py-8">
          <ToolsExplorer records={data.records} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header — 编号大标题 */}
      <header className="border-b-2 border-swiss-fg swiss-grid">
        <div className="border-b border-swiss-fg/20 bg-swiss-fg text-swiss-bg">
          <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-3 font-mono text-sm uppercase tracking-ultra">
            <span className="bg-swiss-accent px-2 py-0.5 text-swiss-bg">03.</span>
            <span>{table.id.toUpperCase()} / LIST</span>
            <span className="ml-auto">
              UPDATED {new Date(data.fetchedAt).toLocaleString("zh-CN", { hour12: false })}
            </span>
          </div>
        </div>
        <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-0 px-6 py-12 sm:py-16 lg:grid-cols-[3fr_2fr]">
          <div className="border-b-2 border-swiss-fg pb-8 lg:border-b-0 lg:border-r-2 lg:pr-12 lg:pb-0">
            <div className="mb-3 font-mono text-sm uppercase tracking-ultra text-swiss-fg/60">
              03.A / TITLE
            </div>
            <div className="flex items-start gap-4">
              <TableIcon className="h-14 w-14 shrink-0 stroke-[1.5] text-swiss-fg" />
              <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-black leading-[0.85] tracking-tightest">
                {table.displayName}
              </h1>
            </div>
            <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-swiss-fg/70">
              {table.description}
            </p>
          </div>
          <div className="flex flex-col gap-4 pt-8 lg:pt-0 lg:pl-12">
            <div className="font-mono text-sm uppercase tracking-ultra text-swiss-fg/60">
              03.B / STATS
            </div>
            <div className="grid grid-cols-2 gap-0 border-2 border-swiss-fg">
              <div className="border-b-2 border-r-2 border-swiss-fg p-4">
                <div className="font-mono text-sm uppercase tracking-ultra text-swiss-fg/50">
                  RECORDS
                </div>
                <div className="mt-1 text-4xl font-black tracking-tighter">
                  {data.records.length}
                </div>
              </div>
              <div className="border-b-2 p-4">
                <div className="font-mono text-sm uppercase tracking-ultra text-swiss-fg/50">
                  FIELDS
                </div>
                <div className="mt-1 text-4xl font-black tracking-tighter">
                  {table.fields.length}
                </div>
              </div>
              <div className="border-r-2 p-4">
                <div className="font-mono text-sm uppercase tracking-ultra text-swiss-fg/50">
                  PRIMARY
                </div>
                <div className="mt-1 text-4xl font-black tracking-tighter">
                  {table.fields.filter((f) => f.primary).length}
                </div>
              </div>
              <div className="p-4">
                <div className="font-mono text-sm uppercase tracking-ultra text-swiss-fg/50">
                  FILTER
                </div>
                <div className="mt-1 text-4xl font-black tracking-tighter">
                  {table.fields.filter((f) => f.filterable).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Table */}
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <NotionDataView table={table} records={data.records} />
      </div>
    </div>
  );
}

function ModuleMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r border-swiss-fg p-3 last:border-r-0 sm:p-4">
      <div className="font-mono text-sm uppercase tracking-widest text-swiss-fg/45">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </div>
  );
}
