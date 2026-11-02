# ============================================================================
# Stage 1: Build React + TypeScript + Tailwind v4 Frontend SPA
# ============================================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ============================================================================
# Stage 2: Production Python FastAPI + Unified SPA Server
# ============================================================================
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEV_RELOAD=false \
    PORT=8000

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source and built frontend SPA assets
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure SQLite data directory exists and is writable
RUN mkdir -p /app/backend/data

WORKDIR /app/backend
EXPOSE 8000

CMD ["python", "run.py"]
