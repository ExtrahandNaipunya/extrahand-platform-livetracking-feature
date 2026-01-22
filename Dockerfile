# -----------------------------
# 1️⃣ Builder
# -----------------------------
    FROM node:20-slim AS builder
    WORKDIR /app
    
    COPY package.json package-lock.json ./
    RUN npm ci
    
    COPY . .
    
    ENV NEXT_TELEMETRY_DISABLED=1
    
    ARG NEXT_PUBLIC_GOOGLE_MAPS_KEY
    ENV NEXT_PUBLIC_GOOGLE_MAPS_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_KEY
    
    RUN npm run build
    
    
    # -----------------------------
    # 2️⃣ Runner
    # -----------------------------
    FROM node:20-slim AS runner
    WORKDIR /app
    
    ENV NODE_ENV=production
    ENV NEXT_TELEMETRY_DISABLED=1
    
    RUN useradd -m nextjs
    
    COPY --from=builder /app/package.json ./
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/.next ./.next
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/server.js ./server.js
    
    USER nextjs
    
    EXPOSE 3000
    CMD ["node", "server.js"]
    