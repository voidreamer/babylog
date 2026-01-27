# CLAUDE.md - AI Coding Instructions

## Project Overview

Babylog is a serverless baby tracking application for logging feedings, diapers, sleep, and health milestones.

## Tech Stack

- **Backend**: FastAPI (Python 3.11+) on AWS Lambda via Mangum
- **Frontend**: React 18 + Vite, JSX (not TypeScript)
- **Database**: Supabase PostgreSQL with SQLAlchemy ORM
- **Auth**: Supabase Auth (migrated from AWS Cognito)
- **Infra**: Terraform for AWS (Lambda, API Gateway, S3, CloudFront)
- **Mobile**: Capacitor for iOS/Android builds

## Project Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app, CORS, rate limiting
│   ├── models.py        # SQLAlchemy models
│   ├── database.py      # DB connection
│   ├── config.py        # Settings from env
│   ├── auth.py          # Auth middleware
│   └── routers/         # API endpoints by domain
│       ├── babies.py
│       ├── feedings.py
│       ├── diapers.py
│       ├── sleeps.py
│       ├── health.py
│       └── ...
├── alembic/             # DB migrations
└── tests/

frontend/
├── src/
│   ├── App.jsx          # Main app, routing, settings
│   ├── api/client.js    # API client
│   ├── hooks/           # React hooks (useAuth, useBaby, etc.)
│   ├── components/      # UI components
│   ├── pages/           # Route pages
│   └── utils/           # Helpers
└── ios/, android/       # Capacitor native projects

infra/                   # Terraform configs
docs/                    # Deployment & troubleshooting guides
```

## Code Conventions

### Backend (Python)

- Use `datetime.now(timezone.utc)` instead of deprecated `datetime.utcnow()`
- Models use SQLAlchemy declarative base with relationships
- Routers are organized by domain (babies, feedings, health, etc.)
- Rate limiting via slowapi with IP-based keys
- Environment config via pydantic Settings

### Frontend (React)

- Functional components with hooks
- JSX files (not TSX) - no TypeScript
- Styling: CSS variables, component-scoped styles
- State: React hooks + context (useAuth, useBaby)
- Icons: lucide-react
- Toasts: sonner
- Animations: framer-motion
- Charts: recharts
- Offline support via IndexedDB (idb)

### API Patterns

- RESTful endpoints under `/api` prefix in production
- JWT auth via Supabase tokens in Authorization header
- User isolation: all queries filter by `user_id`
- Cascade deletes for baby-related data

## Key Models

- **Baby**: Central entity, owned by user_id, can be shared
- **Feeding**: type (formula/breast/bottle/solid), amount_ml, duration
- **Diaper**: type (wet/dirty/mixed), optional rash tracking
- **Sleep**: start_time, end_time, quality
- **Health records**: DoctorVisit, Vaccination, Medication, Milestone, GrowthRecord, Tooth, SickDay, Allergy

## Development

### Backend
```bash
cd backend
pip install -r requirements.txt
# Set DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY in .env
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Deployment

- CI/CD via GitHub Actions (`.github/workflows/ci-cd.yml`)
- Staging branch deploys to staging environment
- Main branch deploys to production
- See `docs/deployment.md` for full guide

## Testing

```bash
cd backend
pytest
```

## Common Tasks

### Adding a new tracker type
1. Create model in `backend/app/models.py`
2. Add migration via alembic
3. Create router in `backend/app/routers/`
4. Register router in `main.py`
5. Create frontend component and hook
6. Add to Dashboard/Timeline

### Adding API endpoint
1. Add to appropriate router file
2. Include auth dependency: `user_id: str = Depends(get_current_user)`
3. Filter queries by user_id for security

## Notes

- Premium features gated by `is_premium` flag on User model
- Promo codes handled in subscription router
- Export to CSV available for premium users
- PWA support via vite-plugin-pwa
