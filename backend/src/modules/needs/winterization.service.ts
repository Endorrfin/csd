// PR-W1 WinterizationService («Підготовка до зими»)
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource, In, Repository } from 'typeorm';
import { WinterizationForm } from './entities/winterization-form.entity';
import { WinterizationFormNeed } from './entities/winterization-form-need.entity';
import { NeedsFormAttachment } from './entities/needs-form-attachment.entity';
import { FormStatus } from './entities/wash-form.entity';
import { CreateWinterizationFormDto } from './dto/create-winterization-form.dto';
import { WinterizationAttachmentDto } from './dto/winterization-attachment.dto';
import { WinterizationNeedDto } from './dto/winterization-need.dto';
import { UpdateWinterizationFormDto } from './dto/update-winterization-form.dto';
import { UpdateWinterizationFormFullDto } from './dto/update-winterization-form-full.dto';
import {
  WinterizationAdminQueryDto,
  WINTERIZATION_SORTABLE_COLUMNS,
} from './dto/winterization-admin-query.dto';
import { AuditActor, stringify } from './audit-log.service';
import { NeedsAuditLogService } from './needs-audit-log.service';
import { FormNumberService } from './form-number.service';
// presigned GET for the admin detail view (files live in the private bucket)
import { UploadService } from '../upload/upload.service';
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
  GENERATOR_ROWS_MAX,
  HOUSEHOLD_ENABLED_ENV,
  HOUSEHOLD_NEED_CATEGORY_MAP,
  NEED_CATEGORIES_BY_APPLICANT_TYPE,
  NEED_CATEGORY_RULES,
  NEED_ITEM_UNITS,
  NEED_ITEMS_BY_CATEGORY,
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
  PHOTO_REQUIRED_CATEGORIES,
  REPEATABLE_ITEM_CATEGORIES,
  SOLID_FUEL_UNITS,
  WINTERIZATION_FORM_TYPE,
  WINTERIZATION_NUMBER_PREFIX,
  WINTERIZATION_PHOTOS_MIN_FOR_WORKS,
} from './winterization.constants';
import type {
  AttachmentKind,
  NeedCategory,
  WinterizationApplicantType,
} from './winterization.constants';

export interface PaginatedWinterizationForms {
  data: WinterizationForm[];
  total: number;
  page: number;
  limit: number;
}

export type WinterizationFormDetail = WinterizationForm & {
  attachments: NeedsFormAttachment[];
};

/** Attachment enriched with a short-lived presigned GET url. */
export type AttachmentWithUrl = NeedsFormAttachment & { url: string | null };
export type WinterizationFormWithUrls = WinterizationForm & {
  attachments: AttachmentWithUrl[];
};

/** SADD block persisted for every applicant type (derived for households). */
type BeneficiaryCounts = Pick<
  WinterizationForm,
  | 'directBeneficiaries'
  | 'idpCount'
  | 'childrenCount'
  | 'pwdCount'
  | 'elderlyCount'
>;

// ── Block nulls ──
// A payload may legally carry fields of a block that does not belong to the
// chosen applicant type: `ValidateIf` switches the validators OFF, and
// `whitelist: true` does NOT strip a known property. So every foreign block is
// explicitly nulled before persisting. Written as `satisfies`-checked literals
// (not computed key lists) so the compiler verifies each field exists and is
// nullable.

const INSTITUTION_BLOCK_NULLS = {
  facilityName: null,
  facilityKind: null,
  facilityKindOther: null,
  streetAddress: null,
  heatingSource: null,
  heatingSourceOther: null,
  heatedArea: null,
  backupPower: null,
  buildingCondition: null,
} satisfies Partial<WinterizationForm>;

const MUNICIPALITY_BLOCK_NULLS = {
  populationTotal: null,
  settlementsCovered: null,
  frontlineStatus: null,
  targetFacilities: null,
} satisfies Partial<WinterizationForm>;

/** Collected by ОМС and інституція alike, never by a household. */
const ORGANIZATION_SHARED_NULLS = {
  contactPosition: null,
  situationDescription: null,
  cofinancing: null,
  cofinancingDetails: null,
  logistics: null,
  docsAvailable: null,
  indirectBeneficiaries: null,
  staffCount: null,
} satisfies Partial<WinterizationForm>;

const HOUSEHOLD_BLOCK_NULLS = {
  hhStreetAddress: null,
  hhHouseNumber: null,
  hhVulnerabilities: null,
  hhAdults: null,
  hhChildren: null,
  hhElderly: null,
  hhPwd: null,
  hhHeatingType: null,
  hhHeatingTypeOther: null,
  hhCriticalNeed: null,
} satisfies Partial<WinterizationForm>;

/** Scalar fields tracked in audit diffs (child arrays are logged as counts). */
function scalarSnapshot(form: WinterizationForm): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...form };
  delete rest.needs;
  delete rest.attachments;
  delete rest.createdAt;
  delete rest.updatedAt;
  return rest;
}

@Injectable()
export class WinterizationService {
  constructor(
    @InjectRepository(WinterizationForm)
    private readonly formRepo: Repository<WinterizationForm>,
    @InjectRepository(WinterizationFormNeed)
    private readonly needRepo: Repository<WinterizationFormNeed>,
    @InjectRepository(NeedsFormAttachment)
    private readonly attachmentRepo: Repository<NeedsFormAttachment>,
    private readonly auditLog: NeedsAuditLogService,
    private readonly formNumber: FormNumberService,
    private readonly dataSource: DataSource,
    private readonly uploadService: UploadService,
    private readonly config: ConfigService,
    @InjectPinoLogger(WinterizationService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Audit writes are fire-and-forget by design: an audit gap is preferable to a
   * rejected community submission (`ARCHITECTURE.md` §14.3). That trade-off only
   * holds while the failure stays visible, so this is the single place it is
   * recorded. The message is deliberately stable and the operation goes in a
   * field rather than the text — that is what a CloudWatch metric filter matches
   * and what Logs Insights groups by.
   */
  private logAuditFailure(err: unknown, auditOp: string): void {
    this.logger.error({ err, auditOp }, 'audit log write failed');
  }

  // ══════════════════════════════════════════════════════════════
  // CREATE (public submit)
  // ══════════════════════════════════════════════════════════════

  async create(
    dto: CreateWinterizationFormDto,
    actor: AuditActor,
  ): Promise<{ id: string; trackingNumber: string }> {
    this.assertHouseholdAllowed(dto.applicantType);

    // Defaults here (not `?? []` at every use site) keep formData free of the
    // three child collections, which are persisted separately.
    const { photos = [], documents = [], needs = [], ...formData } = dto;

    const needCategories = this.resolveNeedCategories(dto);
    this.assertCategoriesAllowed(dto.applicantType, needCategories);
    this.assertNeedsConsistency(dto.applicantType, needCategories, needs);
    this.assertPhotoRequirement(needCategories, photos);
    this.assertValidAttachments('photo', photos);
    this.assertValidAttachments('document', documents);
    this.assertUniqueS3Keys(photos, documents);

    const beneficiaries = this.resolveBeneficiaries(dto);

    const saved = await this.dataSource.transaction(async (manager) => {
      const trackingNumber = await this.formNumber.nextTrackingNumber(
        manager,
        WINTERIZATION_FORM_TYPE,
        WINTERIZATION_NUMBER_PREFIX,
      );

      const form = manager.create(WinterizationForm, {
        ...formData,
        ...this.foreignBlockNulls(dto.applicantType),
        ...this.categoryScalarNulls(needCategories),
        ...this.dependentFieldNulls(dto),
        needCategories,
        ...beneficiaries,
        trackingNumber,
        needs: needs.map((row, idx) =>
          manager.create(WinterizationFormNeed, this.toNeedRow(row, idx)),
        ),
      });
      const savedForm = await manager.save(form);

      const attachmentRows = this.buildAttachmentRows(
        savedForm.id,
        photos,
        documents,
      ).map((row) => manager.create(NeedsFormAttachment, row));
      if (attachmentRows.length) await manager.save(attachmentRows);

      return savedForm;
    });

    // Fire-and-forget: a logging failure must not break the public submit.
    try {
      await this.auditLog.logCreate(WINTERIZATION_FORM_TYPE, saved.id, actor, {
        trackingNumber: saved.trackingNumber,
        applicantType: saved.applicantType,
        needCategories: saved.needCategories,
        needsCount: needs.length,
        photosCount: photos.length,
        documentsCount: documents.length,
      });
    } catch (err) {
      this.logAuditFailure(err, 'winterization.create');
    }

    return { id: saved.id, trackingNumber: saved.trackingNumber };
  }

  // ══════════════════════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════════════════════

  async findAll(
    query: WinterizationAdminQueryDto,
  ): Promise<PaginatedWinterizationForms> {
    const qb = this.formRepo.createQueryBuilder('f');

    if (query.status)
      qb.andWhere('f.status = :status', { status: query.status });
    if (query.region)
      qb.andWhere('f.region ILIKE :region', { region: `%${query.region}%` });
    if (query.applicantType)
      qb.andWhere('f.applicantType = :applicantType', {
        applicantType: query.applicantType,
      });
    if (query.facilityKind)
      qb.andWhere('f.facilityKind = :facilityKind', {
        facilityKind: query.facilityKind,
      });
    // needCategories is a text[] column — membership test, not equality.
    // `@> ARRAY[...]` (not `= ANY(...)`) so the GIN index can be used.
    if (query.needCategory)
      qb.andWhere('f.needCategories @> ARRAY[:needCategory]::text[]', {
        needCategory: query.needCategory,
      });
    if (query.urgency)
      qb.andWhere('f.urgency = :urgency', { urgency: query.urgency });
    if (query.search) {
      // trackingNumber / organizationName / facilityName only — never PII contacts.
      qb.andWhere(
        '(f.trackingNumber ILIKE :s OR f.organizationName ILIKE :s OR f.facilityName ILIKE :s)',
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
      query.sortBy && WINTERIZATION_SORTABLE_COLUMNS.includes(query.sortBy)
        ? query.sortBy
        : 'createdAt';
    qb.orderBy(`f.${sortBy}`, query.sortOrder ?? 'DESC');

    const [data, total] = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return { data, total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<WinterizationFormDetail> {
    const form = await this.formRepo.findOne({ where: { id } });
    if (!form)
      throw new NotFoundException(`Winterization form ${id} not found`);

    const attachments = await this.attachmentRepo.find({
      where: { formType: WINTERIZATION_FORM_TYPE, formId: id },
      order: { kind: 'ASC', sortOrder: 'ASC' },
    });

    return Object.assign(form, { attachments });
  }

  /**
   * Admin detail read: findById plus a short-lived presigned GET `url` per
   * attachment (files live in the private bucket, so this is the only way to
   * view them). URL generation is best-effort per file — an S3 hiccup yields
   * url:null rather than a failed request.
   */
  async findByIdWithUrls(id: string): Promise<WinterizationFormWithUrls> {
    const detail = await this.findById(id);

    const attachments: AttachmentWithUrl[] = await Promise.all(
      detail.attachments.map(async (a) => {
        let url: string | null = null;
        try {
          url = await this.uploadService.getNeedsFileUrl(a.s3Key);
        } catch (err: unknown) {
          this.logger.error(
            { err, s3Key: a.s3Key },
            'failed to presign a needs attachment URL',
          );
        }
        return Object.assign(a, { url });
      }),
    );

    return Object.assign(detail, { attachments });
  }

  async getAuditLog(id: string) {
    await this.assertExists(id);
    return this.auditLog.findByForm(WINTERIZATION_FORM_TYPE, id);
  }

  // ══════════════════════════════════════════════════════════════
  // UPDATE
  // ══════════════════════════════════════════════════════════════

  /** Quick status/notes change from the admin list. */
  async update(
    id: string,
    dto: UpdateWinterizationFormDto,
    actor: AuditActor,
  ): Promise<WinterizationFormDetail> {
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
          WINTERIZATION_FORM_TYPE,
          id,
          actor,
          oldStatus,
          dto.status,
        );
      }
      if (dto.managerNotes !== undefined && dto.managerNotes !== oldNotes) {
        await this.auditLog.logUpdate(WINTERIZATION_FORM_TYPE, id, actor, [
          {
            fieldName: 'managerNotes',
            oldValue: oldNotes,
            newValue: dto.managerNotes,
          },
        ]);
      }
    } catch (err) {
      this.logAuditFailure(err, 'winterization.update');
    }

    return this.findById(id);
  }

  /**
   * Full edit (admin). Replace semantics for needs / photos / documents: an
   * array present in the payload replaces the whole collection; an omitted
   * array leaves the collection untouched.
   *
   * The household gate is re-checked against the RESULTING applicant type so an
   * admin edit cannot smuggle in a household application while the flag is off.
   */
  async updateFull(
    id: string,
    dto: UpdateWinterizationFormFullDto,
    actor: AuditActor,
  ): Promise<WinterizationFormDetail> {
    const existing = await this.findById(id);
    const before = scalarSnapshot(existing);

    const applicantType = dto.applicantType ?? existing.applicantType;
    this.assertHouseholdAllowed(applicantType);

    const needCategories = dto.needCategories ?? existing.needCategories;
    this.assertCategoriesAllowed(applicantType, needCategories);
    if (dto.needs)
      this.assertNeedsConsistency(applicantType, needCategories, dto.needs);
    if (dto.photos) this.assertValidAttachments('photo', dto.photos);
    if (dto.documents) this.assertValidAttachments('document', dto.documents);

    const { photos, documents, needs, status, managerNotes, ...scalars } = dto;

    await this.dataSource.transaction(async (manager) => {
      const patch: Partial<WinterizationForm> = {
        ...(scalars as Partial<WinterizationForm>),
        // Re-null foreign blocks only when the driving field is being changed;
        // otherwise an untouched block would be wiped by a partial edit.
        ...(dto.applicantType ? this.foreignBlockNulls(applicantType) : {}),
        ...(dto.needCategories ? this.categoryScalarNulls(needCategories) : {}),
      };
      if (status !== undefined) patch.status = status;
      if (managerNotes !== undefined) patch.managerNotes = managerNotes;
      if (Object.keys(patch).length) {
        await manager.update(WinterizationForm, { id }, patch);
      }

      if (needs) {
        await manager.delete(WinterizationFormNeed, {
          winterizationFormId: id,
        });
        const rows = needs.map((row, idx) =>
          manager.create(WinterizationFormNeed, {
            winterizationFormId: id,
            ...this.toNeedRow(row, idx),
          }),
        );
        if (rows.length) await manager.save(rows);
      }

      if (photos) {
        await manager.delete(NeedsFormAttachment, {
          formType: WINTERIZATION_FORM_TYPE,
          formId: id,
          kind: 'photo',
        });
        const rows = this.buildAttachmentRows(id, photos, []).map((r) =>
          manager.create(NeedsFormAttachment, r),
        );
        if (rows.length) await manager.save(rows);
      }

      if (documents) {
        await manager.delete(NeedsFormAttachment, {
          formType: WINTERIZATION_FORM_TYPE,
          formId: id,
          kind: 'document',
        });
        const rows = this.buildAttachmentRows(id, [], documents).map((r) =>
          manager.create(NeedsFormAttachment, r),
        );
        if (rows.length) await manager.save(rows);
      }
    });

    const updated = await this.findById(id);

    try {
      const changes = NeedsAuditLogService.diff(
        before,
        scalarSnapshot(updated),
      );
      if (needs) {
        changes.push({
          fieldName: 'needs',
          oldValue: stringify(existing.needs?.length ?? 0),
          newValue: stringify(updated.needs?.length ?? 0),
        });
      }
      await this.auditLog.logUpdate(
        WINTERIZATION_FORM_TYPE,
        id,
        actor,
        changes,
      );
    } catch (err) {
      this.logAuditFailure(err, 'winterization.fullUpdate');
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
      throw new NotFoundException(
        'No winterization forms found for provided ids',
      );
    }

    await this.formRepo.update({ id: In(forms.map((f) => f.id)) }, { status });

    try {
      for (const f of forms) {
        if (f.status !== status) {
          await this.auditLog.logStatusChange(
            WINTERIZATION_FORM_TYPE,
            f.id,
            actor,
            f.status,
            status,
          );
        }
      }
    } catch (err) {
      this.logAuditFailure(err, 'winterization.bulkStatusChange');
    }

    return { updated: forms.length };
  }

  // ══════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════

  /**
   * Admin-only. Need rows die via FK CASCADE; attachments are polymorphic (no
   * FK) so they are deleted explicitly in the same transaction. S3 objects are
   * NOT deleted here (accepted MVP compromise, same as recovery) — the keys stay
   * in the audit trail for a later cleanup script.
   */
  async remove(id: string, actor: AuditActor): Promise<{ deleted: true }> {
    const existing = await this.findById(id);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(NeedsFormAttachment, {
        formType: WINTERIZATION_FORM_TYPE,
        formId: id,
      });
      await manager.delete(WinterizationForm, { id });
    });

    try {
      await this.auditLog.logDelete(WINTERIZATION_FORM_TYPE, id, actor);
      await this.auditLog.logUpdate(WINTERIZATION_FORM_TYPE, id, actor, [
        {
          fieldName: 's3Keys',
          oldValue: existing.attachments.map((a) => a.s3Key).join(','),
          newValue: null,
        },
      ]);
    } catch (err) {
      this.logAuditFailure(err, 'winterization.delete');
    }

    return { deleted: true };
  }

  // ══════════════════════════════════════════════════════════════
  // Feature gate — household applications (implementation-plan §7)
  // ══════════════════════════════════════════════════════════════

  /**
   * Households are DESIGNED but switched off at launch. Enabling them is a
   * management decision (direct assistance to individuals triggers additional
   * Ukrainian tax-reporting duties), so the gate is an env flag rather than a
   * code change: WINTERIZATION_HOUSEHOLD_ENABLED=true.
   *
   * This guard exists because the UI card being `disabled` protects nothing —
   * the endpoint is public, so the rule has to live on the server.
   */
  private get householdEnabled(): boolean {
    return this.config.get<string>(HOUSEHOLD_ENABLED_ENV, 'false') === 'true';
  }

  private assertHouseholdAllowed(
    applicantType: WinterizationApplicantType,
  ): void {
    if (applicantType === 'household' && !this.householdEnabled) {
      throw new UnprocessableEntityException(
        'Household applications are not accepted yet — the winterization form currently serves local authorities and institutions only',
      );
    }
  }

  // ══════════════════════════════════════════════════════════════
  // Business rules
  // ══════════════════════════════════════════════════════════════

  /**
   * A household never fills the category checkboxes — it picks one critical
   * need, which maps 1:1 onto a category. Deriving server-side keeps analytics
   * and the XLSX export uniform across applicant types (and ignores whatever a
   * crafted household payload might put in needCategories).
   */
  private resolveNeedCategories(
    dto: CreateWinterizationFormDto,
  ): NeedCategory[] {
    if (dto.applicantType === 'household') {
      if (!dto.hhCriticalNeed) {
        throw new BadRequestException(
          'hhCriticalNeed is required for household applicants',
        );
      }
      return [HOUSEHOLD_NEED_CATEGORY_MAP[dto.hhCriticalNeed]];
    }

    const categories = dto.needCategories ?? [];
    if (!categories.length) {
      throw new BadRequestException(
        'needCategories must contain at least one category',
      );
    }
    return categories;
  }

  private assertCategoriesAllowed(
    applicantType: WinterizationApplicantType,
    categories: NeedCategory[],
  ): void {
    const allowed: readonly string[] =
      NEED_CATEGORIES_BY_APPLICANT_TYPE[applicantType];
    for (const category of categories) {
      if (!allowed.includes(category)) {
        throw new BadRequestException(
          `Need category "${category}" is not available for applicant type "${applicantType}"`,
        );
      }
    }
  }

  /**
   * Cross-field rules the DTO cannot express (implementation-plan §2, крок 3):
   * no orphan rows, item∈category, per-category minimum rows/quantities,
   * duplicate items, generator row cap.
   *
   * The per-category MINIMUMS apply to ОМС/інституція only. A household never
   * fills a specification block — its need is a single `hhCriticalNeed`, budgeted
   * from the standard package (SN201B cash equivalent / SN201C heating kit), so
   * requiring an itemised row there would reject every valid household submit.
   * The structural checks still run for households in case rows are sent anyway.
   */
  private assertNeedsConsistency(
    applicantType: WinterizationApplicantType,
    categories: NeedCategory[],
    rows: WinterizationNeedDto[],
  ): void {
    const selected = new Set<string>(categories);

    for (const row of rows) {
      if (!selected.has(row.category)) {
        throw new BadRequestException(
          `needs contains a row for category "${row.category}" which is not selected in needCategories`,
        );
      }
      const allowedItems: readonly string[] =
        NEED_ITEMS_BY_CATEGORY[row.category];
      if (!allowedItems.includes(row.item)) {
        throw new BadRequestException(
          `Item "${row.item}" is not valid for category "${row.category}"`,
        );
      }
    }

    if (applicantType !== 'household') {
      for (const category of categories) {
        const rule = NEED_CATEGORY_RULES[category];
        const categoryRows = rows.filter((r) => r.category === category);

        if (rule.requiresRows && categoryRows.length === 0) {
          throw new BadRequestException(
            `Category "${category}" requires at least one specified item`,
          );
        }
        if (
          rule.requiresQuantity &&
          !categoryRows.some((r) => typeof r.quantity === 'number')
        ) {
          throw new BadRequestException(
            `Category "${category}" requires a quantity on at least one item — the request cannot be budgeted otherwise`,
          );
        }
      }
    }

    // Only `generators` may repeat an item (one row per power rating).
    const repeatable: readonly string[] = REPEATABLE_ITEM_CATEGORIES;
    const seen = new Set<string>();
    for (const row of rows) {
      if (repeatable.includes(row.category)) continue;
      const key = `${row.category}:${row.item}`;
      if (seen.has(key)) {
        throw new BadRequestException(
          `needs contains duplicate item "${row.item}" in category "${row.category}"`,
        );
      }
      seen.add(key);
    }

    const generatorRows = rows.filter(
      (r) => r.category === 'generators',
    ).length;
    if (generatorRows > GENERATOR_ROWS_MAX) {
      throw new BadRequestException(
        `Category "generators" supports at most ${GENERATOR_ROWS_MAX} rows`,
      );
    }
  }

  /**
   * Photos are evidence for a BoQ, so they are mandatory only where there is
   * something to measure — repairs and insulation. A fuel or NFI request is not
   * blocked (plan §2, крок 6).
   */
  private assertPhotoRequirement(
    categories: NeedCategory[],
    photos: WinterizationAttachmentDto[],
  ): void {
    const worksCategories: readonly string[] = PHOTO_REQUIRED_CATEGORIES;
    const needsEvidence = categories.some((c) => worksCategories.includes(c));
    if (needsEvidence && photos.length < WINTERIZATION_PHOTOS_MIN_FOR_WORKS) {
      throw new BadRequestException(
        `At least ${WINTERIZATION_PHOTOS_MIN_FOR_WORKS} photos are required when repair or insulation works are requested`,
      );
    }
  }

  /** Cross-field checks the DTO cannot express: MIME + size per kind. */
  private assertValidAttachments(
    kind: AttachmentKind,
    files: WinterizationAttachmentDto[],
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

  private assertUniqueS3Keys(
    photos: WinterizationAttachmentDto[],
    documents: WinterizationAttachmentDto[],
  ): void {
    const keys = [...photos, ...documents].map((f) => f.s3Key);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Attachments contain duplicate s3 keys');
    }
  }

  /**
   * SADD counts. For ОМС/інституція they come straight from the form; for a
   * household they are DERIVED from the composition so the reporting columns are
   * never NULL and the XLSX/analytics treat all applicant types alike.
   *
   * The three household buckets are treated as DISJOINT («Дорослі 18–59»,
   * «Діти до 18», «Особи 60+») — the UI must label them that way.
   */
  private resolveBeneficiaries(
    dto: CreateWinterizationFormDto,
  ): BeneficiaryCounts {
    if (dto.applicantType !== 'household') {
      const {
        directBeneficiaries,
        idpCount,
        childrenCount,
        pwdCount,
        elderlyCount,
      } = dto;
      if (
        directBeneficiaries === undefined ||
        idpCount === undefined ||
        childrenCount === undefined ||
        pwdCount === undefined ||
        elderlyCount === undefined
      ) {
        // Defence in depth: DTO ValidateIf already requires these here.
        throw new BadRequestException(
          'Beneficiary counts are required for municipality and institution applicants',
        );
      }
      return {
        directBeneficiaries,
        idpCount,
        childrenCount,
        pwdCount,
        elderlyCount,
      };
    }

    const adults = dto.hhAdults ?? 0;
    const children = dto.hhChildren ?? 0;
    const elderly = dto.hhElderly ?? 0;
    const total = adults + children + elderly;
    if (total < 1) {
      throw new BadRequestException(
        'Household composition must contain at least one person',
      );
    }

    return {
      directBeneficiaries: total,
      idpCount: (dto.hhVulnerabilities ?? []).includes('idp') ? total : 0,
      childrenCount: children,
      pwdCount: dto.hhPwd ?? 0,
      elderlyCount: elderly,
    };
  }

  // ── Persistence helpers ──

  private foreignBlockNulls(
    applicantType: WinterizationApplicantType,
  ): Partial<WinterizationForm> {
    switch (applicantType) {
      case 'household':
        return {
          ...INSTITUTION_BLOCK_NULLS,
          ...MUNICIPALITY_BLOCK_NULLS,
          ...ORGANIZATION_SHARED_NULLS,
        };
      case 'institution':
        return { ...MUNICIPALITY_BLOCK_NULLS, ...HOUSEHOLD_BLOCK_NULLS };
      case 'municipality':
      default:
        return { ...INSTITUTION_BLOCK_NULLS, ...HOUSEHOLD_BLOCK_NULLS };
    }
  }

  /** Scalars that belong to a category the applicant did not select. */
  private categoryScalarNulls(
    categories: NeedCategory[],
  ): Partial<WinterizationForm> {
    const has = (c: NeedCategory): boolean => categories.includes(c);
    return {
      ...(has('solid_fuel')
        ? {}
        : { solidFuelBoilerCount: null, solidFuelStorageAvailable: null }),
      ...(has('heating_system_repair')
        ? {}
        : { heatingRepairDescription: null }),
      ...(has('resilience_point_equipment')
        ? {}
        : { resiliencePointStatus: null, resiliencePointCapacity: null }),
      ...(has('liquid_fuel') ? {} : { liquidFuelMonthsNeeded: null }),
      ...(has('other') ? {} : { needCategoryOther: null }),
    };
  }

  /** Fields whose relevance depends on another answer rather than a category. */
  private dependentFieldNulls(
    dto: CreateWinterizationFormDto,
  ): Partial<WinterizationForm> {
    return {
      ...(dto.estimatedCost === undefined || dto.estimatedCost === null
        ? { costBasis: null }
        : {}),
      ...(dto.otherDonors ? {} : { otherDonorsDetails: null }),
      ...(dto.cofinancing === 'no' ? { cofinancingDetails: null } : {}),
    };
  }

  private toNeedRow(
    row: WinterizationNeedDto,
    idx: number,
  ): Partial<WinterizationFormNeed> {
    const isGenerator = row.category === 'generators';
    return {
      category: row.category,
      item: row.item,
      quantity: row.quantity ?? null,
      unit: this.resolveUnit(row),
      // kW / fuel / purpose are meaningful for generators only.
      powerKw: isGenerator ? (row.powerKw ?? null) : null,
      fuelType: isGenerator ? (row.fuelType ?? null) : null,
      purpose: isGenerator ? (row.purpose ?? null) : null,
      details: row.details ?? null,
      sortOrder: row.sortOrder ?? idx,
    };
  }

  /**
   * Unit is snapshotted server-side from the item catalog. Solid fuel is the one
   * category where the applicant's choice wins — coal in tonnes vs firewood in
   * m³ (or stacked m³) are both legitimate ways to state the same order.
   */
  private resolveUnit(row: WinterizationNeedDto): string | null {
    const solidFuelUnits: readonly string[] = SOLID_FUEL_UNITS;
    if (
      row.category === 'solid_fuel' &&
      row.unit &&
      solidFuelUnits.includes(row.unit)
    ) {
      return row.unit;
    }
    return NEED_ITEM_UNITS[row.item];
  }

  private buildAttachmentRows(
    formId: string,
    photos: WinterizationAttachmentDto[],
    documents: WinterizationAttachmentDto[],
  ): Array<Partial<NeedsFormAttachment>> {
    const toRow =
      (kind: AttachmentKind) =>
      (
        f: WinterizationAttachmentDto,
        idx: number,
      ): Partial<NeedsFormAttachment> => ({
        formType: WINTERIZATION_FORM_TYPE,
        formId,
        kind,
        s3Key: f.s3Key,
        publicUrl: null, // private bucket — resolved as a presigned GET on read
        originalName: f.originalName,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        sortOrder: f.sortOrder ?? idx,
      });
    return [...photos.map(toRow('photo')), ...documents.map(toRow('document'))];
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.formRepo.exists({ where: { id } });
    if (!exists)
      throw new NotFoundException(`Winterization form ${id} not found`);
  }
}
