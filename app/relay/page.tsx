import { RelayV1Explorer } from "@/components/relay-v1-explorer";
import { loadTable } from "@/lib/data-loader";
import { buildRelayV1Data } from "@/lib/relay-v1";

export const dynamic = "force-static";

export default async function RelayPage() {
  const [sites, groups, performance, modelRates] = await Promise.all([
    loadTable("relay_sites_tracker"),
    loadTable("relay_site_groups"),
    loadTable("relay_site_perf"),
    loadTable("model_rates"),
  ]);

  const data = buildRelayV1Data(
    sites?.records ?? [],
    modelRates?.records ?? [],
    groups?.records ?? [],
    performance?.records ?? [],
  );

  return <RelayV1Explorer data={data} />;
}
