#!/bin/bash
# 一键部署 relay-sites-web → 腾讯云服务器（www.xiuxai.com/relay-index/）
# 用法: ./scripts/deploy.sh [--skip-fetch]
#   默认流程: 本地 npm run fetch（数据）→ rsync 同步 → 服务器 docker 构建 → 重启容器 → 健康检查
#   --skip-fetch: 跳过数据拉取（数据没变化时加快部署）
set -euo pipefail

SERVER="root@124.222.88.183"
REMOTE_DIR="/opt/relay-sites-web"
IMAGE="relay-sites-web:relay-index"
CONTAINER="relay-sites-web"
SSH_OPTS="-o BatchMode=yes"
RSYNC_EXCLUDES=(
  --exclude node_modules
  --exclude .next
  --exclude .git
  --exclude .omx
  --exclude .staging
  --exclude ".env*"
  --exclude .DS_Store
  --exclude "*.log"
  --exclude tsconfig.tsbuildinfo
)

SKIP_FETCH=0
for arg in "$@"; do
  case "$arg" in
    --skip-fetch) SKIP_FETCH=1 ;;
    *) echo "未知参数: $arg（支持 --skip-fetch）" >&2; exit 1 ;;
  esac
done

cd "$(dirname "$0")/.."

# ── [1/4] 数据更新 ────────────────────────────────────────────────
echo "==> [1/4] 更新数据 (npm run fetch)"
if [ "$SKIP_FETCH" = "1" ]; then
  echo "    跳过数据拉取（--skip-fetch）"
else
  npm run fetch
fi

# ── [2/4] 同步代码 ────────────────────────────────────────────────
echo "==> [2/4] rsync 同步到 ${SERVER}:${REMOTE_DIR}"
rsync -az --delete -e "ssh $SSH_OPTS" "${RSYNC_EXCLUDES[@]}" ./ "$SERVER:$REMOTE_DIR/"
echo "    同步完成"

# ── [3/4] 服务器构建 + 重启容器 ──────────────────────────────────
echo "==> [3/4] 服务器构建镜像并重启容器"
ssh $SSH_OPTS "$SERVER" bash -s <<REMOTE
set -e
cd "$REMOTE_DIR"
echo "    docker build ..."
docker build --build-arg NEXT_PUBLIC_BASE_PATH=/relay-index -t "$IMAGE" . > /tmp/relay-build.log 2>&1 && echo "    构建成功" || { echo "    构建失败，日志尾部："; tail -15 /tmp/relay-build.log; exit 1; }
docker rm -f "$CONTAINER" > /dev/null 2>&1 || true
docker run -d --name "$CONTAINER" --restart unless-stopped -p 127.0.0.1:3000:3000 "$IMAGE" > /dev/null
echo "    容器已重启"
REMOTE

# ── [4/4] 健康检查 ────────────────────────────────────────────────
echo "==> [4/4] 健康检查"
sleep 3
LOCAL_STATUS=$(ssh $SSH_OPTS "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/relay-index/")
PUBLIC_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -L https://www.xiuxai.com/relay-index/)
echo "    服务器本地 (127.0.0.1:3000): HTTP $LOCAL_STATUS"
echo "    公网 (www.xiuxai.com/relay-index/): HTTP $PUBLIC_STATUS"
if [ "$LOCAL_STATUS" != "200" ] || [ "$PUBLIC_STATUS" != "200" ]; then
  echo "ERROR: 健康检查未通过" >&2
  exit 1
fi

echo ""
echo "==> 部署完成 ✅  https://www.xiuxai.com/relay-index/"
