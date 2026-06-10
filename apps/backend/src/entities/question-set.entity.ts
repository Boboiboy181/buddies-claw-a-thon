import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Job } from './job.entity';

export enum QuestionSetStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('question_sets')
export class QuestionSet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @Column()
  name: string;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'enum', enum: QuestionSetStatus, default: QuestionSetStatus.DRAFT })
  status: QuestionSetStatus;

  @Column({ nullable: true })
  generatedFromJdHash: string;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
