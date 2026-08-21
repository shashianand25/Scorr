# ==============================================================================
# Scorr - Monorepo Multi-Stage Dockerfile
# ==============================================================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
ENV NODE_ENV=production

# Stage 1: Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
RUN npm --prefix apps/api install --omit=dev --no-audit

# Stage 2: Backend Runner
FROM base AS backend-runner
WORKDIR /app
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY apps/api ./apps/api
COPY package.json ./

EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/api/api/index.js"]
