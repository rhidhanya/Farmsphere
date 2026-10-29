# Multi-stage production build for FarmSphere Node.js Backend
FROM node:20-alpine AS base

WORKDIR /app

# Install dependencies (only production deps)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5001

# Default environment variables
ENV NODE_ENV=production
ENV PORT=5001

# Run as non-root node user for security
USER node

# Health check using native Node.js HTTP request
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({ host: '127.0.0.1', port: process.env.PORT || 5001, path: '/api/health', timeout: 4000 }, (res) => process.exit(res.statusCode === 200 ? 0 : 1)); req.on('error', () => process.exit(1)); req.end();"

# Start the application
CMD ["node", "server.js"]
