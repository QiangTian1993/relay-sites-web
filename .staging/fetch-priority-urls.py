#!/usr/bin/env python3
"""从 KB 拉取高优 10 工具的完整 record（含 链接/GitHub URL/厂商）。"""
import json
import os
import subprocess
import sys
from pathlib import Path

STAGING_DIR = Path(__file__).parent
KB_TOKEN = os.getenv("FEISHU_KB_TOKEN", "")
if not KB_TOKEN:
    sys.stderr.write("❌ FEISHU_KB_TOKEN 未设\nexport FEISHU_KB_TOKEN='你的 base token'\n")
    sys.exit(1)
TABLE_ID = "tblNIf9J7dvQscDc"
PRIORITY = ['Cursor','Claude Code','Windsurf','Trae','Aider','Cline','Continue','Cody','GitHub Copilot','Tabnine']

ENV_NO_PROXY = {
    **os.environ,
    "JAVA_TOOL_OPTIONS": "-Djava.net.useSystemProxies=false -DsocksProxyHost= -Dhttp.proxyHost= -Dhttps.proxyHost=",
}


def get_all_records():
    """拉全表 records。"""
    cmd = [
        "lark-cli", "base", "+record-list",
        "--as", "bot",
        "--base-token", KB_TOKEN,
        "--table-id", TABLE_ID,
        "--format", "json",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=ENV_NO_PROXY)
    out = result.stdout.strip()
    if not out:
        return []
    parsed = json.loads(out)
    if not parsed.get("ok"):
        raise RuntimeError(f"record-list failed: {parsed}")
    return parsed.get("data", {}).get("records", [])


def main():
    all_records = get_all_records()
    print(f"全表拉取: {len(all_records)} 条")

    by_name = {r.get('工具名', ''): r for r in all_records}
    priority_records = []
    for name in PRIORITY:
        r = by_name.get(name)
        if r:
            priority_records.append(r)
            print(f"  ✓ {name}  链接={r.get('链接','')[:60]!r}  GH={r.get('GitHub URL','') or '-'}")
        else:
            print(f"  ✗ {name}  -- 未找到")

    out = STAGING_DIR / "priority-staging.json"
    out.write_text(json.dumps(priority_records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n写入: {out} ({len(priority_records)} 条)")


if __name__ == "__main__":
    main()