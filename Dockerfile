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
COPY backend/package.json ./backend/
COPY web/package.json ./web/
COPY mobile/package.json ./mobile/
RUN npm --prefix backend install --omit=dev --no-audit

# Stage 2: Backend Runner
FROM base AS backend-runner
WORKDIR /app
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
COPY package.json ./

EXPOSE 3000
ENV PORT=3000
CMD ["node", "backend/api/index.js"]
