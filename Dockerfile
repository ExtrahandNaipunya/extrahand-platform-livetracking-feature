# -----------------------------
# 1️⃣ Builder
# -----------------------------
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Build-time environment variables
ARG REDIS_URL
ARG REDIS_TOKEN
ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY
ARG GOOGLE_DISTANCE_MATRIX_KEY
ARG MONGODB_URI

ENV REDIS_URL=${REDIS_URL}
ENV REDIS_TOKEN=${REDIS_TOKEN}
ENV NEXT_PUBLIC_GOOGLE_MAPS_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_KEY}
ENV GOOGLE_DISTANCE_MATRIX_KEY=${GOOGLE_DISTANCE_MATRIX_KEY}
ENV MONGODB_URI=${MONGODB_URI}

RUN npm run build

# -----------------------------
# 2️⃣ Runner
# -----------------------------
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Prevent Next.js from trying to install TypeScript at runtime
ENV NEXT_SKIP_TYPE_CHECK=true

RUN useradd -m nextjs

# Copy package.json and node_modules (builder has all deps including TypeScript)
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy built Next.js output
COPY --from=builder /app/.next ./.next

# Copy app directory (needed for custom server route resolution)
COPY --from=builder /app/app ./app

# Copy other necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js

# Copy tsconfig.json to prevent Next.js from trying to auto-configure
COPY --from=builder /app/tsconfig.json ./tsconfig.json

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["node", "server.js"]
    