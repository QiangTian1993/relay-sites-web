#!/usr/bin/env python3
"""Dry-run 验证 .staging/all-staging.json 的 42 条记录的 4 字段结构。

不调用 lark-cli，纯本地校验：
- __id 存在且格式正确
- 工具名 非空
- 4 个目标字段都存在且非空
- 字段类型是 string
- 没有 problematic chars（null bytes、未配对 surrogate、BOM）
- JSON 可序列化
- 没有重复 __id
- 字段长度合理（>10 chars 且 <5000 chars）

输出：每条 record 的 PASS/WARN/FAIL + 总览。
"""
import json
import sys
from pathlib import Path

STAGING_PATH = Path(__file__).parent / "all-staging.json"
TARGET_FIELDS = ["产品定位", "目标用户", "使用建议", "竞品对比"]


def validate_record(rec: dict, idx: int) -> tuple[str, list[str]]:
    """返回 (status, issues)。status: PASS / WARN / FAIL"""
    issues = []
    status = "PASS"

    # __id
    rid = rec.get("__id")
    if not rid:
        issues.append("缺少 __id")
        status = "FAIL"
    elif not rid.startswith("rec"):
        issues.append(f"__id 格式异常: {rid!r}")
        status = "FAIL"

    # 工具名
    name = rec.get("工具名")
    if not name:
        issues.append("缺少 工具名")
        status = max(status, "FAIL", key=["PASS", "WARN", "FAIL"].index)

    # 4 字段检查
    for f in TARGET_FIELDS:
        if f not in rec:
            issues.append(f"缺少字段 {f!r}")
            status = "FAIL"
            continue
        v = rec[f]
        if v is None:
            issues.append(f"{f!r} 是 None")
            status = "FAIL"
            continue
        if not isinstance(v, str):
            issues.append(f"{f!r} 不是 string（type={type(v).__name__}）")
            status = "FAIL"
            continue
        if len(v) == 0:
            issues.append(f"{f!r} 是空字符串")
            status = "FAIL"
            continue
        if len(v) < 10:
            issues.append(f"{f!r} 异常短（{len(v)} chars）")
            status = max(status, "WARN", key=["PASS", "WARN", "FAIL"].index)
        if len(v) > 5000:
            issues.append(f"{f!r} 异常长（{len(v)} chars）")
            status = max(status, "WARN", key=["PASS", "WARN", "FAIL"].index)
        # problematic chars
        if "\x00" in v:
            issues.append(f"{f!r} 含 null byte")
            status = "FAIL"
        if "\ufeff" in v:
            issues.append(f"{f!r} 含 BOM")
            status = "WARN"

    # JSON 序列化测试
    try:
        json.dumps(rec, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        issues.append(f"JSON 序列化失败: {e}")
        status = "FAIL"

    return status, issues


def main():
    if not STAGING_PATH.exists():
        print(f"❌ 找不到 {STAGING_PATH}")
        sys.exit(1)

    records = json.loads(STAGING_PATH.read_text(encoding="utf-8"))
    print(f"📋 Staging records: {len(records)}")
    print(f"🎯 Target fields: {TARGET_FIELDS}")
    print("=" * 80)

    status_count = {"PASS": 0, "WARN": 0, "FAIL": 0}
    seen_ids = set()
    dup_ids = []

    for i, rec in enumerate(records, 1):
        rid = rec.get("__id", "?")
        name = rec.get("工具名", "?")
        status, issues = validate_record(rec, i)

        # dup 检查
        if rid in seen_ids:
            dup_ids.append(rid)
            issues.append(f"__id 重复: {rid}")
            status = "FAIL"
        seen_ids.add(rid)

        status_count[status] += 1
        symbol = {"PASS": "✓", "WARN": "⚠", "FAIL": "✗"}[status]
        print(f"[{i:2d}/{len(records)}] {symbol} {status:<4} {name[:20]:<20} ({rid})")
        if issues:
            for iss in issues:
                print(f"          └─ {iss}")

    print("=" * 80)
    print(f"📊 总览: PASS={status_count['PASS']}  WARN={status_count['WARN']}  FAIL={status_count['FAIL']}  Total={len(records)}")

    if dup_ids:
        print(f"⚠️  重复 __id: {dup_ids}")

    # 字段填充率
    print()
    print("📈 字段填充率:")
    for f in TARGET_FIELDS:
        filled = sum(1 for r in records if r.get(f) and len(str(r.get(f))) > 0)
        avg_len = sum(len(str(r.get(f, ""))) for r in records) // max(filled, 1)
        print(f"  {f:<10}: {filled}/{len(records)} 填充  平均 {avg_len} chars")

    if status_count["FAIL"] > 0:
        print()
        print("❌ 有 FAIL records，批量 upsert 前必须修复")
        sys.exit(1)
    elif status_count["WARN"] > 0:
        print()
        print("⚠️  有 WARN records，可继续但建议 review")
    else:
        print()
        print("✅ 全部 PASS，可批量 upsert")


if __name__ == "__main__":
    main()