// PR-W1 WinterizationService business-rules spec (mocked repos)
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { WinterizationService } from './winterization.service';
import { WinterizationForm } from './entities/winterization-form.entity';
import { WinterizationFormNeed } from './entities/winterization-form-need.entity';
import { NeedsFormAttachment } from './entities/needs-form-attachment.entity';
import { FormStatus } from './entities/wash-form.entity';
import { NeedsAuditLogService } from './needs-audit-log.service';
import { FormNumberService } from './form-number.service';
import { CreateWinterizationFormDto } from './dto/create-winterization-form.dto';
import { AuditActor } from './audit-log.service';
import { UploadService } from '../upload/upload.service';
import { getLoggerToken } from 'nestjs-pino';

// PR 1 / Step 18 — the services log audit failures through an injected
// PinoLogger instead of console.error, so the spec asserts on the logger.
const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() };

const actor: AuditActor = { userId: null, email: null };

const photo = (n: number, overrides: Record<string, unknown> = {}) => ({
  s3Key: `media/needs/winterization/photo/p-${n}.jpg`,
  originalName: `p-${n}.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  ...overrides,
});

/** ОМС asking for coal — the canonical launch scenario. */
const baseDto = (): CreateWinterizationFormDto => ({
  applicantType: 'municipality',
  organizationName: 'Покровська МТГ',
  region: 'Донецька',
  regionEn: 'Donetsk',
  district: '',
  districtEn: '',
  community: '',
  communityEn: '',
  communityCode: '',
  contactName: 'Іван Іваненко',
  contactPosition: 'Заступник голови',
  phone: '+380501234567',
  email: 'a@b.com',
  needCategories: ['solid_fuel'],
  situationDescription: 'x'.repeat(60),
  needs: [{ category: 'solid_fuel', item: 'coal', quantity: 15 }],
  directBeneficiaries: 5200,
  idpCount: 800,
  childrenCount: 900,
  pwdCount: 120,
  elderlyCount: 1400,
  needBy: 'by_october',
  urgency: 'critical',
  otherDonors: false,
  cofinancing: 'no',
  consentGiven: true,
});

const householdDto = (): CreateWinterizationFormDto => ({
  applicantType: 'household',
  organizationName: 'Іваненко Іван Іванович',
  region: 'Донецька',
  regionEn: 'Donetsk',
  district: '',
  districtEn: '',
  community: '',
  communityEn: '',
  communityCode: '',
  contactName: 'Іваненко Іван Іванович',
  phone: '+380501234567',
  email: 'a@b.com',
  hhStreetAddress: 'вул. Центральна',
  hhHouseNumber: '12',
  hhVulnerabilities: ['idp', 'single_pensioner'],
  hhAdults: 1,
  hhChildren: 2,
  hhElderly: 1,
  hhPwd: 1,
  hhHeatingType: 'stove',
  hhCriticalNeed: 'solid_fuel',
  needBy: 'by_november',
  urgency: 'high',
  otherDonors: false,
  consentGiven: true,
});

describe('WinterizationService', () => {
  let service: WinterizationService;

  // Mocks are declared as standalone jest.fn()s FIRST, then composed into the
  // manager/dataSource objects — referencing methods off the typed objects later
  // would trip @typescript-eslint/unbound-method.
  const managerCreateMock = jest.fn(
    (_cls: unknown, obj: Record<string, unknown>) => obj,
  );
  const managerSaveMock = jest.fn((x: unknown) =>
    Promise.resolve(
      Array.isArray(x)
        ? x
        : { id: 'form-1', ...(x as Record<string, unknown>) },
    ),
  );
  const managerDeleteMock = jest.fn().mockResolvedValue({ affected: 1 });
  const managerUpdateMock = jest.fn().mockResolvedValue({ affected: 1 });

  const manager = {
    create: managerCreateMock,
    save: managerSaveMock,
    delete: managerDeleteMock,
    update: managerUpdateMock,
  } as unknown as EntityManager;

  const txMock = jest.fn(
    (cb: (m: EntityManager) => Promise<unknown>): Promise<unknown> =>
      cb(manager),
  );
  const dataSource = { transaction: txMock } as unknown as DataSource;

  const formRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    exists: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const attachmentRepo = { find: jest.fn().mockResolvedValue([]) };
  const needRepo = {};

  const auditLog = {
    logCreate: jest.fn().mockResolvedValue(undefined),
    logDelete: jest.fn().mockResolvedValue(undefined),
    logStatusChange: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
    findByForm: jest.fn().mockResolvedValue([]),
  };
  const formNumber = {
    nextTrackingNumber: jest.fn().mockResolvedValue('CSD-W-2026-0001'),
  };
  const uploadService = {
    getNeedsFileUrl: jest
      .fn()
      .mockResolvedValue('https://private.example/signed'),
  };

  /** Household gate is env-driven; default OFF, like production at launch. */
  let householdEnabled = 'false';
  const config = {
    get: jest.fn((key: string, def?: string) =>
      key === 'WINTERIZATION_HOUSEHOLD_ENABLED' ? householdEnabled : def,
    ),
  };

  /** The object handed to manager.create(WinterizationForm, …). */
  const createdForm = (): Record<string, unknown> => {
    const calls = managerCreateMock.mock.calls as unknown[][];
    const hit = calls.find((c) =>
      Object.prototype.hasOwnProperty.call(
        c[1] as Record<string, unknown>,
        'trackingNumber',
      ),
    );
    return (hit?.[1] ?? {}) as Record<string, unknown>;
  };

  /** Need rows created inside the transaction. */
  const createdNeedRows = (): Array<Record<string, unknown>> => {
    const calls = managerCreateMock.mock.calls as unknown[][];
    return calls
      .map((c) => c[1] as Record<string, unknown>)
      .filter((o) => Object.prototype.hasOwnProperty.call(o, 'category'));
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    householdEnabled = 'false';
    const moduleRef = await Test.createTestingModule({
      providers: [
        WinterizationService,
        { provide: getRepositoryToken(WinterizationForm), useValue: formRepo },
        {
          provide: getRepositoryToken(WinterizationFormNeed),
          useValue: needRepo,
        },
        {
          provide: getRepositoryToken(NeedsFormAttachment),
          useValue: attachmentRepo,
        },
        { provide: NeedsAuditLogService, useValue: auditLog },
        { provide: FormNumberService, useValue: formNumber },
        { provide: DataSource, useValue: dataSource },
        { provide: UploadService, useValue: uploadService },
        { provide: ConfigService, useValue: config },
        {
          provide: getLoggerToken(WinterizationService.name),
          useValue: logger,
        },
      ],
    }).compile();

    service = moduleRef.get(WinterizationService);
  });

  describe('create', () => {
    it('mints a W-prefixed tracking number inside the transaction', async () => {
      const result = await service.create(baseDto(), actor);

      expect(result).toEqual({
        id: 'form-1',
        trackingNumber: 'CSD-W-2026-0001',
      });
      expect(txMock).toHaveBeenCalledTimes(1);
      expect(formNumber.nextTrackingNumber).toHaveBeenCalledWith(
        manager,
        'winterization',
        'W',
      );
      expect(auditLog.logCreate).toHaveBeenCalledWith(
        'winterization',
        'form-1',
        actor,
        expect.objectContaining({ trackingNumber: 'CSD-W-2026-0001' }),
      );
    });

    it('accepts a submit with zero photos when no works are requested', async () => {
      await expect(service.create(baseDto(), actor)).resolves.toEqual({
        id: 'form-1',
        trackingNumber: 'CSD-W-2026-0001',
      });
    });

    it('sets the measurement unit server-side from the item catalog', async () => {
      const dto = baseDto();
      dto.needs = [
        { category: 'solid_fuel', item: 'coal', quantity: 15 },
        { category: 'solid_fuel', item: 'firewood', quantity: 50 },
      ];
      await service.create(dto, actor);

      const rows = createdNeedRows();
      expect(rows.find((r) => r.item === 'coal')?.unit).toBe('t');
      expect(rows.find((r) => r.item === 'firewood')?.unit).toBe('m3');
    });

    it('honours the applicant unit choice for solid fuel only', async () => {
      const dto = baseDto();
      dto.needs = [
        { category: 'solid_fuel', item: 'coal', quantity: 20, unit: 'm3' },
      ];
      await service.create(dto, actor);
      expect(createdNeedRows()[0].unit).toBe('m3');
    });

    it('drops generator-only fields on non-generator rows', async () => {
      const dto = baseDto();
      dto.needs = [
        {
          category: 'solid_fuel',
          item: 'coal',
          quantity: 15,
          powerKw: 10,
          fuelType: 'diesel',
          purpose: 'facility',
        },
      ];
      await service.create(dto, actor);

      const row = createdNeedRows()[0];
      expect(row.powerKw).toBeNull();
      expect(row.fuelType).toBeNull();
      expect(row.purpose).toBeNull();
    });

    it('nulls the household block for an organization applicant', async () => {
      const dto = baseDto();
      // A crafted payload may carry foreign-block fields: ValidateIf switches
      // the validators off but `whitelist` does not strip the property.
      Object.assign(dto, { hhAdults: 3, hhCriticalNeed: 'winter_kit' });

      await service.create(dto, actor);

      const form = createdForm();
      expect(form.hhAdults).toBeNull();
      expect(form.hhCriticalNeed).toBeNull();
    });

    it('nulls institution fields for a municipality applicant', async () => {
      const dto = baseDto();
      Object.assign(dto, { facilityKind: 'education', heatedArea: 900 });

      await service.create(dto, actor);

      const form = createdForm();
      expect(form.facilityKind).toBeNull();
      expect(form.heatedArea).toBeNull();
    });

    it('nulls scalars of categories the applicant did not select', async () => {
      const dto = baseDto();
      Object.assign(dto, {
        heatingRepairDescription: 'x'.repeat(40),
        liquidFuelMonthsNeeded: 6,
      });

      await service.create(dto, actor);

      const form = createdForm();
      expect(form.heatingRepairDescription).toBeNull();
      expect(form.liquidFuelMonthsNeeded).toBeNull();
      // solid_fuel IS selected, so its scalars are left alone
      expect(form.solidFuelBoilerCount).toBeUndefined();
    });

    it('persists attachments with kind derived from the source array', async () => {
      const dto = baseDto();
      dto.photos = [photo(1), photo(2), photo(3)];
      dto.documents = [
        {
          s3Key: 'media/needs/winterization/doc/letter.pdf',
          originalName: 'letter.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
        },
      ];
      await service.create(dto, actor);

      const saveCalls = managerSaveMock.mock.calls as unknown[][];
      const rows = saveCalls[saveCalls.length - 1][0] as Array<{
        kind: string;
        formType: string;
      }>;
      expect(rows).toHaveLength(4);
      expect(rows.filter((r) => r.kind === 'photo')).toHaveLength(3);
      expect(rows.filter((r) => r.kind === 'document')).toHaveLength(1);
      expect(rows.every((r) => r.formType === 'winterization')).toBe(true);
    });

    it('does not fail the submit when audit logging throws', async () => {
      auditLog.logCreate.mockRejectedValueOnce(new Error('boom'));
      await expect(service.create(baseDto(), actor)).resolves.toEqual({
        id: 'form-1',
        trackingNumber: 'CSD-W-2026-0001',
      });

      expect(logger.error).toHaveBeenCalledWith(
        { err: expect.any(Error) as Error, auditOp: 'winterization.create' },
        'audit log write failed',
      );
    });
  });

  describe('create — needs consistency', () => {
    it('rejects a need row whose category is not selected', async () => {
      const dto = baseDto();
      dto.needs = [
        { category: 'solid_fuel', item: 'coal', quantity: 15 },
        { category: 'winter_nfi', item: 'blankets', quantity: 50 },
      ];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
      expect(txMock).not.toHaveBeenCalled();
    });

    it('rejects an item that does not belong to its category', async () => {
      const dto = baseDto();
      dto.needs = [{ category: 'solid_fuel', item: 'blankets', quantity: 10 }];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a category that requires rows but has none', async () => {
      const dto = baseDto();
      dto.needs = [];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects solid fuel with no tonnage — it cannot be budgeted', async () => {
      const dto = baseDto();
      dto.needs = [{ category: 'solid_fuel', item: 'coal' }];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows a quantity-less row where the checkbox alone is enough', async () => {
      const dto = baseDto();
      dto.needCategories = ['winter_nfi'];
      dto.needs = [{ category: 'winter_nfi', item: 'blankets' }];
      await expect(service.create(dto, actor)).resolves.toBeDefined();
    });

    it('rejects a duplicate item inside a non-repeatable category', async () => {
      const dto = baseDto();
      dto.needs = [
        { category: 'solid_fuel', item: 'coal', quantity: 10 },
        { category: 'solid_fuel', item: 'coal', quantity: 5 },
      ];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows several generator rows (one per power rating)', async () => {
      const dto = baseDto();
      dto.needCategories = ['generators'];
      dto.needs = [
        { category: 'generators', item: 'generator', quantity: 2, powerKw: 10 },
        { category: 'generators', item: 'generator', quantity: 1, powerKw: 60 },
      ];
      await expect(service.create(dto, actor)).resolves.toBeDefined();
      expect(createdNeedRows()).toHaveLength(2);
    });

    it('rejects more than 5 generator rows', async () => {
      const dto = baseDto();
      dto.needCategories = ['generators'];
      dto.needs = Array.from({ length: 6 }, (_, i) => ({
        category: 'generators' as const,
        item: 'generator' as const,
        quantity: 1,
        powerKw: 10 + i,
      }));
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a category not available to the applicant type', async () => {
      const dto = baseDto();
      // SN201A cash-for-utilities is a household modality only.
      dto.needCategories = ['utilities_cash'];
      dto.needs = [];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create — conditional photo requirement', () => {
    const worksDto = (): CreateWinterizationFormDto => {
      const dto = baseDto();
      dto.needCategories = ['insulation'];
      dto.needs = [{ category: 'insulation', item: 'windows', quantity: 24 }];
      return dto;
    };

    it('requires at least 3 photos for insulation works', async () => {
      const dto = worksDto();
      dto.photos = [photo(1), photo(2)];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('passes with 3 photos for insulation works', async () => {
      const dto = worksDto();
      dto.photos = [photo(1), photo(2), photo(3)];
      await expect(service.create(dto, actor)).resolves.toBeDefined();
    });

    it('rejects a photo carrying a document mime type', async () => {
      const dto = worksDto();
      dto.photos = [
        photo(1, { mimeType: 'application/pdf' }),
        photo(2),
        photo(3),
      ] as CreateWinterizationFormDto['photos'];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an oversized photo (per-kind cap, not the absolute DTO cap)', async () => {
      const dto = worksDto();
      dto.photos = [
        photo(1, { sizeBytes: 6 * 1024 * 1024 }), // 6 MB > 5 MB photo cap
        photo(2),
        photo(3),
      ] as CreateWinterizationFormDto['photos'];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects duplicate s3 keys across photos and documents', async () => {
      const dto = worksDto();
      dto.photos = [photo(1), photo(2), photo(3)];
      dto.documents = [
        {
          s3Key: dto.photos[0].s3Key,
          originalName: 'letter.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
        },
      ];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('household feature gate (§7)', () => {
    it('rejects a household submit with 422 while the flag is off', async () => {
      await expect(service.create(householdDto(), actor)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(txMock).not.toHaveBeenCalled();
    });

    it('accepts a household submit once the flag is on', async () => {
      householdEnabled = 'true';
      await expect(service.create(householdDto(), actor)).resolves.toEqual({
        id: 'form-1',
        trackingNumber: 'CSD-W-2026-0001',
      });
    });

    it('derives needCategories from the critical need', async () => {
      householdEnabled = 'true';
      const dto = householdDto();
      dto.hhCriticalNeed = 'winter_kit';
      await service.create(dto, actor);
      expect(createdForm().needCategories).toEqual(['winter_nfi']);
    });

    it('derives the SADD counts from the household composition', async () => {
      householdEnabled = 'true';
      await service.create(householdDto(), actor);

      const form = createdForm();
      // adults 1 + children 2 + elderly 1 = 4 (buckets are disjoint)
      expect(form.directBeneficiaries).toBe(4);
      expect(form.childrenCount).toBe(2);
      expect(form.elderlyCount).toBe(1);
      expect(form.pwdCount).toBe(1);
      // 'idp' is among the vulnerabilities, so the whole household counts as IDP
      expect(form.idpCount).toBe(4);
    });

    it('rejects an empty household composition', async () => {
      householdEnabled = 'true';
      const dto = householdDto();
      dto.hhAdults = 0;
      dto.hhChildren = 0;
      dto.hhElderly = 0;
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('blocks an admin full-edit from switching a form to household', async () => {
      formRepo.findOne.mockResolvedValue({
        id: 'form-1',
        applicantType: 'municipality',
        needCategories: ['solid_fuel'],
        status: FormStatus.NEW,
        needs: [],
      });

      await expect(
        service.updateFull('form-1', { applicantType: 'household' }, actor),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('update / bulk / remove', () => {
    const existing = () => ({
      id: 'form-1',
      applicantType: 'municipality',
      needCategories: ['solid_fuel'],
      status: FormStatus.NEW,
      managerNotes: null,
      needs: [],
    });

    it('logs a status change on quick update', async () => {
      formRepo.findOne.mockResolvedValue(existing());
      formRepo.save.mockResolvedValue(undefined);

      await service.update('form-1', { status: FormStatus.IN_REVIEW }, actor);

      expect(auditLog.logStatusChange).toHaveBeenCalledWith(
        'winterization',
        'form-1',
        actor,
        FormStatus.NEW,
        FormStatus.IN_REVIEW,
      );
    });

    it('throws NotFound when bulk ids match nothing', async () => {
      formRepo.find.mockResolvedValue([]);
      await expect(
        service.bulkUpdateStatus(
          ['11111111-1111-4111-8111-111111111111'],
          FormStatus.APPROVED,
          actor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes polymorphic attachments together with the form', async () => {
      formRepo.findOne.mockResolvedValue(existing());
      attachmentRepo.find.mockResolvedValue([
        { s3Key: 'media/needs/winterization/photo/p-1.jpg' },
      ]);

      await service.remove('form-1', actor);

      expect(managerDeleteMock).toHaveBeenCalledWith(NeedsFormAttachment, {
        formType: 'winterization',
        formId: 'form-1',
      });
      expect(managerDeleteMock).toHaveBeenCalledWith(WinterizationForm, {
        id: 'form-1',
      });
      expect(auditLog.logDelete).toHaveBeenCalledWith(
        'winterization',
        'form-1',
        actor,
      );
    });

    it('throws NotFound for a missing form id', async () => {
      formRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByIdWithUrls', () => {
    it('adds a presigned GET url to each attachment', async () => {
      formRepo.findOne.mockResolvedValue({
        id: 'form-1',
        status: FormStatus.NEW,
      });
      attachmentRepo.find.mockResolvedValue([
        { s3Key: 'media/needs/winterization/photo/p-1.jpg', kind: 'photo' },
        { s3Key: 'media/needs/winterization/doc/letter.pdf', kind: 'document' },
      ]);

      const result = await service.findByIdWithUrls('form-1');

      expect(uploadService.getNeedsFileUrl).toHaveBeenCalledTimes(2);
      expect(
        result.attachments.every(
          (a) => a.url === 'https://private.example/signed',
        ),
      ).toBe(true);
    });

    it('returns url:null for a file whose presign fails, without throwing', async () => {
      formRepo.findOne.mockResolvedValue({
        id: 'form-1',
        status: FormStatus.NEW,
      });
      attachmentRepo.find.mockResolvedValue([
        { s3Key: 'media/needs/winterization/photo/p-1.jpg', kind: 'photo' },
      ]);
      uploadService.getNeedsFileUrl.mockRejectedValueOnce(new Error('s3 down'));

      const result = await service.findByIdWithUrls('form-1');

      expect(result.attachments[0].url).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        {
          err: expect.any(Error) as Error,
          s3Key: 'media/needs/winterization/photo/p-1.jpg',
        },
        'failed to presign a needs attachment URL',
      );
    });
  });
});
