# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for SQLite and other native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    && ln -sf python3 /usr/bin/python

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY data/ ./data/

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sprinkler -u 1001

# Change ownership of app directory
RUN chown -R sprinkler:nodejs /app

# Switch to non-root user
USER sprinkler

# Use environment PORT or default to 3000
EXPOSE $PORT
ENV PORT=${PORT:-3000}

# Health check using environment PORT
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "
        const http = require('http');
        const port = process.env.PORT || 3000;
        const options = { hostname: 'localhost', port: port, path: '/health', timeout: 2000 };
        const req = http.request(options, (res) => process.exit(res.statusCode === 200 ? 0 : 1));
        req.on('error', () => process.exit(1));
        req.end();
    "

# Start the application
CMD ["node", "src/server.js"]