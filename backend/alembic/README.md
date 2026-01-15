# Alembic Database Migrations

This directory contains database migrations managed by Alembic.

## Quick Reference

```bash
# Check current migration status
alembic current

# Apply all pending migrations
alembic upgrade head

# Create a new migration (auto-generate from model changes)
alembic revision --autogenerate -m "description of changes"

# Create an empty migration (for manual changes)
alembic revision -m "description of changes"

# Rollback one migration
alembic downgrade -1

# View migration history
alembic history
```

## For Existing Databases

If the database already has tables from the manual SQL migrations (001-007),
mark the baseline as applied without running it:

```bash
alembic stamp 0001
```

This tells Alembic "pretend migration 0001 is already applied" so it won't
try to create tables that already exist.

## Creating New Migrations

1. Modify models in `app/models.py`
2. Generate migration: `alembic revision --autogenerate -m "add user preferences"`
3. Review the generated file in `alembic/versions/`
4. Apply: `alembic upgrade head`

## CI/CD Integration

In your deployment pipeline:

```bash
alembic upgrade head
```

This is idempotent - it only applies migrations that haven't been run yet.
