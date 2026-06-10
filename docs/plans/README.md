# HR AI Interview Platform — Project Plan

## Tổng quan

Platform phỏng vấn tự động dùng AI: HR tạo session, upload JD + CV + bộ câu hỏi, ứng viên vào link, AI interviewer đọc câu hỏi qua TTS, ghi nhận câu trả lời, sinh báo cáo tự động.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | NestJS 11, TypeScript 5.8 |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Queue | BullMQ + Redis |
| Frontend | React 19 + Vite 8 |
| Styling | TailwindCSS 4 (CSS-first) |
| Routing | React Router 7 |
| State | Zustand 5 + React Query 5 |
| Database | PostgreSQL 16 |
| Storage | S3 / MinIO |
| Video | Daily.co |
| AI | OpenAI (GPT-4o, TTS, Whisper) |
| Deploy | Docker + docker-compose |

## Roadmap

| Phase | Tên | Status | File |
|-------|-----|--------|------|
| 1 | Monorepo Foundation + Scaffold | ✅ Done | [phase-1.md](./phase-1.md) |
| 2 | Backend Core Modules | ✅ Done | [phase-2.md](./phase-2.md) |
| 3 | Interview Orchestrator + State Machine | 🔲 Todo | [phase-3.md](./phase-3.md) |
| 4 | Frontend Integration + Real APIs | 🔲 Todo | [phase-4.md](./phase-4.md) |
| 5 | Polish, Seed, E2E, README | 🔲 Todo | [phase-5.md](./phase-5.md) |

## Quick Start

```bash
# Infra
pnpm docker:dev:up

# Migrate + Seed
cd apps/backend
pnpm prisma:migrate
pnpm prisma:seed

# Dev servers
pnpm dev
```

## API Base URL
- Backend: http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs
- Frontend: http://localhost:5173
- MinIO Console: http://localhost:9001
