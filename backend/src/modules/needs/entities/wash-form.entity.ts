import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

// Тип WASH потребности
export enum WashNeedType {
  BOREHOLE = 'borehole_drilling',
  WATER_TOWER = 'water_tower',
  PIPES_VALVES = 'pipes_valves_fittings',
  PUMPS = 'pumps_equipment',
  PURIFICATION = 'purification_system',
  WATER_TANKS = 'water_tanks',
  BOTTLED_WATER = 'bottled_water_hygiene',
  SOLAR_POWER = 'solar_power_plant',
  WASH_ROOMS = 'wash_rooms_rehabilitation',
}

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

  // Информация о заявителе
  @Column()
  applicantName: string;

  @Column()
  applicantPhone: string;

  @Column({ nullable: true })
  applicantEmail: string;

  @Column()
  organizationName: string;

  @Column({ nullable: true })
  organizationRole: string;

  // Местоположение
  @Column()
  region: string;

  @Column()
  district: string;

  @Column()
  settlement: string;

  @Column({ nullable: true })
  address: string;

  // Координаты для будущей карты
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  // Тип потребности
  @Column({ type: 'enum', enum: WashNeedType })
  needType: WashNeedType;

  // Детали потребности
  @Column({ type: 'text' })
  description: string;

  // Количество людей, которые получат помощь
  @Column({ type: 'int', nullable: true })
  beneficiariesCount: number;

  // Тип учреждения (школа, больница, община)
  @Column({ nullable: true })
  facilityType: string;

  // Текущее состояние инфраструктуры
  @Column({ type: 'text', nullable: true })
  currentCondition: string;

  // Приоритет
  @Column({ default: 'medium' })
  priority: string;

  // Статус обработки
  @Column({ type: 'enum', enum: FormStatus, default: FormStatus.NEW })
  status: FormStatus;

  // Комментарий менеджера
  @Column({ type: 'text', nullable: true })
  managerNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
