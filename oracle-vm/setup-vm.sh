#!/bin/bash
# One-time VM setup for HeyBub production server.
# Run this after SSH'ing into the new VM:
#   ssh -i ~/.ssh/oci_heybub ubuntu@<VM_IP>
#   curl -sSL <this-script> | bash
# Or copy and run directly.

set -euo pipefail

echo "=== HeyBub VM Setup ==="
echo ""

# -----------------------------------------------
# 1. System updates
# -----------------------------------------------
echo "[1/6] Updating system packages..."
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

# -----------------------------------------------
# 2. Install Docker + Docker Compose
# -----------------------------------------------
echo "[2/6] Installing Docker..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker ubuntu
    echo "  Docker installed. Group membership takes effect on next login."
else
    echo "  Docker already installed."
fi

# Compose v2 comes with Docker now, verify it
sudo docker compose version

# -----------------------------------------------
# 3. Create app directory
# -----------------------------------------------
echo "[3/6] Setting up /opt/heybub..."
sudo mkdir -p /opt/heybub
sudo chown ubuntu:ubuntu /opt/heybub

# -----------------------------------------------
# 4. Open iptables ports (Ubuntu firewall on OCI)
# -----------------------------------------------
echo "[4/6] Configuring iptables..."
# OCI Ubuntu images have iptables rules that block ports even if
# the security list allows them. We need to open 80 and 443.
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT

# Persist iptables rules across reboots
sudo apt-get install -y -qq iptables-persistent
sudo netfilter-persistent save

# -----------------------------------------------
# 5. Idle reclamation prevention
# -----------------------------------------------
echo "[5/6] Setting up idle reclamation prevention..."

sudo tee /usr/local/bin/heybub-keepalive.sh > /dev/null << 'KEEPALIVE'
#!/bin/bash
# Brief CPU activity to prevent OCI idle reclamation.
# Checks health endpoint and does a tiny bit of work.
curl -sf http://localhost:8000/api/health > /dev/null 2>&1 || true
# Generate brief CPU activity (< 0.1s)
dd if=/dev/urandom bs=1024 count=64 2>/dev/null | md5sum > /dev/null
KEEPALIVE
sudo chmod +x /usr/local/bin/heybub-keepalive.sh

# Systemd timer — runs every 5 minutes
sudo tee /etc/systemd/system/heybub-keepalive.service > /dev/null << 'SVC'
[Unit]
Description=HeyBub idle reclamation prevention

[Service]
Type=oneshot
ExecStart=/usr/local/bin/heybub-keepalive.sh
SVC

sudo tee /etc/systemd/system/heybub-keepalive.timer > /dev/null << 'TIMER'
[Unit]
Description=Run HeyBub keepalive every 5 minutes

[Timer]
OnBootSec=60
OnUnitActiveSec=300
AccuracySec=30

[Install]
WantedBy=timers.target
TIMER

sudo systemctl daemon-reload
sudo systemctl enable --now heybub-keepalive.timer

# -----------------------------------------------
# 6. Auto-restart Docker on boot
# -----------------------------------------------
echo "[6/6] Enabling Docker auto-start..."
sudo systemctl enable docker

# -----------------------------------------------
# Done
# -----------------------------------------------
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Copy .env.prod to /opt/heybub/.env.prod"
echo "  2. Deploy with: cd /opt/heybub && docker compose -f docker-compose.prod.yml up -d"
echo "  3. Check health: curl http://localhost:8000/api/health"
echo ""
echo "NOTE: Log out and back in for docker group to take effect:"
echo "  exit && ssh -i ~/.ssh/oci_heybub ubuntu@\$(hostname -I | awk '{print \$1}')"
