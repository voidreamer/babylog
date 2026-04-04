# HeyBub Production Readiness Plan
*Generated: 2026-04-04*

## Table of Contents
1. Current State Assessment
2. Phase 1: Harden What Exists
3. Phase 2: Notification Stack
4. Phase 3: Telegram Bot Integration
5. Phase 4: Capacitor Native Features (Widgets + Voice)
6. ~~Phase 5: Infrastructure Migration Evaluation~~ (SKIPPED — Oracle ARM A1.Flex unavailable in Toronto region, keeping AWS serverless)
7. Phase 6: App Store Polish
8. Priority Matrix

---

## 1. Current State Assessment

### Strong Points
- **Offline-first architecture**: IndexedDB with 30-day cache, sync queue with exponential backoff, optimistic UI updates, buildOfflineDashboard() reconstructs full dashboard from local cache
- **Instant hydration**: AuthProvider and BabyProvider read cached state from localStorage synchronously — no loading screen for returning users
- **Code splitting**: Recharts, Framer Motion, date-fns, Supabase, i18n chunked separately; routes lazy-loaded
- **CI/CD**: 6 GitHub Actions workflows (deploy, preview, cleanup, Lighthouse, translate, native builds), Dependabot for all ecosystems
- **Infrastructure**: Terraform IaC with per-environment state, CloudFront with security headers + OAC, budget alerts, CloudWatch alarms, Grafana Cloud integration
- **RBAC**: Owner/caregiver/viewer roles via JSONB shared_with with PostgreSQL containment queries
- **i18n**: 7 languages with automated DeepL translation pipeline
- **Capacitor 8**: Deep link handling, local notifications, haptics, camera configured

### Weak Points — Critical
| Issue | Location | Impact |
|-------|----------|--------|
| Terraform auto-approve | .github/workflows/ci-cd.yml:180 | Infra changes applied to prod without review |
| No automated rollback | ci-cd.yml deploy job | Failed deploy stays live |
| Secrets in env vars | lambda.tf, ci-cd.yml | DATABASE_URL, JWT_SECRET, Stripe keys exposed in Lambda env vars and Terraform state |
| Rate limiting not enforced | backend/app/main.py:18-27 | SlowAPI configured but zero @limiter.limit() decorators |
| Backend logging is dead | All routers | Logger declared but no actual log calls |

### Weak Points — High
| Issue | Location | Impact |
|-------|----------|--------|
| CSP disabled in production | infra/frontend.tf:111 | XSS protection missing |
| Push notifications backend hollow | models.py:362-371 | PushSubscription model exists, no endpoints |
| No crash analytics | Entire app | No Sentry or equivalent |
| No LICENSE file | Repo root | Legally ambiguous |
| CORS too permissive | main.py:40-49 | allow_methods=["*"], allow_headers=["*"] |
| Missing DB indexes | models.py | No GIN index on shared_with JSONB, no analytics indexes |
| No cross-field validation | schemas.py | e.g., sleep end_time > start_time not enforced |

### Weak Points — Medium
- No frontend linting config (ESLint, Prettier)
- No pre-commit hooks
- Backend deps use >= not pinned versions
- No E2E tests (Cypress/Playwright)
- No backend .env.example
- Offline data unencrypted in IndexedDB
- Limited a11y (no ARIA live regions, no skip nav)

---

## 2. Phase 1: Harden What Exists
*Estimated scope: foundational fixes before adding features*

### 2.1 Secrets Management
- Move DATABASE_URL, SUPABASE_JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VAPID keys to AWS Secrets Manager (or if migrating to Oracle, use HashiCorp Vault or encrypted env files)
- Lambda reads secrets at runtime via IAM role
- Remove secrets from Terraform variables and state
- Rotate all existing secrets after migration

### 2.2 Deploy Safety
- Add `terraform plan` artifact step in CI/CD; require manual approval before apply
- Store previous Lambda version ARN; on health check failure, revert via `aws lambda update-function-code --s3-key previous-version.zip`
- Add staging branch trigger to CI/CD (currently only main deploys)
- Test database migrations against staging before production

### 2.3 Rate Limiting
Add @limiter.limit() decorators:
- Write endpoints (POST/PUT/DELETE): "30/minute"
- Read endpoints (GET): "60/minute"
- Auth-adjacent endpoints: "10/minute"
- Export endpoints: "5/minute"
- Admin endpoints: "5/minute"

### 2.4 Logging & Observability
- Add structlog or python-json-logger for structured Lambda logs
- Log on every request: request_id, user_id, baby_id, method, path, status, duration_ms
- Log on errors: full exception with stack trace
- Add Sentry SDK to both backend (Python) and frontend (React)
- Wire CloudWatch Log Insights saved queries for common error patterns

### 2.5 Security Quick Wins
- Enable CSP in production (follow infra/ENABLE_CSP_PRODUCTION.md)
- Tighten CORS: allow_methods=["GET","POST","PUT","DELETE","OPTIONS"], allow_headers=["Authorization","Content-Type","X-Admin-Key"]
- Add GIN index on babies.shared_with for shared baby lookups
- Add composite index on analytics_events(event_name, created_at)
- Add LICENSE file (MIT)
- Create backend .env.example
- Add @field_validator for cross-field checks (end_time > start_time, amount > 0, etc.)

---

## 3. Phase 2: Notification Stack
*Complete the existing notification infrastructure*

### 3.1 Backend Push Notification Endpoints
```
POST /push/subscribe     — Register Web Push subscription (endpoint, p256dh, auth_key)
DELETE /push/unsubscribe — Remove subscription by endpoint
POST /push/test          — Send test notification to verify setup
```
- Use pywebpush (already in requirements.txt) with VAPID keys (already in config)
- Store subscriptions in existing push_subscriptions table

### 3.2 Notification Scheduler
- Scheduled Lambda (EventBridge rule, every 15 minutes) OR cron job on VM:
  - Check for upcoming doctor visits (day before at 6 PM, morning of at 8 AM)
  - Check for vaccination due dates
  - Check medication reminders at user-configured time
  - Pattern-based alerts: "Baby hasn't eaten in X hours" (configurable threshold)
- Each notification type toggleable per-user via notification preferences

### 3.3 Frontend Web Push Integration
- Service worker push event handler (shows notification even when app is closed)
- navigator.serviceWorker.pushManager.subscribe() with VAPID public key
- Merge with existing Capacitor local notification system:
  - Native (Capacitor): Use @capacitor/push-notifications for FCM/APNs
  - Web (PWA): Use Web Push API
  - Both fall back to local notifications for reminders when offline

### 3.4 Notification Preferences
- Per-baby notification settings
- Per-type toggles (appointments, medications, feeding reminders, sleep alerts)
- Quiet hours (e.g., 10 PM - 7 AM)
- Delivery channel preference (push, Telegram, both)

---

## 4. Phase 3: Telegram Bot Integration
*New feature: log entries and check status via Telegram*

### 4.1 Architecture
```
User ←→ Telegram Bot API ←→ Bot Server (webhook or polling) ←→ HeyBub API
```

If staying on Lambda: Use Telegram webhook mode → API Gateway → dedicated Lambda function
If moving to VM: Use polling mode (simpler) or webhook mode behind nginx

### 4.2 Bot Commands
```
/start              — Link Telegram account to HeyBub user (auth via deep link token)
/status             — Today's summary for selected baby
/feed <type> <amt>  — Log feeding ("4oz formula", "breast 15min", "solids banana")
/diaper <type>      — Log diaper change ("poo", "pee", "mixed")
/sleep start        — Start sleep session
/sleep end          — End current sleep session
/pumping <amt> <dur>— Log pumping session
/bath               — Log bath
/tummy <dur>        — Log tummy time
/summary            — Daily summary with counts
/share              — Generate shareable daily summary image/text
/select <baby>      — Switch active baby (for multi-baby users)
/remind <time> <msg>— Set custom reminder
/settings           — Configure notification preferences
```

### 4.3 Natural Language Parsing
Beyond slash commands, support freeform messages:
- "fed baby 4 ounces of formula at 2pm" → create feeding
- "diaper change, poo, green" → create diaper entry with color
- "she's been sleeping since 1:30" → start sleep backdated
- "how long since last feeding?" → query and respond

Implementation: Regex patterns for common phrases, with fallback to Claude API for complex parsing (optional, adds cost).

### 4.4 Sharing & Notifications via Telegram
- Daily summary message at configurable time (e.g., 8 PM)
- Forward summary to family group chat
- Caregiver handoff: "Here's what happened today: 5 feedings, 4 diapers, 2 naps (3h 15m total)"
- Photo sharing: caregivers can send photos via Telegram → stored as activity photos

### 4.5 WhatsApp (Future Extension)
- Requires Meta Business API approval and per-conversation costs
- Same command structure as Telegram
- Template messages for outbound notifications (Meta requirement)
- Add only after Telegram bot proves the interaction model

### 4.6 Implementation Plan
1. Create bot via @BotFather, get token
2. New backend module: app/bot/telegram.py
3. Webhook endpoint: POST /bot/telegram/webhook
4. User linking: /start command generates one-time token, user confirms in app
5. Command parser with validation (baby access check before every action)
6. Store telegram_chat_id on users table (new migration)
7. Notification delivery: push + Telegram based on user preference

---

## 5. Phase 4: Capacitor Native Features

### 5.1 iOS Widgets (WidgetKit)

**Approach**: Native Swift WidgetKit extension (Capacitor doesn't support widgets natively)

**Data Flow**:
```
React App (Capacitor) → App Groups UserDefaults → WidgetKit Extension reads → Renders widget
```

**Implementation**:
1. Enable App Groups in Xcode: group.com.heybub.app
2. Create Capacitor plugin or use @nicknisi/capacitor-app-group to write to shared UserDefaults
3. On every dashboard refresh / data change, write JSON summary to shared UserDefaults:
   ```json
   {
     "baby_name": "Emma",
     "last_feeding": {"time": "2026-04-04T14:30:00Z", "type": "formula", "amount": "4oz"},
     "last_diaper": {"time": "2026-04-04T13:15:00Z", "type": "poo"},
     "last_sleep": {"start": "2026-04-04T11:00:00Z", "end": "2026-04-04T12:30:00Z"},
     "active_sleep": null,
     "today_summary": {"feedings": 5, "diapers": 4, "sleep_hours": 3.25}
   }
   ```
4. Swift WidgetKit extension with TimelineProvider:
   - Small widget: Last feeding time + type, last diaper time
   - Medium widget: Today's summary (feeds, diapers, sleep total)
   - Large widget: Mini timeline of today's events
   - Lock Screen widget: Time since last feeding / active sleep timer
5. Deep link from widget tap: heybub://dashboard or heybub://health
6. WidgetCenter.shared.reloadAllTimelines() called from app on data change

### 5.2 Android Widgets (Glance)

**Approach**: Jetpack Glance (modern) or RemoteViews (legacy, wider support)

**Implementation**:
1. SharedPreferences for data sharing (same JSON format as iOS)
2. Capacitor plugin to write to SharedPreferences from WebView
3. AppWidgetProvider subclass with GlanceAppWidget
4. Widget types mirror iOS: small summary, medium timeline
5. Deep link intents: intent://dashboard#Intent;scheme=heybub;end
6. AppWidgetManager.updateAppWidget() on data change

### 5.3 Voice-Led Interactions

**Strategy**: "Hands-free baby logging" — parents' hands are often occupied

**Phase A: Web Speech API (Cross-Platform, Ship First)**
1. VoiceCommandBar component: floating microphone FAB on Dashboard
2. SpeechRecognition API for voice input (works in WebView + browser)
3. Command parser:
   - "Log feeding [type] [amount] [time]"
   - "Start sleep" / "End sleep" / "Baby woke up"
   - "Diaper change [type]"
   - "Start tummy time" / "End tummy time"
   - "How long since last feeding?" (query mode)
   - "What did baby eat today?" (summary mode)
4. SpeechSynthesis for confirmations: "Logged 4 ounce formula feeding at 2:15 PM"
5. Haptic feedback on recognition success (@capacitor/haptics)
6. Offline queue: voice-logged entries use existing offline sync
7. Visual transcript display with edit-before-confirm option

**Phase B: Siri Shortcuts (iOS, Premium Feature)**
- SiriKit integration via Capacitor native module
- App Intents framework (iOS 16+)
- "Hey Siri, log a feeding in HeyBub"
- Donate interactions for Siri suggestions

**Phase C: Google Assistant (Android, Premium Feature)**
- App Actions via actions.xml
- Built-in intents for logging
- "Hey Google, log baby diaper change in HeyBub"

---

## 6. Phase 5: Infrastructure Migration Evaluation

### 6.1 Oracle Cloud Free Tier Options

| Resource | E2.1.Micro | A1.Flex (ARM) |
|----------|-----------|---------------|
| CPU | 1/8 OCPU (AMD) | Up to 4 OCPU (ARM) |
| RAM | 1 GB | Up to 24 GB |
| Storage | 50 GB boot | 200 GB total |
| Network | 480 Mbps | Up to 4 Gbps |
| Cost | Always Free | Always Free |
| Verdict | Too small for this stack | Strong candidate |

**Recommendation**: Only consider A1.Flex (ARM). The E2.1.Micro cannot run FastAPI + PostgreSQL + Telegram bot comfortably.

### 6.2 Proposed Architecture on Oracle A1.Flex

```
                    Cloudflare (Free)
                    ├── CDN for static assets
                    ├── SSL termination
                    ├── DDoS protection
                    └── DNS management
                         │
                    Oracle A1.Flex VM (4 OCPU, 24GB RAM)
                    ├── Docker Compose
                    │   ├── nginx (reverse proxy)
                    │   ├── fastapi (uvicorn, 2 workers)
                    │   ├── postgresql (self-hosted, 15+)
                    │   ├── telegram-bot (polling mode)
                    │   ├── notification-scheduler (cron)
                    │   └── redis (optional, for caching)
                    └── Volumes
                        ├── pg_data (database)
                        ├── backups (daily pg_dump)
                        └── uploads (photos)
```

### 6.3 Migration Tradeoffs

**Gains**:
- $0/month (vs ~$10 AWS + Supabase costs)
- Persistent server: Telegram bot polling, WebSocket connections, cron jobs, background workers all trivial
- Self-hosted PostgreSQL: no Supabase dependency, full control over extensions, backups, replication
- Simpler deployment: docker-compose up vs Terraform + Lambda + S3 + CloudFront + API Gateway
- No cold starts
- ARM is fast for Python workloads

**Losses**:
- You become the sysadmin: OS patches, Docker updates, SSL rotation (Cloudflare handles this), disk monitoring, backup verification
- Single point of failure: one VM, one region, no auto-scaling
- Oracle free tier reputation: some users report accounts flagged (Always Free tier is contractually permanent, but trust varies)
- No CDN built-in (Cloudflare free tier covers this)
- ARM architecture: most Python packages work, but verify native deps (psycopg2-binary, Pillow, etc.)
- Lose AWS-native integrations: CloudWatch, API Gateway, Lambda@Edge

**Recommended strategy**: Hybrid migration
1. Keep Supabase Auth (proven, handles OAuth complexity)
2. Move API + DB + bot + scheduler to Oracle A1.Flex
3. Use Cloudflare for CDN, SSL, DNS, and static asset hosting
4. Keep GitHub Actions for CI/CD (build → docker push → ssh deploy)
5. Automated daily pg_dump to Oracle Object Storage (free tier includes 20GB)

### 6.4 Migration Steps (if proceeding)
1. Provision Oracle A1.Flex instance (Ubuntu 22.04 ARM)
2. Install Docker + Docker Compose
3. Create docker-compose.yml with all services
4. Migrate PostgreSQL data from Supabase (pg_dump/pg_restore)
5. Configure Cloudflare DNS + proxy
6. Update frontend VITE_API_URL to new domain
7. Update GitHub Actions: build Docker image → push to GHCR → SSH deploy
8. Run both environments in parallel for 1 week
9. Cut over DNS
10. Decommission AWS resources

---

## 7. Phase 6: App Store Polish

### 7.1 App Store Requirements
- Privacy nutrition labels (iOS): list all data collected and purposes
- Data deletion: already exists (DELETE /me) — verify it's thorough
- Terms of Service page (new)
- COPPA compliance review: baby data = children's data, need parental consent flow
- Health data handling disclosure (not HealthKit, but still health-adjacent)

### 7.2 Performance
- Lambda provisioned concurrency OR VM always-on (eliminates cold starts)
- CloudFront cache split: index.html (no-cache) vs /assets/* (1 year immutable)
- @capacitor/splash-screen for native cold start UX
- Image optimization: compress profile photos on upload

### 7.3 Testing
- Add Playwright E2E for critical flows:
  - Login → create baby → log feeding → see on dashboard
  - Offline → log → reconnect → verify sync
  - Share baby → caregiver access → viewer restrictions
- Backend integration tests for multi-user + Stripe webhook scenarios
- Load test the API (k6 or locust) to establish baseline

### 7.4 Developer Experience
- Add LICENSE file (MIT)
- Backend .env.example with all required vars documented
- Pre-commit hooks: ruff (Python), ESLint + Prettier (TypeScript)
- CONTRIBUTING.md with branch naming, commit format, PR process

---

## 8. Priority Matrix

```
                         HIGH IMPACT
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          │  Secrets Mgmt     │  Telegram Bot     │
          │  Deploy Rollback  │  Voice Logging    │
          │  Rate Limiting    │  iOS Widgets      │
          │  Sentry/Logging   │  Push Notifs      │
          │  CSP in Prod      │  Oracle Migration │
          │                   │                   │
    LOW ──┼───────────────────┼───────────────────┼── HIGH
   EFFORT │                   │                   │  EFFORT
          │  LICENSE file     │  Android Widgets  │
          │  .env.example     │  Siri Shortcuts   │
          │  CORS tightening  │  E2E Tests        │
          │  DB indexes       │  WhatsApp Bot     │
          │  Pre-commit hooks │  Multi-region DR  │
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                          LOW IMPACT
```

**Recommended execution order**:
1. Phase 1 (Harden) — foundation for everything else
2. Phase 2 (Notifications) — complete existing half-built system
3. Phase 3 (Telegram Bot) — new parent interaction channel
4. Phase 5 (Oracle Migration) — if cost/flexibility motivates it, do before widgets
5. Phase 4 (Voice + Widgets) — premium native features
6. Phase 6 (App Store) — final polish

---

## Appendix: Key File Locations

### Backend
- app/main.py — FastAPI setup, Mangum handler, middleware
- app/auth.py — Supabase JWT verification
- app/models.py — All 20+ SQLAlchemy models (372 lines)
- app/schemas.py — Pydantic validation models
- app/database.py — Connection pooling config
- app/routers/utils.py — RBAC helpers (verify_baby_access, baby_access_filter)
- app/routers/ — 13 router files (babies, feedings, diapers, sleeps, pumpings, health, activities, analytics, rest_planner, export, billing, subscription, admin, users)

### Frontend
- src/App.tsx — Main router + settings panel (400+ lines)
- src/main.tsx — Deep link handling + Capacitor setup
- src/hooks/useAuth.tsx — Auth context with instant hydration
- src/hooks/useBaby.tsx — Baby context with cached state
- src/api/client.ts — API client with 60+ methods, offline queue (699 lines)
- src/utils/offlineStorage.ts — IndexedDB schema + cache (450+ lines)
- src/utils/notificationScheduler.ts — Local notification scheduling (450+ lines)
- src/hooks/useOfflineSync.ts — Sync orchestration + retry logic
- vite.config.ts — PWA + Workbox caching + code splitting

### Infrastructure
- infra/main.tf — Terraform provider + backend config
- infra/lambda.tf — Lambda + API Gateway
- infra/frontend.tf — S3 + CloudFront + security headers
- infra/monitoring.tf — CloudWatch alarms + Grafana
- infra/budget.tf — Cost alerts
- infra/preview.tf — PR preview infrastructure
- .github/workflows/ci-cd.yml — Main deploy pipeline
- .github/workflows/preview-deploy.yml — PR preview deployments
