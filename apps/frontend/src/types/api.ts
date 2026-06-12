// Mirrors backend Prisma enums (apps/backend/prisma/schema.prisma)

export type InterviewStatus =
  | 'CREATED'
  | 'INVITED'
  | 'CONSENT_ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RECORDING_PROCESSING'
  | 'TRANSCRIPT_PROCESSING'
  | 'REPORT_GENERATING'
  | 'REPORT_READY'
  | 'FAILED';

export type InterviewState =
  | 'INIT'
  | 'CONSENT_PENDING'
  | 'READY_CHECK'
  | 'AGENT_GREETING'
  | 'ASKING_QUESTION'
  | 'LISTENING_ANSWER'
  | 'PROCESSING_ANSWER'
  | 'AGENT_RESPONSE'
  | 'NEXT_QUESTION'
  | 'COMPLETED'
  | 'REPORT_GENERATING'
  | 'REPORT_READY'
  | 'FAILED';

export interface InterviewQuestion {
  id: string;
  interviewId: string;
  order: number;
  text: string;
  category?: string | null;
  isRequired?: boolean;
  maxDurationSeconds?: number | null;
}

export interface CandidateInterviewPayload {
  id: string;
  accessToken: string;
  status: InterviewStatus;
  state: InterviewState;
  currentQuestionIndex: number;
  dailyRoomUrl?: string | null;
  consentAcceptedAt?: string | null;
  candidate: { id: string; fullName: string; email: string };
  job: { id: string; title: string; jdRawText?: string };
  questions: InterviewQuestion[];
}

// WebSocket payloads (apps/backend/src/gateway/interview.gateway.ts)

export interface AgentSpeakEvent {
  type: 'greeting' | 'question';
  text: string;
  audioUrl: string;
  questionId?: string;
}

export interface StateChangedEvent {
  state: InterviewState;
  questionIndex?: number;
  questionId?: string;
  transcript?: string;
}

export interface StartListeningEvent {
  questionId: string;
  maxDurationSeconds?: number;
}
