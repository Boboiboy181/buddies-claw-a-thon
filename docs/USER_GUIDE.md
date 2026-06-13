# User Guide — AI HR Interview Platform

This guide walks through the platform end to end: the HR workflow (create a job → generate
questions → invite a candidate → read the AI report) and the candidate experience.

> **Demo logins (from `pnpm prisma:seed`)**
> - **HR:** `hr@demo.com` / `demo1234`
> - **Candidate link:** `http://localhost:5173/interview/demo-candidate-token`
> - A **completed interview with a full AI report** is pre-seeded — open it from the
>   Interviews list to see the report viewer without running a live interview.

---

## Before you start

Make sure the stack is running (see [README](../README.md)):

```bash
docker compose -f docker-compose.dev.yml up -d        # Postgres, Redis, MinIO
cd apps/backend && pnpm prisma:migrate && pnpm prisma:seed && cd ../..
pnpm dev                                               # backend :3001, frontend :5173
```

Open **http://localhost:5173**. Health and API docs:
- API docs (Swagger): http://localhost:3001/api/docs
- Health: http://localhost:3001/health

---

## Part 1 — HR workflow

### 1. Log in

Go to `/login` and sign in with `hr@demo.com` / `demo1234`. You land on the **Dashboard**.

### 2. Dashboard

A read-only overview: total jobs, candidates, interviews, and reports ready, plus a pipeline
view (running / completed / reports generated) and recent activity. Use it to see at a glance
what's in flight and what's ready to review.

### 3. Create a job

1. **Jobs → New job**.
2. Paste the **job description** and fill in title, department, level, location.
3. Save. You'll land on the **Job detail** page.

The job description is the source material the AI uses to generate interview questions and to
judge how well a candidate fits the role.

### 4. Generate a question set

1. On the **Job detail** page, choose **Generate questions**.
2. Pick the count, language, and mix (e.g. technical + behavioral).
3. Review the generated questions. Each has a category, expected signals, and evaluation
   criteria.
4. **Activate** the set. Only an active set can be attached to an interview.

> Questions are **snapshotted** into an interview when it's created, so later edits to the
> question bank never change an interview that's already in progress.

### 5. Add a candidate

**Candidates → New candidate**. Enter name, email, phone, and optionally upload a CV (it gets
parsed into text the AI uses for CV-vs-answer matching).

### 6. Create an interview

1. **Interviews → New interview**.
2. Select the **job**, the **candidate**, and the active **question set**.
3. Create it. The interview starts in `CREATED`.
4. On the **Interview detail** page:
   - **Setup room** — provisions the video room (LiveKit, or Daily as fallback) and prewarms TTS.
   - **Send invite** — marks the interview `INVITED`.
   - **Copy the candidate link** (the `…/interview/<token>` URL) and send it to the candidate.

### 7. Monitor progress

The Interview detail page **auto-refreshes** while the interview is active. Status moves through:

```
CREATED → INVITED → IN_PROGRESS → COMPLETED
        → RECORDING_PROCESSING → TRANSCRIPT_PROCESSING
        → REPORT_GENERATING → REPORT_READY
```

When the candidate finishes, a report job is queued automatically.

### 8. Read the report

Once status is **`REPORT_READY`**, the Interview detail page shows the full report:

- **Summary** and **recommendation** (`strong_yes` / `yes` / `maybe` / `no`) with reasoning and
  suggested follow-up questions.
- **CV match analysis** — claims matched, missing/unclear, and inconsistencies to review.
- **JD fit analysis** — matching skills, gaps, and a role-fit summary.
- **Per-question Q&A** — transcript, strengths, concerns, evidence quotes, and a 1–10 score.
- **Rubric scores** and **audio review signals** (speaking pace, duration).
- **Print / Export PDF** to share the report.

> The AI is instructed to use only provided evidence — it won't infer protected attributes or
> make psychological/medical claims, and audio/video signals are labelled observational only.

---

## Part 2 — Candidate experience

The candidate opens the link you sent (`/interview/<token>`) — **no login required**.

1. **Consent** — they review and accept the recording/processing notice.
2. **Device check** — camera and microphone permissions and a quick test.
3. **Interview** — the AI agent greets them, then for each question:
   - The question is **read aloud** (text-to-speech) and shown on screen.
   - The candidate **records their spoken answer**.
   - The answer audio is submitted and transcribed (Whisper).
   - The agent moves to the next question.
4. **Finish** — after the last question the session completes and the candidate is done. The
   report is generated in the background; the candidate doesn't see it.

---

## Filtering & search (HR)

- **Jobs**: search by keyword and filter by status (Draft / Active / Archived).
- **Interviews**: filter by status (Created, Invited, In progress, Completed, Report ready, …).
- Empty lists show a helpful empty state with a shortcut to create the first item.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| "Phiên đăng nhập hết hạn" toast, kicked to login | JWT expired — just log in again. |
| `429 Too Many Requests` on login | Rate limit (5 attempts/min). Wait a minute. |
| Questions / report fail to generate | LLM env not set — check `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` in `apps/backend/.env`. |
| No audio on questions / no transcript | TTS/STT not configured — set `TTS_MODEL` / `STT_MODEL` / `STT_BASE_URL`, or the OpenAI fallback keys. |
| Recording never appears | LiveKit egress needs **publicly reachable** S3 — local MinIO won't work for recordings. |
| `/health` shows `db` or `redis` `down` | Infra not up — run `docker compose -f docker-compose.dev.yml up -d`. |

---

For architecture and module details, see [README](../README.md) and
[CLAUDE.md](../CLAUDE.md).
