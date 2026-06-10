import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { QuestionSet } from './question-set.entity';

export enum QuestionCategory {
  SCREENING = 'screening',
  MOTIVATION = 'motivation',
  EXPERIENCE = 'experience',
  BEHAVIORAL = 'behavioral',
  TECHNICAL = 'technical',
  CULTURE_FIT = 'culture_fit',
  SALARY = 'salary',
  CUSTOM = 'custom',
}

@Entity('question_bank_items')
export class QuestionBankItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  questionSetId: string;

  @ManyToOne(() => QuestionSet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'questionSetId' })
  questionSet: QuestionSet;

  @Column()
  order: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'enum', enum: QuestionCategory, default: QuestionCategory.CUSTOM })
  category: QuestionCategory;

  @Column({ type: 'jsonb', nullable: true })
  expectedSignals: string[];

  @Column({ type: 'jsonb', nullable: true })
  evaluationCriteria: string[];

  @Column({ default: 120 })
  maxDurationSeconds: number;

  @Column({ default: true })
  isRequired: boolean;

  @Column({ type: 'text', nullable: true })
  followUpStrategy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
