# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --frozen-lockfile --filter backend

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN pnpm prisma:generate && pnpm build

# ---- Production stage ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --frozen-lockfile --filter backend --prod

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma 2>/dev/null || true

WORKDIR /app/apps/backend

EXPOSE 3001

# Chạy migrate rồi mới start
CMD ["sh", "-c", "pnpm prisma:deploy && node dist/main"]
