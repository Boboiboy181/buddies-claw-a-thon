# Phase 1 — Monorepo Foundation + Full Scaffold

**Status:** ✅ Done  
**Commit:** `d1ca3c8`, `bb49968`, `ede0e55`

## Mục tiêu

Thiết lập monorepo, toàn bộ cấu trúc dự án, cấu hình build, Docker, và Prisma schema hoàn chỉnh.

## Deliverables

### Monorepo
- [x] `pnpm-workspace.yaml` — khai báo `apps/*` và `packages/*`
- [x] `turbo.json` — task pipeline: build, dev, lint, test
- [x] Root `package.json` — scripts: `dev`, `build`, `docker:*`
- [x] `.npmrc` — `shamefully-hoist=true` + prisma hoist patterns (bắt buộc cho pnpm + Prisma 7)

### Backend scaffold (`apps/backend/`)
- [x] NestJS 11 + TypeScript 5.8
- [x] `prisma/schema.prisma` — full schema: HrUser, Candidate, Job, QuestionSet, QuestionBankItem, Interview, InterviewQuestion, InterviewAnswer, InterviewReport, AuditLog
- [x] `prisma.config.ts` — Prisma 7 config (không có `url` trong schema, dùng `defineConfig`)
- [x] `prisma/seed.ts` — seed HR user, job, question set, candidates, interviews
- [x] `src/prisma/prisma.service.ts` — PrismaPg adapter
- [x] `src/app.module.ts` — module root với BullMQ forRoot
- [x] `src/auth/` — JWT auth: register, login, JwtStrategy, JwtAuthGuard
- [x] `src/main.ts` — bootstrap với ValidationPipe, Swagger
- [x] `.env` — env vars đầy đủ
- [x] `Dockerfile` — multi-stage build

### Frontend scaffold (`apps/frontend/`)
- [x] React 19 + Vite 8
- [x] TailwindCSS 4 (CSS-first, `@tailwindcss/vite`, không cần `tailwind.config.js`)
- [x] React Router 7 — routes cho HR và candidate
- [x] Zustand 5 — auth store với persist
- [x] `src/lib/api.ts` — Axios + JWT interceptor + auto-logout on 401
- [x] Tất cả HR pages: Dashboard, Jobs, Candidates, Interviews
- [x] Candidate interview page
- [x] `nginx.conf` — SPA fallback + `/api/` proxy + WebSocket proxy

### Infrastructure
- [x] `docker-compose.yml` — production stack (postgres, redis, backend, frontend)
- [x] `docker-compose.dev.yml` — dev infra (postgres, redis, minio)
- [x] Port mapping: postgres `5433:5432`, redis `6380:6379`, minio `9000:9000`

## Breaking changes đã xử lý

| Vấn đề | Nguyên nhân | Fix |
|--------|-------------|-----|
| `url` removed từ schema.prisma | Prisma 7 breaking change | Dùng `prisma.config.ts` với `defineConfig` |
| PrismaClient không export | pnpm không hoist | `.npmrc` với `shamefully-hoist=true` |
| Enum import lỗi | Prisma 7 đổi API | Dùng `$Enums.EnumName` thay vì named import |
| `migrate` not in PrismaConfig | Type removed | Xóa migrate block, chỉ dùng adapter ở runtime |
| dotenv undefined trong seed/config | Import order | `import 'dotenv/config'` ở đầu file |
| Docker port mapping sai | Typo `5433:5433` | Fix thành `5433:5432` |
| BullMQ config key đổi | `@nestjs/bull` → `@nestjs/bullmq` | `redis:{}` → `connection:{}` |
| Tailwind v4 breaking | Config file removed | Xóa `tailwind.config.js`, dùng `@theme {}` CSS |
