-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionSetStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('SCREENING', 'MOTIVATION', 'EXPERIENCE', 'BEHAVIORAL', 'TECHNICAL', 'CULTURE_FIT', 'SALARY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('CREATED', 'INVITED', 'CONSENT_ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'RECORDING_PROCESSING', 'TRANSCRIPT_PROCESSING', 'REPORT_GENERATING', 'REPORT_READY', 'FAILED');

-- CreateEnum
CREATE TYPE "InterviewState" AS ENUM ('INIT', 'CONSENT_PENDING', 'READY_CHECK', 'AGENT_GREETING', 'ASKING_QUESTION', 'LISTENING_ANSWER', 'PROCESSING_ANSWER', 'AGENT_RESPONSE', 'NEXT_QUESTION', 'COMPLETED', 'REPORT_GENERATING', 'REPORT_READY', 'FAILED');

-- CreateTable
CREATE TABLE "hr_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'hr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "cvFileUrl" TEXT,
    "cvParsedText" TEXT,
    "cvParsedJson" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "level" TEXT,
    "location" TEXT,
    "employmentType" TEXT,
    "jdRawText" TEXT NOT NULL,
    "jdParsedJson" JSONB,
    "requirements" TEXT[],
    "rubricJson" JSONB,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_sets" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "QuestionSetStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedFromJdHash" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank_items" (
    "id" TEXT NOT NULL,
    "questionSetId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "category" "QuestionCategory" NOT NULL DEFAULT 'CUSTOM',
    "expectedSignals" TEXT[],
    "evaluationCriteria" TEXT[],
    "maxDurationSeconds" INTEGER NOT NULL DEFAULT 120,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "followUpStrategy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "questionSetId" TEXT,
    "questionSetSnapshotJson" JSONB,
    "status" "InterviewStatus" NOT NULL DEFAULT 'CREATED',
    "state" "InterviewState" NOT NULL DEFAULT 'INIT',
    "accessToken" TEXT NOT NULL,
    "dailyRoomName" TEXT,
    "dailyRoomUrl" TEXT,
    "recordingId" TEXT,
    "recordingUrl" TEXT,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "consentAcceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_questions" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "sourceQuestionBankItemId" TEXT,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "expectedSignals" TEXT[],
    "evaluationCriteria" TEXT[],
    "maxDurationSeconds" INTEGER NOT NULL DEFAULT 120,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "ttsAudioUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_answers" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerAudioUrl" TEXT,
    "answerVideoUrl" TEXT,
    "transcript" TEXT,
    "durationSeconds" INTEGER,
    "analysisJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_reports" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "summary" TEXT,
    "qaAnalysisJson" JSONB,
    "cvMatchAnalysisJson" JSONB,
    "jdFitAnalysisJson" JSONB,
    "audioReviewSignalsJson" JSONB,
    "videoReviewSignalsJson" JSONB,
    "rubricScoresJson" JSONB,
    "recommendation" JSONB,
    "riskFlagsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT,
    "interviewId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_users_email_key" ON "hr_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE UNIQUE INDEX "interviews_accessToken_key" ON "interviews"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "interview_answers_questionId_key" ON "interview_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "interview_reports_interviewId_key" ON "interview_reports"("interviewId");

-- AddForeignKey
ALTER TABLE "question_sets" ADD CONSTRAINT "question_sets_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "question_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "question_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "hr_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_answers" ADD CONSTRAINT "interview_answers_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_answers" ADD CONSTRAINT "interview_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "interview_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_reports" ADD CONSTRAINT "interview_reports_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
