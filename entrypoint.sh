#!/bin/sh
set -e

REDIS_URL="${REDIS_URL:-}"

case "$REDIS_URL" in
  redis://localhost:*|redis://127.0.0.1:*|"")
    echo "[entrypoint] Starting bundled Redis on 127.0.0.1:6379"
    redis-server --bind 127.0.0.1 --port 6379 --save "" --appendonly no &
    REDIS_PID=$!
    ;;
  *)
    echo "[entrypoint] Using external Redis at $REDIS_URL; skipping bundled redis-server"
    REDIS_PID=""
    ;;
esac

exec node dist/main
