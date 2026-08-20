# ==============================================================================
# Scorr Backend - Node.js Express API Container
# ==============================================================================
FROM node:20-alpine
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package configuration
COPY package.json package-lock.json* ./
RUN npm install --no-audit

# Copy application source code
COPY . .

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "api/index.js"]
