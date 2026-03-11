import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CooperationType {
  VACANCY = 'vacancy',
  TENDER = 'tender',
  INITIATIVE = 'initiative',
}

export enum CooperationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('cooperation')
export class Cooperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CooperationType })
  type: CooperationType;

  @Column({ type: 'enum', enum: CooperationStatus, default: CooperationStatus.OPEN })
  status: CooperationStatus;

  @Column()
  titleUa: string;

  @Column()
  titleEn: string;

  @Column({ type: 'text' })
  descriptionUa: string;

  @Column({ type: 'text' })
  descriptionEn: string;

  // Requirements/conditions
  @Column({ type: 'text', nullable: true })
  requirementsUa: string;

  @Column({ type: 'text', nullable: true })
  requirementsEn: string;

  @Column({ nullable: true })
  location: string;

  // Submission deadline
  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date;

  @Column({ nullable: true })
  contactEmail: string;

  @Column({ default: true })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
