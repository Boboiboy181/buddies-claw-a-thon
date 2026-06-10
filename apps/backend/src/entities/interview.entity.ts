import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Candidate } from './candidate.entity';
import { Job } from './job.entity';
import { QuestionSet } from './question-set.entity';

export enum InterviewStatus {
  CREATED = 'created',
  INVITED = 'invited',
  CONSENT_ACCEPTED = 'consent_accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  RECORDING_PROCESSING = 'recording_processing',
  TRANSCRIPT_PROCESSING = 'transcript_processing',
  REPORT_GENERATING = 'report_generating',
  REPORT_READY = 'report_ready',
  FAILED = 'failed',
}

export enum InterviewState {
  INIT = 'INIT',
  CONSENT_PENDING = 'CONSENT_PENDING',
  READY_CHECK = 'READY_CHECK',
  AGENT_GREETING = 'AGENT_GREETING',
  ASKING_QUESTION = 'ASKING_QUESTION',
  LISTENING_ANSWER = 'LISTENING_ANSWER',
  PROCESSING_ANSWER = 'PROCESSING_ANSWER',
  AGENT_RESPONSE = 'AGENT_RESPONSE',
  NEXT_QUESTION = 'NEXT_QUESTION',
  COMPLETED = 'COMPLETED',
  REPORT_GENERATING = 'REPORT_GENERATING',
  REPORT_READY = 'REPORT_READY',
  FAILED = 'FAILED',
}

@Entity('interviews')
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  candidateId: string;

  @ManyToOne(() => Candidate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;

  @Column()
  jobId: string;

  @ManyToOne(() => Job, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @Column({ nullable: true })
  questionSetId: string;

  @ManyToOne(() => QuestionSet, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'questionSetId' })
  questionSet: QuestionSet;

  @Column({ type: 'jsonb', nullable: true })
  questionSetSnapshotJson: any[];

  @Column({ type: 'enum', enum: InterviewStatus, default: InterviewStatus.CREATED })
  status: InterviewStatus;

  @Column({ type: 'enum', enum: InterviewState, default: InterviewState.INIT })
  state: InterviewState;

  @Column({ unique: true })
  accessToken: string;

  @Column({ nullable: true })
  dailyRoomName: string;

  @Column({ nullable: true })
  dailyRoomUrl: string;

  @Column({ nullable: true })
  recordingId: string;

  @Column({ nullable: true })
  recordingUrl: string;

  @Column({ default: 0 })
  currentQuestionIndex: number;

  @Column({ nullable: true })
  consentAcceptedAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
