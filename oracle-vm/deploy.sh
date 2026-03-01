#!/bin/bash
# Manual deploy to OCI VM. Use this for initial setup and testing.
# CI/CD takes over once the pipeline is merged.
#
# Usage: ./oracle-vm/deploy.sh <VM_IP>

set -euo pipefail

VM_IP="${1:?Usage: $0 <VM_IP>}"
SSH_KEY="$HOME/.ssh/oci_heybub"
SSH_CMD="ssh -i $SSH_KEY -o StrictHostKeyChecking=no ubuntu@$VM_IP"
RSYNC_CMD="rsync -avz --delete -e 'ssh -i $SSH_KEY -o StrictHostKeyChecking=no'"

echo "=== Deploying to $VM_IP ==="

# 1. Sync files
echo "[1/4] Syncing files..."
eval $RSYNC_CMD backend/ ubuntu@$VM_IP:/opt/heybub/backend/
eval $RSYNC_CMD docker-compose.prod.yml ubuntu@$VM_IP:/opt/heybub/docker-compose.prod.yml
eval $RSYNC_CMD Caddyfile ubuntu@$VM_IP:/opt/heybub/Caddyfile

# 2. Build and start
echo "[2/4] Building and starting containers..."
$SSH_CMD "cd /opt/heybub && docker compose -f docker-compose.prod.yml build --no-cache api"
$SSH_CMD "cd /opt/heybub && docker compose -f docker-compose.prod.yml up -d"

# 3. Health check
echo "[3/4] Waiting for API to become healthy..."
for i in $(seq 1 30); do
    HTTP_CODE=$($SSH_CMD "curl -sf -o /dev/null -w '%{http_code}' http://localhost:8000/api/health" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        echo "  Health check passed (attempt $i)"
        break
    fi
    echo "  Attempt $i: HTTP $HTTP_CODE — retrying in 2s..."
    sleep 2
done

if [ "$HTTP_CODE" != "200" ]; then
    echo "Health check FAILED after 30 attempts"
    echo "Check logs: ssh -i $SSH_KEY ubuntu@$VM_IP 'cd /opt/heybub && docker compose -f docker-compose.prod.yml logs'"
    exit 1
fi

# 4. Run migrations
echo "[4/4] Running database migrations..."
$SSH_CMD "cd /opt/heybub && docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head"

echo ""
echo "=== Deploy successful ==="
echo "API: http://$VM_IP:8000/api/health"
echo "Once DNS is set: https://api.heybub.app/api/health"
