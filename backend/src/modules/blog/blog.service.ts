import { Injectable, NotFoundException } from '@nestjs/common';
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

  findAllPublished(): Promise<Post[]> {
    return this.postRepository.find({
      where: { isPublished: true },
      order: { createdAt: 'DESC' },
    });
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

  // author comes from request.user (JWT)
  create(dto: CreatePostDto, author: User): Promise<Post> {
    const post = this.postRepository.create({ ...dto, author });
    return this.postRepository.save(post);
  }

  async update(slug: string, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findBySlug(slug);
    Object.assign(post, dto);
    return this.postRepository.save(post);
  }

  async remove(slug: string): Promise<void> {
    const post = await this.findBySlug(slug);
    await this.postRepository.remove(post);
  }
}
