import { RelayV1Explorer } from "@/components/relay-v1-explorer";
import { loadTable } from "@/lib/data-loader";
import { buildRelayV1Data } from "@/lib/relay-v1";
import { getAllQCRecords } from "@/lib/qc-store";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 中转站比价大盘",
  description: "多平台 AI 中转服务横向对比：模型倍率、分组计费、7 天可用率与网络延迟实测打点，一站式选型。",
  alternates: { canonical: "/relay" },
};

export const dynamic = "force-static";

export default async function RelayPage() {
  const [sites, groups, performance, modelRates, qcRecords] = await Promise.all([
    loadTable("relay_sites_tracker"),
    loadTable("relay_site_groups"),
    loadTable("relay_site_perf"),
    loadTable("model_rates"),
    getAllQCRecords(),
  ]);

  const data = buildRelayV1Data(
    sites?.records ?? [],
    modelRates?.records ?? [],
    groups?.records ?? [],
    performance?.records ?? [],
  );

  return <RelayV1Explorer data={data} qcRecords={qcRecords} />;
}
