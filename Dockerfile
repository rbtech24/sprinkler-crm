# Multi-stage Dockerfile for SprinklerPro CRM Monorepo
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files for both backend and frontend
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm ci --omit=dev && npm cache clean --force
RUN cd frontend && npm ci && npm cache clean --force

# Build frontend
FROM base AS frontend-builder
WORKDIR /app/frontend

# Copy frontend dependencies
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ .

# Set API URL for build
ENV NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Build frontend
RUN npm run build

# Full application image with both frontend and backend
FROM base AS production
WORKDIR /app

# Install nginx for reverse proxy
RUN apk add --no-cache nginx

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy backend
COPY --from=deps --chown=appuser:nodejs /app/backend/node_modules ./backend/node_modules
COPY --chown=appuser:nodejs backend/ ./backend/

# Copy built frontend
COPY --from=frontend-builder --chown=appuser:nodejs /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder --chown=appuser:nodejs /app/frontend/.next/static ./frontend/.next/static
COPY --from=frontend-builder --chown=appuser:nodejs /app/frontend/public ./frontend/public

# Create data directory for SQLite
RUN mkdir -p /app/backend/data && chown appuser:nodejs /app/backend/data

# Copy nginx configuration
RUN mkdir -p /etc/nginx/http.d
COPY nginx.conf /etc/nginx/http.d/default.conf

# Copy and setup startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start all services (nginx needs root, so we don't switch users)
CMD ["/app/start.sh"]