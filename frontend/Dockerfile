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

# Use environment PORT or default to 3000
ENV PORT=${PORT:-3000}
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE $PORT

# Health check - simple HTTP request to root
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "
        const http = require('http');
        const port = process.env.PORT || 3000;
        const options = { hostname: 'localhost', port: port, path: '/', timeout: 2000 };
        const req = http.request(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1));
        req.on('error', () => process.exit(1));
        req.end();
    " || exit 1

# Start the application
CMD ["dumb-init", "node", "server.js"]