import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  level: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  employmentType: string;

  @Column({ type: 'text' })
  jdRawText: string;

  @Column({ type: 'jsonb', nullable: true })
  jdParsedJson: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  requirements: string[];

  @Column({ type: 'jsonb', nullable: true })
  rubricJson: Record<string, any>;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.DRAFT })
  status: JobStatus;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
