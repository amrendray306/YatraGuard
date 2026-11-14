# ====================================================================
# YATRAGUARD MULTI-STAGE PRODUCTION DOCKERFILE
# ====================================================================

# STAGE 1: Build React Client (Vite + Tailwind CSS)
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# STAGE 2: Build Express Backend (TypeScript + Prisma)
FROM node:20-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY server/ ./
RUN npm run build

# STAGE 3: Production Minimal Runtime
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Install OpenSSL for Prisma engine compatibility
RUN apk add --no-cache openssl

# Set up server directory
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client and schema
COPY --from=server-builder /app/server/prisma ./prisma/
COPY --from=server-builder /app/server/node_modules/.prisma ./node_modules/.prisma/
COPY --from=server-builder /app/server/node_modules/@prisma ./node_modules/@prisma/

# Copy compiled backend
COPY --from=server-builder /app/server/dist ./dist/

# Copy compiled frontend SPA for unified Express serving
WORKDIR /app/client
COPY --from=client-builder /app/client/dist ./dist/

# Run as non-root user for security hardening
WORKDIR /app/server
USER node

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/health || exit 1

CMD ["node", "dist/index.js"]

