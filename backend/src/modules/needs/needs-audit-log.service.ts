// shared audit-log service for new needs forms ===
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NeedsFormAuditLog } from './entities/needs-form-audit-log.entity';
// Reuse the wash audit primitives (actor/change shapes + serializer + diff)
// so both logs behave identically for the admin UI.
import {
  AuditActor,
  AuditChange,
  AuditLogService,
  stringify,
} from './audit-log.service';

const NON_LOGGABLE_FIELDS = new Set(['createdAt', 'updatedAt', 'id']);

/**
 * formType-aware twin of AuditLogService, writing to the shared
 * needs_form_audit_log table. WASH stays on its own table/service — working
 * code is not refactored in this epic (implementation-plan §10).
 */
@Injectable()
export class NeedsAuditLogService {
  constructor(
    @InjectRepository(NeedsFormAuditLog)
    private readonly repo: Repository<NeedsFormAuditLog>,
  ) {}

  async logCreate(
    formType: string,
    formId: string,
    actor: AuditActor,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({
        formType,
        formId,
        changedById: actor.userId,
        changedByEmail: actor.email,
        action: 'created',
        fieldName: null,
        oldValue: null,
        newValue: null,
        metadata: { snapshot },
      }),
    );
  }

  async logDelete(
    formType: string,
    formId: string,
    actor: AuditActor,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({
        formType,
        formId,
        changedById: actor.userId,
        changedByEmail: actor.email,
        action: 'deleted',
        fieldName: null,
        oldValue: null,
        newValue: null,
        metadata: null,
      }),
    );
  }

  async logStatusChange(
    formType: string,
    formId: string,
    actor: AuditActor,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({
        formType,
        formId,
        changedById: actor.userId,
        changedByEmail: actor.email,
        action: 'status_changed',
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
        metadata: null,
      }),
    );
  }

  async logUpdate(
    formType: string,
    formId: string,
    actor: AuditActor,
    changes: AuditChange[],
  ): Promise<void> {
    if (!changes.length) return;

    const rows = changes
      .filter((c) => !NON_LOGGABLE_FIELDS.has(c.fieldName))
      .map((c) =>
        this.repo.create({
          formType,
          formId,
          changedById: actor.userId,
          changedByEmail: actor.email,
          action: 'updated' as const,
          fieldName: c.fieldName,
          oldValue: stringify(c.oldValue),
          newValue: stringify(c.newValue),
          metadata: null,
        }),
      );

    if (rows.length) await this.repo.save(rows);
  }

  /** Full log for one form, newest first. */
  async findByForm(
    formType: string,
    formId: string,
  ): Promise<NeedsFormAuditLog[]> {
    return this.repo.find({
      where: { formType, formId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Snapshot diff — same semantics as the wash implementation. */
  static diff(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): AuditChange[] {
    return AuditLogService.diff(before, after);
  }
}
