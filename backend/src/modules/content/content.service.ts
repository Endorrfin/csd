import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from './entities/page.entity';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';

@Injectable()
export class ContentService {
  constructor(
      @InjectRepository(Page)
      private readonly pageRepository: Repository<Page>,
  ) {}

  // Public - only published pages
  findAllPublished(): Promise<Page[]> {
    return this.pageRepository.find({
      where: { isPublished: true },
      order: { sortOrder: 'ASC' },
    });
  }

  // Admin — all pages
  findAll(): Promise<Page[]> {
    return this.pageRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async findBySlug(slug: string): Promise<Page> {
    const page = await this.pageRepository.findOne({ where: { slug } });
    if (!page) {
      throw new NotFoundException(`Page "${slug}" not found`);
    }
    return page;
  }

  create(dto: CreatePageDto): Promise<Page> {
    const page = this.pageRepository.create(dto);
    return this.pageRepository.save(page);
  }

  async update(slug: string, dto: UpdatePageDto): Promise<Page> {
    const page = await this.findBySlug(slug);
    Object.assign(page, dto);
    return this.pageRepository.save(page);
  }

  async remove(slug: string): Promise<void> {
    const page = await this.findBySlug(slug);
    await this.pageRepository.remove(page);
  }
}
