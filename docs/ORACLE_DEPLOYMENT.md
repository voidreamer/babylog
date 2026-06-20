# Oracle Cloud Deployment (API host)

Running capture of the manual steps used to stand up the FastAPI backend on an
Oracle Cloud **Always-Free** VM after the AWS free tier ended (2026-06-15).
Source-of-truth for the eventual Terraform codification (see end-of-project task).
No secrets in this file — values come from `backend/.env` / Cloudflare.

## Target

- Backend: Oracle `VM.Standard.E2.1.Micro` (1 OCPU / 1 GB, Always Free), Oracle Linux 9, region `ca-toronto-1`.
- Runtime: native Python 3.11 + uv venv + systemd (not Docker — 1 GB box). `Dockerfile`/`fly.toml` remain valid fallbacks.
- TLS/ingress: Cloudflare Tunnel → `api.heybub.app` (outbound-only; no public ports needed).
- DB/Auth/Storage: unchanged on Supabase (`ca-central-1`). Frontend: Cloudflare Pages (separate).

## 1. Instance (via oci-cli, profile DEFAULT, session-token auth)

Launched identical to the prior instance, with a controlled SSH key:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/heybub_oracle -N "" -C heybub-oracle
printf '{"ssh_authorized_keys": "%s"}\n' "$(cat ~/.ssh/heybub_oracle.pub)" > /tmp/oci_md.json
oci compute instance launch --profile DEFAULT --auth security_token \
  --availability-domain "fZHn:CA-TORONTO-1-AD-1" \
  --compartment-id <tenancy-ocid> \
  --shape "VM.Standard.E2.1.Micro" \
  --image-id <oracle-linux-9-image-ocid> \
  --subnet-id <subnet-ocid> \
  --assign-public-ip true \
  --display-name "heybub-api" \
  --metadata file:///tmp/oci_md.json \
  --wait-for-state RUNNING
```

- Current public IP: `132.145.109.74`, SSH user `opc`, key `~/.ssh/heybub_oracle`.
- Subnet security list already allows ingress TCP **22/80/443** from 0.0.0.0/0 (with Cloudflare Tunnel, only 22 is needed, and only for management).
- Old instance (lost SSH key, IP `140.238.152.128`) to be terminated after cutover.

## 2. Host prep

```sh
# 2 GB swap (OOM insurance on 1 GB; persisted to /etc/fstab)
sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Python 3.11 via uv (NOT dnf — the OCI "Included Packages" repo pulls 231 MB of
# metadata and hangs the 1 GB box). uv fetches a self-contained CPython in seconds.
# Install Python UNDER /opt, not ~ : a systemd service runs in a domain SELinux
# forbids from exec'ing files in /home (user_home_t) -> 203/EXEC. /opt + bin_t works.
curl -LsSf https://astral.sh/uv/install.sh | sh
export UV_PYTHON_INSTALL_DIR=/opt/heybub/.uv-python
uv python install 3.11
```

### kdump reclaim (recommended on the 1 GB box)
Oracle Linux reserves **448 MB** for crashkernel (`crashkernel=1G-64G:448M`), leaving
only ~503 MB usable. kdump isn't worth half the RAM here:
```sh
sudo grubby --update-kernel=ALL --remove-args=crashkernel
sudo systemctl disable --now kdump
sudo reboot   # reclaims ~448 MB -> ~950 MB usable
```

## 3. App install
```sh
sudo mkdir -p /opt/heybub && sudo chown opc:opc /opt/heybub
uv venv --python 3.11 /opt/heybub/.venv          # symlinks the /opt python
# ship backend/ (excl .venv,__pycache__,tests,lambda.zip) via: tar czf - -C backend . | ssh ... 'tar xzf - -C /opt/heybub'
cd /opt/heybub && chmod 600 .env
uv pip install --python .venv/bin/python -r requirements.txt
sudo chcon -R -t bin_t /opt/heybub/.venv/bin /opt/heybub/.uv-python   # SELinux: allow service exec
```

## 4. systemd service  (/etc/systemd/system/heybub-api.service)
`User=opc`, `WorkingDirectory=/opt/heybub` (app reads .env from here),
`ExecStart=/opt/heybub/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8080 --proxy-headers --forwarded-allow-ips '*'`,
`Restart=always`. Then `systemctl enable --now heybub-api`; verify `curl localhost:8080/health`.

## 5. Cloudflare Tunnel → api.heybub.app  (DONE)
Origin cert (`~/.cloudflared/cert.pem`, from `cloudflared tunnel login` on a machine with a browser) staged to the VM. Then:
```sh
curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 \
  | sudo install -m0755 /dev/stdin /usr/local/bin/cloudflared
export TUNNEL_ORIGIN_CERT=$HOME/.cloudflared/cert.pem
cloudflared tunnel create heybub-oci          # -> tunnel UUID 26b1b664-... + creds json
cloudflared tunnel route dns --overwrite-dns heybub-oci api.heybub.app
# stage cert + <UUID>.json + config.yml into /etc/cloudflared (system loc, service-readable)
# /etc/systemd/system/cloudflared.service: ExecStart=cloudflared --config /etc/cloudflared/config.yml tunnel run, User=root, Restart=always
sudo systemctl enable --now cloudflared
```
config.yml ingress: `api.heybub.app -> http://localhost:8080`, fallback `http_status:404`.
IMPORTANT: do these steps in ONE serial SSH session — concurrent sessions + the app
swap-thrash the 1 GB box into SSH-banner-timeout (recover via `oci compute instance action --action RESET`).

## 6. Frontend cutover (DONE) + Stripe webhook (TODO)
- Build: `frontend/.env.production.local` overrides only `VITE_API_URL=https://api.heybub.app`;
  every other var (incl. the AUTH Supabase project) comes from `frontend/.env`. `npm run build`.
- Host: Cloudflare Pages project `heybub` → `npx wrangler pages deploy dist --project-name heybub`.
  Custom domain `app.heybub.app` (already in `CORS_ORIGINS`) via Pages API + DNS CNAME
  `app -> heybub-77c.pages.dev` (proxied).
- **AUTH GOTCHA — two-project split:** auth users live in Supabase project `ztgslfglskfmzakeizoq`,
  data in `blfitvvauoncoifrgvej`. Backend validates login JWTs with `SUPABASE_JWT_SECRET` (= the
  AUTH project's secret) but uses `SUPABASE_URL` (DATA project) only for storage. PR #165 added
  JWT *issuer* validation derived from `SUPABASE_URL` → rejected every login (issuer=data project
  ≠ token issuer=auth project). The old Lambda never set `SUPABASE_URL`, so it was unaffected; the
  VM `.env` sets it. Fix: `app/auth.py` no longer validates issuer (signature + audience suffice;
  per-project secrets already prevent cross-project token reuse). This change must also land on main.
- Stripe webhook: still points at dead AWS — repoint to `https://api.heybub.app/api/billing/webhook` (TODO).

## 7. Terminate old instance (lost-key, 140.238.152.128) — TODO

## Stability notes (1 GB box)
- Reclaim kdump (§2) — non-negotiable; 503 MB thrashes, ~950 MB is stable.
- Do VM ops in ONE serial SSH session. Concurrent/background SSH pollers + the app spike the
  1-vCPU box into swap-death (SSH "banner exchange timeout"). Recover with
  `oci compute instance action --action RESET` (or console reboot).
- If it still destabilizes under real user load, move to the free Ampere A1 (4 OCPU / 24 GB).

## Operator cheatsheet

```sh
# SSH in
ssh -i ~/.ssh/heybub_oracle opc@132.145.109.74

# --- restart services ---
sudo systemctl restart heybub-api     # the FastAPI/uvicorn app
sudo systemctl restart cloudflared    # the Cloudflare tunnel

# --- status / logs / health ---
systemctl status heybub-api cloudflared --no-pager
sudo journalctl -u heybub-api -n 50 --no-pager     # app logs
sudo journalctl -u cloudflared -n 50 --no-pager    # tunnel logs
curl -s localhost:8080/health                      # on-box health
curl -s https://api.heybub.app/health              # public health (tunnel)

# Both services are `systemctl enable`d -> they auto-start on boot.
```

**If SSH won't connect (box stalled / swap-thrashing):** you can't fix it over SSH — reboot the
instance:
- OCI Console → Compute → Instances → `heybub-api` → **Reboot**, or
- `oci compute instance action --instance-id <ocid> --action RESET --profile DEFAULT --auth security_token`
  (needs a valid `oci session authenticate`).

After reboot both services come back automatically; verify with the health checks above.
Do VM work in ONE SSH session at a time — concurrent sessions can re-trigger the thrash.
