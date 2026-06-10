import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Interview } from './interview.entity';

@Entity('interview_questions')
export class InterviewQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  interviewId: string;

  @ManyToOne(() => Interview, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewId' })
  interview: Interview;

  @Column({ nullable: true })
  sourceQuestionBankItemId: string;

  @Column()
  order: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'jsonb', nullable: true })
  expectedSignals: string[];

  @Column({ type: 'jsonb', nullable: true })
  evaluationCriteria: string[];

  @Column({ default: 120 })
  maxDurationSeconds: number;

  @Column({ default: true })
  isRequired: boolean;

  @Column({ nullable: true })
  ttsAudioUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
