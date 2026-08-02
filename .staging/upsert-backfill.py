#!/usr/bin/env python3
"""批量 upsert 42 个 vibe_coding_tracker 工具的 4 字段回填。

策略：
- 用 lark-cli `+record-upsert` 按 record_id 更新
- 4 字段：产品定位 / 目标用户 / 使用建议 / 竞品对比
- 每次只发 4 个字段（不全量覆盖，保护已有数据）
- 每条 sleep 0.7s（QPS threshold=2/s，避免 99991668）
- 失败重试 1 次，仍失败则记入失败列表

输入：.staging/all-staging.json
输出：.staging/upsert-result.json（成功/失败统计）

KB token 从环境变量 FEISHU_KB_TOKEN 读：
  export FEISHU_KB_TOKEN='base token'
  python3 .staging/upsert-backfill.py
"""
import json
import os
import subprocess
import sys
import time
from pathlib import Path

STAGING_DIR = Path(__file__).parent
KB_TOKEN = os.environ.get("FEISHU_KB_TOKEN") or ""
if not KB_TOKEN:
    print("❌ 缺少 FEISHU_KB_TOKEN 环境变量", file=sys.stderr)
    print("   export FEISHU_KB_TOKEN='你的 base token'", file=sys.stderr)
    sys.exit(1)
TABLE_ID = "tblNIf9J7dvQscDc"
TARGET_FIELDS = ["产品定位", "目标用户", "使用建议", "竞品对比"]
SLEEP_SEC = 0.7

ENV_NO_PROXY = {
    **os.environ,
    "JAVA_TOOL_OPTIONS": "-Djava.net.useSystemProxies=false -DsocksProxyHost= -Dhttp.proxyHost= -Dhttps.proxyHost=",
}


def upsert_one(record_id: str, fields: dict) -> dict:
    """upsert 一条 record，fields 是 {字段名: 值} 字典。返回 (ok, msg)。"""
    fields_json = json.dumps(fields, ensure_ascii=False)
    cmd = [
        "lark-cli", "base", "+record-upsert",
        "--as", "bot",
        "--base-token", KB_TOKEN,
        "--table-id", TABLE_ID,
        "--record-id", record_id,
        "--json", fields_json,
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=30, env=ENV_NO_PROXY
        )
        out = result.stdout.strip()
        try:
            parsed = json.loads(out)
            ok = parsed.get("ok", False)
            return {"ok": ok, "msg": out[:300]}
        except json.JSONDecodeError:
            return {"ok": False, "msg": f"非 JSON: {out[:200]} | stderr: {result.stderr[:200]}"}
    except subprocess.TimeoutExpired:
        return {"ok": False, "msg": "timeout 30s"}
    except Exception as e:
        return {"ok": False, "msg": str(e)}


def main():
    staging_path = STAGING_DIR / "all-staging.json"
    records = json.loads(staging_path.read_text(encoding="utf-8"))
    print(f"开始 upsert: {len(records)} 条 records")

    results = {"success": [], "failed": []}
    for i, rec in enumerate(records, 1):
        rid = rec["__id"]
        name = rec.get("工具名", "?")
        # 只取 4 个目标字段
        fields = {k: rec[k] for k in TARGET_FIELDS if k in rec and rec[k]}
        if not fields:
            print(f"[{i:2d}/{len(records)}] {name}: 跳过（4 字段全空）")
            continue

        # 第一次尝试
        r = upsert_one(rid, fields)
        if not r["ok"]:
            # 重试 1 次
            time.sleep(1.0)
            r = upsert_one(rid, fields)

        if r["ok"]:
            results["success"].append({"id": rid, "name": name})
            print(f"[{i:2d}/{len(records)}] ✓ {name}")
        else:
            results["failed"].append({"id": rid, "name": name, "msg": r["msg"]})
            print(f"[{i:2d}/{len(records)}] ✗ {name}: {r['msg'][:80]}")

        time.sleep(SLEEP_SEC)

    # 写结果
    out_path = STAGING_DIR / "upsert-result.json"
    out_path.write_text(
        json.dumps(
            {
                "total": len(records),
                "success_count": len(results["success"]),
                "failed_count": len(results["failed"]),
                "success": results["success"],
                "failed": results["failed"],
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\n{'='*50}")
    print(f"完成: 成功 {len(results['success'])} / 失败 {len(results['failed'])} / 总 {len(records)}")
    print(f"结果写入: {out_path}")


if __name__ == "__main__":
    main()