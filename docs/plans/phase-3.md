# Phase 3 — Interview Orchestrator + State Machine

**Status:** ✅ Done  
**Ước tính:** 1 ngày

## Mục tiêu

Implement `InterviewOrchestratorService` — dịch vụ điều phối toàn bộ luồng phỏng vấn real-time:  
TTS → WebSocket push audio → candidate trả lời → STT → next question → kết thúc.

## State Machine

```
INIT
 └─► CONSENT_PENDING     (gửi link, candidate mở trang)
      └─► READY_CHECK    (consent accepted, check camera/mic)
           └─► AGENT_GREETING   (TTS: lời chào)
                └─► ASKING_QUESTION   (TTS đọc câu hỏi, emit agent_speak)
                     └─► LISTENING_ANSWER  (emit start_listening, timer start)
                          └─► PROCESSING_ANSWER  (STT transcribe)
                               └─► AGENT_RESPONSE  (TTS: optional follow-up hoặc ack)
                                    └─► NEXT_QUESTION  ──► ASKING_QUESTION (nếu còn câu)
                                         └─► COMPLETED  (hết câu hỏi)
                                              └─► REPORT_GENERATING  (BullMQ enqueue)
                                                   └─► REPORT_READY
FAILED  (any unrecoverable error)
```

## Files cần tạo

### `src/orchestrator/orchestrator.service.ts`
Service trung tâm điều phối interview session.

```typescript
// Inject: PrismaService, TtsService, SttService, StorageService, DailyService, InterviewGateway, ReportsService, Queue

class InterviewOrchestratorService {
  // Giai đoạn 1: Setup
  async setupRoom(interviewId: string): Promise<{ roomUrl: string; hostToken: string; candidateToken: string }>
  // - createRoom qua DailyService
  // - lưu dailyRoomName + dailyRoomUrl vào Interview
  // - generate host token + candidate token

  // Giai đoạn 2: Invite
  async sendInvite(interviewId: string): Promise<void>
  // - set status INVITED
  // - trả về candidateLink

  // Giai đoạn 3: Consent accepted → greeting
  async onConsentAccepted(interviewId: string): Promise<void>
  // - set state READY_CHECK
  // - emit state_changed via Gateway

  // Giai đoạn 4: Start → greeting
  async startGreeting(interviewId: string): Promise<void>
  // - set state AGENT_GREETING
  // - synthesize greeting text qua TTS
  // - upload MP3 lên Storage
  // - emit agent_speak { type: 'greeting', audioUrl, text }

  // Giai đoạn 5: Ask question
  async askQuestion(interviewId: string, questionIndex: number): Promise<void>
  // - set state ASKING_QUESTION
  // - load question từ InterviewQuestion (theo index)
  // - check cache: nếu question.ttsAudioUrl đã có → reuse
  // - nếu chưa: synthesize → upload → save ttsAudioUrl
  // - emit agent_speak { type: 'question', audioUrl, text, questionId }

  // Giai đoạn 6: Start listening
  async startListening(interviewId: string, questionId: string): Promise<void>
  // - set state LISTENING_ANSWER
  // - emit start_listening { questionId, maxDurationSeconds }

  // Giai đoạn 7: Process answer audio
  async processAnswer(interviewId: string, questionId: string, audioBuffer: Buffer): Promise<string>
  // - set state PROCESSING_ANSWER
  // - upload audio lên Storage
  // - STT transcribe → lấy transcript
  // - upsert InterviewAnswer (answerAudioUrl, transcript, durationSeconds)
  // - trả về transcript

  // Giai đoạn 8: Next step
  async advanceInterview(interviewId: string): Promise<void>
  // - load currentQuestionIndex
  // - nếu còn câu: increment index → askQuestion
  // - nếu hết: finishInterview

  // Giai đoạn 9: Finish
  async finishInterview(interviewId: string): Promise<void>
  // - set state COMPLETED, status COMPLETED
  // - stopRecording qua DailyService
  // - emit interview_completed
  // - enqueue report generation

  // Pre-generate TTS cho toàn bộ questions (background)
  async prewarmTts(interviewId: string): Promise<void>
  // - load tất cả InterviewQuestions chưa có ttsAudioUrl
  // - synthesize + upload song song (Promise.all)
}
```

### `src/orchestrator/orchestrator.controller.ts`
```
POST /orchestrator/interviews/:id/setup-room   → setupRoom
POST /orchestrator/interviews/:id/invite        → sendInvite
POST /orchestrator/interviews/:id/start-greeting → startGreeting
POST /orchestrator/interviews/:id/next-question  → askQuestion
POST /orchestrator/interviews/:id/start-listening → startListening
POST /orchestrator/interviews/:id/process-answer  → processAnswer (multipart audio)
POST /orchestrator/interviews/:id/advance        → advanceInterview
POST /orchestrator/interviews/:id/finish         → finishInterview
POST /orchestrator/interviews/:id/prewarm-tts    → prewarmTts (background)
```

### `src/orchestrator/orchestrator.module.ts`
Imports: TtsModule, SttModule, StorageModule, DailyModule, ReportsModule, GatewayModule, BullModule (report-generation queue).

## TTS Audio URL Strategy

```
Storage key format: interviews/{interviewId}/tts/{questionId}.mp3
```

- Khi `askQuestion` được gọi: check `question.ttsAudioUrl` trong DB
- Nếu đã có → dùng luôn (reuse từ lần invite trước hoặc prewarm)
- Nếu chưa có → synthesize → upload → cập nhật DB → emit URL
- `prewarmTts` chạy ngay sau `setupRoom` để câu hỏi đầu tiên không bị delay

## WebSocket Flow

```
Backend                              Frontend (Candidate)
   │                                       │
   │──── emit: agent_speak (greeting) ────►│
   │                                       │  play audio
   │◄─── event: agent_audio_ended ─────────│
   │                                       │
   │──── emit: agent_speak (question 1) ──►│
   │                                       │  play audio
   │◄─── event: agent_audio_ended ─────────│
   │                                       │
   │──── emit: start_listening ───────────►│
   │                                       │  record audio
   │◄─── POST /process-answer (audio) ─────│
   │     STT → transcript saved            │
   │──── emit: agent_speak (question 2) ──►│
   │         ...                           │
   │──── emit: interview_completed ───────►│
   │                                       │  show "done" screen
```

## Deliverables Checklist

- [x] `src/orchestrator/orchestrator.service.ts`
- [x] `src/orchestrator/orchestrator.controller.ts`
- [x] `src/orchestrator/orchestrator.module.ts`
- [x] Import OrchestratorModule trong `app.module.ts`
- [x] TTS prewarm chạy sau setup-room
- [x] Audio upload key convention documented
- [x] State transitions update DB + emit Gateway
- [x] Error handling: set state FAILED + emit error event
- [x] Greeting text có thể config qua env (VN/EN) — `AGENT_GREETING_TEXT`, `AGENT_LANGUAGE`
- [x] `POST /orchestrator/interviews/:id/process-answer` nhận multipart/form-data với field `audio`
