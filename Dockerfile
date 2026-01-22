# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies with cache busting
ARG CACHE_BUST=1
RUN npm ci --only=production --ignore-scripts

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build argument for cache busting
ARG BUILD_DATE
ARG CACHE_BUST=1

# Build-time environment variables (for Next.js build process)
# These can be overridden via CapRover build args
ARG REDIS_URL
ARG REDIS_TOKEN
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY
ARG GOOGLE_DISTANCE_MATRIX_KEY
ARG MONGODB_URI

# Set build-time env vars
ENV NEXT_TELEMETRY_DISABLED=1
ENV REDIS_URL=${REDIS_URL}
ENV REDIS_TOKEN=${REDIS_TOKEN}
ENV NEXT_PUBLIC_GOOGLE_MAPS_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_KEY}
ENV GOOGLE_DISTANCE_MATRIX_KEY=${GOOGLE_DISTANCE_MATRIX_KEY}
ENV MONGODB_URI=${MONGODB_URI}

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create public directory (Next.js expects it, even if empty)
# Copy public directory if it exists (it should exist since we created it with .gitkeep)
RUN mkdir -p ./public
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
