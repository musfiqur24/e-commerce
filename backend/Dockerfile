# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

# Copy lockfiles + npmrc first (cache layer)
COPY package*.json ./
COPY .npmrc* ./

RUN npm ci --legacy-peer-deps

COPY . .

# Run the dashboard patch before building
RUN node scripts/patch-medusa-dashboard-create-additional-data.js

RUN npm run build


# ── Stage 2: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

ENV NODE_ENV=production

# Copy the compiled Medusa server bundle
COPY --from=builder /app/.medusa/server ./

# Copy static assets (uploaded files served by the local file provider)
COPY --from=builder /app/static ./static

# Install only production deps
RUN npm install --omit=dev --legacy-peer-deps

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s \
    CMD wget --spider -q http://localhost:9000/health || exit 1

# Run migrations then start the server
CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
