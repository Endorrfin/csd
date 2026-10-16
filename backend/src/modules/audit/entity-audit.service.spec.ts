// === ADDED: spec 003 — unit tests for the status audit log service ===
import type { EntityManager, Repository } from 'typeorm';
import { NeedsFormAuditLog } from '../needs/entities/needs-form-audit-log.entity';
import { AuditedEntityType } from './audit-entity-type';
import {
  DEFAULT_HISTORY_LIMIT,
  EntityAuditService,
  MAX_HISTORY_LIMIT,
  toEntryDto,
} from './entity-audit.service';

const ID = '3b0c1f0e-6f0a-4c36-9a53-0a7a3f7a9a11';
const ACTOR = { userId: 'user-1', email: 'manager@test.local' };

function makeService() {
  const saved: Partial<NeedsFormAuditLog>[] = [];
  const txRepo = {
    create: jest.fn((v: Partial<NeedsFormAuditLog>) => v),
    save: jest.fn((v: Partial<NeedsFormAuditLog>) => {
      saved.push(v);
      return Promise.resolve(v);
    }),
  };
  const manager = {
    getRepository: jest.fn(() => txRepo),
  } as unknown as EntityManager;
  const readRepo = { find: jest.fn().mockResolvedValue([]) };
  const service = new EntityAuditService(
    readRepo as unknown as Repository<NeedsFormAuditLog>,
  );
  return { service, manager, saved, readRepo, txRepo };
}

describe('EntityAuditService', () => {
  it('writes through the caller-supplied transaction manager, not its own repository', async () => {
    const { service, manager, txRepo, readRepo } = makeService();

    await service.recordStatusChange(
      manager,
      AuditedEntityType.COMPLAINT,
      ID,
      ACTOR,
      'new',
      'in_review',
    );

    expect(txRepo.save).toHaveBeenCalledTimes(1);
    expect(readRepo.find).not.toHaveBeenCalled();
  });

  it('records a status change with actor, old and new value', async () => {
    const { service, manager, saved } = makeService();

    await service.recordStatusChange(
      manager,
      AuditedEntityType.TESTIMONIAL,
      ID,
      ACTOR,
      'pending',
      'approved',
    );

    expect(saved[0]).toMatchObject({
      formType: 'testimonial',
      formId: ID,
      changedById: 'user-1',
      changedByEmail: 'manager@test.local',
      action: 'status_changed',
      fieldName: 'status',
      oldValue: 'pending',
      newValue: 'approved',
    });
  });

  it('marks notesChanged on the status entry without creating a second entry', async () => {
    const { service, manager, saved } = makeService();

    await service.recordStatusChange(
      manager,
      AuditedEntityType.INQUIRY,
      ID,
      ACTOR,
      'new',
      'read',
      true,
    );

    expect(saved).toHaveLength(1);
    expect(saved[0].metadata).toMatchObject({ notesChanged: true });
  });

  it('records a notes-only change as flag + field name, never the text', async () => {
    const { service, manager, saved } = makeService();

    await service.recordNotesChanged(
      manager,
      AuditedEntityType.COMPLAINT,
      ID,
      ACTOR,
    );

    expect(saved[0]).toMatchObject({
      action: 'updated',
      fieldName: 'managerNotes',
      oldValue: null,
      newValue: null,
    });
    expect(saved[0].metadata).toMatchObject({ notesChanged: true });
  });

  it('stores only whitelisted metadata keys', async () => {
    const { service, manager, saved } = makeService();

    await service.recordCreated(
      manager,
      AuditedEntityType.PROCUREMENT,
      ID,
      ACTOR,
      'draft',
    );
    await service.recordDeleted(
      manager,
      AuditedEntityType.PROCUREMENT,
      ID,
      ACTOR,
      'draft',
    );
    await service.recordStatusChange(
      manager,
      AuditedEntityType.PROCUREMENT,
      ID,
      ACTOR,
      'draft',
      'published',
      true,
    );

    const allowed = new Set(['requestId', 'status', 'notesChanged']);
    for (const row of saved) {
      for (const key of Object.keys(row.metadata ?? {})) {
        expect(allowed.has(key)).toBe(true);
      }
      expect(typeof row.metadata?.requestId).toBe('string');
    }
  });

  it('records deletion with the status held at deletion time', async () => {
    const { service, manager, saved } = makeService();

    await service.recordDeleted(
      manager,
      AuditedEntityType.VACANCY,
      ID,
      ACTOR,
      'draft',
    );

    expect(saved[0]).toMatchObject({ action: 'deleted', formType: 'vacancy' });
    expect(saved[0].metadata).toMatchObject({ status: 'draft' });
  });

  it('propagates a failed audit write so the surrounding transaction rolls back', async () => {
    const { service, manager, txRepo } = makeService();
    txRepo.save.mockRejectedValueOnce(new Error('insert failed'));

    await expect(
      service.recordStatusChange(
        manager,
        AuditedEntityType.COMPLAINT,
        ID,
        ACTOR,
        'new',
        'closed',
      ),
    ).rejects.toThrow('insert failed');
  });

  describe('findByEntity', () => {
    it('applies the default limit and newest-first order', async () => {
      const { service, readRepo } = makeService();

      await service.findByEntity(AuditedEntityType.COMPLAINT, ID);

      expect(readRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { formType: 'complaint', formId: ID },
          order: { createdAt: 'DESC', id: 'DESC' },
          take: DEFAULT_HISTORY_LIMIT,
        }),
      );
    });

    it('clamps the limit to the hard maximum', async () => {
      const { service, readRepo } = makeService();

      await service.findByEntity(AuditedEntityType.COMPLAINT, ID, 100000);

      expect(readRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: MAX_HISTORY_LIMIT }),
      );
    });
  });
});

describe('toEntryDto', () => {
  const row = {
    id: 'row-1',
    formType: 'complaint',
    formId: ID,
    changedById: 'user-1',
    changedBy: { id: 'user-1', passwordHash: 'secret' },
    changedByEmail: 'manager@test.local',
    action: 'status_changed',
    fieldName: 'status',
    oldValue: 'new',
    newValue: 'closed',
    metadata: { requestId: 'req-1', notesChanged: true, injected: '<b>x</b>' },
    createdAt: new Date('2026-10-16T10:00:00Z'),
  } as unknown as NeedsFormAuditLog;

  it('does not expose the user id, the user relation or the request id', () => {
    const dto = toEntryDto(row);
    const serialised = JSON.stringify(dto);

    expect(Object.keys(dto).sort()).toEqual(
      [
        'action',
        'changedByEmail',
        'createdAt',
        'details',
        'id',
        'newValue',
        'oldValue',
      ].sort(),
    );
    expect(serialised).not.toContain('user-1');
    expect(serialised).not.toContain('passwordHash');
    expect(serialised).not.toContain('req-1');
  });

  it('copies only the whitelisted detail keys', () => {
    expect(toEntryDto(row).details).toEqual({ notesChanged: true });
  });

  it('returns null details when nothing is whitelisted', () => {
    const plain = { ...row, metadata: { requestId: 'req-1' } };
    expect(
      toEntryDto(plain as unknown as NeedsFormAuditLog).details,
    ).toBeNull();
  });
});
