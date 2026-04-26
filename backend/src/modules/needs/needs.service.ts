import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { WashForm, FormStatus } from './entities/wash-form.entity';
import { WashFormItem } from './entities/wash-form-item.entity';
import { WashFormBorehole } from './entities/wash-form-borehole.entity';
import { WashFormTower } from './entities/wash-form-tower.entity';
import { WashFormPurification } from './entities/wash-form-purification.entity';
import { WashFormPump } from './entities/wash-form-pump.entity';
import { CreateWashFormDto } from './dto/create-wash-form.dto';
import { UpdateWashFormDto } from './dto/update-wash-form.dto';
import { UpdateWashFormFullDto } from './dto/update-wash-form-full.dto';
import { AuditActor, AuditLogService } from './audit-log.service';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Snapshot of form fields we use for audit diffs (no child arrays). */
type FormSnapshot = Record<string, unknown>;

@Injectable()
export class NeedsService {
  constructor(
    @InjectRepository(WashForm)
    private readonly washFormRepo: Repository<WashForm>,
    @InjectRepository(WashFormItem)
    private readonly washFormItemRepo: Repository<WashFormItem>,
    @InjectRepository(WashFormBorehole)
    private readonly boreholeRepo: Repository<WashFormBorehole>,
    @InjectRepository(WashFormTower)
    private readonly towerRepo: Repository<WashFormTower>,
    @InjectRepository(WashFormPurification)
    private readonly purificationRepo: Repository<WashFormPurification>,
    @InjectRepository(WashFormPump)
    private readonly pumpRepo: Repository<WashFormPump>,
    private readonly auditLog: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  // ══════════════════════════════════════════════════════════════
  // CREATE
  // ══════════════════════════════════════════════════════════════

  /**
   * Public — submit a new WASH needs form.
   * Enforces "at least one of boreholes / towers / purifications / pumps /
   * items must be present" rule at the service layer.
   */
  async create(
    dto: CreateWashFormDto,
    actor: AuditActor,
  ): Promise<WashForm> {
    this.assertAtLeastOneSection(dto);

    const {
      items,
      boreholes,
      towers,
      purifications,
      pumps,
      ...formData
    } = dto;

    // CHANGED: map all child arrays through the corresponding repo.create()
    // so TypeORM cascade saves them together with the parent.
    const form = this.washFormRepo.create({
      ...formData,
      boreholes: (boreholes ?? []).map((b, idx) =>
        this.boreholeRepo.create({ ...b, sortOrder: b.sortOrder ?? idx }),
      ),
      towers: (towers ?? []).map((t, idx) =>
        this.towerRepo.create({ ...t, sortOrder: t.sortOrder ?? idx }),
      ),
      purifications: (purifications ?? []).map((p, idx) =>
        this.purificationRepo.create({ ...p, sortOrder: p.sortOrder ?? idx }),
      ),
      pumps: (pumps ?? []).map((p, idx) =>
        this.pumpRepo.create({ ...p, sortOrder: p.sortOrder ?? idx }),
      ),
      items: (items ?? []).map((it, idx) =>
        this.washFormItemRepo.create({
          equipmentItemId: it.equipmentItemId,
          quantity: it.quantity,
          notes: it.notes,
          sortOrder: it.sortOrder ?? idx,
        }),
      ),
    });

    const saved = await this.washFormRepo.save(form);

    // Audit in a fire-and-forget try/catch so a logging failure does not
    // break user-facing submit. Errors go to stdout for CloudWatch.
    try {
      await this.auditLog.logCreate(saved.id, actor, {
        boreholesCount: saved.boreholes.length,
        towersCount: saved.towers.length,
        purificationsCount: saved.purifications.length,
        pumpsCount: saved.pumps.length,
        itemsCount: saved.items.length,
      });
    } catch (err) {
      console.error('[audit-log] failed to log create:', err);
    }

    return saved;
  }

  // ══════════════════════════════════════════════════════════════
  // READ
  // ══════════════════════════════════════════════════════════════

// CHANGED: extended options + sort whitelist + date range
  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: FormStatus;
    region?: string;
    search?: string;
    sortBy?: string;                // NEW
    sortOrder?: 'ASC' | 'DESC';     // NEW
    dateFrom?: string;              // NEW: ISO date (YYYY-MM-DD)
    dateTo?: string;                // NEW: ISO date (inclusive end-of-day)
  }): Promise<PaginatedResult<WashForm>> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;

    // NEW: whitelist — never interpolate raw user input into ORDER BY.
    const SORTABLE: Record<string, string> = {
      createdAt: 'form.createdAt',
      organizationName: 'form.organizationName',
      region: 'form.region',
      dependentPopulation: 'form.dependentPopulation',
      status: 'form.status',
    };
    const sortColumn =
      options?.sortBy && SORTABLE[options.sortBy]
        ? SORTABLE[options.sortBy]
        : 'form.createdAt';
    const sortDirection: 'ASC' | 'DESC' =
      options?.sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const qb = this.washFormRepo
      .createQueryBuilder('form')
      .leftJoinAndSelect('form.items', 'item')
      .leftJoinAndSelect('item.equipmentItem', 'equipment')
      .leftJoinAndSelect('equipment.category', 'category')
      .leftJoinAndSelect('form.boreholes', 'borehole')
      .leftJoinAndSelect('form.towers', 'tower')
      .leftJoinAndSelect('form.purifications', 'purification')
      .leftJoinAndSelect('form.pumps', 'pump')
      .orderBy(sortColumn, sortDirection); // CHANGED: whitelisted column

    if (options?.status) {
      qb.andWhere('form.status = :status', { status: options.status });
    }
    if (options?.region) {
      qb.andWhere('LOWER(form.region) LIKE :region', {
        region: `%${options.region.toLowerCase()}%`,
      });
    }
    if (options?.search) {
      const s = `%${options.search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(form.organizationName) LIKE :s OR LOWER(form.headName) LIKE :s OR LOWER(form.email) LIKE :s OR LOWER(form.objectName) LIKE :s)',
        { s },
      );
    }

    // NEW: date range on createdAt — dateTo is end-of-day inclusive
    if (options?.dateFrom) {
      qb.andWhere('form.createdAt >= :dateFrom', {
        dateFrom: new Date(options.dateFrom),
      });
    }
    if (options?.dateTo) {
      const dt = new Date(options.dateTo);
      dt.setUTCHours(23, 59, 59, 999);
      qb.andWhere('form.createdAt <= :dateTo', { dateTo: dt });
    }

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  // ══════════════════════════════════════════════════════════════
  // NEW: BULK STATUS UPDATE
  // ══════════════════════════════════════════════════════════════

  /**
   * Manager/Admin — bulk status update for multiple forms.
   * - Skips forms already at the target status (no-op, no audit noise).
   * - Single transaction for the SQL update.
   * - Audit log written per-form so individual histories stay accurate.
   */
  async bulkUpdateStatus(
    ids: string[],
    status: FormStatus,
    actor: AuditActor,
  ): Promise<{ updated: number; skipped: number }> {
    if (!ids?.length) {
      throw new BadRequestException('No form IDs provided');
    }

    const forms = await this.washFormRepo.find({
      where: { id: In(ids) },
      select: ['id', 'status'],
    });

    if (!forms.length) {
      throw new NotFoundException('No matching forms found');
    }

    const changed = forms.filter((f) => f.status !== status);
    const skipped = forms.length - changed.length;

    if (changed.length) {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          WashForm,
          { id: In(changed.map((f) => f.id)) },
          { status },
        );
      });

      // Per-form audit (after commit). Failures don't break the response.
      for (const f of changed) {
        try {
          await this.auditLog.logStatusChange(f.id, actor, f.status, status);
        } catch (err) {
          console.error('[audit-log] failed to log bulk status change:', err);
        }
      }
    }

    return { updated: changed.length, skipped };
  }

  async findById(id: string): Promise<WashForm> {
    const form = await this.washFormRepo.findOne({
      where: { id },
      relations: [
        'boreholes',
        'towers',
        'purifications',
        'pumps',
        'items',
        'items.equipmentItem',
        'items.equipmentItem.category',
      ],
    });
    if (!form) throw new NotFoundException('WASH form not found');

    // CHANGED: ensure child arrays are ordered by sortOrder for stable UI.
    form.boreholes.sort((a, b) => a.sortOrder - b.sortOrder);
    form.towers.sort((a, b) => a.sortOrder - b.sortOrder);
    form.purifications.sort((a, b) => a.sortOrder - b.sortOrder);
    form.pumps.sort((a, b) => a.sortOrder - b.sortOrder);
    form.items.sort((a, b) => a.sortOrder - b.sortOrder);

    return form;
  }

  // ══════════════════════════════════════════════════════════════
  // UPDATE — quick status/notes change
  // ══════════════════════════════════════════════════════════════

  /**
   * Manager/Admin — quick update of status and/or manager notes.
   * Used by the admin list inline status change.
   */
  async update(
    id: string,
    dto: UpdateWashFormDto,
    actor: AuditActor,
  ): Promise<WashForm> {
    const form = await this.findById(id);

    const oldStatus = form.status;
    const oldNotes = form.managerNotes;

    if (dto.status !== undefined) form.status = dto.status;
    if (dto.managerNotes !== undefined) form.managerNotes = dto.managerNotes;

    const saved = await this.washFormRepo.save(form);

    try {
      if (dto.status !== undefined && dto.status !== oldStatus) {
        await this.auditLog.logStatusChange(
          saved.id,
          actor,
          oldStatus,
          saved.status,
        );
      }
      if (
        dto.managerNotes !== undefined &&
        (dto.managerNotes ?? null) !== (oldNotes ?? null)
      ) {
        await this.auditLog.logUpdate(saved.id, actor, [
          {
            fieldName: 'managerNotes',
            oldValue: oldNotes,
            newValue: saved.managerNotes,
          },
        ]);
      }
    } catch (err) {
      console.error('[audit-log] failed to log quick update:', err);
    }

    return saved;
  }

  // ══════════════════════════════════════════════════════════════
  // UPDATE — full edit (Manager+)
  // ══════════════════════════════════════════════════════════════

  /**
   * Manager/Admin — full-form edit. Array sections use replace-semantics:
   *   - If the array is present in the payload, the existing collection is
   *     fully replaced (old rows deleted, new ones inserted).
   *   - If the array is omitted (undefined), the collection is left alone.
   *
   * Runs inside a transaction so the form update and all child-array
   * replacements land together or roll back together.
   */
  async updateFull(
    id: string,
    dto: UpdateWashFormFullDto,
    actor: AuditActor,
  ): Promise<WashForm> {
    // Load once (outside tx) to produce the "before" snapshot for audit.
    const existing = await this.findById(id);
    const beforeSnapshot = this.toSnapshot(existing);

    const {
      boreholes,
      towers,
      purifications,
      pumps,
      items,
      ...scalarFields
    } = dto;

    await this.dataSource.transaction(async (manager) => {
      // 1. Apply scalar field updates on the parent form.
      Object.assign(existing, scalarFields);
      await manager.save(existing);

      // 2. Replace child arrays where provided.
      if (boreholes !== undefined) {
        await manager.delete(WashFormBorehole, { washFormId: id });
        if (boreholes.length) {
          const rows = boreholes.map((b, idx) =>
            manager.create(WashFormBorehole, {
              ...b,
              washFormId: id,
              sortOrder: b.sortOrder ?? idx,
            }),
          );
          await manager.save(rows);
        }
      }

      if (towers !== undefined) {
        await manager.delete(WashFormTower, { washFormId: id });
        if (towers.length) {
          const rows = towers.map((t, idx) =>
            manager.create(WashFormTower, {
              ...t,
              washFormId: id,
              sortOrder: t.sortOrder ?? idx,
            }),
          );
          await manager.save(rows);
        }
      }

      if (purifications !== undefined) {
        await manager.delete(WashFormPurification, { washFormId: id });
        if (purifications.length) {
          const rows = purifications.map((p, idx) =>
            manager.create(WashFormPurification, {
              ...p,
              washFormId: id,
              sortOrder: p.sortOrder ?? idx,
            }),
          );
          await manager.save(rows);
        }
      }

      if (pumps !== undefined) {
        await manager.delete(WashFormPump, { washFormId: id });
        if (pumps.length) {
          const rows = pumps.map((p, idx) =>
            manager.create(WashFormPump, {
              ...p,
              washFormId: id,
              sortOrder: p.sortOrder ?? idx,
            }),
          );
          await manager.save(rows);
        }
      }

      if (items !== undefined) {
        await manager.delete(WashFormItem, { washFormId: id });
        if (items.length) {
          const rows = items.map((it, idx) =>
            manager.create(WashFormItem, {
              washFormId: id,
              equipmentItemId: it.equipmentItemId,
              quantity: it.quantity,
              notes: it.notes,
              sortOrder: it.sortOrder ?? idx,
            }),
          );
          await manager.save(rows);
        }
      }
    });

    // Re-load with fresh relations for the diff and the response.
    const updated = await this.findById(id);
    const afterSnapshot = this.toSnapshot(updated);

    try {
      const changes = AuditLogService.diff(beforeSnapshot, afterSnapshot);
      // Split status off into its own audit action if it changed.
      const statusChange = changes.find((c) => c.fieldName === 'status');
      const nonStatusChanges = changes.filter(
        (c) => c.fieldName !== 'status',
      );
      if (statusChange) {
        await this.auditLog.logStatusChange(
          id,
          actor,
          String(statusChange.oldValue ?? ''),
          String(statusChange.newValue ?? ''),
        );
      }
      if (nonStatusChanges.length) {
        await this.auditLog.logUpdate(id, actor, nonStatusChanges);
      }
    } catch (err) {
      console.error('[audit-log] failed to log full update:', err);
    }

    return updated;
  }

  // ══════════════════════════════════════════════════════════════
  // DELETE
  // ══════════════════════════════════════════════════════════════

  async remove(id: string, actor: AuditActor): Promise<void> {
    const form = await this.findById(id);
    // Log BEFORE deletion so the row exists; FK cascade will wipe the log
    // afterwards (that's fine — nothing else references a deleted form).
    try {
      await this.auditLog.logDelete(id, actor);
    } catch (err) {
      console.error('[audit-log] failed to log delete:', err);
    }
    await this.washFormRepo.remove(form);
  }

  // ══════════════════════════════════════════════════════════════
  // AUDIT LOG read-through
  // ══════════════════════════════════════════════════════════════

  async getAuditLog(id: string) {
    // Ensure the form exists first — avoids leaking IDs.
    await this.findById(id);
    return this.auditLog.findByFormId(id);
  }

  // ══════════════════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════════════════

  /** Throws 400 if the submission has no WASH activities and no items. */
  private assertAtLeastOneSection(dto: CreateWashFormDto): void {
    const hasAny =
      (dto.boreholes?.length ?? 0) > 0 ||
      (dto.towers?.length ?? 0) > 0 ||
      (dto.purifications?.length ?? 0) > 0 ||
      (dto.pumps?.length ?? 0) > 0 ||
      (dto.items?.length ?? 0) > 0;

    if (!hasAny) {
      throw new BadRequestException(
        'At least one section must be filled: boreholes, towers, purifications, pumps, or equipment items.',
      );
    }
  }

  /** Flattens a form into a plain snapshot for audit diffs. */
  private toSnapshot(form: WashForm): FormSnapshot {
    return {
      // Scalars
      region: form.region,
      regionEn: form.regionEn,
      district: form.district,
      districtEn: form.districtEn,
      community: form.community,
      communityEn: form.communityEn,
      communityCode: form.communityCode,
      settlement: form.settlement,
      settlementEn: form.settlementEn,
      settlementCode: form.settlementCode,
      organizationName: form.organizationName,
      headName: form.headName,
      headPhone: form.headPhone,
      email: form.email,
      objectName: form.objectName,
      dependentPopulation: form.dependentPopulation,
      socialFacilities: form.socialFacilities,
      installationDeadline: form.installationDeadline,
      replacementReason: form.replacementReason,
      status: form.status,
      managerNotes: form.managerNotes,
      // Child arrays — JSON-stringified shape for comparison.
      boreholes: form.boreholes?.map((b) => ({
        workType: b.workType,
        expectedFlowRate: b.expectedFlowRate,
        existingDepth: b.existingDepth,
        existingDebit: b.existingDebit,
        hasAquiferInfo: b.hasAquiferInfo,
        hasDesignInfo: b.hasDesignInfo,
        hasPassport: b.hasPassport,
        oldLocation: b.oldLocation,
        notes: b.notes,
      })),
      towers: form.towers?.map((t) => ({
        towerType: t.towerType,
        towerHeight: t.towerHeight,
        customHeight: t.customHeight,
        hasFoundation: t.hasFoundation,
        isFoundationSuitable: t.isFoundationSuitable,
        needsFoundationReconstruction: t.needsFoundationReconstruction,
        canSelfReconstruct: t.canSelfReconstruct,
        canProvideCrane: t.canProvideCrane,
        notes: t.notes,
      })),
      purifications: form.purifications?.map((p) => ({
        hasRoom: p.hasRoom,
        hasTemperatureControl: p.hasTemperatureControl,
        hasWaterInletDrainage: p.hasWaterInletDrainage,
        hasPowerSupply: p.hasPowerSupply,
        canMaintainSystem: p.canMaintainSystem,
        willingToProvideWater: p.willingToProvideWater,
        notes: p.notes,
      })),
      pumps: form.pumps?.map((p) => ({
        purpose: p.purpose,
        purposeOther: p.purposeOther,
        brand: p.brand,
        model: p.model,
        powerKw: p.powerKw,
        flowRateM3h: p.flowRateM3h,
        headM: p.headM,
        diameterInches: p.diameterInches,
        voltage: p.voltage,
        phases: p.phases,
        quantity: p.quantity,
        notes: p.notes,
      })),
      items: form.items?.map((it) => ({
        equipmentItemId: it.equipmentItemId,
        quantity: it.quantity,
        notes: it.notes,
      })),
    };
  }
}
