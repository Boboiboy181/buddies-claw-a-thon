# Phase 4 — Frontend Integration + Real APIs

**Status:** ✅ Done (2026-06-12)  
**Ước tính:** 1.5 ngày

> **Ghi chú triển khai (khác plan):**
> - Không tách bộ hooks `src/hooks/` — các trang dùng React Query inline trực tiếp, tương đương về chức năng.
> - Report viewer nằm trong `InterviewDetail.tsx` (không có trang `InterviewReport.tsx` riêng), đủ các section: Summary, Recommendation, CV Match, JD Fit, Q&A Analysis, Rubric Scores, Print/Export PDF.
> - Candidate join Daily room qua endpoint public mới `POST /orchestrator/interviews/:id/join-room` (trả roomUrl + candidateToken); fallback camera preview local khi Daily chưa cấu hình. Cloud recording bật tự động lúc `start-greeting`.
> - Ghi âm câu trả lời bằng WAV 16kHz (Web Audio API) thay vì MediaRecorder/webm vì endpoint STT (VNG MaaS whisper) chỉ nhận RIFF/WAV.
> - Dùng `@daily-co/daily-js` (đã có sẵn) thay vì `@daily-co/react-library`.

## Mục tiêu

Kết nối toàn bộ frontend React với backend APIs. Thay thế mock data bằng React Query + Axios. Implement candidate interview room với Daily.co + WebSocket.

## API Hooks cần tạo (`src/hooks/`)

### Auth
```typescript
// src/hooks/useAuth.ts — wrap Zustand auth store
useLogin()     → POST /auth/login
useRegister()  → POST /auth/register
useLogout()    → clear store + redirect
```

### Jobs
```typescript
// src/hooks/useJobs.ts
useJobs(filters?)          → GET /jobs
useJob(id)                 → GET /jobs/:id
useCreateJob()             → POST /jobs
useUpdateJob(id)           → PATCH /jobs/:id
useArchiveJob(id)          → DELETE /jobs/:id
```

### Question Sets
```typescript
// src/hooks/useQuestionSets.ts
useJobQuestionSets(jobId)            → GET /jobs/:jobId/question-sets
useQuestionSet(id)                   → GET /question-sets/:id
useGenerateQuestions(jobId)          → POST /jobs/:jobId/question-sets/generate
useAddQuestion(qsId)                 → POST /question-sets/:id/questions
useUpdateQuestion(qsId, qId)         → PATCH /question-sets/:id/questions/:qId
useDeleteQuestion(qsId, qId)         → DELETE /question-sets/:id/questions/:qId
useReorderQuestions(qsId)            → PATCH /question-sets/:id/reorder
useActivateQuestionSet(id)           → POST /question-sets/:id/activate
```

### Interviews
```typescript
// src/hooks/useInterviews.ts
useInterviews(filters?)       → GET /interviews
useInterview(id)              → GET /interviews/:id
useCreateInterview()          → POST /interviews
useInterviewReport(id)        → GET /interviews/:id/report
useInterviewRecording(id)     → GET /interviews/:id/recording
```

### Candidates
```typescript
// src/hooks/useCandidates.ts
useCandidates()        → GET /candidates
useCandidate(id)       → GET /candidates/:id
useCreateCandidate()   → POST /candidates
useUpdateCandidate(id) → PATCH /candidates/:id
```

### Dashboard
```typescript
// src/hooks/useDashboard.ts
useDashboardSummary()  → GET /hr/dashboard/summary
```

### Candidate (public)
```typescript
// src/hooks/useCandidateInterview.ts
useInterviewByToken(token)          → GET /candidate/interviews/:token
useAcceptConsent(id)                → POST /candidate/interviews/:id/consent
useStartInterview(id)               → POST /candidate/interviews/:id/start
useSubmitAnswer(id)                 → POST /candidate/interviews/:id/answers
useFinishInterview(id)              → POST /candidate/interviews/:id/finish
useProcessAnswer(id)                → POST /orchestrator/interviews/:id/process-answer
```

## Pages cần cập nhật

### HR Pages

#### `pages/hr/Dashboard.tsx`
- [ ] Fetch `useDashboardSummary()`
- [ ] Cards: Total Jobs, Candidates, Interviews, Reports Ready
- [ ] Recent interviews table với status badge
- [ ] Quick actions: New Job, New Interview

#### `pages/hr/JobsList.tsx`
- [ ] Fetch `useJobs(filters)` với filter bar (status, keyword)
- [ ] Table với columns: Title, Department, Level, Questions, Interviews, Status, Actions
- [ ] "Archive" confirm dialog

#### `pages/hr/JobDetail.tsx`
- [ ] Fetch `useJob(id)` + `useJobQuestionSets(id)`
- [ ] Tab: Overview | Question Sets | Interviews
- [ ] Overview: JD text, requirements, rubric JSON display

#### `pages/hr/JobQuestions.tsx`
- [ ] Active question set display
- [ ] "Generate Questions" form: questionCount, categories (multi-select), language, difficulty
- [ ] Loading state khi đang generate (có thể mất 5-10s)
- [ ] Drag-and-drop reorder (dùng `@dnd-kit/core`)
- [ ] Edit inline / delete từng câu hỏi
- [ ] Activate button để set active set

#### `pages/hr/InterviewNew.tsx`
- [ ] Form: chọn Job, chọn/tạo Candidate (email lookup)
- [ ] Preview: câu hỏi sẽ được dùng (active set)
- [ ] Submit → tạo interview → copy candidateLink

#### `pages/hr/InterviewDetail.tsx`
- [ ] Fetch `useInterview(id)` với polling nếu status đang processing
- [ ] Status timeline (stepper)
- [ ] Tabs: Overview | Answers | Report
- [ ] "Setup Room" button → `POST /orchestrator/.../setup-room`
- [ ] "View Recording" button (nếu có recordingUrl)

#### `pages/hr/InterviewReport.tsx` (mới)
- [ ] Fetch `useInterviewReport(id)`
- [ ] Summary card
- [ ] Q&A Analysis accordion (mỗi câu hỏi: transcript, strengths, concerns, score)
- [ ] CV Match Analysis
- [ ] JD Fit Analysis
- [ ] Rubric Scores table
- [ ] Recommendation badge (strong_yes / yes / maybe / no)
- [ ] Print/Export PDF button

### Candidate Pages

#### `pages/candidate/CandidateInterview.tsx` (refactor hoàn toàn)
Đây là trang phức tạp nhất. Cần:

**Bước 1 — Consent screen**
- [ ] Hiển thị tên job, công ty
- [ ] Giải thích: phỏng vấn AI, ghi âm, thời gian
- [ ] Checkbox consent + nút "Bắt đầu"

**Bước 2 — Device check**
- [ ] Camera preview (getUserMedia)
- [ ] Mic level indicator
- [ ] Nút "Sẵn sàng"

**Bước 3 — Interview room**
- [ ] Daily.co `<DailyProvider>` + `<DailyVideo>` (self camera preview)
- [ ] AI Agent panel (avatar + text transcript)
- [ ] Audio player: tự play khi nhận `agent_speak` event từ WebSocket
- [ ] Recording indicator khi `start_listening` event nhận được
- [ ] Progress: "Câu 2/5"
- [ ] Submit answer: record audio → POST `/orchestrator/.../process-answer`

**Bước 4 — Done screen**
- [ ] "Phỏng vấn hoàn tất" message
- [ ] Estimated report time

## WebSocket Client (`src/lib/socket.ts`)

```typescript
import { io, Socket } from 'socket.io-client';

export const createInterviewSocket = (interviewId: string) => {
  const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001');
  socket.emit('join_interview', { interviewId });
  return socket;
};
```

Hook `useInterviewSocket(interviewId)`:
- Connect khi mount, disconnect khi unmount
- Listen: `interview_state_changed`, `agent_speak`, `start_listening`, `interview_completed`, `error`
- Expose: `emit('agent_audio_ended', ...)`, `emit('answer_submitted', ...)`

## Daily.co Integration

```typescript
// src/components/interview/DailyRoom.tsx
import { DailyProvider, useDaily } from '@daily-co/react-library';

// Self-view camera
// Auto-join khi candidateToken available
// Record candidate video
```

Package cần thêm vào `apps/frontend/package.json`:
```json
"@daily-co/react-library": "^0.50.0",
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^8.0.0"
```

## Audio Recording

```typescript
// src/lib/audioRecorder.ts
class AudioRecorder {
  start(): void                        // MediaRecorder start
  stop(): Promise<Blob>               // stop + return blob
  getLevel(): number                  // volume level 0-1 for UI
}
```

## Environment Variables (frontend `.env`)

```bash
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
VITE_DAILY_ROOM_URL_BASE=https://your-domain.daily.co
```

## Component Library cần tạo (`src/components/`)

```
components/
  interview/
    ConsentScreen.tsx        — consent + job info
    DeviceCheck.tsx          — camera/mic test
    AgentPanel.tsx           — AI avatar + speaking text
    AudioPlayer.tsx          — auto-play agent audio
    AudioRecorder.tsx        — record candidate answer
    ProgressBar.tsx          — question x/y
    InterviewRoom.tsx        — main room container
  report/
    ReportHeader.tsx         — recommendation badge + summary
    QuestionAnalysis.tsx     — accordion với scores
    CvMatchSection.tsx
    JdFitSection.tsx
    RubricTable.tsx
  shared/
    StatusBadge.tsx          — color-coded interview status
    ConfirmDialog.tsx
    LoadingSpinner.tsx
    EmptyState.tsx
```

## Deliverables Checklist

- [ ] Tất cả React Query hooks với proper cache keys + invalidation
- [ ] HR Dashboard với real data
- [ ] Job CRUD flow (create → add questions → activate set)
- [ ] AI question generation UI với loading state
- [ ] Interview create + copy candidate link
- [ ] Interview detail với status polling
- [ ] Report viewer với tất cả sections
- [ ] Candidate consent screen
- [ ] Candidate device check (camera/mic)
- [ ] Candidate interview room (Daily.co + WebSocket + audio)
- [ ] Audio recording + submit answer
- [ ] WebSocket state sync (state changes → UI updates)
- [ ] Error boundaries + toast notifications
- [ ] Responsive design (mobile cho candidate, desktop cho HR)
