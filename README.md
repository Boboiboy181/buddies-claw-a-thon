# AI HR Interview Platform

An AI-powered interview platform. HR users create job postings, candidate profiles, and
question sets. Candidates join through a public link and are interviewed by an AI agent —
text-to-speech reads each question aloud, speech-to-text transcribes the answer — and
receive a GPT-generated evaluation report. Interview state syncs in real time over
WebSockets; report generation runs on a background queue.

| | |
|---|---|
| **HR app** | Dashboard, jobs, candidates, question sets, interviews, AI reports |
| **Candidate app** | Public link → consent → device check → AI interview → done |
| **AI** | LLM (GPT-4o / OpenAI-compatible MaaS) for question + report generation, TTS for questions, Whisper for transcription |
| **Video** | LiveKit Cloud (preferred) with Daily.co fallback |

---

## Architecture

```
        Browser (React 19 + Vite)
          |  REST /api/*  (Vite dev proxy → :3001)
          |  WebSocket    (socket.io)
          v
   NestJS 11 API  (apps/backend)  :3001
     |  Prisma ORM ───────────────► PostgreSQL 16
     |  BullMQ ────────────────────► Redis 7   (reports-queue)
     |  OpenAI-compatible LLM ─────► GPT-4o / TTS / Whisper
     |  LiveKit / Daily.co ────────► video rooms + recordings
     |  S3 / MinIO ────────────────► audio recordings, CV files
     v
   Reports worker → builds InterviewReport JSON
```

Interview state machine:

```
INIT → CONSENT → READY → ASKING → LISTENING → PROCESSING → COMPLETED
                                                         ↘ FAILED
```

See [CLAUDE.md](./CLAUDE.md) for the full module map and data model.

---

## Prerequisites

- **Node.js 22**
- **pnpm** (`corepack enable`)
- **Docker** + Docker Compose (Postgres, Redis, MinIO)

---

## Quick start (local dev)

```bash
# 1. Start infra only (Postgres :5433, Redis :6380, MinIO :9000/:9001)
docker compose -f docker-compose.dev.yml up -d

# 2. Configure backend env
cp apps/backend/.env.example apps/backend/.env   # fill in LLM_API_KEY etc.

# 3. Migrate + seed demo data
cd apps/backend && pnpm prisma:migrate && pnpm prisma:seed && cd ../..

# 4. Run backend (:3001) + frontend (:5173)
pnpm dev
```

Then open **http://localhost:5173**.

### Demo accounts (from seed)

| Role | How to access |
|------|----------------|
| **HR** | Log in with `hr@demo.com` / `demo1234` |
| **Candidate** | Open `http://localhost:5173/interview/demo-candidate-token` |

The seed also creates one **completed interview with a full AI report** (open it from
the Interviews list) so the report viewer is populated without running a live interview.

### Run the whole stack in Docker

```bash
docker compose up --build        # API + SPA + Postgres + Redis + MinIO (via override)
```

`docker-compose.override.yml` adds MinIO and local defaults automatically. For a
production-style run without those local conveniences, use
`docker compose -f docker-compose.yml up -d`.

---

## Common commands

Run from the repo root unless noted.

| Command | What it does |
|---|---|
| `pnpm dev` | Start backend + frontend via Turborepo |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |
| `pnpm docker:up` / `docker:down` / `docker:logs` | Manage the **full** Docker stack (API + SPA + infra). For infra-only, use `docker compose -f docker-compose.dev.yml up -d` |

Backend-only (`apps/backend/`):

| Command | What it does |
|---|---|
| `pnpm prisma:migrate` | Create + apply a new migration |
| `pnpm prisma:deploy` | Apply migrations in production |
| `pnpm prisma:seed` | Seed demo data (HR user, jobs, completed + pending interviews) |
| `pnpm prisma:studio` | Open the Prisma GUI |

---

## API documentation

- **Swagger UI:** http://localhost:3001/api/docs
- **Health check:** http://localhost:3001/api/health → reports `db` + `redis` status

REST is served under `/api`; the WebSocket hub uses socket.io.

---

## Environment variables

Full list in [`apps/backend/.env.example`](./apps/backend/.env.example). Key ones:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string |
| `REDIS_HOST` / `REDIS_PORT` | ✅ | Redis for BullMQ |
| `JWT_SECRET` / `JWT_EXPIRES_IN` | ✅ | Auth token signing |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | ✅ | OpenAI-compatible LLM (question + report generation) |
| `TTS_MODEL` / `STT_MODEL` / `STT_BASE_URL` / `TTS_VOICE` | ◻︎ | Speech synthesis / transcription; falls back to direct OpenAI |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | ◻︎ | Legacy direct OpenAI fallback |
| `AWS_S3_BUCKET` / `AWS_S3_ENDPOINT` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | ✅ | Object storage (set endpoint to MinIO in dev) |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | ◻︎ | Preferred video provider |
| `DAILY_API_KEY` / `DAILY_API_URL` | ◻︎ | Video fallback |
| `FRONTEND_URL` | ✅ | CORS allowlist origin |
| `PORT` | ◻︎ | Backend port (default 3001) |

---

## Tech decisions

- **Turborepo + pnpm workspaces** — single repo for backend and frontend with shared tooling.
- **NestJS modules** — one module per domain slice (auth, interviews, reports, …); see CLAUDE.md.
- **Prisma + `@prisma/adapter-pg`** — typed data access over PostgreSQL.
- **BullMQ on Redis** — report generation is slow and best-effort, so it runs off the request path.
- **Denormalized question snapshots** — questions are copied into `InterviewQuestion` at interview
  creation so later edits to the question bank never alter an in-progress interview.
- **OpenAI-compatible MaaS gateway** — LLM/TTS/STT go through a configurable base URL, with a
  direct-OpenAI fallback, so the platform isn't locked to one provider.
- **React Query + Zustand** — server cache vs. a small client auth store, kept separate.

## Operational hardening

- **Rate limiting** (`@nestjs/throttler`): 100 req/min globally, 5 req/min on `/api/auth/login`.
- **Health checks** (`@nestjs/terminus`): `/api/health` pings Postgres and Redis.
- **Validation + serialization**: global `ValidationPipe` (whitelist + transform) and
  `ClassSerializerInterceptor`.

---

## Known limitations / future work

- **No automated test suite yet.** The end-to-end flow is verified manually (see
  `docs/plans/phase-5.md`). Unit/integration tests are planned.
- **Recordings need publicly reachable storage.** LiveKit egress can't write to local MinIO;
  use real S3 for recording.
- **TTS/STT depend on provider availability** and are rate-limited by the MaaS gateway.
- **Single-tenant** — no organization/multi-workspace separation.

---

See [`docs/plans/`](./docs/plans/) for the phased build history.
