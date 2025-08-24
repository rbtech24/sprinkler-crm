# Multi-stage build for Next.js frontend

# Stage 1: Build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "
        const http = require('http');
        const options = { hostname: 'localhost', port: 3007, path: '/api/health', timeout: 2000 };
        const req = http.request(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1));
        req.on('error', () => process.exit(1));
        req.end();
    " || exit 1

# Start the application
CMD ["dumb-init", "node", "server.js"]