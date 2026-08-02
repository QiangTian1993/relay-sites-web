#!/usr/bin/env python3
"""Phase 3a: 扩字段深度 × 10 高优工具
- Fetch 官网 (curl)
- Combine baseline 4 fields
- Call Claude to expand each to 500-800 chars
- Save incrementally to priority-enriched.json
"""
from __future__ import annotations
import json
import subprocess
import re
import sys
import os
from pathlib import Path
from typing import Optional

STAGING_DIR = Path(__file__).parent
INPUT = STAGING_DIR / "priority-staging.json"
OUTPUT = STAGING_DIR / "priority-enriched.json"

CLAUDE_PROMPT = """你是中文开发者工具评测专家。请基于以下材料，扩展「{tool_name}」的 4 段评测内容。

## 源材料

### 官网正文（来自 {url}）
{source_text}

### 已有摘要（baseline，每段约 100 chars）
- 产品定位: {baseline_positioning}
- 目标用户: {baseline_target_users}
- 使用建议: {baseline_usage_tips}
- 竞品对比: {baseline_competitor}

## 输出要求

严格输出合法 JSON（中文, 客观, 数据驱动, 不夸张, 不编造）：

{{
  "产品定位": "<500-800 chars：是什么产品/核心价值/差异化定位/技术特点>",
  "目标用户": "<300-500 chars：谁会用/规模/技能水平/付费意愿>",
  "使用建议": "<500-800 chars：何时用/怎么用/避坑/最佳实践>",
  "竞品对比": "<500-800 chars：主要竞品(≥3 个)/各自优势/差异化/选择建议>"
}}

规则：
1. 产品定位/使用建议/竞品对比 ≥500 chars；目标用户 ≥300 chars
2. 竞品对比至少列举 3 个竞品 + 各自差异点
3. 官网信息用 markdown 链接 [官网](url)
4. 直接输出 JSON，不要任何 markdown 代码块包裹，不要任何前缀说明
"""


def extract_url(md_link: str) -> Optional[str]:
    """从 [text](url) 提取 url"""
    if not md_link:
        return None
    m = re.search(r'\((https?://[^)]+)\)', md_link)
    if m:
        return m.group(1)
    if md_link.startswith('http'):
        return md_link
    return None


def fetch_site(url: str, timeout: int = 30) -> str:
    """fetch URL → plain text（去掉 HTML tag）"""
    try:
        result = subprocess.run(
            ['curl', '--noproxy', '*', '-sL', '--max-time', str(timeout),
             '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
             url],
            capture_output=True, text=True, timeout=timeout + 5
        )
        html = result.stdout
        # 去掉 script/style/HTML tag
        text = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r'<[^>]+>', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        # 解 HTML entities
        text = (text.replace('&nbsp;', ' ').replace('&amp;', '&')
                    .replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"'))
        return text[:8000]  # limit
    except Exception as e:
        return f"[fetch error: {e}]"


def call_claude(prompt: str, timeout: int = 180) -> Optional[dict]:
    """call `claude -p`, parse JSON output"""
    try:
        result = subprocess.run(
            ['claude', '-p', prompt],
            capture_output=True, text=True, timeout=timeout
        )
        out = result.stdout.strip()
        if not out:
            print(f"    [claude empty output, stderr: {result.stderr[:200]}]")
            return None
        # 直接 parse
        try:
            return json.loads(out)
        except json.JSONDecodeError:
            # 尝试从 text 提取 JSON
            m = re.search(r'\{.*\}', out, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(0))
                except json.JSONDecodeError:
                    pass
            print(f"    [claude parse fail, output head: {out[:200]}]")
            return None
    except subprocess.TimeoutExpired:
        print(f"    [claude timeout {timeout}s]")
        return None
    except Exception as e:
        print(f"    [claude error: {e}]")
        return None


def expand_one(rec: dict) -> dict:
    name = rec['工具名']
    url = extract_url(rec.get('链接', ''))
    baseline = rec['现有']

    print(f"\n--- {name} ---")
    print(f"  URL: {url}")

    source_text = ''
    if url:
        source_text = fetch_site(url)
        print(f"  source: {len(source_text)} chars")
    if not source_text or source_text.startswith('[fetch error'):
        source_text = '(无官网正文，将基于 baseline 扩展)'

    prompt = CLAUDE_PROMPT.format(
        tool_name=name,
        url=url or '',
        source_text=source_text,
        baseline_positioning=baseline['产品定位'][:200],
        baseline_target_users=baseline['目标用户'][:200],
        baseline_usage_tips=baseline['使用建议'][:200],
        baseline_competitor=baseline['竞品对比'][:200],
    )

    print(f"  claude...")
    enriched = call_claude(prompt)
    if not enriched:
        return {**rec, 'enriched': None, 'enriched_status': 'failed'}

    # length check
    lengths = {k: len(enriched.get(k, '')) for k in ['产品定位', '目标用户', '使用建议', '竞品对比']}
    print(f"  ✓ lengths: {lengths}")
    return {**rec, 'enriched': enriched, 'enriched_status': 'ok', 'enriched_lengths': lengths}


def main():
    if not INPUT.exists():
        print(f"❌ {INPUT} not found")
        sys.exit(1)

    records = json.loads(INPUT.read_text(encoding='utf-8'))
    print(f"Phase 3a: 扩字段深度 × {len(records)} 工具\n")

    # 加载已有结果（增量保存）
    if OUTPUT.exists():
        existing = json.loads(OUTPUT.read_text(encoding='utf-8'))
        done_ids = {r['__id'] for r in existing if r.get('enriched')}
        results = existing
        print(f"已有 {len(done_ids)} 条已完成，跳过")
    else:
        existing = []
        done_ids = set()
        results = []

    for rec in records:
        rid = rec.get('__id', rec['工具名'])
        if rid in done_ids:
            print(f"\n--- {rec['工具名']} (跳过，已完成) ---")
            continue
        result = expand_one(rec)
        # 替换或追加
        idx = next((i for i, r in enumerate(results) if r.get('__id', r.get('工具名')) == rid), None)
        if idx is not None:
            results[idx] = result
        else:
            results.append(result)
        # 增量保存
        OUTPUT.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')

    success = sum(1 for r in results if r.get('enriched_status') == 'ok')
    print(f"\n{'='*60}")
    print(f"完成: {success}/{len(records)} 成功")
    print(f"输出: {OUTPUT}")


if __name__ == '__main__':
    main()