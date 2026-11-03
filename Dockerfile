FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
COPY apps/hub-web/package*.json ./apps/hub-web/
COPY packages/ui/package*.json ./packages/ui/
COPY packages/contracts/ ./packages/contracts/
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm --workspace=apps/hub-web run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/hub-web/public ./apps/hub-web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/hub-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/hub-web/.next/static ./apps/hub-web/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/hub-web/server.js"]

