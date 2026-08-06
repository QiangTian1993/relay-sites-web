#!/bin/bash
# GitHub 热榜定时调度分发（LaunchAgent 触发，北京时间）
# 08:00 / 21:00 → daily 榜 14 个语言；周日 08:00 追加 weekly；每月 1 日 08:00 追加 monthly
# 对应 ~/Library/LaunchAgents/com.relay-sites.github-trending.plist

set -uo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
SCRIPT_DIR="/Users/ian-mbp/工作/project/relay-sites-web/scripts"
HOUR=$(date +%H)
DOW=$(date +%u)   # 1=周一 ... 7=周日
DOM=$(date +%d)

echo "===== $(date '+%Y-%m-%d %H:%M:%S %Z') 调度触发 (HOUR=$HOUR DOW=$DOW DOM=$DOM) ====="

if [ "$HOUR" = "08" ] || [ "$HOUR" = "21" ]; then
  for lang in all javascript typescript python go rust java c++ c shell php swift kotlin ruby; do
    "$SCRIPT_DIR/cron-trending.sh" --since daily --lang "$lang" || echo "[runner] daily $lang 失败: $?"
  done
  if [ "$HOUR" = "08" ] && [ "$DOW" = "7" ]; then
    "$SCRIPT_DIR/cron-trending.sh" --since weekly --lang all || echo "[runner] weekly 失败: $?"
  fi
  if [ "$HOUR" = "08" ] && [ "$DOM" = "01" ]; then
    "$SCRIPT_DIR/cron-trending.sh" --since monthly --lang all || echo "[runner] monthly 失败: $?"
  fi
fi

echo "[runner] 完成"
