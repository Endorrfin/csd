// === ADDED: spec 003 — unit tests for the Procurement status audit wiring ===
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProcurementService } from './procurement.service';
import { Procurement, ProcurementStatus } from './entities/procurement.entity';
import { EntityAuditService } from '../audit/entity-audit.service';
import { AuditedEntityType } from '../audit/audit-entity-type';

const ACTOR = { userId: 'staff-1', email: 'manager@test.local' };
const ID = 'a0000000-0000-4000-8000-000000000001';

describe('ProcurementService — audited writes', () => {
  let service: ProcurementService;
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
        .mockResolvedValue({ id: ID, status: ProcurementStatus.DRAFT }),
      create: jest.fn((v: object) => v),
      save: jest.fn(),
    };
    manager = {
      findOne: jest.fn().mockResolvedValue({
        id: ID,
        status: ProcurementStatus.DRAFT,
        managerNotes: null,
      }),
      findOneByOrFail: jest
        .fn()
        .mockResolvedValue({ status: ProcurementStatus.DRAFT }),
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
        ProcurementService,
        { provide: getRepositoryToken(Procurement), useValue: repo },
        { provide: DataSource, useValue: { transaction } },
        { provide: EntityAuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(ProcurementService);
  });

  it('update: audits a status carried by the generic update, under a row lock', async () => {
    await service.update(ID, { status: ProcurementStatus.PUBLISHED }, ACTOR);

    expect(manager.findOne).toHaveBeenCalledWith(
      Procurement,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(audit.recordUpdate).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.PROCUREMENT,
      ID,
      ACTOR,
      expect.objectContaining({
        oldStatus: ProcurementStatus.DRAFT,
        newStatus: ProcurementStatus.PUBLISHED,
      }),
    );
  });

  it('update: the lock query does not join relations (FOR UPDATE cannot span an outer join)', async () => {
    await service.update(ID, { status: ProcurementStatus.PUBLISHED }, ACTOR);

    const [, options] = manager.findOne.mock.calls[0] as [
      unknown,
      { relations?: unknown },
    ];
    expect(options.relations).toBeUndefined();
  });

  it('update: throws NotFound and audits nothing for an unknown id', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(
      service.update(ID, { status: ProcurementStatus.PUBLISHED }, ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.recordUpdate).not.toHaveBeenCalled();
  });

  it('updateStatus: runs the change and the audit write in ONE transaction', async () => {
    await service.updateStatus(ID, ProcurementStatus.PUBLISHED, ACTOR);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(audit.recordUpdate).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.PROCUREMENT,
      ID,
      ACTOR,
      expect.objectContaining({
        oldStatus: ProcurementStatus.DRAFT,
        newStatus: ProcurementStatus.PUBLISHED,
      }),
    );
  });

  it('updateStatus: propagates an audit failure so the transaction rolls back', async () => {
    audit.recordUpdate.mockRejectedValue(new Error('audit down'));

    await expect(
      service.updateStatus(ID, ProcurementStatus.PUBLISHED, ACTOR),
    ).rejects.toThrow('audit down');
  });

  it('remove: refuses a non-draft record and audits nothing', async () => {
    manager.findOne.mockResolvedValue({
      id: ID,
      status: ProcurementStatus.PUBLISHED,
    });

    await expect(service.remove(ID, ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(manager.remove).not.toHaveBeenCalled();
    expect(audit.recordDeleted).not.toHaveBeenCalled();
  });

  it('remove: deletes a draft and records the deletion with its status', async () => {
    await service.remove(ID, ACTOR);

    expect(manager.remove).toHaveBeenCalled();
    expect(audit.recordDeleted).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.PROCUREMENT,
      ID,
      ACTOR,
      ProcurementStatus.DRAFT,
    );
  });

  it('create: records the creation by the staff actor inside the insert transaction', async () => {
    await service.create(
      { tenderTitleUa: 'a', tenderTitleEn: 'b' },
      'user-1',
      ACTOR,
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(audit.recordCreated).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.PROCUREMENT,
      ID,
      ACTOR,
      expect.any(String),
    );
  });

  it('create: an audit failure rejects, so the insert rolls back', async () => {
    audit.recordCreated.mockRejectedValue(new Error('audit down'));

    await expect(
      service.create(
        { tenderTitleUa: 'a', tenderTitleEn: 'b' },
        'user-1',
        ACTOR,
      ),
    ).rejects.toThrow('audit down');
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
