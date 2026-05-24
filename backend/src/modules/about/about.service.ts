import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sanitizeHtml from 'sanitize-html';
import { AboutSection } from './entities/about-section.entity';
import { AboutDocument } from './entities/about-document.entity';
import { CreateAboutSectionDto } from './dto/create-about-section.dto';
import { UpdateAboutSectionDto } from './dto/update-about-section.dto';
import { CreateAboutDocumentDto } from './dto/create-about-document.dto';
import { UpdateAboutDocumentDto } from './dto/update-about-document.dto';

// aligned with existing Quill content elsewhere (blog/content) — XSS hardening
const QUILL_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'blockquote',
    'code',
    'pre',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'span',
    'div',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    span: ['class', 'style'],
    div: ['class', 'style'],
    p: ['class', 'style'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
};

@Injectable()
export class AboutService {
  constructor(
    @InjectRepository(AboutSection)
    private readonly sectionRepo: Repository<AboutSection>,
    @InjectRepository(AboutDocument)
    private readonly documentRepo: Repository<AboutDocument>,
  ) {}

  // ===== PUBLIC =====

  // CHANGED: single endpoint payload for SSR — both lists in one trip
  async getPublicAbout(): Promise<{
    sections: AboutSection[];
    documents: AboutDocument[];
  }> {
    const [sections, documents] = await Promise.all([
      this.sectionRepo.find({
        where: { isPublished: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      }),
      this.documentRepo.find({
        where: { isPublished: true },
        order: { sortOrder: 'ASC', titleUa: 'ASC' },
      }),
    ]);
    return { sections, documents };
  }

  // ===== SECTIONS (admin) =====

  findAllSections(): Promise<AboutSection[]> {
    return this.sectionRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findSectionById(id: string): Promise<AboutSection> {
    const section = await this.sectionRepo.findOne({ where: { id } });
    if (!section) {
      throw new NotFoundException(`AboutSection ${id} not found`);
    }
    return section;
  }

  async createSection(dto: CreateAboutSectionDto): Promise<AboutSection> {
    const existing = await this.sectionRepo.findOne({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException(
        `Section with key "${dto.key}" already exists`,
      );
    }

    const section = this.sectionRepo.create({
      ...dto,
      contentUa: this.sanitizeNullable(dto.contentUa),
      contentEn: this.sanitizeNullable(dto.contentEn),
    });
    return this.sectionRepo.save(section);
  }

  async updateSection(
    id: string,
    dto: UpdateAboutSectionDto,
  ): Promise<AboutSection> {
    const section = await this.findSectionById(id);

    Object.assign(section, {
      ...dto,
      // only sanitize content fields when present in DTO (preserve existing on partial update)
      ...(dto.contentUa !== undefined && {
        contentUa: this.sanitizeNullable(dto.contentUa),
      }),
      ...(dto.contentEn !== undefined && {
        contentEn: this.sanitizeNullable(dto.contentEn),
      }),
    });

    return this.sectionRepo.save(section);
  }

  async removeSection(id: string): Promise<void> {
    const result = await this.sectionRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`AboutSection ${id} not found`);
    }
  }

  // ===== DOCUMENTS (admin) =====

  findAllDocuments(): Promise<AboutDocument[]> {
    return this.documentRepo.find({
      order: { sortOrder: 'ASC', titleUa: 'ASC' },
    });
  }

  async findDocumentById(id: string): Promise<AboutDocument> {
    const document = await this.documentRepo.findOne({ where: { id } });
    if (!document) {
      throw new NotFoundException(`AboutDocument ${id} not found`);
    }
    return document;
  }

  createDocument(dto: CreateAboutDocumentDto): Promise<AboutDocument> {
    const document = this.documentRepo.create({
      ...dto,
      descriptionUa: dto.descriptionUa ?? null,
      descriptionEn: dto.descriptionEn ?? null,
    });
    return this.documentRepo.save(document);
  }

  async updateDocument(
    id: string,
    dto: UpdateAboutDocumentDto,
  ): Promise<AboutDocument> {
    const document = await this.findDocumentById(id);
    Object.assign(document, dto);
    return this.documentRepo.save(document);
  }

  async removeDocument(id: string): Promise<void> {
    const result = await this.documentRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`AboutDocument ${id} not found`);
    }
  }

  // ===== HELPERS =====

  private sanitizeNullable(html: string | undefined): string | null {
    if (html === undefined || html === null || html.trim() === '') {
      return null;
    }
    return sanitizeHtml(html, QUILL_SANITIZE_OPTIONS);
  }
}
