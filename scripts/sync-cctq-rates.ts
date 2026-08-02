import fs from "node:fs";
import { execFileSync } from "node:child_process";

// Force load .env.local
const envLocal = fs.readFileSync(".env.local", "utf-8");
const match = envLocal.match(/FEISHU_BASE_TOKEN=(.+)/);
if (!match) throw new Error("Could not find FEISHU_BASE_TOKEN in .env.local");
const KB_TOKEN = match[1].trim();

const TABLE_ID = "tbl5EDYdDtH8SlXM";
const SITE_ID = "cctq";
const SITE_RECORD_ID = "recvqn3NGSHUux"; // The ID of cctq in relay_sites_tracker
const SITE_NAME = "CCTQ AI API 中转站";
const SOURCE_DOMAIN = "www.cctq.ai";

function runLark(args: string[]) {
  const cmd = ["lark-cli", ...args, "--base-token", KB_TOKEN, "--format", "json"];
  return execFileSync(cmd[0], cmd.slice(1), { encoding: "utf-8" });
}

async function main() {
  const res = await fetch("https://www.cctq.ai/api/pricing");
  const pricingData = await res.json();
  const models = pricingData.data;

  const existingRates = JSON.parse(fs.readFileSync("data/model_rates.json", "utf-8"));
  const existingCctq = existingRates.filter((r: any) => r.site_id === SITE_ID);
  
  const fetchedAt = new Date().getTime(); // timestamp in ms

  for (const m of models) {
    const existing = existingCctq.find((r: any) => r.model_name === m.model_name);
    
    const isImage = ["dall-e", "midjourney", "gpt-image", "flux", "suno", "luma"].some(sub => m.model_name.toLowerCase().includes(sub));
    const modelType = isImage ? "image" : "text";

    const fields = {
      "site": [SITE_RECORD_ID],
      "site_id": SITE_ID,
      "site_name": SITE_NAME,
      "source_domain": SOURCE_DOMAIN,
      "model_name": m.model_name,
      "model_type": modelType,
      "rate_input": m.model_ratio,
      "rate_output": m.model_ratio * m.completion_ratio,
      "rate_cache": m.cache_ratio,
      "rate_create_cache": m.create_cache_ratio,
      "model_price": m.model_price > 0 ? m.model_price : null,
      "enable_groups": m.enable_groups ? m.enable_groups.join(", ") : "",
      "fetched_at": fetchedAt
    };

    const args = [
      "base", "+record-upsert",
      "--table-id", TABLE_ID,
      "--json", JSON.stringify(fields)
    ];
    if (existing) {
      console.log(`Updating ${m.model_name} (ID: ${existing.__id})`);
      args.push("--record-id", existing.__id);
    } else {
      console.log(`Inserting ${m.model_name}`);
    }
    
    try {
      runLark(args);
    } catch (e: any) {
      console.error(`Error processing ${m.model_name}:`, e.message);
    }
    
    await new Promise(r => setTimeout(r, 400));
  }
  
  console.log("Done syncing to Feishu! Running fetch-data.ts to update local cache...");
  // Use the same KB_TOKEN for fetch-data
  execFileSync("npx", ["tsx", "scripts/fetch-data.ts"], { 
    stdio: "inherit",
    env: { ...process.env, KB_TOKEN, FEISHU_BASE_TOKEN: KB_TOKEN }
  });
}

main().catch(console.error);
