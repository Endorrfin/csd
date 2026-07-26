import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { RecoveryXlsxExportService } from './recovery-xlsx-export.service';
import { RecoveryForm } from './entities/recovery-form.entity';
import { RecoveryFormDamage } from './entities/recovery-form-damage.entity';
import { NeedsFormAttachment } from './entities/needs-form-attachment.entity';
import { FormStatus } from './entities/wash-form.entity';

/**
 * Unit test for the Recovery XLSX exporter. Repositories are mocked so no DB is
 * touched; the produced buffer is parsed back with the same lib (exceljs) and
 * inspected for structure, enum-label rendering and UA/EN header divergence.
 */

const FORM_ID = '11111111-1111-1111-1111-111111111111';

// Partial fixtures — the service only reads scalar fields, so `as unknown as`
// keeps the objects small while staying off `any`.
const sampleForms = [
  {
    id: FORM_ID,
    trackingNumber: 'CSD-R-2026-0001',
    status: FormStatus.NEW,
    applicantCategory: 'municipality',
    applicantCategoryOther: null,
    organizationName: 'Zvanivka Council',
    region: 'Донецька',
    regionEn: 'Donetsk',
    district: 'Бахмутський',
    districtEn: 'Bakhmutskyi',
    community: 'Званівська',
    communityEn: 'Zvanivska',
    communityCode: 'UA1402019000000001',
    settlement: 'Званівка',
    settlementEn: 'Zvanivka',
    settlementCode: 'UA1402019001000002',
    contactName: 'Іван Петренко',
    contactPosition: 'Голова',
    phone: '+380501234567',
    email: 'head@zvanivka.gov.ua',
    messenger: null,
    altContactName: null,
    altContactPhone: null,
    website: null,
    objectName: 'Школа №1',
    objectType: 'healthcare',
    objectTypeOther: null,
    streetAddress: 'вул. Шкільна, 1',
    ownershipType: 'communal',
    ownershipTypeOther: null,
    onApplicantBalance: true,
    buildYear: 1975,
    totalArea: '1234.50',
    floors: 2,
    workCategories: ['building_repair', 'utilities'],
    damageDescription: 'Дах зруйновано',
    damageCause: 'shelling',
    damageCauseOther: null,
    damageDate: '2024-05',
    damageCategory: 'category_1',
    functioningStatus: 'partially_operational',
    accessibilityFeatures: ['ramp', 'elevator'],
    educationMode: null,
    shelterStatus: null,
    shelterType: null,
    shelterCapacity: null,
    healthFacilityKind: 'ambulatory',
    suspendedServices: null,
    declarationsCount: null,
    directBeneficiaries: 100,
    idpCount: 10,
    childrenCount: 20,
    pwdCount: 5,
    elderlyCount: 8,
    femaleCount: 55,
    maleCount: 45,
    indirectBeneficiaries: 300,
    staffCount: 12,
    canOperateRemotely: 'partially',
    estimatedCost: '150000.00',
    costBasis: 'cost_estimate',
    cofinancing: 'no',
    cofinancingDetails: null,
    docsAvailable: ['defect_act', 'cost_estimate'],
    desiredTimeline: 'm1_3',
    urgency: 'planned',
    otherDonors: false,
    otherDonorsDetails: null,
    asbestosPresence: 'unknown',
    cloudLink: null,
    consentGiven: true,
    managerNotes: 'Пріоритет',
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-02T10:00:00.000Z'),
  },
] as unknown as RecoveryForm[];

const sampleDamages = [
  {
    id: 'd1',
    recoveryFormId: FORM_ID,
    element: 'roof',
    volume: '120.00',
    unit: 'm2',
    notes: 'Наскрізні отвори',
    sortOrder: 0,
  },
  {
    id: 'd2',
    recoveryFormId: FORM_ID,
    element: 'windows',
    volume: '8.00',
    unit: 'pcs',
    notes: null,
    sortOrder: 1,
  },
] as unknown as RecoveryFormDamage[];

const sampleAttachments = [
  {
    id: 'a1',
    formType: 'recovery',
    formId: FORM_ID,
    kind: 'photo',
    s3Key: 'media/needs/recovery/photo/x.jpg',
    publicUrl: null,
    originalName: 'roof.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    sortOrder: 0,
  },
  {
    id: 'a2',
    formType: 'recovery',
    formId: FORM_ID,
    kind: 'document',
    s3Key: 'media/needs/recovery/document/y.pdf',
    publicUrl: null,
    originalName: 'estimate.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    sortOrder: 0,
  },
] as unknown as NeedsFormAttachment[];

function makeService(): RecoveryXlsxExportService {
  const qb = {
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn().mockResolvedValue(sampleForms),
  };
  qb.andWhere.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);

  const formRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  } as unknown as Repository<RecoveryForm>;

  const damageRepo = {
    find: jest.fn().mockResolvedValue(sampleDamages),
  } as unknown as Repository<RecoveryFormDamage>;

  const attachmentRepo = {
    find: jest.fn().mockResolvedValue(sampleAttachments),
  } as unknown as Repository<NeedsFormAttachment>;

  return new RecoveryXlsxExportService(formRepo, damageRepo, attachmentRepo);
}

/** Flatten a row's cells to primitive values for `toContain` assertions. */
function rowValues(sheet: ExcelJS.Worksheet, rowNumber: number): unknown[] {
  const raw = sheet.getRow(rowNumber).values;
  return Array.isArray(raw) ? (raw as unknown[]) : [];
}

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  // exceljs types `load` against its own Buffer (ArrayBuffer-based); a Node
  // Buffer is accepted at runtime, so bridge the nominal type mismatch.
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return wb;
}

describe('RecoveryXlsxExportService', () => {
  it('returns a non-empty Node Buffer', async () => {
    const service = makeService();
    const buffer = await service.buildWorkbook({ lang: 'en' });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('produces three worksheets with the expected EN names and header rows', async () => {
    const service = makeService();
    const buffer = await service.buildWorkbook({ lang: 'en' });
    const wb = await loadWorkbook(buffer);

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Applications',
      'Damages',
      'Files',
    ]);

    const apps = wb.getWorksheet('Applications');
    expect(apps).toBeDefined();
    expect(apps?.getRow(1).getCell(1).value).toBe('Tracking number');
  });

  it('renders enum + array values as human labels (not raw keys)', async () => {
    const service = makeService();
    const buffer = await service.buildWorkbook({ lang: 'en' });
    const wb = await loadWorkbook(buffer);

    const apps = wb.getWorksheet('Applications');
    expect(apps).toBeDefined();
    const dataRow = rowValues(apps as ExcelJS.Worksheet, 2);

    // enum → label
    expect(dataRow).toContain('Healthcare'); // objectType
    expect(dataRow).toContain('Category 1 (up to 40%)'); // damageCategory
    expect(dataRow).toContain('New'); // status
    // array → joined labels
    expect(dataRow).toContain('Building repair, Utilities'); // workCategories
    // boolean → Yes/No
    expect(dataRow).toContain('Yes'); // consentGiven / onApplicantBalance
    // must NOT leak the raw enum key
    expect(dataRow).not.toContain('healthcare');

    const damages = wb.getWorksheet('Damages');
    expect(rowValues(damages as ExcelJS.Worksheet, 2)).toContain('Roof');

    const files = wb.getWorksheet('Files');
    expect(rowValues(files as ExcelJS.Worksheet, 2)).toContain('Photo');
  });

  it('uses Ukrainian sheet names + headers when lang="ua" (differs from EN)', async () => {
    const service = makeService();
    const enWb = await loadWorkbook(
      await service.buildWorkbook({ lang: 'en' }),
    );
    const uaWb = await loadWorkbook(
      await service.buildWorkbook({ lang: 'ua' }),
    );

    expect(uaWb.worksheets.map((w) => w.name)).toEqual([
      'Заявки',
      'Пошкодження',
      'Файли',
    ]);

    const enHeader = enWb
      .getWorksheet('Applications')
      ?.getRow(1)
      .getCell(1).value;
    const uaHeader = uaWb.getWorksheet('Заявки')?.getRow(1).getCell(1).value;

    expect(enHeader).toBe('Tracking number');
    expect(uaHeader).toBe('Номер заявки');
    expect(enHeader).not.toBe(uaHeader);

    // enum labels are localized too
    expect(
      rowValues(uaWb.getWorksheet('Пошкодження') as ExcelJS.Worksheet, 2),
    ).toContain('Дах');
  });

  it('applies the findAll-style filters to the query builder', async () => {
    const qb = {
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    qb.andWhere.mockReturnValue(qb);
    qb.orderBy.mockReturnValue(qb);
    const formRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<RecoveryForm>;
    const damageRepo = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Repository<RecoveryFormDamage>;
    const attachmentRepo = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Repository<NeedsFormAttachment>;

    const service = new RecoveryXlsxExportService(
      formRepo,
      damageRepo,
      attachmentRepo,
    );
    await service.buildWorkbook({
      status: FormStatus.NEW,
      region: 'Донец',
      objectType: 'healthcare',
      applicantCategory: 'municipality',
      urgency: 'planned',
      search: 'CSD-R',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
      lang: 'en',
    });

    // 8 filters applied + createdAt ordering, no child queries on empty result.
    expect(qb.andWhere).toHaveBeenCalledTimes(8);
    expect(qb.orderBy).toHaveBeenCalledWith('f.createdAt', 'DESC');
    expect(damageRepo.find).not.toHaveBeenCalled();
    expect(attachmentRepo.find).not.toHaveBeenCalled();
  });
});
