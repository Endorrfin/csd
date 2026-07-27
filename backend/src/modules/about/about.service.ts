import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import sanitizeHtml from 'sanitize-html';
import { AboutSection } from './entities/about-section.entity';
import { AboutDocument } from './entities/about-document.entity';
import { AboutDocumentFile } from './entities/about-document-file.entity';
import { CreateAboutSectionDto } from './dto/create-about-section.dto';
import { UpdateAboutSectionDto } from './dto/update-about-section.dto';
import { CreateAboutDocumentDto } from './dto/create-about-document.dto';
import { UpdateAboutDocumentDto } from './dto/update-about-document.dto';
import { CreateAboutDocumentFileDto } from './dto/create-about-document-file.dto';
import { UploadService } from '../upload/upload.service';
import {
  ABOUT_DOCS_S3_PREFIX,
  ABOUT_DOCUMENT_URL_TTL_SECONDS,
} from './about-documents.constants';
import type {
  AboutDocumentAccessMode,
  AboutDocumentLocale,
  AboutDocumentType,
} from './about-documents.constants';

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

// === ADDED: PR-D1 — the public registry payload deliberately carries NO file URL.
// `GET /api/about` used to return every document link in a single response, which is
// exactly the bulk-download vector we are closing: one request, every file. Links are
// now issued one document at a time by GET /api/about/documents/:code/file. ===
export interface PublicAboutDocument {
  code: string;
  documentType: AboutDocumentType;
  accessMode: AboutDocumentAccessMode;
  titleUa: string;
  titleEn: string;
  descriptionUa: string | null;
  descriptionEn: string | null;
  version: string | null;
  lastReviewDate: Date | null;
  nextReviewDate: Date | null;
  sortOrder: number;
  /** Language variants that actually have a current file — drives the UA/EN switch. */
  locales: AboutDocumentLocale[];
}

export interface AboutDocumentFileLink {
  code: string;
  locale: AboutDocumentLocale;
  version: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  /** false → the viewer must not render a download button (access_mode view_only). */
  downloadAllowed: boolean;
  url: string;
  expiresIn: number;
}

@Injectable()
export class AboutService {
  constructor(
    @InjectRepository(AboutSection)
    private readonly sectionRepo: Repository<AboutSection>,
    @InjectRepository(AboutDocument)
    private readonly documentRepo: Repository<AboutDocument>,
    // === ADDED: PR-D1 ===
    @InjectRepository(AboutDocumentFile)
    private readonly fileRepo: Repository<AboutDocumentFile>,
    private readonly uploadService: UploadService,
    private readonly dataSource: DataSource,
  ) {}

  // ===== PUBLIC =====

  // CHANGED: single endpoint payload for SSR — both lists in one trip
  async getPublicAbout(): Promise<{
    sections: AboutSection[];
    documents: PublicAboutDocument[];
  }> {
    const [sections, documents] = await Promise.all([
      this.sectionRepo.find({
        where: { isPublished: true },
        order: { sortOrder: 'ASC', createdAt: 'ASC' },
      }),
      this.documentRepo.find({
        where: { isPublished: true },
        relations: { files: true },
        order: { sortOrder: 'ASC', titleUa: 'ASC' },
      }),
    ]);

    return {
      sections,
      documents: documents
        .map((document) => this.toPublicDocument(document))
        // a published registry entry with no uploaded file has nothing to show
        .filter((document) => document.locales.length > 0),
    };
  }

  /**
   * PR-D1 — short-lived presigned GET for ONE document in ONE language.
   * Rate limiting belongs in front of this route (see docs/about-documents/pr-d2-task.md):
   * the endpoint is cheap, but it is the only remaining way to enumerate files.
   */
  async getPublicDocumentFile(
    code: string,
    locale: AboutDocumentLocale,
  ): Promise<AboutDocumentFileLink> {
    const document = await this.documentRepo.findOne({
      where: { code, isPublished: true },
    });
    if (!document) {
      throw new NotFoundException(`Document "${code}" not found`);
    }
    if (document.accessMode === 'on_request') {
      // PR-D5 adds the request-and-release flow; until then there is no public path.
      throw new ForbiddenException(
        `Document "${code}" is available on request only`,
      );
    }

    const file = await this.fileRepo.findOne({
      where: { documentId: document.id, locale, isCurrent: true },
    });
    if (!file) {
      throw new NotFoundException(
        `Document "${code}" has no current "${locale}" file`,
      );
    }

    const downloadAllowed = document.accessMode === 'public_download';
    const fileName = `${document.code}_${file.version}_${file.locale}.pdf`;
    const url = await this.uploadService.getAboutDocFileUrl(
      file.s3Key,
      fileName,
      downloadAllowed,
    );

    return {
      code: document.code,
      locale: file.locale,
      version: file.version,
      fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      pageCount: file.pageCount,
      downloadAllowed,
      url,
      expiresIn: ABOUT_DOCUMENT_URL_TTL_SECONDS,
    };
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
      relations: { files: true },
      order: { sortOrder: 'ASC', titleUa: 'ASC' },
    });
  }

  async findDocumentById(id: string): Promise<AboutDocument> {
    const document = await this.documentRepo.findOne({
      where: { id },
      relations: { files: true },
    });
    if (!document) {
      throw new NotFoundException(`AboutDocument ${id} not found`);
    }
    return document;
  }

  // CHANGED: PR-D1 — `code` is unique, so a clash must be a 409 rather than a 500.
  async createDocument(dto: CreateAboutDocumentDto): Promise<AboutDocument> {
    const existing = await this.documentRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Document with code "${dto.code}" already exists`,
      );
    }

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
    // about_document_files rows cascade; the S3 objects are intentionally kept so a
    // deletion by mistake stays recoverable (lifecycle cleanup is a separate concern).
    const result = await this.documentRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`AboutDocument ${id} not found`);
    }
  }

  // ===== DOCUMENT FILES (admin) — ADDED: PR-D1 =====

  async findDocumentFiles(documentId: string): Promise<AboutDocumentFile[]> {
    await this.findDocumentById(documentId);
    return this.fileRepo.find({
      where: { documentId },
      order: { locale: 'ASC', version: 'DESC' },
    });
  }

  /**
   * Attach an already-uploaded PDF. The browser is not a trusted source for an S3
   * key, so the prefix is re-derived from the document's own code here — otherwise an
   * admin session could point CSD-POL-01 at a file uploaded under another document.
   * Re-uploading the same version replaces it in place.
   */
  async addDocumentFile(
    documentId: string,
    dto: CreateAboutDocumentFileDto,
  ): Promise<AboutDocumentFile> {
    const document = await this.findDocumentById(documentId);
    const expectedPrefix = `${ABOUT_DOCS_S3_PREFIX}${document.code}/${dto.locale}/${dto.version}/`;
    if (!dto.s3Key.startsWith(expectedPrefix)) {
      throw new BadRequestException(
        `s3Key must start with "${expectedPrefix}"`,
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // A partial unique index allows exactly one current file per document+locale,
      // so the previous one has to be demoted inside the same transaction.
      await manager.update(
        AboutDocumentFile,
        { documentId: document.id, locale: dto.locale, isCurrent: true },
        { isCurrent: false },
      );

      const existing = await manager.findOne(AboutDocumentFile, {
        where: {
          documentId: document.id,
          locale: dto.locale,
          version: dto.version,
        },
      });

      // Assigned field-by-field on a real instance rather than through
      // create()/merge(): TypeORM's DeepPartial<T> resolves to `T | {...}` and makes
      // an object literal report as a missing-properties error on the wrong branch.
      const file = existing ?? new AboutDocumentFile();
      file.documentId = document.id;
      file.locale = dto.locale;
      file.version = dto.version;
      file.s3Key = dto.s3Key;
      file.originalName = dto.originalName;
      file.mimeType = dto.mimeType;
      file.sizeBytes = dto.sizeBytes;
      file.pageCount = dto.pageCount ?? null;
      file.effectiveDate = dto.effectiveDate
        ? new Date(dto.effectiveDate)
        : null;
      file.isCurrent = true;

      return manager.save(file);
    });
  }

  async removeDocumentFile(fileId: string): Promise<void> {
    const result = await this.fileRepo.delete(fileId);
    if (result.affected === 0) {
      throw new NotFoundException(`AboutDocumentFile ${fileId} not found`);
    }
  }

  /** Short-lived presigned GET so an admin can verify what was uploaded. */
  async getAdminFileUrl(fileId: string): Promise<{ url: string }> {
    const file = await this.fileRepo.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException(`AboutDocumentFile ${fileId} not found`);
    }
    const url = await this.uploadService.getAboutDocFileUrl(
      file.s3Key,
      file.originalName,
      false,
    );
    return { url };
  }

  // ===== HELPERS =====

  private toPublicDocument(document: AboutDocument): PublicAboutDocument {
    const locales = (document.files ?? [])
      .filter((file) => file.isCurrent)
      .map((file) => file.locale)
      .sort();

    return {
      code: document.code,
      documentType: document.documentType,
      accessMode: document.accessMode,
      titleUa: document.titleUa,
      titleEn: document.titleEn,
      descriptionUa: document.descriptionUa,
      descriptionEn: document.descriptionEn,
      version: document.version,
      lastReviewDate: document.lastReviewDate,
      nextReviewDate: document.nextReviewDate,
      sortOrder: document.sortOrder,
      locales,
    };
  }

  private sanitizeNullable(html: string | undefined): string | null {
    if (html === undefined || html === null || html.trim() === '') {
      return null;
    }
    return sanitizeHtml(html, QUILL_SANITIZE_OPTIONS);
  }
}
