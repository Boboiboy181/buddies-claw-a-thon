import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Interview } from './interview.entity';

@Entity('interview_reports')
export class InterviewReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  interviewId: string;

  @OneToOne(() => Interview, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewId' })
  interview: Interview;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'jsonb', nullable: true })
  qaAnalysisJson: any[];

  @Column({ type: 'jsonb', nullable: true })
  cvMatchAnalysisJson: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  jdFitAnalysisJson: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  audioReviewSignalsJson: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  videoReviewSignalsJson: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  rubricScoresJson: any[];

  @Column({ type: 'jsonb', nullable: true })
  recommendation: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  riskFlagsJson: any[];

  @CreateDateColumn()
  createdAt: Date;
}
