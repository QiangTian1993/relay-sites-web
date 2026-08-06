#!/bin/bash
# GitHub 热榜定时采集入口（本机 crontab 使用，北京时间）
# 用法: cron-trending.sh --since daily|weekly|monthly --lang <slug|all>
# 日志: ~/logs/github-trending-YYYYMM.log（追加）
# 依赖: lark-cli（/opt/homebrew/bin，bot 身份有 base 写权限）

set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
PROJECT_DIR="/Users/ian-mbp/工作/project/relay-sites-web"
LOG_DIR="$HOME/logs"
mkdir -p "$LOG_DIR"

cd "$PROJECT_DIR"
echo "===== $(date '+%Y-%m-%d %H:%M:%S %Z') $* =====" >> "$LOG_DIR/github-trending-$(date +%Y%m).log"
exec npx tsx scripts/fetch-github-trending.ts "$@" >> "$LOG_DIR/github-trending-$(date +%Y%m).log" 2>&1
