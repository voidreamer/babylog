# API Server Migration: Lambda to a Persistent Server

*Decision date: 2026-06-12. Supersedes [FUTURE_LAMBDA_OPTIMIZATION.md](FUTURE_LAMBDA_OPTIMIZATION.md).*

## Decision

Move the FastAPI backend off Lambda + API Gateway onto one always-on
container on Fly.io. Keep S3 + CloudFront for the frontend.

## Why

Opening the app frequently lands on a Lambda cold start. At 256 MB the
function gets roughly 1/7 of a vCPU, and a cold start has to import
FastAPI, SQLAlchemy and Pydantic, then open a TLS connection to Supabase
before handling the request. Measured experience: several seconds of
"cards in loading state" after launch. The product's whole pitch is
logging in seconds at 3am, so the API must respond instantly every time,
not just while warm.

A persistent process removes the problem class: no imports per request,
a warm connection pool (`pool_pre_ping` is already configured in
`backend/app/database.py`), and TLS session reuse.

### Stopgap already applied

`infra/lambda.tf` now sets `memory_size = 1024`. More memory means a
larger CPU slice, which cuts cold starts from multiple seconds to about
one. Cost at current volume stays in cents. This ships immediately while
the migration happens.

## Options considered

| Option | Cost | Notes |
|---|---|---|
| Fly.io shared-cpu-1x, 512 MB, always on | ~$3-6/mo | No cold starts, no servers to patch, remote Docker builds, easy region pinning. **Chosen.** |
| Hetzner VPS (CAX11, 2 vCPU ARM, 4 GB) | ~€4/mo | Cheapest raw compute, but we own OS updates, TLS, deploy scripts, monitoring. |
| Railway hobby | ~$5/mo | Similar convenience to Fly, slightly pricier at equal specs. |
| AWS App Runner | ~$5-15/mo | Stays in AWS/Terraform, but costs more and configures harder than Fly. |
| Lambda + provisioned concurrency | ~$3-12/mo | Pays Lambda prices to imitate a server. Keeps API Gateway latency and per-invocation DB connection churn. |

Decision driver: under $6/month, zero ops burden, and first-byte latency
that no longer depends on traffic patterns.

## Region

Co-locate the API with the Supabase Postgres project. Once cold starts
are gone, DB round-trips dominate response time. Check the region in the
`DATABASE_URL` host. The AWS side of this project runs in `ca-central-1`;
if Supabase matches, use Fly region `yul` (Montreal). `fly.toml`
currently defaults to `iad`; adjust before the first deploy.

## Cutover runbook

1. `cd backend && fly launch --no-deploy` (accepts the committed
   `fly.toml`; set the region here).
2. `fly secrets set` for every var the app reads (full list in the
   `fly.toml` header; names come from `backend/app/config.py`).
3. `fly deploy`, then smoke-test `https://<app>.fly.dev/health` and an
   authenticated request.
4. Put a custom domain in front: `fly certs add api.heybub.app`, add the
   DNS record. Clients should only ever know `api.heybub.app` so a future
   host change never touches them again.
5. Frontend cutover: update `VITE_API_URL` in GitHub Actions, add the new
   origin to `CORS_ORIGINS` on Fly, redeploy. The iOS widgets read the
   API base URL from App Group UserDefaults at runtime, so they follow
   automatically after the app launches once.
6. Update the Stripe webhook endpoint to the new host and send a test
   event from the Stripe dashboard.
7. Run both stacks for a few days. Watch Sentry and Fly logs.
8. Remove the Lambda, API Gateway and related IAM resources from
   Terraform. Keep S3 + CloudFront (frontend) and the preview stack.
   `mangum` can then leave `requirements.txt`, and the
   `handler = Mangum(...)` line can leave `app/main.py`.

## Rollback

Until step 8, rollback is repointing `VITE_API_URL` (and the Stripe
webhook) back at API Gateway and redeploying the frontend. Nothing
server-side needs to change, both stacks serve the same code and the
same database.

## Connection pool note

Supabase plans cap direct Postgres connections. One Fly machine with
SQLAlchemy's default pool (5 + overflow) is fine. If we later scale to
several machines, switch `DATABASE_URL` to the Supavisor session pooler
(port 5432 on the pooler host) rather than raising pool sizes.
