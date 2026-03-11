import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PartnerType {
  DONOR = 'donor',
  PARTNER = 'partner',
  GOVERNMENT = 'government',
}

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nameUa: string;

  @Column()
  nameEn: string;

  @Column({ type: 'text', nullable: true })
  descriptionUa: string;

  @Column({ type: 'text', nullable: true })
  descriptionEn: string;

  @Column({ type: 'enum', enum: PartnerType, default: PartnerType.PARTNER })
  type: PartnerType;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  websiteUrl: string;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
