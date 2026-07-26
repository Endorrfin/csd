//  PR-W1 Winterization form — need specification rows
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WinterizationForm } from './winterization-form.entity';
import type {
  GeneratorFuelType,
  GeneratorPurpose,
  NeedCategory,
  NeedItem,
} from '../winterization.constants';

/**
 * One requested position of the winterization specification
 * («Вугілля — 15 т», «Генератор 10 кВт — 2 шт», «Вікна — 24 шт»).
 *
 * This table is the winterization counterpart of recovery_form_damages and the
 * bank the budget is computed from: an analyst multiplies `quantity` by the
 * Shelter Cluster reference cost for the item (SN201B/SN201C/SN202A/SN203A —
 * implementation-plan Додаток А) to get a draft budget even when the applicant
 * could not provide a кошторис.
 *
 * `quantity` is optional for most categories — the checkbox is what is
 * mandatory, so an applicant without exact measurements is not blocked. Two
 * categories are the exception (`generators`, `solid_fuel`, `liquid_fuel` — see
 * NEED_CATEGORY_RULES): a line with no number there cannot be budgeted at all.
 */
@Entity('winterization_form_needs')
export class WinterizationFormNeed {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WinterizationForm, (form) => form.needs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'winterizationFormId' })
  winterizationForm: WinterizationForm;

  @Index()
  @Column()
  winterizationFormId: string;

  /** Must be one of the parent form's needCategories (service-enforced). */
  @Column({ type: 'varchar', length: 40 })
  category: NeedCategory;

  /** Item within the category — see NEED_ITEMS_BY_CATEGORY. */
  @Column({ type: 'varchar', length: 40 })
  item: NeedItem;

  /** NUMERIC → string at runtime; the client coerces. */
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  quantity: number | null;

  /** Unit snapshot: server-derived from NEED_ITEM_UNITS (solid fuel: t | m³ per applicant choice). */
  @Column({ type: 'varchar', length: 10, nullable: true })
  unit: string | null;

  /** Generators only — the number donors actually budget against. */
  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  powerKw: number | null;

  /** Generators only — diesel / petrol / gas. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  fuelType: GeneratorFuelType | null;

  /** Generators only — what the unit powers (boiler house, water utility, …). */
  @Column({ type: 'varchar', length: 30, nullable: true })
  purpose: GeneratorPurpose | null;

  /** Free-form clarification for the line (e.g. an `other` item description). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  details: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
