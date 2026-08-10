#!/bin/bash
# GPT-5.6 混用检测器（本地 Web UI，来源: github.com/chen-006/gpt56_api_detector v4.0.1）
# 用法: ./scripts/gpt56-detector.sh [--port 8765] [--no-browser]
# 启动后打开输出的 URL，填写 API 地址 / 模型名 / key，先选「单次检测 + 低」档
# 检测内容: Juice 型号指纹（Sol/Terra/Luna/5.5/5.4）、输出完整性（48/32）、提示覆盖、行为分布
set -euo pipefail

cd "$(dirname "$0")/gpt56-detector"
exec python3 gpt56_vnext_web.py "$@"
