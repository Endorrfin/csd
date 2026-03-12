import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  titleUa: string;

  @Column()
  titleEn: string;

  @Column({ type: 'text' })
  contentUa: string;

  @Column({ type: 'text' })
  contentEn: string;

  // Short description for the list/SEO
  @Column({ type: 'text', nullable: true })
  excerptUa: string;

  @Column({ type: 'text', nullable: true })
  excerptEn: string;

  // Category: "story", "news", "update"
  @Column({ default: 'news' })
  category: string;

  @Column({ nullable: true })
  coverImage: string;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ default: true })
  isPublished: boolean;

  // Author of the post
  @ManyToOne(() => User, { eager: true })
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
