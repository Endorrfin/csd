import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WashForm } from './wash-form.entity';

export enum WaterTowerType {
  VBR_15 = 'vbr_15',
  VBR_25 = 'vbr_25',
  VBR_50 = 'vbr_50',
  VBR_OVER_50 = 'vbr_over_50',
}

/** CHANGED: '10' added — missing in previous enum, caused validation error on submit. */
export enum WaterTowerHeight {
  H_8 = '8',
  H_10 = '10',
  H_12 = '12',
  H_15 = '15',
  H_18 = '18',
  H_20 = '20',
  H_25 = '25',
  OVER_25 = 'over_25',
}

/**
 * One water tower (водонапірна башта) entry within a WASH form.
 * Multiple towers allowed per form.
 */
@Entity('wash_form_towers')
export class WashFormTower {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WashForm, (form) => form.towers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'washFormId' })
  washForm: WashForm;

  @Index()
  @Column()
  washFormId: string;

  @Column({ type: 'enum', enum: WaterTowerType })
  towerType: WaterTowerType;

  @Column({ type: 'enum', enum: WaterTowerHeight })
  towerHeight: WaterTowerHeight;

  /** Required when towerHeight = OVER_25. */
  @Column({ type: 'int', nullable: true })
  customHeight: number | null;

  @Column({ type: 'boolean', default: false })
  hasFoundation: boolean;

  @Column({ type: 'boolean', default: false })
  isFoundationSuitable: boolean;

  @Column({ type: 'boolean', default: false })
  needsFoundationReconstruction: boolean;

  @Column({ type: 'boolean', default: false })
  canSelfReconstruct: boolean;

  @Column({ type: 'boolean', default: false })
  canProvideCrane: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
