FROM node:24-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN node scripts/patch-medusa-dashboard-create-additional-data.js

RUN npm run build


FROM node:24-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

ENV NODE_ENV=production

# Copy the built server contents directly into WORKDIR so medusa-config.js
# lands at /app/medusa-config.js where the Medusa CLI expects it.
COPY --from=builder /app/.medusa/server ./

RUN npm install --omit=dev --legacy-peer-deps

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s \
    CMD wget --spider -q http://localhost:9000/health || exit 1

CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]
