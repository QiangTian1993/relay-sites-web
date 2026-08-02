// Swiss Style Detail Page —— already implemented in data-detail.tsx

import { notFound } from "next/navigation";
import { loadTable, loadAllTables } from "@/lib/data-loader";
import { getVisibleTable, VISIBLE_TABLES } from "@/lib/tables";
import { buildModelOfferSummaries } from "@/lib/relay-product";
import { DataDetail } from "@/components/data-detail";
import { RelaySiteDetail } from "@/components/relay-site-detail";
import { ToolsDetail } from "@/components/tools-detail";
import { buildToolRow } from "@/lib/tools-types";
export const dynamicParams = true;

export async function generateStaticParams() {
  const tables = await loadAllTables(VISIBLE_TABLES);
  return tables.flatMap((data) =>
    data.records.flatMap((r) => {
      const ids = new Set<string>();
      if (r.__id) ids.add(String(r.__id));
      const pk = r[data.table.primaryKey];
      if (pk) ids.add(String(pk));
      if (r.site_id) ids.add(String(r.site_id));
      return Array.from(ids).map((id) => ({ name: data.table.id, id }));
    })
  );
}

interface Params {
  params: { name: string; id: string };
}

export default async function RecordDetailPage({ params }: Params) {
  const table = getVisibleTable(params.name);
  if (!table) notFound();

  const data = await loadTable(table.id);
  if (!data) notFound();

  const recordId = decodeURIComponent(params.id);
  const record = data.records.find(
    (r) =>
      r.__id === recordId ||
      String(r[table.primaryKey] ?? "") === recordId ||
      String(r["站点ID"] ?? "") === recordId ||
      String(r.site_id ?? "") === recordId
  );
  if (!record) notFound();

  if (table.id === "relay_sites_tracker") {
    const [performanceData, groupData, modelData] = await Promise.all([
      loadTable("relay_site_perf"),
      loadTable("relay_site_groups"),
      loadTable("model_rates"),
    ]);
    const siteId = String(record["站点ID"] ?? "");
    const domainHost = String(record["域名"] ?? "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();

    const performance = performanceData?.records.find((item) => {
      const relId = Array.isArray(item.site) && item.site[0] ? (item.site[0] as { id?: string }).id : typeof item.site === "object" && item.site !== null ? (item.site as { id?: string }).id : null;
      const itemHost = String(item.host ?? "").replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
      return relId === record.__id || String(item.site_id ?? "") === siteId || (itemHost && domainHost && itemHost === domainHost);
    }) ?? null;
    const groups = groupData?.records.filter((item) => String(item.site_id ?? "") === siteId) ?? [];
    const siteModelRecords = modelData?.records.filter((item) => String(item.site_id ?? "") === record.__id) ?? [];

    return (
      <RelaySiteDetail
        record={record}
        performance={performance}
        groups={groups}
        modelOffers={buildModelOfferSummaries(siteModelRecords)}
      />
    );
  }

  if (table.id === "vibe_coding_tracker") {
    return <ToolsDetail row={buildToolRow(record)} />;
  }

  return <DataDetail table={table} record={record} />;
}
