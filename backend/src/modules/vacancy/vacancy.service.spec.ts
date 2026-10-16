// === ADDED: spec 003 — unit tests for the Vacancy status audit wiring ===
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VacancyService } from './vacancy.service';
import { Vacancy, VacancyStatus } from './entities/vacancy.entity';
import { EntityAuditService } from '../audit/entity-audit.service';
import { AuditedEntityType } from '../audit/audit-entity-type';

const ACTOR = { userId: 'staff-1', email: 'manager@test.local' };
const ID = 'a0000000-0000-4000-8000-000000000001';

describe('VacancyService — audited writes', () => {
  let service: VacancyService;
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
        .mockResolvedValue({ id: ID, status: VacancyStatus.DRAFT }),
      create: jest.fn((v: object) => v),
      save: jest.fn(),
    };
    manager = {
      findOne: jest.fn().mockResolvedValue({
        id: ID,
        status: VacancyStatus.DRAFT,
        managerNotes: null,
      }),
      findOneByOrFail: jest
        .fn()
        .mockResolvedValue({ status: VacancyStatus.DRAFT }),
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
        VacancyService,
        { provide: getRepositoryToken(Vacancy), useValue: repo },
        { provide: DataSource, useValue: { transaction } },
        { provide: EntityAuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(VacancyService);
  });

  it('update: audits a status carried by the generic update, under a row lock', async () => {
    await service.update(ID, { status: VacancyStatus.PUBLISHED }, ACTOR);

    expect(manager.findOne).toHaveBeenCalledWith(
      Vacancy,
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(audit.recordUpdate).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.VACANCY,
      ID,
      ACTOR,
      expect.objectContaining({
        oldStatus: VacancyStatus.DRAFT,
        newStatus: VacancyStatus.PUBLISHED,
      }),
    );
  });

  it('update: the lock query does not join relations (FOR UPDATE cannot span an outer join)', async () => {
    await service.update(ID, { status: VacancyStatus.PUBLISHED }, ACTOR);

    const [, options] = manager.findOne.mock.calls[0] as [
      unknown,
      { relations?: unknown },
    ];
    expect(options.relations).toBeUndefined();
  });

  it('update: throws NotFound and audits nothing for an unknown id', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(
      service.update(ID, { status: VacancyStatus.PUBLISHED }, ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(audit.recordUpdate).not.toHaveBeenCalled();
  });

  it('updateStatus: runs the change and the audit write in ONE transaction', async () => {
    await service.updateStatus(ID, VacancyStatus.PUBLISHED, ACTOR);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(audit.recordUpdate).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.VACANCY,
      ID,
      ACTOR,
      expect.objectContaining({
        oldStatus: VacancyStatus.DRAFT,
        newStatus: VacancyStatus.PUBLISHED,
      }),
    );
  });

  it('updateStatus: propagates an audit failure so the transaction rolls back', async () => {
    audit.recordUpdate.mockRejectedValue(new Error('audit down'));

    await expect(
      service.updateStatus(ID, VacancyStatus.PUBLISHED, ACTOR),
    ).rejects.toThrow('audit down');
  });

  it('remove: refuses a non-draft record and audits nothing', async () => {
    manager.findOne.mockResolvedValue({
      id: ID,
      status: VacancyStatus.PUBLISHED,
    });

    await expect(service.remove(ID, ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(manager.delete).not.toHaveBeenCalled();
    expect(audit.recordDeleted).not.toHaveBeenCalled();
  });

  it('remove: deletes a draft and records the deletion with its status', async () => {
    await service.remove(ID, ACTOR);

    expect(manager.delete).toHaveBeenCalledWith(Vacancy, ID);
    expect(audit.recordDeleted).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.VACANCY,
      ID,
      ACTOR,
      VacancyStatus.DRAFT,
    );
  });

  it('create: records the creation by the staff actor inside the insert transaction', async () => {
    await service.create(
      { titleUa: 'a', titleEn: 'b' } as never,
      'user-1',
      ACTOR,
    );

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(audit.recordCreated).toHaveBeenCalledWith(
      manager,
      AuditedEntityType.VACANCY,
      ID,
      ACTOR,
      expect.any(String),
    );
  });

  it('create: an audit failure rejects, so the insert rolls back', async () => {
    audit.recordCreated.mockRejectedValue(new Error('audit down'));

    await expect(
      service.create({ titleUa: 'a', titleEn: 'b' } as never, 'user-1', ACTOR),
    ).rejects.toThrow('audit down');
  });
});
