// === ADDED: spec 003 — status audit log writer/reader for procurement, vacancy, testimonial, complaint, inquiry ===
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  NeedsFormAuditLog,
  NeedsAuditAction,
} from '../needs/entities/needs-form-audit-log.entity';
import { resolveRequestId } from '../../common/logger/request-id';
import type { AuditActor } from './audit-actor';
import { AuditedEntityType } from './audit-entity-type';

export const DEFAULT_HISTORY_LIMIT = 100;
export const MAX_HISTORY_LIMIT = 500;

/**
 * The only keys ever stored in `metadata`. Never free text from the audited record:
 * the log is append-only and cannot be corrected, and complaints / inquiries carry
 * personal data (spec decision D3).
 */
export interface EntityAuditMetadata {
  requestId: string;
  /** Initial status for `created`, status held at deletion for `deleted`. */
  status?: string;
  /** True when `managerNotes` changed. The note text is never stored. */
  notesChanged?: boolean;
}

/** What the API returns for one entry. Deliberately has no user id and no raw metadata. */
export interface EntityAuditEntryDto {
  id: string;
  action: NeedsAuditAction;
  oldValue: string | null;
  newValue: string | null;
  changedByEmail: string | null;
  createdAt: Date;
  details: { status?: string; notesChanged?: boolean } | null;
}

export function toEntryDto(row: NeedsFormAuditLog): EntityAuditEntryDto {
  const meta = (row.metadata ?? {}) as Partial<EntityAuditMetadata>;
  const details: EntityAuditEntryDto['details'] = {};
  if (typeof meta.status === 'string') details.status = meta.status;
  if (typeof meta.notesChanged === 'boolean') {
    details.notesChanged = meta.notesChanged;
  }
  return {
    id: row.id,
    action: row.action,
    oldValue: row.oldValue,
    newValue: row.newValue,
    changedByEmail: row.changedByEmail,
    createdAt: row.createdAt,
    details: Object.keys(details).length ? details : null,
  };
}

/**
 * Every `record*` method takes the caller's `EntityManager` as a REQUIRED first argument.
 * That is the point: the audit row must be written inside the same transaction as the
 * change it describes (decision D2), and a call site without a transaction does not compile.
 */
@Injectable()
export class EntityAuditService {
  constructor(
    @InjectRepository(NeedsFormAuditLog)
    private readonly repo: Repository<NeedsFormAuditLog>,
  ) {}

  /** Staff-created record. Public submits are deliberately not audited (D13). */
  async recordCreated(
    manager: EntityManager,
    type: AuditedEntityType,
    id: string,
    actor: AuditActor,
    status: string,
  ): Promise<void> {
    await this.write(manager, type, id, actor, 'created', {
      metadata: { status },
    });
  }

  /**
   * One entry per status change. When notes changed in the same request the flag rides on
   * this entry instead of producing a second one.
   */
  async recordStatusChange(
    manager: EntityManager,
    type: AuditedEntityType,
    id: string,
    actor: AuditActor,
    oldStatus: string,
    newStatus: string,
    notesChanged = false,
  ): Promise<void> {
    await this.write(manager, type, id, actor, 'status_changed', {
      fieldName: 'status',
      oldValue: oldStatus,
      newValue: newStatus,
      metadata: notesChanged ? { notesChanged: true } : {},
    });
  }

  /** Notes changed without a status change. Records THAT it changed, never the text. */
  async recordNotesChanged(
    manager: EntityManager,
    type: AuditedEntityType,
    id: string,
    actor: AuditActor,
  ): Promise<void> {
    await this.write(manager, type, id, actor, 'updated', {
      fieldName: 'managerNotes',
      metadata: { notesChanged: true },
    });
  }

  /**
   * Single entry point for every update path (PATCH :id, :id/status, and the legacy
   * publish / approve / reject wrappers that delegate to `update`). It decides what, if
   * anything, to record, so no module repeats the comparison:
   *   - status changed (with or without notes) -> one `status_changed` entry
   *   - only notes changed                    -> one `updated` entry (flag, no text)
   *   - nothing relevant changed              -> nothing is written
   * An omitted field (`undefined`) means "not part of this request", not "cleared".
   */
  async recordUpdate(
    manager: EntityManager,
    type: AuditedEntityType,
    id: string,
    actor: AuditActor,
    change: {
      oldStatus: string;
      newStatus?: string;
      oldNotes?: string | null;
      newNotes?: string | null;
    },
  ): Promise<void> {
    const statusChanged =
      change.newStatus !== undefined && change.newStatus !== change.oldStatus;
    const notesChanged =
      change.newNotes !== undefined &&
      (change.newNotes ?? '') !== (change.oldNotes ?? '');

    if (statusChanged) {
      await this.recordStatusChange(
        manager,
        type,
        id,
        actor,
        change.oldStatus,
        change.newStatus as string,
        notesChanged,
      );
    } else if (notesChanged) {
      await this.recordNotesChanged(manager, type, id, actor);
    }
  }

  /** The row has no foreign key to the record, so this entry outlives the deletion. */
  async recordDeleted(
    manager: EntityManager,
    type: AuditedEntityType,
    id: string,
    actor: AuditActor,
    status: string,
  ): Promise<void> {
    await this.write(manager, type, id, actor, 'deleted', {
      metadata: { status },
    });
  }

  /** Newest first. Works for ids whose record no longer exists. */
  async findByEntity(
    type: AuditedEntityType,
    id: string,
    limit?: number,
  ): Promise<NeedsFormAuditLog[]> {
    const take = Math.min(
      Math.max(limit ?? DEFAULT_HISTORY_LIMIT, 1),
      MAX_HISTORY_LIMIT,
    );
    return this.repo.find({
      where: { formType: type, formId: id },
      order: { createdAt: 'DESC', id: 'DESC' },
      take,
    });
  }

  private async write(
    manager: EntityManager,
    type: AuditedEntityType,
    id: string,
    actor: AuditActor,
    action: NeedsAuditAction,
    extra: {
      fieldName?: string;
      oldValue?: string;
      newValue?: string;
      metadata: Omit<EntityAuditMetadata, 'requestId'>;
    },
  ): Promise<void> {
    const repo = manager.getRepository(NeedsFormAuditLog);
    await repo.save(
      repo.create({
        formType: type,
        formId: id,
        changedById: actor.userId,
        changedByEmail: actor.email,
        action,
        fieldName: extra.fieldName ?? null,
        oldValue: extra.oldValue ?? null,
        newValue: extra.newValue ?? null,
        metadata: { ...extra.metadata, requestId: resolveRequestId() },
        // CHANGED: stamped here, after the caller took its row lock. The column default is
        // now(), which in PostgreSQL is the transaction START time, so two near-simultaneous
        // changes could otherwise be ordered differently from the order they were applied.
        createdAt: new Date(),
      }),
    );
  }
}
