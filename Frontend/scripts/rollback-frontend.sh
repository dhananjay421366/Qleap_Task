#!/usr/bin/env bash
set -Eeuo pipefail

LOCK_FILE="${DEPLOY_LOCK_FILE:-/var/lock/taskmanagement-frontend-deploy.lock}"
STATE_FILE="${DEPLOY_STATE_FILE:-/var/lib/taskmanagement-frontend/active-slot}"
META_DIR="${DEPLOY_META_DIR:-/var/lib/taskmanagement-frontend/slots}"
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/nginx/conf.d/taskmanagement-frontend-upstreams.conf}"
LOG_DIR="${DEPLOY_LOG_DIR:-/var/log/taskmanagement-frontend}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"
DRAIN_SECONDS="${DRAIN_SECONDS:-10}"
BLUE_PORT=4001; GREEN_PORT=5001
BLUE_CONTAINER="${FRONTEND_BLUE_CONTAINER:-taskmanagement-frontend-blue}"
GREEN_CONTAINER="${FRONTEND_GREEN_CONTAINER:-taskmanagement-frontend-green}"

mkdir -p "$(dirname "$LOCK_FILE")" "$META_DIR" "$LOG_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Another frontend deployment or rollback is running." >&2; exit 1; }
LOG_FILE="$LOG_DIR/rollback-$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee -a "$LOG_FILE") 2>&1
cleanup() { rm -f "${UPSTREAM_FILE}.rollback-new"; }
trap cleanup EXIT

ACTIVE="$(cat "$STATE_FILE" 2>/dev/null || true)"
[[ "$ACTIVE" == blue || "$ACTIVE" == green ]] || { echo "No active slot state exists." >&2; exit 1; }
[[ "$ACTIVE" == blue ]] && TARGET=green || TARGET=blue
PORT=$([[ "$TARGET" == blue ]] && echo 4001 || echo 5001)
CONTAINER=$([[ "$TARGET" == blue ]] && echo "$BLUE_CONTAINER" || echo "$GREEN_CONTAINER")
CURRENT_CONTAINER=$([[ "$ACTIVE" == blue ]] && echo "$BLUE_CONTAINER" || echo "$GREEN_CONTAINER")
IMAGE="$(sed -n 's/^previous_image=//p' "$META_DIR/$ACTIVE.state" 2>/dev/null || true)"
[[ -n "$IMAGE" ]] || { echo "No previous image metadata for active slot $ACTIVE." >&2; exit 1; }

echo "Rolling back active=$ACTIVE to slot=$TARGET image=$IMAGE"
docker pull "$IMAGE"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" --restart unless-stopped -p "127.0.0.1:${PORT}:80" \
  --label "com.taskmanagement.slot=$TARGET" --label "com.taskmanagement.image=$IMAGE" "$IMAGE" >/dev/null
healthy=0
for ((i=1; i<=HEALTH_RETRIES; i++)); do
  if curl --fail --silent --show-error --max-time 3 "http://127.0.0.1:${PORT}/" >/dev/null; then healthy=1; break; fi
  sleep "$HEALTH_INTERVAL"
done
if (( ! healthy )); then
  echo "Rollback health check failed; removing only $CONTAINER" >&2
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  exit 1
fi

BACKUP="${UPSTREAM_FILE}.before-rollback-$(date -u +%Y%m%dT%H%M%SZ)"
[[ -f "$UPSTREAM_FILE" ]] && cp -p "$UPSTREAM_FILE" "$BACKUP"
cat > "${UPSTREAM_FILE}.rollback-new" <<EOF
# Managed by taskmanagement frontend rollback at $(date -u +%FT%TZ)
upstream taskmanagement_frontend {
    server 127.0.0.1:${PORT};
}
EOF
mv -f "${UPSTREAM_FILE}.rollback-new" "$UPSTREAM_FILE"
if ! nginx -t || ! nginx -s reload; then
  echo "Nginx rollback switch failed; restoring previous upstream configuration" >&2
  [[ -f "$BACKUP" ]] && cp -p "$BACKUP" "$UPSTREAM_FILE"
  nginx -t && nginx -s reload || true
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  exit 1
fi

echo "active=$TARGET" > "$STATE_FILE"
echo "image=$IMAGE" > "$META_DIR/$TARGET.image"
echo "image=$IMAGE" > "$META_DIR/$TARGET.state"
echo "previous_slot=$ACTIVE" >> "$META_DIR/$TARGET.state"
echo "previous_image=$(cat "$META_DIR/$ACTIVE.image" 2>/dev/null || true)" >> "$META_DIR/$TARGET.state"
sleep "$DRAIN_SECONDS"
docker rm -f "$CURRENT_CONTAINER" >/dev/null 2>&1 || true
echo "Rollback successful: active slot=$TARGET"
