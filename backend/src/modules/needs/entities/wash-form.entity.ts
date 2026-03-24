import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { WashFormItem } from './wash-form-item.entity';

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

  // ── Загальна інформація (з Excel-анкети) ──

  /** Область */
  @Column()
  region: string;

  /** Назва організації (громада, водоканал, медичний заклад, школа тощо) */
  @Column()
  organizationName: string;

  /** ПІБ керівника */
  @Column()
  headName: string;

  /** Телефон керівника */
  @Column()
  headPhone: string;

  /** Email для зв'язку (обов'язковий) */
  @Column()
  email: string;

  // ── Інформація про об'єкт ──

  /** Назва об'єкту (або вулиці з уточненням: вода, каналізація, КНС, ВНС тощо) */
  @Column()
  objectName: string;

  /** Кількість людей, які залежать від об'єкту */
  @Column({ type: 'int' })
  dependentPopulation: number;

  /** Соціальні установи, залежні від об'єкту (лікарня, школа, садочок тощо) */
  @Column({ type: 'text', nullable: true })
  socialFacilities: string;

  /** Орієнтовний термін монтажу наданих матеріалів */
  @Column({ nullable: true })
  installationDeadline: string;

  /** Короткий опис причин заміни */
  @Column({ type: 'text' })
  replacementReason: string;

  // ── WASH Activities (опціональні, JSONB) ──

  /** Розділ III: Буріння свердловин */
  @Column({ type: 'jsonb', nullable: true })
  boreholeDrilling: {
    workType: 'new_drilling' | 'repair_cleaning' | 'new_near_existing';
    hasAquiferInfo?: boolean;
    existingDepth?: number;
    existingDebit?: number;
    hasDesignInfo?: boolean;
    hasPassport?: boolean;
    oldLocation?: string;
    expectedFlowRate: number;
    notes?: string;
  } | null;

  /** Розділ IV: Водонапірні башти */
  @Column({ type: 'jsonb', nullable: true })
  waterTower: {
    towerType: 'vbr_15' | 'vbr_25' | 'vbr_50' | 'vbr_over_50';
    towerHeight: '8' | '12' | '15' | '18' | '20' | '25' | 'over_25';
    customHeight?: number;
    hasFoundation: boolean;
    isFoundationSuitable: boolean;
    needsFoundationReconstruction: boolean;
    canSelfReconstruct: boolean;
    canProvideCrane: boolean;
    notes?: string;
  } | null;

  /** Розділ V: Системи очищення води */
  @Column({ type: 'jsonb', nullable: true })
  purificationSystem: {
    hasRoom: boolean;
    hasTemperatureControl: boolean;
    hasWaterInletDrainage: boolean;
    hasPowerSupply: boolean;
    canMaintainSystem: boolean;
    willingToProvideWater: boolean;
    notes?: string;
  } | null;

  // ── Позиції заявки (обладнання та матеріали) ──

  @OneToMany(() => WashFormItem, (item) => item.washForm, {
    cascade: true,
    eager: true,
  })
  items: WashFormItem[];

  // ── Службові поля ──

  @Column({ type: 'enum', enum: FormStatus, default: FormStatus.NEW })
  status: FormStatus;

  @Column({ type: 'text', nullable: true })
  managerNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
