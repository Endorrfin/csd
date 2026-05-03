import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async findAllPublished(
    page: number,
    limit: number,
  ): Promise<{
    items: Post[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const [items, total] = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.isPublished = :isPublished', { isPublished: true })
      .orderBy('COALESCE(post."publishedAt", post."createdAt")', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async findFeatured(): Promise<Post | null> {
    const featured = await this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.isFeatured = :isFeatured', { isFeatured: true })
      .andWhere('post.isPublished = :isPublished', { isPublished: true })
      .getOne();

    if (featured) return featured;

    // fallback: newest published — so hero is never empty
    return this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.isPublished = :isPublished', { isPublished: true })
      .orderBy('COALESCE(post."publishedAt", post."createdAt")', 'DESC')
      .limit(1)
      .getOne();
  }

  findAll(): Promise<Post[]> {
    return this.postRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findBySlug(slug: string): Promise<Post> {
    const post = await this.postRepository.findOne({ where: { slug } });
    if (!post) {
      throw new NotFoundException(`Post "${slug}" not found`);
    }
    return post;
  }

  async create(dto: CreatePostDto, author: User): Promise<Post> {
    const existing = await this.postRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Post with slug "${dto.slug}" already exists`,
      );
    }

    if (dto.isFeatured) {
      await this.unsetCurrentFeatured();
    }

    const post = this.postRepository.create({ ...dto, author });
    return this.postRepository.save(post);
  }

  async update(slug: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findBySlug(slug);

    // if this update sets isFeatured=true, unset others first.
    // Skip when this post is already featured to avoid touching itself.
    if (dto.isFeatured === true && !post.isFeatured) {
      await this.unsetCurrentFeatured();
    }

    // skip undefined fields. class-transformer instantiates UpdatePostDto
    // with all properties present (set to undefined for those not in body),
    // and Object.assign propagates undefined onto the entity, breaking the
    // response payload (DB is fine — TypeORM save() skips undefined).
    for (const key of Object.keys(dto) as (keyof UpdatePostDto)[]) {
      if (dto[key] !== undefined) {
        (post as any)[key] = dto[key];
      }
    }

    return this.postRepository.save(post);
  }

  async remove(slug: string): Promise<void> {
    const post = await this.findBySlug(slug);
    await this.postRepository.remove(post);
  }

  private async unsetCurrentFeatured(): Promise<void> {
    await this.postRepository.update(
      { isFeatured: true },
      { isFeatured: false },
    );
  }
}
