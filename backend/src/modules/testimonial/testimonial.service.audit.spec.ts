// === ADDED: spec 003 — unit tests for the Testimonial status audit wiring ===
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TestimonialService } from './testimonial.service';
import { Testimonial, TestimonialStatus } from './entities/testimonial.entity';
import { EntityAuditService } from '../audit/entity-audit.service';
import { AuditedEntityType } from '../audit/audit-entity-type';

const ACTOR = { userId: 'staff-1', email: 'manager@test.local' };
const ID = 'a0000000-0000-4000-8000-000000000001';

describe('TestimonialService — audited writes', () => {
  let service: TestimonialService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let manager: {
    findOne: jest.Mock;
    findOneByOrFail: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    remove: jest.Mock;
  };
  let audit: {
    recordUpdate: jest.Mock;
    recordDeleted: jest.Mock;
    recordCreated: jest.Mock;
  };
  let transaction: jest.Mock;

  beforeEach(async () => {
    repo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: ID, status: TestimonialStatus.PENDING }),
      create: jest.fn((v: object) => v),
      save: jest.fn(),
    };
    manager = {
      findOne: jest.fn().mockResolvedValue({
        id: ID,
        status: TestimonialStatus.PENDING,
        managerNotes: null,
      }),
      findOneByOrFail: jest
        .fn()
        .mockResolvedValue({ status: TestimonialStatus.PENDING }),
      save: jest.fn((v: object) => Promise.resolve({ id: ID, ...v })),
      update: jest.fn(),
      delete: jest.fn(),
      remove: jest.fn(),
    };
    audit = {
      recordUpdate: jest.fn(),
      recordDeleted: jest.fn(),
      recordCreated: jest.fn(),
    };
    transaction = jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
      cb(manager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestimonialService,
        { provide: getRepositoryToken(Testimonial), useValue: repo },
        { provide: DataSource, useValue: { transaction } },
        { provide: EntityAuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(TestimonialService);
  });

  it('update: audits a status carried by the generic update, under a row lock', async () => {
    await service.update(ID, { status: TestimonialStatus.APPROVED }, ACTOR);

    expect(manager.findOne).toHaveBeenCalledWith(
      Testimonial,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(audit.recordUpdate).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.TESTIMONIAL,
      ID,
      ACTOR,
      expect.objectContaining({
        oldStatus: TestimonialStatus.PENDING,
        newStatus: TestimonialStatus.APPROVED,
      }),
    );
  });

  it('update: the lock query does not join relations (FOR UPDATE cannot span an outer join)', async () => {
    await service.update(ID, { status: TestimonialStatus.APPROVED }, ACTOR);

    const [, options] = manager.findOne.mock.calls[0] as [
      unknown,
      { relations?: unknown },
    ];
    expect(options.relations).toBeUndefined();
  });

  it('update: throws NotFound and audits nothing for an unknown id', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(
      service.update(ID, { status: TestimonialStatus.APPROVED }, ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.recordUpdate).not.toHaveBeenCalled();
  });

  it('updateStatus: runs the change and the audit write in ONE transaction', async () => {
    await service.updateStatus(
      ID,
      TestimonialStatus.APPROVED,
      undefined,
      ACTOR,
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(audit.recordUpdate).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.TESTIMONIAL,
      ID,
      ACTOR,
      expect.objectContaining({
        oldStatus: TestimonialStatus.PENDING,
        newStatus: TestimonialStatus.APPROVED,
      }),
    );
  });

  it('updateStatus: propagates an audit failure so the transaction rolls back', async () => {
    audit.recordUpdate.mockRejectedValue(new Error('audit down'));

    await expect(
      service.updateStatus(ID, TestimonialStatus.APPROVED, undefined, ACTOR),
    ).rejects.toThrow('audit down');
  });

  it('updateStatus: passes the note comparison to the audit log, never the text', async () => {
    await service.updateStatus(
      ID,
      TestimonialStatus.APPROVED,
      'internal note',
      ACTOR,
    );

    expect(audit.recordUpdate).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.TESTIMONIAL,
      ID,
      ACTOR,
      expect.objectContaining({ oldNotes: null, newNotes: 'internal note' }),
    );
  });

  it('remove: any testimonial can be deleted, and the deletion is recorded with its status', async () => {
    await service.remove(ID, ACTOR);

    expect(manager.delete).toHaveBeenCalledWith(Testimonial, ID);
    expect(audit.recordDeleted).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.TESTIMONIAL,
      ID,
      ACTOR,
      TestimonialStatus.PENDING,
    );
  });

  it('setVerified: is not audited (spec decision D6)', async () => {
    repo.findOne.mockResolvedValue({ id: ID });
    (repo as unknown as { update: jest.Mock }).update = jest.fn();

    await service.setVerified(ID, true);

    expect(audit.recordUpdate).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('create (public): is untouched, with no transaction and no audit entry', async () => {
    repo.save.mockResolvedValue({ id: ID });

    await service.create({ authorName: 'a', text: 'b' });

    expect(transaction).not.toHaveBeenCalled();
    expect(audit.recordCreated).not.toHaveBeenCalled();
  });

  describe('findByIdForAdmin (spec 004)', () => {
    it('loads the record with no relations, so no creator user is attached', async () => {
      repo.findOne.mockResolvedValue({ id: ID });

      await service.findByIdForAdmin(ID);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: ID } });
    });

    it('throws NotFound for an unknown id', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findByIdForAdmin(ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
