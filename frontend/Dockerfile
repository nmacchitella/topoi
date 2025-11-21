# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set to production
ENV NODE_ENV=production

# Copy standalone server files
COPY --from=builder /app/.next/standalone ./

# Copy static files
COPY --from=builder /app/.next/static ./.next/static

# Expose port
EXPOSE 3000

# Run the application
CMD ["node", "server.js"]
