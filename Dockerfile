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
RUN cd frontend && npm ci --omit=dev && npm cache clean --force

# Build frontend
FROM base AS frontend-builder
WORKDIR /app/frontend

# Copy frontend dependencies
COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend/ .

# Build frontend
RUN npm run build

# Production backend image
FROM base AS backend-production
WORKDIR /app

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backenduser

# Copy backend dependencies
COPY --from=deps --chown=backenduser:nodejs /app/backend/node_modules ./backend/node_modules
COPY --chown=backenduser:nodejs backend/ ./backend/

# Create data directory for SQLite
RUN mkdir -p /app/backend/data && chown backenduser:nodejs /app/backend/data

# Switch to non-root user
USER backenduser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start backend server
WORKDIR /app/backend
CMD ["node", "src/server.js"]

# Production frontend image
FROM base AS frontend-production
WORKDIR /app

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built frontend
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/.next/static ./.next/static
COPY --from=frontend-builder --chown=nextjs:nodejs /app/frontend/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start frontend server
CMD ["node", "server.js"]

# Default to backend for monorepo deployment
FROM backend-production AS default