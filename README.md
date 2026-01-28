# Babylog

A serverless baby tracking application built with FastAPI and React, deployed on AWS.

## Features

- Track multiple babies with sharing support
- Log feedings (formula, breast, bottle, solid foods)
- Track diaper changes with optional rash monitoring
- Monitor sleep sessions with quality tracking
- Health records: doctor visits, vaccinations, medications, milestones, growth charts
- Activity tracking: tummy time, baths, supplements
- Dashboard with customizable widgets
- Daily timeline view with drag-and-drop editing
- Analytics and insights
- Offline support with sync
- iPad-optimized responsive design
- PWA support

## Tech Stack

**Backend**
- Python 3.11+ with FastAPI
- SQLAlchemy ORM
- AWS Lambda (via Mangum)
- API Gateway

**Frontend**
- React 18 with Vite
- Framer Motion for animations
- Recharts for data visualization
- Capacitor for iOS/Android builds

**Infrastructure**
- Supabase PostgreSQL
- Supabase Auth
- AWS S3 + CloudFront for static hosting
- Terraform for IaC
- GitHub Actions CI/CD

## Project Structure

```
backend/           FastAPI application
  app/
    routers/       API endpoints by domain
    models.py      SQLAlchemy models
    auth.py        JWT authentication
  alembic/         Database migrations

frontend/          React application
  src/
    components/    UI components
    hooks/         React hooks
    pages/         Route pages
    api/           API client

infra/             Terraform configurations
```

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `.env` with:
```
DATABASE_URL=postgresql://user:pass@localhost:5432/babylog
SUPABASE_JWT_SECRET=your-jwt-secret
```

Run:
```bash
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deployment

The project uses GitHub Actions for CI/CD:
- Push to `staging` branch deploys to staging environment
- Push to `main` branch deploys to production

Infrastructure is managed with Terraform. Copy `infra/terraform.tfvars.example` to `terraform.tfvars` and configure your variables.

## License

MIT
