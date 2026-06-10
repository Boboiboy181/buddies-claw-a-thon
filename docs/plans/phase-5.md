# Phase 5 — Polish, Seed, E2E, README

**Status:** 🔲 Todo  
**Ước tính:** 0.5 ngày

## Mục tiêu

Hoàn thiện trải nghiệm demo, viết README, test end-to-end flow, fix issues cuối cùng.

## 1. Seed data nâng cao

### `prisma/seed.ts` additions

Bổ sung vào seed hiện có (hr@demo.com / demo1234 đã có):

```typescript
// Interview đã hoàn thành với report
const completedInterview = {
  status: 'REPORT_READY',
  state: 'REPORT_READY',
  startedAt: '2024-01-10T09:00:00Z',
  endedAt: '2024-01-10T09:35:00Z',
  answers: [/* mock transcripts */],
  report: {
    summary: '...',
    recommendation: { decision: 'yes', reason: '...' },
    // ... full mock report JSON
  }
};

// Interview đang pending
const pendingInterview = {
  status: 'INVITED',
  accessToken: 'demo-candidate-token',  // stable token cho demo
};

// Second job
const backendJob = {
  title: 'Senior Backend Engineer',
  department: 'Engineering',
  jdRawText: '...',
  status: 'ACTIVE',
};
```

**Demo accounts:**
| Account | Email | Password | Role |
|---------|-------|----------|------|
| HR | hr@demo.com | demo1234 | hr |
| Candidate | (dùng link) | N/A | — |

## 2. Backend — bổ sung nhỏ

### Swagger setup hoàn chỉnh (`src/main.ts`)
- [ ] `DocumentBuilder` với title, description, version
- [ ] Bearer auth scheme
- [ ] `SwaggerModule.setup('api/docs', app, document)`

### Validation pipes
- [ ] `ValidationPipe({ whitelist: true, transform: true })` global
- [ ] `ClassSerializerInterceptor` global (loại bỏ password khỏi response)
- [ ] Transform `@Exclude()` decorator trên `HrUser.password`

### Health check (`src/health/`)
- [ ] `GET /api/health` → `{ status: 'ok', timestamp, db: 'connected', redis: 'connected' }`
- [ ] Dùng `@nestjs/terminus`

### Rate limiting
- [ ] `@nestjs/throttler`: 100 req/min global
- [ ] Strict limit cho `/auth/login`: 5 req/min

### CORS
- [ ] Allow `FRONTEND_URL` env
- [ ] Allow credentials

## 3. Frontend — polish

### Error handling
- [ ] Global `ErrorBoundary` component
- [ ] `react-hot-toast` cho success/error notifications
- [ ] 401 auto-logout với toast "Phiên đăng nhập hết hạn"
- [ ] Network error retry với React Query `retry: 1`

### Loading states
- [ ] Skeleton loaders cho Dashboard, Interview list, Report
- [ ] "Generating questions..." loading screen (progress dots)
- [ ] "Generating report..." polling screen với estimated time

### Empty states
- [ ] Jobs list empty: "Chưa có vị trí tuyển dụng nào. Tạo mới?"
- [ ] Candidates empty: "Chưa có ứng viên nào"
- [ ] No question set: "Chưa có bộ câu hỏi. Generate ngay?"

### Mobile responsiveness
- [ ] Candidate interview page: full mobile support
- [ ] HR pages: tablet-friendly sidebar collapse

## 4. Docker final check

### `apps/backend/Dockerfile` review
```dockerfile
FROM node:22-alpine AS base
# pnpm install với --frozen-lockfile
# prisma generate
# nest build
# production image: chỉ dist/ + node_modules production
```

### `apps/frontend/Dockerfile` review  
```dockerfile
FROM node:22-alpine AS build
# vite build
FROM nginx:alpine
# copy dist/ → nginx
# copy nginx.conf
```

### Compose healthcheck
- [ ] Backend depends_on postgres + redis với `condition: service_healthy`
- [ ] Frontend depends_on backend

### Environment override
- [ ] `docker-compose.override.yml` cho local dev secret overrides
- [ ] `.env.example` cho tất cả required vars

## 5. End-to-end flow test

### Happy path (manual hoặc automated)

```
1. Login hr@demo.com / demo1234
2. View dashboard — xem stats
3. Jobs → New Job → nhập JD
4. JobDetail → Generate Questions (5 câu, vi, technical+behavioral)
5. Verify questions generated OK, activate set
6. Interviews → New Interview → chọn job + candidate email
7. Copy candidate link
8. Open link in incognito → consent → device check
9. Start interview → nghe AI đọc câu hỏi (TTS)
10. Trả lời → submit audio
11. Complete 5 câu → finish
12. HR: Interview detail → xem status REPORT_GENERATING → REPORT_READY
13. HR: View report → summary, Q&A analysis, recommendation
```

### Partial flow (khi thiếu API keys)
```
- TTS mock: nếu OPENAI_API_KEY trống → text-only mode (không play audio)
- Daily.co mock: nếu DAILY_API_KEY trống → dùng mock room URL
- Report mock: nếu OPENAI_API_KEY trống → return canned report
```

## 6. README.md (root)

Sections:
- [ ] Project overview + screenshot
- [ ] Architecture diagram (ASCII hoặc diagram link)
- [ ] Prerequisites (Node 22, pnpm, Docker)
- [ ] Quick start (5 commands)
- [ ] Environment variables table
- [ ] API documentation link (Swagger)
- [ ] Tech decisions
- [ ] Known limitations / future work

## 7. `.env.example` update

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/hr_interview

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380

# JWT
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d

# OpenAI (required for AI features)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Daily.co (optional, mock room used if empty)
DAILY_API_KEY=

# Storage (MinIO for local, S3 for production)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_BUCKET=hr-interview
AWS_REGION=us-east-1
AWS_S3_ENDPOINT=http://localhost:9000

# App
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Deliverables Checklist

- [ ] Seed: demo-ready data (1 completed interview với full report)
- [ ] Swagger docs accessible tại `/api/docs`
- [ ] Global validation pipe + serializer
- [ ] Health check endpoint
- [ ] Rate limiting trên auth routes
- [ ] Toast notifications cho tất cả user actions
- [ ] Skeleton loaders
- [ ] Empty state components
- [ ] Docker build cả 2 images thành công
- [ ] `pnpm docker:up` → full stack chạy không lỗi
- [ ] Happy path E2E test pass (manual checklist)
- [ ] README.md hoàn chỉnh
- [ ] `.env.example` update
