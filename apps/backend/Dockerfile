# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --frozen-lockfile --filter backend

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN pnpm build

# ---- Production stage ----
FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN pnpm install --frozen-lockfile --filter backend --prod

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

WORKDIR /app/apps/backend

EXPOSE 3001

CMD ["node", "dist/main"]
