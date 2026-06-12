# Persistent-server deployment (Fly.io, Hetzner, Railway, any Docker host).
# The Lambda path (Mangum) still works from the same codebase; this image
# just runs the FastAPI app under uvicorn instead.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY migrations ./migrations
COPY app ./app

RUN useradd --create-home appuser
USER appuser

EXPOSE 8080

# --proxy-headers so request.client reflects the real client IP behind the
# platform proxy (rate limiting depends on it).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers", "--forwarded-allow-ips", "*"]
