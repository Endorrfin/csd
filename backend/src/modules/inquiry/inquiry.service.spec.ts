import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
// CHANGED: status audit log collaborators (spec 003)
import { DataSource } from 'typeorm';
import { EntityAuditService } from '../audit/entity-audit.service';
import { AuditedEntityType } from '../audit/audit-entity-type';
import { InquiryService } from './inquiry.service';
import {
  Inquiry,
  InquiryStatus,
  InquiryReason,
  InquiryLang,
} from './entities/inquiry.entity';

// Minimal repo mock — only the methods InquiryService actually calls
const repoMock = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const ACTOR = { userId: 'staff-1', email: 'admin@test.local' };

describe('InquiryService', () => {
  let service: InquiryService;
  let repo: ReturnType<typeof repoMock>;
  // CHANGED: transactional writes go through the manager handed out by DataSource.transaction
  let manager: { findOne: jest.Mock; update: jest.Mock; delete: jest.Mock };
  let audit: {
    recordUpdate: jest.Mock;
    recordDeleted: jest.Mock;
  };

  beforeEach(async () => {
    manager = { findOne: jest.fn(), update: jest.fn(), delete: jest.fn() };
    audit = { recordUpdate: jest.fn(), recordDeleted: jest.fn() };
    const dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) =>
        cb(manager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiryService,
        { provide: getRepositoryToken(Inquiry), useFactory: repoMock },
        { provide: DataSource, useValue: dataSource },
        { provide: EntityAuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(InquiryService);
    repo = module.get(getRepositoryToken(Inquiry));
  });

  describe('create', () => {
    it('persists the inquiry as-is (status default comes from the entity)', async () => {
      const dto = {
        reason: InquiryReason.GENERAL,
        preferredLang: InquiryLang.UA,
        email: 'olha@example.com',
        message: 'Hi',
      };
      const built = { ...dto } as Inquiry;
      const saved = { ...built, id: 'uuid-1' };
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toEqual(saved);
    });
  });

  describe('exportCsv', () => {
    it('builds a CSV with a header row and quotes fields containing commas', async () => {
      const record = {
        createdAt: new Date('2026-05-24T10:00:00Z'),
        status: InquiryStatus.NEW,
        reason: InquiryReason.GENERAL,
        reasonOther: null,
        name: 'Olha',
        email: 'olha@example.com',
        phone: null,
        messengerType: null,
        messengerHandle: null,
        preferredLang: InquiryLang.UA,
        message: 'Hello, world', // comma → must be quoted
        consent: true,
        managerNotes: null,
      } as Inquiry;

      const qb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([record]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const csv = await service.exportCsv({ lang: 'en' });
      const lines = csv.split('\n');

      expect(lines[0].startsWith('#,Created,Status,Reason')).toBe(true);
      expect(lines[1]).toContain('general');
      expect(lines[1]).toContain('"Hello, world"'); // comma-bearing field quoted
      expect(lines[1]).toContain('yes'); // consent rendered
    });
  });

  describe('findById', () => {
    it('throws NotFound when the inquiry does not exist', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    const existing = { id: 'uuid-1', status: InquiryStatus.NEW } as Inquiry;

    beforeEach(() => {
      manager.findOne.mockResolvedValue(existing);
      repo.findOne.mockResolvedValue({
        ...existing,
        status: InquiryStatus.READ,
      });
    });

    it('omits managerNotes from the update when not provided', async () => {
      await service.updateStatus(
        'uuid-1',
        InquiryStatus.READ,
        undefined,
        ACTOR,
      );

      expect(manager.update).toHaveBeenCalledWith(Inquiry, 'uuid-1', {
        status: InquiryStatus.READ,
      });
    });

    it('locks the row for update before reading the old status', async () => {
      await service.updateStatus(
        'uuid-1',
        InquiryStatus.READ,
        undefined,
        ACTOR,
      );

      expect(manager.findOne).toHaveBeenCalledWith(
        Inquiry,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });

    it('records the change inside the same transaction with the verified actor', async () => {
      await service.updateStatus('uuid-1', InquiryStatus.READ, 'note', ACTOR);

      expect(audit.recordUpdate).toHaveBeenCalledWith(
        manager,
        AuditedEntityType.INQUIRY,
        'uuid-1',
        ACTOR,
        expect.objectContaining({
          oldStatus: InquiryStatus.NEW,
          newStatus: InquiryStatus.READ,
          newNotes: 'note',
        }),
      );
    });

    it('rejects when the audit write fails, so the transaction rolls back', async () => {
      audit.recordUpdate.mockRejectedValue(new Error('audit down'));

      await expect(
        service.updateStatus('uuid-1', InquiryStatus.READ, undefined, ACTOR),
      ).rejects.toThrow('audit down');
    });

    it('throws NotFound for an unknown id and writes nothing', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('nope', InquiryStatus.READ, undefined, ACTOR),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(manager.update).not.toHaveBeenCalled();
      expect(audit.recordUpdate).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('rejects deletion unless the inquiry is ARCHIVED', async () => {
      manager.findOne.mockResolvedValue({
        id: 'uuid-1',
        status: InquiryStatus.NEW,
      });

      await expect(service.remove('uuid-1', ACTOR)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(manager.delete).not.toHaveBeenCalled();
      expect(audit.recordDeleted).not.toHaveBeenCalled();
    });

    it('deletes an ARCHIVED inquiry', async () => {
      manager.findOne.mockResolvedValue({
        id: 'uuid-1',
        status: InquiryStatus.ARCHIVED,
      });
      manager.delete.mockResolvedValue(undefined);

      await service.remove('uuid-1', ACTOR);

      expect(manager.delete).toHaveBeenCalledWith(Inquiry, 'uuid-1');
      expect(audit.recordDeleted).toHaveBeenCalledWith(
        manager,
        AuditedEntityType.INQUIRY,
        'uuid-1',
        ACTOR,
        InquiryStatus.ARCHIVED,
      );
    });
  });
});
