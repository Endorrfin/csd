// === ADDED: spec 003 — unit tests for the complaint status audit wiring ===
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ComplaintService } from './complaint.service';
import { Complaint, ComplaintStatus } from './entities/complaint.entity';
import { EntityAuditService } from '../audit/entity-audit.service';
import { AuditedEntityType } from '../audit/audit-entity-type';

const ACTOR = { userId: 'staff-1', email: 'manager@test.local' };
const ID = 'c0000000-0000-4000-8000-000000000001';

describe('ComplaintService — audited writes', () => {
  let service: ComplaintService;
  let repo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let manager: { findOne: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let audit: { recordUpdate: jest.Mock; recordDeleted: jest.Mock };
  let transaction: jest.Mock;

  beforeEach(async () => {
    repo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    manager = { findOne: jest.fn(), update: jest.fn(), delete: jest.fn() };
    audit = { recordUpdate: jest.fn(), recordDeleted: jest.fn() };
    transaction = jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
      cb(manager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintService,
        { provide: getRepositoryToken(Complaint), useValue: repo },
        { provide: DataSource, useValue: { transaction } },
        { provide: EntityAuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(ComplaintService);

    manager.findOne.mockResolvedValue({
      id: ID,
      status: ComplaintStatus.NEW,
      managerNotes: null,
    });
    repo.findOne.mockResolvedValue({ id: ID, status: ComplaintStatus.NEW });
  });

  describe('update (PATCH :id)', () => {
    it('audits a status change carried by the generic update', async () => {
      await service.update(ID, { status: ComplaintStatus.RESOLVED }, ACTOR);

      expect(audit.recordUpdate).toHaveBeenCalledWith(
        manager,
        AuditedEntityType.COMPLAINT,
        ID,
        ACTOR,
        expect.objectContaining({
          oldStatus: ComplaintStatus.NEW,
          newStatus: ComplaintStatus.RESOLVED,
        }),
      );
    });

    it('locks the row and writes through the transaction manager', async () => {
      await service.update(ID, { status: ComplaintStatus.RESOLVED }, ACTOR);

      expect(manager.findOne).toHaveBeenCalledWith(
        Complaint,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(manager.update).toHaveBeenCalledWith(Complaint, ID, {
        status: ComplaintStatus.RESOLVED,
      });
    });

    it('throws NotFound and audits nothing for an unknown id', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.update(ID, { status: ComplaintStatus.RESOLVED }, ACTOR),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(audit.recordUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus (PATCH :id/status)', () => {
    it('passes old and new status plus the note comparison to the audit log', async () => {
      await service.updateStatus(
        ID,
        ComplaintStatus.IN_REVIEW,
        'internal note',
        ACTOR,
      );

      expect(audit.recordUpdate).toHaveBeenCalledWith(
        manager,
        AuditedEntityType.COMPLAINT,
        ID,
        ACTOR,
        {
          oldStatus: ComplaintStatus.NEW,
          newStatus: ComplaintStatus.IN_REVIEW,
          oldNotes: null,
          newNotes: 'internal note',
        },
      );
    });

    it('runs update and audit in ONE transaction', async () => {
      await service.updateStatus(
        ID,
        ComplaintStatus.IN_REVIEW,
        undefined,
        ACTOR,
      );

      expect(transaction).toHaveBeenCalledTimes(1);
    });

    it('propagates an audit failure so the transaction rolls back', async () => {
      audit.recordUpdate.mockRejectedValue(new Error('audit down'));

      await expect(
        service.updateStatus(ID, ComplaintStatus.IN_REVIEW, undefined, ACTOR),
      ).rejects.toThrow('audit down');
    });
  });

  describe('remove', () => {
    it('refuses to delete a complaint that is not closed and audits nothing', async () => {
      await expect(service.remove(ID, ACTOR)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(manager.delete).not.toHaveBeenCalled();
      expect(audit.recordDeleted).not.toHaveBeenCalled();
    });

    it('deletes a closed complaint and records the deletion with its status', async () => {
      manager.findOne.mockResolvedValue({
        id: ID,
        status: ComplaintStatus.CLOSED,
      });

      await service.remove(ID, ACTOR);

      expect(manager.delete).toHaveBeenCalledWith(Complaint, ID);
      expect(audit.recordDeleted).toHaveBeenCalledWith(
        manager,
        AuditedEntityType.COMPLAINT,
        ID,
        ACTOR,
        ComplaintStatus.CLOSED,
      );
    });
  });

  describe('create (public)', () => {
    it('is untouched: no transaction and no audit entry for an anonymous submit', async () => {
      repo.create.mockReturnValue({});
      repo.save.mockResolvedValue({ id: ID });

      await service.create({
        category: 'other',
        description: 'x',
      } as never);

      expect(transaction).not.toHaveBeenCalled();
      expect(audit.recordUpdate).not.toHaveBeenCalled();
    });
  });
});
