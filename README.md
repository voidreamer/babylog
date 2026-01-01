# Babylog - Baby Tracker

A serverless baby tracking app built with FastAPI, React, and deployed on AWS.

## Features

- 👶 Track multiple babies
- 🍼 Log feedings (formula/breast)
- 🧷 Track diaper changes
- 😴 Monitor sleep sessions
- 📊 Dashboard with widgets
- 📅 Daily timeline view
- 📱 iPad-optimized responsive design

## Tech Stack

- **Backend**: FastAPI on AWS Lambda
- **Frontend**: React + Vite on S3/CloudFront
- **Database**: Supabase PostgreSQL
- **Auth**: AWS Cognito with Google OAuth
- **Infrastructure**: Terraform

## Quick Start

See [docs/deployment.md](docs/deployment.md) for deployment instructions.

### Local Development

**Backend**:
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Configure DATABASE_URL
uvicorn app.main:app --reload
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

## Documentation

- [Deployment Guide](docs/deployment.md)
- [Region Migration Troubleshooting](docs/region-migration-troubleshooting.md)

## License

MIT