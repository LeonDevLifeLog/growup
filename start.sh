#!/usr/bin/env bash
# 一键启动成长健研社，用于本地体验。
#
#   ./start.sh            演示模式：预置虚构大区、学校和账号，可直接登录体验
#   ./start.sh --prod     正式模式：空数据库，首次打开进入初始化向导
#   ./start.sh --docker   使用 Docker 运行（未安装 Node.js 22.13+ 时自动使用）
#   ./start.sh --port 9000
#   ./start.sh --stop     停止以 Docker 方式启动的体验服务
#   ./start.sh --reset    清空演示数据后重新开始（不影响正式模式数据）
#
# 环境变量：GROWUP_IMAGE  使用已发布的镜像（如 ghcr.io/<owner>/<repo>:latest）而不是本地构建
#           NPM_REGISTRY  安装依赖使用的 npm 源（默认使用国内镜像）
set -euo pipefail

cd "$(dirname "$0")"

MODE=demo
RUNTIME=auto
PORT=8787
OPEN=1
ACTION=start
CONTAINER=growup-quickstart
NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmmirror.com}"

usage() { sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; }

while [ $# -gt 0 ]; do
  case "$1" in
    --demo) MODE=demo ;;
    --prod) MODE=prod ;;
    --docker) RUNTIME=docker ;;
    --node) RUNTIME=node ;;
    --port)
      [ $# -ge 2 ] || { echo "--port 需要端口号" >&2; exit 2; }
      PORT="$2"; shift ;;
    --port=*) PORT="${1#*=}" ;;
    --no-open) OPEN=0 ;;
    --stop) ACTION=stop ;;
    --reset) ACTION=reset ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数：$1" >&2; usage; exit 2 ;;
  esac
  shift
done

case "$PORT" in
  ''|*[!0-9]*) echo "端口必须是数字：$PORT" >&2; exit 2 ;;
esac

say() { printf '\033[32m›\033[0m %s\n' "$*"; }
fail() { printf '\033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

node_ok() {
  have node || return 1
  node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)'
}

port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; }

wait_healthy() {
  local url="http://127.0.0.1:$PORT/api/health"
  for _ in $(seq 1 60); do
    if have curl && curl -fsS "$url" >/dev/null 2>&1; then return 0; fi
    if ! have curl && have wget && wget -qO- "$url" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}

open_browser() {
  [ "$OPEN" = 1 ] || return 0
  local url="http://127.0.0.1:$PORT/"
  if have open; then open "$url" >/dev/null 2>&1 || true
  elif have xdg-open; then xdg-open "$url" >/dev/null 2>&1 || true
  fi
}

banner() {
  local url="http://127.0.0.1:$PORT"
  echo
  say "成长健研社已启动（$([ "$MODE" = demo ] && echo 演示模式 || echo 正式模式)）"
  echo "    学生端      $url/"
  echo "    管理后台    $url/#admin"
  echo "    使用指南    $url/guide/"
  echo
  if [ "$MODE" = demo ]; then
    cat <<'EOF'
    演示账号（密码均为 Growup123!，登录时选择对应大区）：
      学生          hainan.student     大区：海南
      大区管理员    hainan.admin       大区：海南
      学校邀请码    HN2026             用于体验“邀请码注册”
    演示数据均为虚构，可用 ./start.sh --reset 恢复初始状态。
EOF
  else
    echo "    首次打开网页会进入“首次安装初始化”向导，创建平台管理员后即可使用。"
  fi
  echo
}

# Prints only the image name on stdout; progress goes to stderr.
docker_image() {
  local image="${GROWUP_IMAGE:-growup:local}"
  if [ -n "${GROWUP_IMAGE:-}" ]; then
    say "拉取镜像 $image" >&2
    docker pull "$image" >/dev/null
  elif ! docker image inspect "$image" >/dev/null 2>&1; then
    say "首次运行，正在构建镜像（约需几分钟）" >&2
    docker compose build app >&2
  fi
  echo "$image"
}

data_volume() { [ "$MODE" = demo ] && echo growup-quickstart-demo || echo growup-quickstart-data; }

if [ "$ACTION" = stop ]; then
  have docker || fail "未找到 Docker；以 Node.js 方式启动的服务请在其窗口按 Ctrl+C 停止"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 && say "已停止体验服务（数据保留）" || say "没有正在运行的体验服务"
  exit 0
fi

if [ "$ACTION" = reset ]; then
  rm -f data/demo.sqlite data/demo.sqlite-wal data/demo.sqlite-shm
  if have docker; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
    docker volume rm growup-quickstart-demo >/dev/null 2>&1 || true
  fi
  say "演示数据已清空，下次启动将重新生成"
  exit 0
fi

if [ "$RUNTIME" = auto ]; then
  if node_ok; then RUNTIME=node
  elif have docker; then RUNTIME=docker
  else fail "需要 Node.js 22.13+ 或 Docker。请安装其中之一后重试：https://nodejs.org/ 或 https://docs.docker.com/get-docker/"
  fi
fi

if [ "$RUNTIME" = docker ]; then
  have docker || fail "未找到 Docker"
  docker info >/dev/null 2>&1 || fail "Docker 未运行，请先启动 Docker"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  port_busy && fail "端口 $PORT 已被占用，请用 --port 指定其他端口"
  image="$(docker_image)"
  say "启动容器 $CONTAINER"
  if [ "$MODE" = demo ]; then
    env_args=(-e DEMO_MODE=1 -e DATA_PATH=/app/data/demo.sqlite)
  else
    env_args=(-e DEMO_MODE=0 -e DATA_PATH=/app/data/growup.sqlite)
  fi
  docker run -d --name "$CONTAINER" \
    -p "127.0.0.1:$PORT:8787" \
    "${env_args[@]}" \
    -v "$(data_volume):/app/data" \
    --restart unless-stopped \
    "$image" >/dev/null
  wait_healthy || { docker logs --tail 50 "$CONTAINER" >&2; fail "服务未能启动"; }
  banner
  echo "    停止：./start.sh --stop    查看日志：docker logs -f $CONTAINER"
  open_browser
  exit 0
fi

node_ok || fail "需要 Node.js 22.13 或更高版本（当前：$(node -v 2>/dev/null || echo 未安装)），或改用 ./start.sh --docker"
port_busy && fail "端口 $PORT 已被占用，请用 --port 指定其他端口"
if [ ! -f node_modules/.package-lock.json ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  say "安装依赖"
  npm ci --registry="$NPM_REGISTRY" --replace-registry-host=always --no-audit --no-fund
fi
say "构建网页"
npm run build --silent >/dev/null
mkdir -p data
export HOST=127.0.0.1 PORT
if [ "$MODE" = demo ]; then
  export DEMO_MODE=1 DATA_PATH=data/demo.sqlite
else
  export DEMO_MODE=0 DATA_PATH=data/growup.sqlite
fi
node --disable-warning=ExperimentalWarning server/index.mjs &
server=$!
trap 'kill "$server" 2>/dev/null || true' INT TERM EXIT
if ! wait_healthy; then fail "服务未能启动"; fi
banner
echo "    按 Ctrl+C 停止。"
open_browser
wait "$server"
