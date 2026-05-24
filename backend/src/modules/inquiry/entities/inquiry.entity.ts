import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Why people contact us (general channel — assistance requests go to needs/WASH)
export enum InquiryReason {
  PARTNERSHIP = 'partnership',
  VOLUNTEERING = 'volunteering',
  PRESS = 'press',
  GENERAL = 'general',
  OTHER = 'other',
}

export enum MessengerType {
  TELEGRAM = 'telegram',
  VIBER = 'viber',
  WHATSAPP = 'whatsapp',
  OTHER = 'other',
}

export enum InquiryLang {
  UA = 'ua',
  EN = 'en',
}

export enum InquiryStatus {
  NEW = 'new',
  READ = 'read',
  REPLIED = 'replied',
  ARCHIVED = 'archived',
}

@Entity('inquiries')
export class Inquiry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: InquiryReason })
  reason: InquiryReason;

  // Free text used only when reason = 'other'
  @Column({ type: 'varchar', nullable: true })
  reasonOther: string | null;

  // Optional — submitter may stay anonymous
  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  // At least one of email / phone / messenger is enforced at the DTO level
  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'enum', enum: MessengerType, nullable: true })
  messengerType: MessengerType | null;

  // @username or phone number in the chosen messenger
  @Column({ type: 'varchar', nullable: true })
  messengerHandle: string | null;

  @Column({ type: 'enum', enum: InquiryLang })
  preferredLang: InquiryLang;

  @Column({ type: 'text' })
  message: string;

  // Soft consent for now (no Privacy Policy page yet); kept for audit
  @Column({ type: 'boolean', default: false })
  consent: boolean;

  @Column({ type: 'enum', enum: InquiryStatus, default: InquiryStatus.NEW })
  status: InquiryStatus;

  // Manager internal notes (not visible to submitter)
  @Column({ type: 'text', nullable: true })
  managerNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
