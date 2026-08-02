import fs from "fs";
import { buildRelayV1Data, RelayV1Group } from "../lib/relay-v1";

const siteRecords = JSON.parse(fs.readFileSync("data/relay_sites_tracker.json", "utf-8"));
const modelRateRecords = JSON.parse(fs.readFileSync("data/model_rates.json", "utf-8"));
const groupRecords = JSON.parse(fs.readFileSync("data/relay_site_groups.json", "utf-8"));
const perfRecords = JSON.parse(fs.readFileSync("data/relay_site_perf.json", "utf-8"));

const data = buildRelayV1Data(siteRecords, modelRateRecords, groupRecords, perfRecords);

function groupMatchesModel(group: RelayV1Group, modelName: string): boolean {
  const normalized = modelName.toLocaleLowerCase();
  return group.relatedModels.some((item) => item.toLocaleLowerCase().startsWith(normalized));
}

for (const site of data.sites.slice(0, 50)) {
  const offer = site.offers[0];
  if (!offer) continue;
  
  const relevantGroups = site.groups.filter((group) => groupMatchesModel(group, offer.modelName));
  const minRateMatches = relevantGroups.map(g => g.rateMin).filter(r => r != null).sort()[0];

  const applicableGroups = site.groups.filter(g => offer.enabledGroups.includes(g.name));
  const minRateEnabled = applicableGroups.map(g => g.rateMin).filter(r => r != null).sort()[0];

  console.log(`Site: ${site.name} | Model: ${offer.modelName}`);
  console.log(`  Min Rate Matches: ${minRateMatches}`);
  console.log(`  Min Rate Enabled: ${minRateEnabled}`);
}
