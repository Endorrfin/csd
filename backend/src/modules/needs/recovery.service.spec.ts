// === ADDED: PR-1 RecoveryService business-rules spec (mocked repos) ===
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RecoveryService } from './recovery.service';
import { RecoveryForm } from './entities/recovery-form.entity';
import { RecoveryFormDamage } from './entities/recovery-form-damage.entity';
import { NeedsFormAttachment } from './entities/needs-form-attachment.entity';
import { FormStatus } from './entities/wash-form.entity';
import { NeedsAuditLogService } from './needs-audit-log.service';
import { FormNumberService } from './form-number.service';
import { CreateRecoveryFormDto } from './dto/create-recovery-form.dto';
import { AuditActor } from './audit-log.service';

const actor: AuditActor = { userId: null, email: null };

const photo = (
  n: number,
  overrides: Partial<Record<string, unknown>> = {},
) => ({
  s3Key: `media/needs/recovery/photo/p-${n}.jpg`,
  originalName: `p-${n}.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: 1024,
  ...overrides,
});

const baseDto = (): CreateRecoveryFormDto =>
  ({
    applicantCategory: 'municipality',
    organizationName: 'Тестова громада',
    region: 'Чернівецька',
    regionEn: 'Chernivtsi',
    district: '',
    districtEn: '',
    community: '',
    communityEn: '',
    communityCode: '',
    contactName: 'Іван Іваненко',
    contactPosition: 'Голова',
    phone: '+380501234567',
    email: 'a@b.com',
    objectName: 'Ліцей №1',
    objectType: 'resilience_center',
    workCategories: ['building_repair'],
    damages: [{ element: 'roof', volume: 100 }],
    damageDescription: 'x'.repeat(120),
    damageCause: 'shelling',
    damageCategory: 'category_1',
    functioningStatus: 'operational',
    directBeneficiaries: 100,
    idpCount: 0,
    childrenCount: 0,
    pwdCount: 0,
    elderlyCount: 0,
    estimatedCost: 100000,
    costBasis: 'defect_act',
    cofinancing: 'no',
    docsAvailable: ['defect_act'],
    otherDonors: false,
    asbestosPresence: 'no',
    photos: [photo(1), photo(2), photo(3)],
    consentGiven: true,
  }) as CreateRecoveryFormDto;

describe('RecoveryService', () => {
  let service: RecoveryService;

  // Mocks are declared as standalone jest.fn()s FIRST, then composed into the
  // manager/dataSource objects — referencing methods off the typed objects
  // later would trip @typescript-eslint/unbound-method.
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

  // transaction manager: create() passes objects through; save() assigns id.
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
  const damageRepo = {};

  const auditLog = {
    logCreate: jest.fn().mockResolvedValue(undefined),
    logDelete: jest.fn().mockResolvedValue(undefined),
    logStatusChange: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
    findByForm: jest.fn().mockResolvedValue([]),
  };
  const formNumber = {
    nextTrackingNumber: jest.fn().mockResolvedValue('CSD-R-2026-0001'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RecoveryService,
        { provide: getRepositoryToken(RecoveryForm), useValue: formRepo },
        {
          provide: getRepositoryToken(RecoveryFormDamage),
          useValue: damageRepo,
        },
        {
          provide: getRepositoryToken(NeedsFormAttachment),
          useValue: attachmentRepo,
        },
        { provide: NeedsAuditLogService, useValue: auditLog },
        { provide: FormNumberService, useValue: formNumber },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(RecoveryService);
  });

  describe('create', () => {
    it('mints a tracking number inside the transaction and returns it', async () => {
      const result = await service.create(baseDto(), actor);

      expect(result).toEqual({
        id: 'form-1',
        trackingNumber: 'CSD-R-2026-0001',
      });
      expect(txMock).toHaveBeenCalledTimes(1);
      expect(formNumber.nextTrackingNumber).toHaveBeenCalledWith(
        manager,
        'recovery',
        'R',
      );
      expect(auditLog.logCreate).toHaveBeenCalledWith(
        'recovery',
        'form-1',
        actor,
        expect.objectContaining({ trackingNumber: 'CSD-R-2026-0001' }),
      );
    });

    it('persists attachments with kind derived from the source array', async () => {
      const dto = baseDto();
      dto.documents = [
        {
          s3Key: 'media/needs/recovery/doc/act.pdf',
          originalName: 'act.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
        },
      ];
      await service.create(dto, actor);

      // last manager.save call receives the attachment rows array
      const saveCalls = managerSaveMock.mock.calls as unknown[][];
      const rows = saveCalls[saveCalls.length - 1][0] as Array<{
        kind: string;
        s3Key: string;
      }>;
      expect(rows).toHaveLength(4);
      expect(rows.filter((r) => r.kind === 'photo')).toHaveLength(3);
      expect(rows.filter((r) => r.kind === 'document')).toHaveLength(1);
    });

    it('sets the measurement unit server-side from the element catalog', async () => {
      await service.create(baseDto(), actor);

      const createCalls = managerCreateMock.mock.calls as unknown[][];
      const damageRow = createCalls.find(
        (c) => (c[1] as Record<string, unknown>).element === 'roof',
      )?.[1] as Record<string, unknown>;
      expect(damageRow.unit).toBe('m2');
    });

    it('rejects duplicate damage elements', async () => {
      const dto = baseDto();
      dto.damages = [{ element: 'roof' }, { element: 'roof' }];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
      expect(txMock).not.toHaveBeenCalled();
    });

    it('rejects a photo with a document mime type', async () => {
      const dto = baseDto();
      dto.photos = [
        photo(1, { mimeType: 'application/pdf' }),
        photo(2),
        photo(3),
      ] as CreateRecoveryFormDto['photos'];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects an oversized photo (per-kind cap, not the absolute DTO cap)', async () => {
      const dto = baseDto();
      dto.photos = [
        photo(1, { sizeBytes: 6 * 1024 * 1024 }), // 6 MB > 5 MB photo cap
        photo(2),
        photo(3),
      ] as CreateRecoveryFormDto['photos'];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects duplicate s3 keys across photos and documents', async () => {
      const dto = baseDto();
      dto.documents = [
        {
          s3Key: dto.photos[0].s3Key, // same key as a photo
          originalName: 'act.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 2048,
        },
      ];
      await expect(service.create(dto, actor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('does not fail the submit when audit logging throws', async () => {
      // CHANGED: silence the intentional console.error AND assert it fired —
      // keeps jest output clean while verifying the CloudWatch-bound log line.
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);

      auditLog.logCreate.mockRejectedValueOnce(new Error('boom'));
      await expect(service.create(baseDto(), actor)).resolves.toEqual({
        id: 'form-1',
        trackingNumber: 'CSD-R-2026-0001',
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[needs-audit-log] failed to log recovery create:',
        expect.any(Error),
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe('update / bulk / remove', () => {
    const existing = () => ({
      id: 'form-1',
      status: FormStatus.NEW,
      managerNotes: null,
      damages: [],
    });

    it('logs a status change on quick update', async () => {
      formRepo.findOne.mockResolvedValue(existing());
      formRepo.save.mockResolvedValue(undefined);

      await service.update('form-1', { status: FormStatus.IN_REVIEW }, actor);

      expect(auditLog.logStatusChange).toHaveBeenCalledWith(
        'recovery',
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
        { s3Key: 'media/needs/recovery/photo/p-1.jpg' },
      ]);

      await service.remove('form-1', actor);

      expect(managerDeleteMock).toHaveBeenCalledWith(NeedsFormAttachment, {
        formType: 'recovery',
        formId: 'form-1',
      });
      expect(managerDeleteMock).toHaveBeenCalledWith(RecoveryForm, {
        id: 'form-1',
      });
      expect(auditLog.logDelete).toHaveBeenCalledWith(
        'recovery',
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
});
