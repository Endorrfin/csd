import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

describe('InquiryService', () => {
  let service: InquiryService;
  let repo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InquiryService,
        { provide: getRepositoryToken(Inquiry), useFactory: repoMock },
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
    it('omits managerNotes from the update when not provided', async () => {
      const existing = { id: 'uuid-1', status: InquiryStatus.NEW } as Inquiry;
      repo.findOne.mockResolvedValue(existing);
      repo.update.mockResolvedValue(undefined);

      await service.updateStatus('uuid-1', InquiryStatus.READ);

      expect(repo.update).toHaveBeenCalledWith('uuid-1', {
        status: InquiryStatus.READ,
      });
    });
  });

  describe('remove', () => {
    it('rejects deletion unless the inquiry is ARCHIVED', async () => {
      repo.findOne.mockResolvedValue({
        id: 'uuid-1',
        status: InquiryStatus.NEW,
      });

      await expect(service.remove('uuid-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('deletes an ARCHIVED inquiry', async () => {
      repo.findOne.mockResolvedValue({
        id: 'uuid-1',
        status: InquiryStatus.ARCHIVED,
      });
      repo.delete.mockResolvedValue(undefined);

      await service.remove('uuid-1');

      expect(repo.delete).toHaveBeenCalledWith('uuid-1');
    });
  });
});
