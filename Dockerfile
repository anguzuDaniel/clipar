# Multi-stage Dockerfile for Clipar on Cloud Run
# Optimized for video processing with FFmpeg

# Stage 1: Dependencies
FROM node:18-slim AS deps
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libc6-compat \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Stage 2: Builder
FROM node:18-slim AS builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libc6-compat \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app in standalone mode
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Runner
FROM node:18-slim AS runner
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libc6-compat \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create directories for video processing
RUN mkdir -p /app/temp /app/public/outputs && \
    chown -R nextjs:nodejs /app/temp /app/public/outputs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV production
ENV PORT 8080
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]
