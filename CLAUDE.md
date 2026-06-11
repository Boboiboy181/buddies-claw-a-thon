# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered HR interview platform. HR users create job postings, candidate profiles, and question sets. Candidates join via a public link, get interviewed by an AI agent (OpenAI TTS reads questions, Whisper transcribes answers), and receive a GPT-4o-generated evaluation report. Real-time state sync uses WebSockets; report generation is queued via BullMQ.

## Monorepo Structure

pnpm + Turborepo workspace with two apps:

- `apps/backend` — NestJS 11 REST + WebSocket API on `:3001`
- `apps/frontend` — React 19 + Vite SPA on `:5173` (dev), Nginx on `:80` (prod)

## Development Setup

```bash
# 1. Start local infrastructure (Postgres 16, Redis 7, MinIO)
docker compose -f docker-compose.dev.yml up -d

# 2. Configure backend env
cp apps/backend/.env.example apps/backend/.env
# Fill in OPENAI_API_KEY, DAILY_API_KEY, JWT_SECRET, etc.

# 3. Run DB migrations and seed demo data
cd apps/backend && pnpm prisma:migrate && pnpm prisma:seed
# Seed creates hr@demo.com / demo1234

# 4. Start all dev servers from repo root
pnpm dev
```

## Common Commands

Run from repo root unless noted:

| Command | What it does |
|---|---|
| `pnpm dev` | Start backend (:3001) + frontend (:5173) via Turborepo |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm docker:up/down/logs` | Manage Docker Compose stack |

Backend-only (`apps/backend/`):

| Command | What it does |
|---|---|
| `pnpm prisma:migrate` | Create + apply new migration |
| `pnpm prisma:deploy` | Apply migrations in production |
| `pnpm prisma:seed` | Seed demo HR user |
| `pnpm prisma:studio` | Open Prisma GUI |
| `pnpm prisma:generate` | Regenerate Prisma client after schema change |

> No tests exist yet (planned for Phase 5). The test commands in `package.json` are placeholders.

## Architecture

### Request Flow

```
Browser (React)
  ↕ REST /api/*  (proxied by Vite dev server → backend:3001)
  ↕ WS           (socket.io)
NestJS API (apps/backend/src/)
  ↕ Prisma ORM → PostgreSQL
  ↕ Redis ← BullMQ job queue (reports-queue)
  ↕ OpenAI API (GPT-4o, TTS-1, Whisper)
  ↕ Daily.co API (video rooms + recordings)
  ↕ S3 / MinIO (audio recordings, CV files)
```

### Backend Module Map (`apps/backend/src/`)

Each module under `modules/` owns one domain slice:

| Module | Responsibility |
|---|---|
| `auth` | JWT login/register, Passport strategy |
| `interviews` | Interview CRUD + state machine (8 states) |
| `gateway` | Socket.io hub — broadcasts all WS events |
| `queue` | BullMQ setup for `reports-queue` |
| `reports` | BullMQ processor — calls OpenAI to build report JSON |
| `daily` | Daily.co room creation, recording webhooks |
| `tts` / `stt` | OpenAI speech synthesis / Whisper transcription |
| `storage` | S3 presigned URL generation (upload/download) |
| `jobs` | Job postings + JD parsing |
| `candidates` | Candidate profiles + CV parsing |
| `question-sets` | Question bank CRUD |
| `dashboard` | Analytics queries |
| `audit` | Audit log writes |

Entry point: `src/main.ts` — enables CORS, validation pipe, Swagger at `/api/docs`, Socket.io adapter.

### Interview State Machine

Interview `state` field transitions (driven by WebSocket events and candidate actions):

```
INIT → CONSENT → READY → ASKING → LISTENING → PROCESSING → COMPLETED
                                                          ↘ FAILED
```

- `ASKING`: TTS plays question audio; frontend fires `agent_audio_ended` when done
- `LISTENING`: candidate records answer
- `PROCESSING`: answer submitted, waiting for Whisper transcription
- On all questions done → report job enqueued → `COMPLETED`

### Frontend Architecture (`apps/frontend/src/`)

- **Routing**: React Router 7 — protected HR routes (`/hr/*`) vs public candidate route (`/interview/:token`)
- **Server state**: React Query (`@tanstack/react-query`)
- **Client state**: Zustand — auth store only
- **API layer**: `lib/api.ts` — Axios instance with JWT interceptor; auto-redirects to `/login` on 401
- **Real-time**: `lib/socket.ts` — socket.io client, used in interview pages
- **Styling**: TailwindCSS 4 (CSS-first config) + shadcn components

### Data Model Summary

Key Prisma models and their relationships:

```
HrUser → Job → QuestionSet → QuestionBankItem
HrUser → Interview ← Candidate
Interview → InterviewQuestion (snapshot of QuestionBankItem at creation time)
Interview → InterviewAnswer (per question, stores audio URL + transcript)
Interview → InterviewReport (AI-generated JSON report)
```

The `InterviewQuestion` table is a denormalized snapshot — questions are copied from `QuestionBankItem` at interview creation so edits to the bank don't affect in-progress interviews.

### Production Docker

`docker-compose.yml` runs four services: `postgres`, `redis`, `backend` (NestJS), `frontend` (Nginx). The Nginx config (`apps/frontend/nginx.conf`) serves the React SPA with fallback to `index.html` and proxies `/api` to the backend container.

## Key Environment Variables

Set in `apps/backend/.env` (see `.env.example`):

- `DATABASE_URL` — Prisma connection string
- `REDIS_HOST` / `REDIS_PORT`
- `JWT_SECRET` / `JWT_EXPIRES_IN`
- `OPENAI_API_KEY`, `OPENAI_MODEL` (default: `gpt-4o`)
- `DAILY_API_KEY`, `DAILY_API_URL`
- `AWS_S3_BUCKET`, `AWS_S3_ENDPOINT` (set endpoint for MinIO in dev)
- `FRONTEND_URL` — used for CORS whitelist
