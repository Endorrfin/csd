import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WashFormItem } from './wash-form-item.entity';
// CHANGED: new child-entity imports.
import { WashFormBorehole } from './wash-form-borehole.entity';
import { WashFormTower } from './wash-form-tower.entity';
import { WashFormPurification } from './wash-form-purification.entity';
import { WashFormPump } from './wash-form-pump.entity';
import { WashFormAuditLog } from './wash-form-audit-log.entity';

export enum FormStatus {
  NEW = 'new',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('wash_forms')
export class WashForm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Location (single settlement per form) ──

  @Column()
  region: string;

  @Column({ default: '' })
  regionEn: string;

  @Column({ default: '' })
  district: string;

  @Column({ default: '' })
  districtEn: string;

  @Column({ default: '' })
  community: string;

  @Column({ default: '' })
  communityEn: string;

  @Column({ default: '' })
  communityCode: string;

  @Column({ nullable: true })
  settlement: string;

  @Column({ nullable: true })
  settlementEn: string;

  @Column({ nullable: true })
  settlementCode: string;

  // ── Organization & contact ──

  @Column()
  organizationName: string;

  @Column()
  headName: string;

  /** Phone in format +380XXXXXXXXX (enforced by DTO regex in Task 2). */
  @Column()
  headPhone: string;

  @Column()
  email: string;

  // ── Object info ──

  @Column()
  objectName: string;

  @Column({ type: 'int' })
  dependentPopulation: number;

  @Column({ type: 'text', nullable: true })
  socialFacilities: string;

  @Column({ nullable: true })
  installationDeadline: string;

  @Column({ type: 'text' })
  replacementReason: string;

  // ── CHANGED: jsonb fields replaced with OneToMany relations. ──

  @OneToMany(() => WashFormBorehole, (b) => b.washForm, {
    cascade: true,
    eager: true,
  })
  boreholes: WashFormBorehole[];

  @OneToMany(() => WashFormTower, (t) => t.washForm, {
    cascade: true,
    eager: true,
  })
  towers: WashFormTower[];

  @OneToMany(() => WashFormPurification, (p) => p.washForm, {
    cascade: true,
    eager: true,
  })
  purifications: WashFormPurification[];

  @OneToMany(() => WashFormPump, (p) => p.washForm, {
    cascade: true,
    eager: true,
  })
  pumps: WashFormPump[];

  @OneToMany(() => WashFormItem, (item) => item.washForm, {
    cascade: true,
    eager: true,
  })
  items: WashFormItem[];

  /** Audit log — loaded on demand via explicit relations query (not eager). */
  @OneToMany(() => WashFormAuditLog, (a) => a.washForm, {
    cascade: false,
    eager: false,
  })
  auditLog: WashFormAuditLog[];

  // ── Service fields ──

  @Column({ type: 'enum', enum: FormStatus, default: FormStatus.NEW })
  status: FormStatus;

  @Column({ type: 'text', nullable: true })
  managerNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
