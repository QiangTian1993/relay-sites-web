import fs from "node:fs";
import { buildRelayV1Data, RelayV1Offer, RelayV1Group } from "../lib/relay-v1";

// Duplicating the logic from the explorer component for this script
function offerPrice(offer: RelayV1Offer, groups: RelayV1Group[]): number | null {
  const basePrice = offer.modelType === "image" ? offer.perCallPrice : (offer.inputRate ?? offer.outputRate);
  if (basePrice == null) return null;
  if (groups.length === 0) return basePrice;

  const applicableGroups = offer.enabledGroups.length > 0
    ? groups.filter((g) => offer.enabledGroups.includes(g.name))
    : groups;

  if (applicableGroups.length === 0) return basePrice;

  const rates = applicableGroups.map((g) => g.rateMin).filter((r): r is number => r != null);
  if (rates.length === 0) return basePrice;

  return basePrice * Math.min(...rates);
}

const siteRecords = JSON.parse(fs.readFileSync("data/relay_sites_tracker.json", "utf-8"));
const modelRateRecords = JSON.parse(fs.readFileSync("data/model_rates.json", "utf-8"));
const groupRecords = JSON.parse(fs.readFileSync("data/relay_site_groups.json", "utf-8"));
const perfRecords = JSON.parse(fs.readFileSync("data/relay_site_perf.json", "utf-8"));

const data = buildRelayV1Data(siteRecords, modelRateRecords, groupRecords, perfRecords);

const targetModel = "gpt-5.6-sol";

const results: {
  siteName: string;
  effectivePrice: number;
  basePrice: number;
  minGroupRate: number;
}[] = [];

for (const site of data.sites) {
    const offer = site.offers.find(o => o.modelName === targetModel);
    if (!offer) continue;

    const basePrice = offer.inputRate ?? offer.outputRate;
    if (basePrice == null || basePrice === 0) continue;

    const effectivePrice = offerPrice(offer, site.groups);
    if (effectivePrice == null) continue;
    
    const minGroupRate = effectivePrice / basePrice;

    results.push({
        siteName: site.name,
        effectivePrice: effectivePrice,
        basePrice: basePrice,
        minGroupRate: minGroupRate,
    });
}

results.sort((a, b) => a.effectivePrice - b.effectivePrice);

console.log(`\n模型 "${targetModel}" 全站综合价格排序:`);
console.log("=".repeat(60));
results.forEach(r => {
    console.log(
        `${r.siteName.padEnd(28)} | ` +
        `最终倍率: ${r.effectivePrice.toFixed(4).padEnd(8)} | ` +
        `基础: ${r.basePrice.toFixed(2)}x | ` +
        `分组: ${r.minGroupRate.toFixed(3)}x`
    );
});
