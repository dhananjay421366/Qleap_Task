#!/usr/bin/env bash
set -Eeuo pipefail

LOCK_FILE="${DEPLOY_LOCK_FILE:-/var/lock/taskmanagement-frontend-deploy.lock}"
STATE_FILE="${DEPLOY_STATE_FILE:-/var/lib/taskmanagement-frontend/active-slot}"
META_DIR="${DEPLOY_META_DIR:-/var/lib/taskmanagement-frontend/slots}"
UPSTREAM_FILE="${UPSTREAM_FILE:-/etc/nginx/conf.d/taskmanagement-frontend-upstreams.conf}"
IMAGE="${1:-${FRONTEND_IMAGE:-}}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
HEALTH_INTERVAL="${HEALTH_INTERVAL:-2}"
DRAIN_SECONDS="${DRAIN_SECONDS:-10}"
BLUE_PORT=4001
GREEN_PORT=5001
BLUE_CONTAINER="${FRONTEND_BLUE_CONTAINER:-taskmanagement-frontend-blue}"
GREEN_CONTAINER="${FRONTEND_GREEN_CONTAINER:-taskmanagement-frontend-green}"
LOG_DIR="${DEPLOY_LOG_DIR:-/var/log/taskmanagement-frontend}"

mkdir -p "$(dirname "$LOCK_FILE")" "$(dirname "$STATE_FILE")" "$META_DIR" "$LOG_DIR"
exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Another frontend deployment or rollback is running." >&2; exit 1; }
LOG_FILE="$LOG_DIR/deploy-$(date -u +%Y%m%dT%H%M%SZ).log"
exec > >(tee -a "$LOG_FILE") 2>&1

cleanup() { rm -f "${UPSTREAM_FILE}.new"; }
trap cleanup EXIT
trap 'echo "Deployment failed at line $LINENO" >&2' ERR

[[ -n "$IMAGE" ]] || { echo "Usage: $0 ghcr.io/owner/repo:<immutable-sha>" >&2; exit 2; }
[[ "$IMAGE" != *:latest ]] || { echo "latest is not an immutable image tag" >&2; exit 2; }

slot_port() { [[ "$1" == blue ]] && echo "$BLUE_PORT" || echo "$GREEN_PORT"; }
slot_container() { [[ "$1" == blue ]] && echo "$BLUE_CONTAINER" || echo "$GREEN_CONTAINER"; }
read_state() { [[ -s "$STATE_FILE" ]] && cat "$STATE_FILE" || true; }

ACTIVE="$(read_state)"
if [[ "$ACTIVE" == blue ]]; then INACTIVE=green; else INACTIVE=blue; fi
if [[ -z "$ACTIVE" ]]; then ACTIVE=none; INACTIVE=blue; fi
PORT="$(slot_port "$INACTIVE")"
CONTAINER="$(slot_container "$INACTIVE")"
PREVIOUS_CONTAINER="$(slot_container "$ACTIVE")"
BACKUP="${UPSTREAM_FILE}.before-$(date -u +%Y%m%dT%H%M%SZ)"

echo "Deploying $IMAGE to inactive slot=$INACTIVE port=$PORT (active=$ACTIVE)"
docker pull "$IMAGE"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" --restart unless-stopped -p "127.0.0.1:${PORT}:80" \
  --label "com.taskmanagement.slot=$INACTIVE" --label "com.taskmanagement.image=$IMAGE" "$IMAGE" >/dev/null

healthy=0
for ((i=1; i<=HEALTH_RETRIES; i++)); do
  if curl --fail --silent --show-error --max-time 3 "http://127.0.0.1:${PORT}/" >/dev/null; then healthy=1; break; fi
  sleep "$HEALTH_INTERVAL"
done
if (( ! healthy )); then
  echo "Health check failed; removing only $CONTAINER" >&2
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  exit 1
fi
printf '%s\n' "$IMAGE" > "$META_DIR/$INACTIVE.image.new"
mv -f "$META_DIR/$INACTIVE.image.new" "$META_DIR/$INACTIVE.image"

[[ -f "$UPSTREAM_FILE" ]] && cp -p "$UPSTREAM_FILE" "$BACKUP"
cat > "${UPSTREAM_FILE}.new" <<EOF
# Managed by taskmanagement frontend deployment at $(date -u +%FT%TZ)
upstream taskmanagement_frontend {
    server 127.0.0.1:${PORT};
}
EOF
mv -f "${UPSTREAM_FILE}.new" "$UPSTREAM_FILE"
if ! nginx -t || ! nginx -s reload; then
  echo "Nginx switch failed; restoring previous upstream configuration" >&2
  [[ -f "$BACKUP" ]] && cp -p "$BACKUP" "$UPSTREAM_FILE"
  nginx -t && nginx -s reload || true
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  exit 1
fi

if [[ "$ACTIVE" != none ]]; then
  echo "active=$INACTIVE" > "$STATE_FILE.new"
  mv -f "$STATE_FILE.new" "$STATE_FILE"
  {
    echo "image=$IMAGE"
    echo "previous_slot=$ACTIVE"
    echo "previous_image=$(cat "$META_DIR/$ACTIVE.image" 2>/dev/null || true)"
  } > "$META_DIR/$INACTIVE.state.new"
  mv -f "$META_DIR/$INACTIVE.state.new" "$META_DIR/$INACTIVE.state"
else
  echo "active=$INACTIVE" > "$STATE_FILE.new"
  mv -f "$STATE_FILE.new" "$STATE_FILE"
  {
    echo "image=$IMAGE"
    echo "previous_slot=none"
    echo "previous_image="
  } > "$META_DIR/$INACTIVE.state.new"
  mv -f "$META_DIR/$INACTIVE.state.new" "$META_DIR/$INACTIVE.state"
fi

if [[ "$ACTIVE" != none ]]; then
  echo "Draining previous slot=$ACTIVE for ${DRAIN_SECONDS}s"
  sleep "$DRAIN_SECONDS"
  docker rm -f "$PREVIOUS_CONTAINER" >/dev/null 2>&1 || true
fi
echo "Deployment successful: active slot=$INACTIVE"
