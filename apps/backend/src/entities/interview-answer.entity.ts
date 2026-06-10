import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Interview } from './interview.entity';
import { InterviewQuestion } from './interview-question.entity';

@Entity('interview_answers')
export class InterviewAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  interviewId: string;

  @ManyToOne(() => Interview, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'interviewId' })
  interview: Interview;

  @Column()
  questionId: string;

  @ManyToOne(() => InterviewQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionId' })
  question: InterviewQuestion;

  @Column({ nullable: true })
  answerAudioUrl: string;

  @Column({ nullable: true })
  answerVideoUrl: string;

  @Column({ type: 'text', nullable: true })
  transcript: string;

  @Column({ nullable: true })
  durationSeconds: number;

  @Column({ type: 'jsonb', nullable: true })
  analysisJson: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
