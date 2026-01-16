# Production Deployment Guide

This document explains how to deploy the staging changes to production, with explanations for learning.

## Overview

**Current State:**
- ✅ Staging: All changes deployed and tested
- ⏳ Production: Needs these changes

**What's Being Deployed:**
- Premium status persistence (server-side, linked to user account)
- Promo code input focus fix
- Automatic database migrations in CI/CD
- Various bug fixes and improvements

---

## Pre-Deployment Checklist

### 1. Add Production Database Secret

**Why?** The GitHub Actions workflow needs to connect to your production database to run migrations.

**How:**
1. Go to: https://github.com/voidreamer/babylog/settings/secrets/actions
2. Click "New repository secret"
3. Name: `DATABASE_URL_PROD`
4. Value: Your production PostgreSQL connection string
   - Find it in your `infra/terraform.tfvars` (production) or AWS Lambda environment variables

**Learning Note:** Secrets are encrypted and never exposed in logs. GitHub masks them automatically.

### 2. Update Production Backend Workflow

The staging workflow has automatic migrations, but production doesn't yet.

**File to update:** `.github/workflows/deploy-backend.yml`

Add the same migration step we added to staging. Here's what to add after the "Wait for update to complete" step:

```yaml
      - name: Run database migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_PROD }}
        run: |
          if [ -z "$DATABASE_URL" ]; then
            echo "⚠️  DATABASE_URL_PROD secret not set - skipping migrations"
            exit 0
          fi
          echo "🔄 Running database migrations..."
          cd backend
          pip install -r requirements.txt -q

          # Check if alembic_version table exists and has a version
          CURRENT_VERSION=$(python -c "
          from sqlalchemy import create_engine, text
          import os
          engine = create_engine(os.environ['DATABASE_URL'])
          try:
              with engine.connect() as conn:
                  result = conn.execute(text('SELECT version_num FROM alembic_version'))
                  row = result.fetchone()
                  print(row[0] if row else '')
          except:
              print('')
          " 2>/dev/null)

          if [ -z "$CURRENT_VERSION" ]; then
            echo "📋 No alembic version found - checking if baseline tables exist..."
            TABLE_EXISTS=$(python -c "
          from sqlalchemy import create_engine, text
          import os
          engine = create_engine(os.environ['DATABASE_URL'])
          with engine.connect() as conn:
              result = conn.execute(text(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'babies')\"))
              print('yes' if result.fetchone()[0] else 'no')
          " 2>/dev/null)

            if [ "$TABLE_EXISTS" = "yes" ]; then
              echo "📌 Existing database detected - stamping baseline migration 0001"
              alembic stamp 0001
            fi
          fi

          alembic upgrade head
          echo "✅ Migrations complete!"
```

---

## Deployment Steps

### Step 1: Create a Pull Request

```bash
# Make sure you're on staging with latest changes
git checkout staging
git pull origin staging

# Create PR to main
gh pr create --base main --head staging --title "Release: Premium persistence + bug fixes" --body "
## Summary
- Fix promo code input losing focus
- Persist premium status server-side (survives cache clear)
- Add automatic database migrations to CI/CD
- Various bug fixes and improvements

## Database Changes
- New \`users\` table for premium status tracking

## Secrets Required
- \`DATABASE_URL_PROD\` must be added before merging
"
```

### Step 2: Add the Production Secret (Before Merging!)

1. Go to GitHub repo → Settings → Secrets → Actions
2. Add: `DATABASE_URL_PROD` = `<your production database URL>`

**⚠️ Important:** Add this BEFORE merging, so migrations run on first deploy.

### Step 3: Merge the PR

```bash
# Via GitHub UI: Click "Merge pull request"
# Or via CLI:
gh pr merge --merge
```

### Step 4: Monitor the Deployment

1. Go to: https://github.com/voidreamer/babylog/actions
2. Watch the "Deploy Backend" and "Deploy Frontend" workflows
3. Check for green checkmarks ✅

### Step 5: Verify Production

1. Clear your browser cache/localStorage
2. Go to your production app
3. Log in and go to Settings
4. Enter promo code: `SIMPLEBABY2026`
5. Log out, clear cache, log back in
6. Premium should still be active! ✅

---

## Understanding the Changes

### What Changed: Database

```
┌─────────────────────────────────────────────────────────────┐
│ BEFORE                           AFTER                      │
├─────────────────────────────────────────────────────────────┤
│ Premium stored in localStorage   Premium stored in database │
│ Lost on cache clear              Survives forever           │
│ Per-device                       Per-account (linked to     │
│                                  Cognito user ID)           │
└─────────────────────────────────────────────────────────────┘
```

**New `users` table:**
| Column | Type | Purpose |
|--------|------|---------|
| id | Integer | Primary key |
| user_id | String | Cognito sub (unique identifier) |
| email | String | User's email |
| is_premium | Boolean | Premium status |
| premium_since | DateTime | When premium was activated |
| promo_code_used | String | Which code was redeemed |

### What Changed: CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ BEFORE                           AFTER                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Build Lambda package          1. Build Lambda package    │
│ 2. Deploy to AWS                 2. Deploy to AWS           │
│ 3. Done                          3. Run alembic migrations  │
│                                  4. Done                    │
│                                                             │
│ Manual migrations required!      Automatic migrations! ✅    │
└─────────────────────────────────────────────────────────────┘
```

### What Changed: Frontend

```jsx
// BEFORE: SettingsPage defined INSIDE MainApp
function MainApp() {
    const [promoCode, setPromoCode] = useState('');

    // This creates a NEW component on every render!
    const SettingsPage = () => (
        <input value={promoCode} onChange={...} />  // Loses focus!
    );
}

// AFTER: SettingsPage defined OUTSIDE MainApp
function SettingsPage({ promoCode, setPromoCode, ...props }) {
    return (
        <input value={promoCode} onChange={...} />  // Keeps focus!
    );
}

function MainApp() {
    const [promoCode, setPromoCode] = useState('');
    return <SettingsPage promoCode={promoCode} setPromoCode={setPromoCode} />;
}
```

**Why did it lose focus?** When you type, `setPromoCode` causes a re-render. The inline component definition creates a *new function reference*, React sees it as a different component, unmounts the old one, mounts the new one → input loses focus.

---

## Rollback Plan

If something goes wrong:

### Rollback Code
```bash
# Revert to previous commit on main
git revert HEAD
git push origin main
```

### Rollback Database (if needed)
```bash
# Connect to production database and run:
alembic downgrade 0001  # Removes users table, keeps others
```

---

## Secrets Summary

| Secret | Environment | Purpose |
|--------|-------------|---------|
| `DATABASE_URL_STAGING` | Staging | Run migrations on staging DB |
| `DATABASE_URL_PROD` | Production | Run migrations on production DB |
| `AWS_ACCESS_KEY_ID` | Both | Deploy to AWS Lambda/S3 |
| `AWS_SECRET_ACCESS_KEY` | Both | Deploy to AWS Lambda/S3 |

---

## Key Concepts Learned

### 1. Alembic Migrations
- Track database schema changes in version-controlled files
- `upgrade head` - Apply all pending migrations
- `stamp` - Mark a migration as applied without running it
- `downgrade` - Revert migrations

### 2. Idempotent Migrations
- Safe to run multiple times without errors
- Check if table exists before CREATE
- Prevents "relation already exists" errors

### 3. GitHub Actions Secrets
- Never exposed in logs (masked as `***`)
- Can't be compared directly in `if:` conditions
- Pass to script via `env:` block, check in shell

### 4. React Component Identity
- Components defined inside other components get recreated on every render
- This causes unnecessary unmounting/remounting
- Always define components at module level or use `useMemo`

---

## Questions?

If you get stuck:
1. Check GitHub Actions logs for error details
2. Verify secrets are set correctly
3. Test the database connection locally first
