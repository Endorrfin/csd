import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WashFormAuditLog,
  AuditAction,
} from './entities/wash-form-audit-log.entity';

/** Identity of the actor performing the action. Null for anonymous public submit. */
export interface AuditActor {
  userId: string | null;
  email: string | null;
}

/** One change entry to log. */
export interface AuditChange {
  fieldName: string;
  oldValue: unknown;
  newValue: unknown;
}

/** Fields we never want to log verbatim (noise or sensitive). */
const NON_LOGGABLE_FIELDS = new Set(['createdAt', 'updatedAt', 'id']);

/**
 * Serialises a value for storage as text. Objects become JSON; primitives
 * stay as-is. Null stays null. Arrays use JSON to preserve structure.
 */
// export so callers (e.g. NeedsService) can safely stringify unknown audit values
export function stringify(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(WashFormAuditLog)
    private readonly repo: Repository<WashFormAuditLog>,
  ) {}

  /** Log creation event — metadata captures the snapshot of the new form. */
  async logCreate(
    washFormId: string,
    actor: AuditActor,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({
        washFormId,
        changedById: actor.userId,
        changedByEmail: actor.email,
        action: AuditAction.CREATED,
        fieldName: null,
        oldValue: null,
        newValue: null,
        metadata: { snapshot },
      }),
    );
  }

  /** Log deletion event. */
  async logDelete(washFormId: string, actor: AuditActor): Promise<void> {
    await this.repo.save(
      this.repo.create({
        washFormId,
        changedById: actor.userId,
        changedByEmail: actor.email,
        action: AuditAction.DELETED,
        fieldName: null,
        oldValue: null,
        newValue: null,
        metadata: null,
      }),
    );
  }

  /**
   * Log a status change as a dedicated action (separate from generic updates
   * so the audit UI can highlight them).
   */
  async logStatusChange(
    washFormId: string,
    actor: AuditActor,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    await this.repo.save(
      this.repo.create({
        washFormId,
        changedById: actor.userId,
        changedByEmail: actor.email,
        action: AuditAction.STATUS_CHANGED,
        fieldName: 'status',
        oldValue: oldStatus,
        newValue: newStatus,
        metadata: null,
      }),
    );
  }

  /** Log a set of field changes — one audit row per field for clean UI. */
  async logUpdate(
    washFormId: string,
    actor: AuditActor,
    changes: AuditChange[],
  ): Promise<void> {
    if (!changes.length) return;

    const rows = changes
      .filter((c) => !NON_LOGGABLE_FIELDS.has(c.fieldName))
      .map((c) =>
        this.repo.create({
          washFormId,
          changedById: actor.userId,
          changedByEmail: actor.email,
          action: AuditAction.UPDATED,
          fieldName: c.fieldName,
          oldValue: stringify(c.oldValue),
          newValue: stringify(c.newValue),
          metadata: null,
        }),
      );

    if (rows.length) await this.repo.save(rows);
  }

  /** Fetch full log for a single form, newest first. */
  async findByFormId(washFormId: string): Promise<WashFormAuditLog[]> {
    return this.repo.find({
      where: { washFormId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Build a diff between two plain-object snapshots.
   * Handles primitives, arrays (compared as JSON), and nested objects.
   */
  static diff(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): AuditChange[] {
    const changes: AuditChange[] = [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of keys) {
      if (NON_LOGGABLE_FIELDS.has(key)) continue;

      const oldValue = before[key];
      const newValue = after[key];

      // Deep compare via JSON — good enough for our simple record shapes.
      const oldSer = stringify(oldValue);
      const newSer = stringify(newValue);
      if (oldSer !== newSer) {
        changes.push({ fieldName: key, oldValue, newValue });
      }
    }

    return changes;
  }
}
