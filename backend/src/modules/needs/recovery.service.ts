import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { RecoveryForm } from './entities/recovery-form.entity';
import { RecoveryFormDamage } from './entities/recovery-form-damage.entity';
import { NeedsFormAttachment } from './entities/needs-form-attachment.entity';
import { FormStatus } from './entities/wash-form.entity';
import { CreateRecoveryFormDto } from './dto/create-recovery-form.dto';
import { RecoveryAttachmentDto } from './dto/recovery-attachment.dto';
import { UpdateRecoveryFormDto } from './dto/update-recovery-form.dto';
import { UpdateRecoveryFormFullDto } from './dto/update-recovery-form-full.dto';
import {
  RecoveryAdminQueryDto,
  RECOVERY_SORTABLE_COLUMNS,
} from './dto/recovery-admin-query.dto';
import { AuditActor, stringify } from './audit-log.service';
import { NeedsAuditLogService } from './needs-audit-log.service';
import { FormNumberService } from './form-number.service';
// presigned GET for the admin detail view
import { UploadService } from '../upload/upload.service';
import {
  AttachmentKind,
  DAMAGE_ELEMENT_UNITS,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
  RECOVERY_FORM_TYPE,
  RECOVERY_NUMBER_PREFIX,
} from './recovery.constants';

export interface PaginatedRecoveryForms {
  data: RecoveryForm[];
  total: number;
  page: number;
  limit: number;
}

export type RecoveryFormDetail = RecoveryForm & {
  attachments: NeedsFormAttachment[];
};

// attachment enriched with a short-lived presigned GET url.
export type AttachmentWithUrl = NeedsFormAttachment & { url: string | null };
export type RecoveryFormWithUrls = RecoveryForm & {
  attachments: AttachmentWithUrl[];
};

/** Scalar fields tracked in audit diffs (child arrays are logged as counts). */
function scalarSnapshot(form: RecoveryForm): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...form };
  delete rest.damages;
  delete rest.attachments;
  delete rest.createdAt;
  delete rest.updatedAt;
  return rest;
}

@Injectable()
export class RecoveryService {
  constructor(
    @InjectRepository(RecoveryForm)
    private readonly formRepo: Repository<RecoveryForm>,
    @InjectRepository(RecoveryFormDamage)
    private readonly damageRepo: Repository<RecoveryFormDamage>,
    @InjectRepository(NeedsFormAttachment)
    private readonly attachmentRepo: Repository<NeedsFormAttachment>,
    private readonly auditLog: NeedsAuditLogService,
    private readonly formNumber: FormNumberService,
    private readonly dataSource: DataSource,
    private readonly uploadService: UploadService,
  ) {}

  // ══════════════════════════════════════════════════════════════
  // CREATE (public submit)
  // ══════════════════════════════════════════════════════════════

  async create(
    dto: CreateRecoveryFormDto,
    actor: AuditActor,
  ): Promise<{ id: string; trackingNumber: string }> {
    this.assertUniqueDamageElements(dto);
    this.assertValidAttachments('photo', dto.photos);
    this.assertValidAttachments('document', dto.documents ?? []);
    this.assertUniqueS3Keys(dto);

    const { photos, documents, damages, ...formData } = dto;

    const saved = await this.dataSource.transaction(async (manager) => {
      const trackingNumber = await this.formNumber.nextTrackingNumber(
        manager,
        RECOVERY_FORM_TYPE,
        RECOVERY_NUMBER_PREFIX,
      );

      const form = manager.create(RecoveryForm, {
        ...formData,
        trackingNumber,
        damages: damages.map((d, idx) =>
          manager.create(RecoveryFormDamage, {
            element: d.element,
            volume: d.volume ?? null,
            unit: DAMAGE_ELEMENT_UNITS[d.element],
            notes: d.notes ?? null,
            sortOrder: d.sortOrder ?? idx,
          }),
        ),
      });
      const savedForm = await manager.save(form);

      const attachmentRows = this.buildAttachmentRows(
        savedForm.id,
        photos,
        documents ?? [],
      ).map((row) => manager.create(NeedsFormAttachment, row));
      await manager.save(attachmentRows);

      return savedForm;
    });

    // Fire-and-forget: a logging failure must not break the public submit.
    try {
      await this.auditLog.logCreate(RECOVERY_FORM_TYPE, saved.id, actor, {
        trackingNumber: saved.trackingNumber,
        objectType: saved.objectType,
        damagesCount: saved.damages.length,
        photosCount: photos.length,
        documentsCount: documents?.length ?? 0,
      });
    } catch (err) {
      console.error('[needs-audit-log] failed to log recovery create:', err);
    }

    return { id: saved.id, trackingNumber: saved.trackingNumber };
  }

  // ══════════════════════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════════════════════

  async findAll(query: RecoveryAdminQueryDto): Promise<PaginatedRecoveryForms> {
    const qb = this.formRepo.createQueryBuilder('f');

    if (query.status)
      qb.andWhere('f.status = :status', { status: query.status });
    if (query.region)
      qb.andWhere('f.region ILIKE :region', { region: `%${query.region}%` });
    if (query.objectType)
      qb.andWhere('f.objectType = :objectType', {
        objectType: query.objectType,
      });
    if (query.applicantCategory)
      qb.andWhere('f.applicantCategory = :applicantCategory', {
        applicantCategory: query.applicantCategory,
      });
    if (query.urgency)
      qb.andWhere('f.urgency = :urgency', { urgency: query.urgency });
    if (query.search) {
      // trackingNumber / objectName / organizationName only — never PII contacts.
      qb.andWhere(
        '(f.trackingNumber ILIKE :s OR f.objectName ILIKE :s OR f.organizationName ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.dateFrom)
      qb.andWhere('f.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo)
      // inclusive end of day
      qb.andWhere("f.createdAt < (:dateTo::date + INTERVAL '1 day')", {
        dateTo: query.dateTo,
      });

    const sortBy =
      query.sortBy && RECOVERY_SORTABLE_COLUMNS.includes(query.sortBy)
        ? query.sortBy
        : 'createdAt';
    qb.orderBy(`f.${sortBy}`, query.sortOrder ?? 'DESC');

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { data, total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<RecoveryFormDetail> {
    const form = await this.formRepo.findOne({ where: { id } });
    if (!form) throw new NotFoundException(`Recovery form ${id} not found`);

    const attachments = await this.attachmentRepo.find({
      where: { formType: RECOVERY_FORM_TYPE, formId: id },
      order: { kind: 'ASC', sortOrder: 'ASC' },
    });

    return Object.assign(form, { attachments });
  }

  /**
   * Admin detail read: same as findById but each attachment is enriched with a
   * short-lived presigned GET `url` (files live in the private bucket, so this
   * is the only way to view them). Kept separate from findById so mutations
   * (update/remove) stay DB-only and don't depend on S3. URL generation is
   * best-effort per file — an S3 hiccup yields url:null, not a failed request.
   */
  async findByIdWithUrls(id: string): Promise<RecoveryFormWithUrls> {
    const detail = await this.findById(id);

    const attachments: AttachmentWithUrl[] = await Promise.all(
      detail.attachments.map(async (a) => {
        let url: string | null = null;
        try {
          url = await this.uploadService.getNeedsFileUrl(a.s3Key);
        } catch (err) {
          console.error(
            `[recovery] failed to presign GET for ${a.s3Key}:`,
            err,
          );
        }
        return Object.assign(a, { url });
      }),
    );

    return Object.assign(detail, { attachments });
  }

  async getAuditLog(id: string) {
    await this.assertExists(id);
    return this.auditLog.findByForm(RECOVERY_FORM_TYPE, id);
  }

  // ══════════════════════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════════════════════

  /** Quick status/notes change from the admin list. */
  async update(
    id: string,
    dto: UpdateRecoveryFormDto,
    actor: AuditActor,
  ): Promise<RecoveryFormDetail> {
    const existing = await this.findById(id);
    const oldStatus = existing.status;
    const oldNotes = existing.managerNotes;

    if (dto.status !== undefined) existing.status = dto.status;
    if (dto.managerNotes !== undefined)
      existing.managerNotes = dto.managerNotes;
    await this.formRepo.save(existing);

    try {
      if (dto.status !== undefined && dto.status !== oldStatus) {
        await this.auditLog.logStatusChange(
          RECOVERY_FORM_TYPE,
          id,
          actor,
          oldStatus,
          dto.status,
        );
      }
      if (dto.managerNotes !== undefined && dto.managerNotes !== oldNotes) {
        await this.auditLog.logUpdate(RECOVERY_FORM_TYPE, id, actor, [
          {
            fieldName: 'managerNotes',
            oldValue: oldNotes,
            newValue: dto.managerNotes,
          },
        ]);
      }
    } catch (err) {
      console.error('[needs-audit-log] failed to log recovery update:', err);
    }

    return this.findById(id);
  }

  /**
   * Full edit (admin). Replace semantics for damages / photos / documents:
   * an array present in the payload replaces the whole collection; an
   * omitted array leaves the collection untouched.
   */
  async updateFull(
    id: string,
    dto: UpdateRecoveryFormFullDto,
    actor: AuditActor,
  ): Promise<RecoveryFormDetail> {
    const existing = await this.findById(id);
    const before = scalarSnapshot(existing);

    if (dto.damages) this.assertUniqueDamageElements({ damages: dto.damages });
    if (dto.photos) this.assertValidAttachments('photo', dto.photos);
    if (dto.documents) this.assertValidAttachments('document', dto.documents);

    const { photos, documents, damages, status, managerNotes, ...scalars } =
      dto;

    await this.dataSource.transaction(async (manager) => {
      // scalar fields — only the provided ones
      const patch: Partial<RecoveryForm> = {
        ...(scalars as Partial<RecoveryForm>),
      };
      if (status !== undefined) patch.status = status;
      if (managerNotes !== undefined) patch.managerNotes = managerNotes;
      if (Object.keys(patch).length) {
        await manager.update(RecoveryForm, { id }, patch);
      }

      if (damages) {
        await manager.delete(RecoveryFormDamage, { recoveryFormId: id });
        const rows = damages.map((d, idx) =>
          manager.create(RecoveryFormDamage, {
            recoveryFormId: id,
            element: d.element,
            volume: d.volume ?? null,
            unit: DAMAGE_ELEMENT_UNITS[d.element],
            notes: d.notes ?? null,
            sortOrder: d.sortOrder ?? idx,
          }),
        );
        await manager.save(rows);
      }

      if (photos) {
        await manager.delete(NeedsFormAttachment, {
          formType: RECOVERY_FORM_TYPE,
          formId: id,
          kind: 'photo',
        });
        const rows = this.buildAttachmentRows(id, photos, []).map((r) =>
          manager.create(NeedsFormAttachment, r),
        );
        await manager.save(rows);
      }

      if (documents) {
        await manager.delete(NeedsFormAttachment, {
          formType: RECOVERY_FORM_TYPE,
          formId: id,
          kind: 'document',
        });
        const rows = this.buildAttachmentRows(id, [], documents).map((r) =>
          manager.create(NeedsFormAttachment, r),
        );
        await manager.save(rows);
      }
    });

    const updated = await this.findById(id);

    try {
      const changes = NeedsAuditLogService.diff(
        before,
        scalarSnapshot(updated),
      );
      if (damages) {
        changes.push({
          fieldName: 'damages',
          oldValue: stringify(existing.damages?.length ?? 0),
          newValue: stringify(updated.damages?.length ?? 0),
        });
      }
      await this.auditLog.logUpdate(RECOVERY_FORM_TYPE, id, actor, changes);
    } catch (err) {
      console.error(
        '[needs-audit-log] failed to log recovery full-update:',
        err,
      );
    }

    return updated;
  }

  async bulkUpdateStatus(
    ids: string[],
    status: FormStatus,
    actor: AuditActor,
  ): Promise<{ updated: number }> {
    const forms = await this.formRepo.find({ where: { id: In(ids) } });
    if (!forms.length) {
      throw new NotFoundException('No recovery forms found for provided ids');
    }

    await this.formRepo.update({ id: In(forms.map((f) => f.id)) }, { status });

    try {
      for (const f of forms) {
        if (f.status !== status) {
          await this.auditLog.logStatusChange(
            RECOVERY_FORM_TYPE,
            f.id,
            actor,
            f.status,
            status,
          );
        }
      }
    } catch (err) {
      console.error('[needs-audit-log] failed to log recovery bulk:', err);
    }

    return { updated: forms.length };
  }

  // ══════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════

  /**
   * Admin-only. Damages die via FK CASCADE; attachments are polymorphic
   * (no FK) so they are deleted explicitly in the same transaction.
   * S3 objects are NOT deleted here (accepted MVP compromise, plan §5) —
   * keys remain in the audit snapshot for a later cleanup script.
   */
  async remove(id: string, actor: AuditActor): Promise<{ deleted: true }> {
    const existing = await this.findById(id);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(NeedsFormAttachment, {
        formType: RECOVERY_FORM_TYPE,
        formId: id,
      });
      await manager.delete(RecoveryForm, { id });
    });

    try {
      await this.auditLog.logDelete(RECOVERY_FORM_TYPE, id, actor);
      await this.auditLog.logUpdate(RECOVERY_FORM_TYPE, id, actor, [
        {
          fieldName: 's3Keys',
          oldValue: existing.attachments.map((a) => a.s3Key).join(','),
          newValue: null,
        },
      ]);
    } catch (err) {
      console.error('[needs-audit-log] failed to log recovery delete:', err);
    }

    return { deleted: true };
  }

  // ══════════════════════════════════════════════════════════════
  // Business rules
  // ══════════════════════════════════════════════════════════════

  private assertUniqueDamageElements(dto: {
    damages: { element: string }[];
  }): void {
    const elements = dto.damages.map((d) => d.element);
    if (new Set(elements).size !== elements.length) {
      throw new BadRequestException(
        'damages must not contain duplicate elements',
      );
    }
  }

  /** Cross-field checks the DTO cannot express: MIME + size per kind. */
  private assertValidAttachments(
    kind: AttachmentKind,
    files: RecoveryAttachmentDto[],
  ): void {
    const allowedMimes: readonly string[] =
      kind === 'photo' ? PHOTO_MIME_TYPES : DOCUMENT_MIME_TYPES;
    const maxBytes = kind === 'photo' ? PHOTO_MAX_BYTES : DOCUMENT_MAX_BYTES;

    for (const f of files) {
      if (!allowedMimes.includes(f.mimeType)) {
        throw new BadRequestException(
          `Unsupported ${kind} mime type: ${f.mimeType}`,
        );
      }
      if (f.sizeBytes > maxBytes) {
        throw new BadRequestException(
          `${kind} "${f.originalName}" exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit`,
        );
      }
    }
  }

  private assertUniqueS3Keys(dto: CreateRecoveryFormDto): void {
    const keys = [
      ...dto.photos.map((p) => p.s3Key),
      ...(dto.documents ?? []).map((d) => d.s3Key),
    ];
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Attachments contain duplicate s3 keys');
    }
  }

  private buildAttachmentRows(
    formId: string,
    photos: RecoveryAttachmentDto[],
    documents: RecoveryAttachmentDto[],
  ): Array<Partial<NeedsFormAttachment>> {
    const toRow =
      (kind: AttachmentKind) =>
      (
        f: RecoveryAttachmentDto,
        idx: number,
      ): Partial<NeedsFormAttachment> => ({
        formType: RECOVERY_FORM_TYPE,
        formId,
        kind,
        s3Key: f.s3Key,
        publicUrl: null, // set by the upload flow (PR-2) or resolved on read
        originalName: f.originalName,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        sortOrder: f.sortOrder ?? idx,
      });
    return [...photos.map(toRow('photo')), ...documents.map(toRow('document'))];
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.formRepo.exists({ where: { id } });
    if (!exists) throw new NotFoundException(`Recovery form ${id} not found`);
  }
}
