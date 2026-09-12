import fs from "node:fs";
import { execFileSync } from "node:child_process";

// Force load .env.local
const envLocal = fs.readFileSync(".env.local", "utf-8");
const match = envLocal.match(/FEISHU_BASE_TOKEN=(.+)/);
if (!match) throw new Error("Could not find FEISHU_BASE_TOKEN in .env.local");
const KB_TOKEN = match[1].trim();

const TABLE_ID = "tblIZtZllNUaSuud"; // relay_site_groups
const SITE_ID = "cctq";
const SITE_RECORD_ID = "recvqn3NGSHUux";
const SITE_NAME = "CCTQ AI API 中转站";

function runLark(args: string[]) {
  const cmd = ["lark-cli", ...args, "--as", "bot", "--base-token", KB_TOKEN, "--format", "json"];
  return execFileSync(cmd[0], cmd.slice(1), { encoding: "utf-8" });
}

async function main() {
  const pricingData = JSON.parse(fs.readFileSync("/tmp/cctq_pricing.json", "utf-8"));
  const groupRatio = pricingData.group_ratio;

  // Load existing groups to find record_id for upsert
  const existingGroups = JSON.parse(fs.readFileSync("data/relay_site_groups.json", "utf-8"));
  const existingCctqGroups = existingGroups.filter((g: any) => g.site_id === SITE_ID);

  console.log(`Syncing ${Object.keys(groupRatio).length} groups for CCTQ...`);

  for (const [groupName, rate] of Object.entries(groupRatio)) {
    const existingGroup = existingCctqGroups.find((g: any) => g.group_name === groupName);

    const fields = {
      "site": [SITE_RECORD_ID],
      "site_id": SITE_ID,
      "site_name": SITE_NAME,
      "group_name": groupName,
      "rate_min": rate,
      "rate_max": rate,
      "rate_values": `${rate}x`,
      "rate_source": "group",
      "updated_at": new Date().getTime(),
    };
    
    const args = [
      "base", "+record-upsert",
      "--table-id", TABLE_ID,
      "--json", JSON.stringify(fields),
    ];

    if (existingGroup) {
      console.log(`Updating group: ${groupName}`);
      args.push("--record-id", existingGroup.__id);
    } else {
      console.log(`Inserting group: ${groupName}`);
    }

    try {
      runLark(args);
    } catch (e: any) {
      console.error(`Error processing group ${groupName}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 400));
  }

  console.log("\nFinished syncing groups to Feishu.");
}

main().catch(console.error);
