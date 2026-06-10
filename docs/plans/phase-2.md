# Phase 2 — Backend Core Modules

**Status:** ✅ Done  
**Commit:** `5874fe8`

## Mục tiêu

Implement toàn bộ NestJS modules: CRUD, AI integration, WebSocket, queue workers.

## Deliverables

### JobsModule (`src/jobs/`)
- [x] `POST /jobs` — tạo job (DRAFT status, gán createdBy)
- [x] `GET /jobs` — list với filter: status, keyword, department, level
- [x] `GET /jobs/:id` — chi tiết + question sets + interview count
- [x] `PATCH /jobs/:id` — update fields + đổi status
- [x] `DELETE /jobs/:id` — archive (soft delete, set ARCHIVED)
- [x] Include `_count.questionSets`, `_count.interviews` trong list response

### CandidatesModule (`src/candidates/`)
- [x] `POST /candidates` — upsert by email (nếu đã tồn tại → trả về existing)
- [x] `GET /candidates` — list tất cả
- [x] `GET /candidates/:id` — chi tiết + toàn bộ interview history
- [x] `PATCH /candidates/:id` — update profile

### QuestionSetsModule (`src/question-sets/`)
- [x] `POST /jobs/:jobId/question-sets/generate` — AI generation từ JD
  - Gọi GPT-4o với `response_format: json_object`
  - Trả về roleSummary, extractedSkills, suggestedRubric, questions
  - Auto-archive previous active set, tạo version mới
  - MD5 hash JD để detect thay đổi
  - Update job.rubricJson + job.jdParsedJson
- [x] `GET /jobs/:jobId/question-sets` — list theo job
- [x] `GET /question-sets/:id` — chi tiết + questions
- [x] `POST /question-sets/:id/questions` — thêm câu hỏi thủ công
- [x] `PATCH /question-sets/:id/questions/:qId` — sửa câu hỏi
- [x] `DELETE /question-sets/:id/questions/:qId` — xóa câu hỏi
- [x] `PATCH /question-sets/:id/reorder` — đặt lại order
- [x] `POST /question-sets/:id/activate` — set ACTIVE, archive others

### InterviewsModule (`src/interviews/`)
- [x] `POST /interviews` — tạo interview session
  - Resolve/create candidate (by email)
  - Auto-find active question set nếu không truyền questionSetId
  - Snapshot questions vào InterviewQuestion records
  - Generate unique `accessToken` (UUID)
  - Trả về `candidateLink: /interview/:accessToken`
- [x] `GET /interviews` — list với filter: candidateId, jobId, status
- [x] `GET /interviews/:id` — full detail + questions + answers + report
- [x] `GET /interviews/:id/report` — lấy báo cáo
- [x] `GET /interviews/:id/recording` — signed recording URL + audit log
- [x] `GET /candidate/interviews/:token` — public endpoint cho candidate
- [x] `POST /candidate/interviews/:id/consent` — accept consent
- [x] `POST /candidate/interviews/:id/start` — bắt đầu phỏng vấn
- [x] `POST /candidate/interviews/:id/answers` — submit answer (upsert)
- [x] `POST /candidate/interviews/:id/finish` — kết thúc + enqueue report

### DashboardModule (`src/dashboard/`)
- [x] `GET /hr/dashboard/summary` — 9 parallel queries:
  - totalJobs (non-archived)
  - totalCandidates
  - totalInterviews
  - pendingInterviews (CREATED + INVITED + IN_PROGRESS)
  - completedInterviews
  - processingReports (3 processing states)
  - readyReports (REPORT_READY)
  - recentInterviews (top 5 với candidate + job)
  - recentCandidates (top 5)

### StorageModule (`src/storage/`)
- [x] `uploadBuffer(buffer, key, contentType)` → S3/MinIO
- [x] `getSignedDownloadUrl(key, expiresIn?)` → pre-signed URL
- [x] `delete(key)`
- [x] `generateKey(folder, filename)` → `folder/uuid-filename`
- [x] Support custom endpoint (MinIO via `forcePathStyle: true`)

### TtsModule (`src/tts/`)
- [x] `synthesize(text, voice?)` → `Buffer` (MP3)
- [x] Dùng OpenAI TTS model `tts-1`, voice: nova (default)
- [x] Format: MP3

### SttModule (`src/stt/`)
- [x] `transcribe(audioBuffer, filename?, language?)` → `string`
- [x] Dùng OpenAI Whisper `whisper-1`
- [x] Default language: `vi` (tiếng Việt)

### DailyModule (`src/daily/`)
- [x] `createRoom(interviewId)` → DailyRoom (mock khi không có API key)
- [x] `deleteRoom(roomName)`
- [x] `getMeetingToken(roomName, userId, isOwner?)`
- [x] `startRecording(roomName)` / `stopRecording(roomName)`
- [x] `POST /webhooks/daily` — xử lý `recording.ready-to-download`
  - Update interview.recordingUrl + recordingId
  - Set status → REPORT_GENERATING

### QueueModule (`src/queue/`)
- [x] Register 3 queues: `report-generation`, `transcription`, `tts`
- [x] Exports `BullModule` để các module khác inject

### ReportsModule (`src/reports/`)
- [x] `generateReport(interviewId)` — full AI analysis:
  - Fetch interview + candidate + job + Q&A
  - Gọi GPT-4o với structured JSON prompt
  - Upsert InterviewReport với tất cả analysis fields
  - Set status → REPORT_READY (hoặc FAILED)
- [x] `ReportGenerationProcessor` — BullMQ worker xử lý `generate-report` jobs
- [x] Retry: 3 attempts, exponential backoff 5s

### GatewayModule (`src/gateway/`)
- [x] Socket.io WebSocket gateway, namespace `/`
- [x] Room isolation: `interview:<interviewId>`
- [x] Inbound events: `join_interview`, `candidate_joined`, `agent_audio_ended`, `answer_submitted`, `interview_finished`
- [x] Backend emit helpers:
  - `emitStateChange(interviewId, state, extra?)`
  - `emitAgentSpeak(interviewId, payload)` — push audio URL + text
  - `emitStartListening(interviewId, questionId)`
  - `emitInterviewCompleted(interviewId)`
  - `emitError(interviewId, message)`

## AI Prompt Design

### Question Generation
- System: chỉ dùng JD, không hỏi protected attributes (tuổi, giới tính, hôn nhân, tôn giáo...)
- Output: JSON với `roleSummary`, `extractedSkills`, `suggestedRubric`, `questions[]`
- Temperature: 0.7

### Report Generation
- System: phân tích dựa trên bằng chứng có sẵn, không suy đoán psychological traits
- Output: JSON với `questionAnalyses`, `cvMatchAnalysis`, `jdFitAnalysis`, `audioReviewSignals`, `videoReviewSignals`, `rubricScores`, `recommendation`
- Temperature: 0.3 (deterministic hơn)
