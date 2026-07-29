import * as ExcelJS from 'exceljs';
import { Repository } from 'typeorm';
import { WinterizationXlsxExportService } from './winterization-xlsx-export.service';
import { WinterizationForm } from './entities/winterization-form.entity';
import { WinterizationFormNeed } from './entities/winterization-form-need.entity';
import { NeedsFormAttachment } from './entities/needs-form-attachment.entity';
import { FormStatus } from './entities/wash-form.entity';
import {
  BACKUP_POWER_OPTIONS,
  BUILDING_CONDITIONS,
  FACILITY_KINDS,
  FRONTLINE_STATUSES,
  GENERATOR_FUEL_TYPES,
  GENERATOR_PURPOSES,
  HEATING_SOURCES,
  LOGISTICS_OPTIONS,
  NEED_BY_OPTIONS,
  NEED_CATEGORIES,
  NEED_ITEMS,
  NEED_UNITS,
  RESILIENCE_POINT_STATUSES,
  WINTERIZATION_APPLICANT_TYPES,
  WINTERIZATION_COFINANCING_OPTIONS,
  WINTERIZATION_COST_BASIS_OPTIONS,
  WINTERIZATION_DOCS_OPTIONS,
  WINTERIZATION_URGENCY_OPTIONS,
} from './winterization.constants';
import {
  APPLICANT_TYPE_LABELS,
  BACKUP_POWER_LABELS,
  BUILDING_CONDITION_LABELS,
  COFINANCING_LABELS,
  COST_BASIS_LABELS,
  DOCS_AVAILABLE_LABELS,
  FACILITY_KIND_LABELS,
  FRONTLINE_STATUS_LABELS,
  GENERATOR_FUEL_TYPE_LABELS,
  GENERATOR_PURPOSE_LABELS,
  HEATING_SOURCE_LABELS,
  LOGISTICS_LABELS,
  NEED_BY_LABELS,
  NEED_CATEGORY_LABELS,
  NEED_ITEM_LABELS,
  NEED_UNIT_LABELS,
  RESILIENCE_POINT_STATUS_LABELS,
  URGENCY_LABELS,
} from './winterization-xlsx-export.labels';

/**
 * Unit test for the Winterization XLSX exporter. Repositories are mocked so no
 * DB is touched; the produced buffer is parsed back with the same lib (exceljs)
 * and inspected for structure, enum-label rendering and UA/EN divergence.
 *
 * The last describe block is a guard, not a behaviour test: it walks every
 * option array in winterization.constants.ts and fails if a value has no ua/en
 * label — so adding an option without a label breaks CI instead of silently
 * exporting a raw enum key to a donor.
 */

const FORM_ID = '22222222-2222-2222-2222-222222222222';

// Partial fixtures — the service only reads scalar fields, so `as unknown as`
// keeps the objects small while staying off `any`.
const sampleForms = [
  {
    id: FORM_ID,
    trackingNumber: 'CSD-W-2026-0001',
    status: FormStatus.NEW,
    applicantType: 'institution',
    organizationName: 'Zvanivka Lyceum',
    edrpou: '12345678',
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
    contactPosition: 'Директор',
    phone: '+380501234567',
    email: 'head@zvanivka.gov.ua',
    messenger: null,
    altContactName: null,
    altContactPhone: null,
    website: null,
    facilityName: 'Ліцей №1',
    facilityKind: 'education',
    facilityKindOther: null,
    streetAddress: 'вул. Шкільна, 1',
    heatingSource: 'autonomous_solid_fuel',
    heatingSourceOther: null,
    heatedArea: '1234.50',
    backupPower: 'insufficient',
    buildingCondition: 'partial_repair_needed',
    populationTotal: null,
    settlementsCovered: null,
    frontlineStatus: null,
    targetFacilities: null,
    needCategories: ['solid_fuel', 'generators'],
    needCategoryOther: null,
    situationDescription: 'Котельня працює на вугіллі, запасу немає.',
    solidFuelBoilerCount: 2,
    solidFuelStorageAvailable: true,
    heatingRepairDescription: null,
    resiliencePointStatus: null,
    resiliencePointCapacity: null,
    liquidFuelMonthsNeeded: null,
    directBeneficiaries: 320,
    idpCount: 40,
    childrenCount: 280,
    pwdCount: 6,
    elderlyCount: 4,
    femaleCount: 170,
    maleCount: 150,
    indirectBeneficiaries: 900,
    staffCount: 45,
    needBy: 'by_october',
    urgency: 'critical',
    estimatedCost: '450000.00',
    costBasis: 'price_offer',
    otherDonors: false,
    otherDonorsDetails: null,
    cofinancing: 'partial',
    cofinancingDetails: 'Громада оплачує доставку',
    logistics: ['own_transport', 'storage'],
    docsAvailable: ['guarantee_letter', 'cost_estimate'],
    cloudLink: null,
    consentGiven: true,
    managerNotes: 'Пріоритет',
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-02T10:00:00.000Z'),
  },
] as unknown as WinterizationForm[];

const sampleNeeds = [
  {
    id: 'n1',
    winterizationFormId: FORM_ID,
    category: 'solid_fuel',
    item: 'coal',
    quantity: '120.00',
    unit: 't',
    powerKw: null,
    fuelType: null,
    purpose: null,
    details: null,
    sortOrder: 0,
  },
  {
    id: 'n2',
    winterizationFormId: FORM_ID,
    category: 'generators',
    item: 'generator',
    quantity: '2.00',
    unit: 'pcs',
    powerKw: '60.00',
    fuelType: 'diesel',
    purpose: 'boiler_house',
    details: 'Для котельні ліцею',
    sortOrder: 1,
  },
] as unknown as WinterizationFormNeed[];

const sampleAttachments = [
  {
    id: 'a1',
    formType: 'winterization',
    formId: FORM_ID,
    kind: 'photo',
    s3Key: 'media/needs/winterization/photo/x.jpg',
    publicUrl: null,
    originalName: 'boiler.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    sortOrder: 0,
  },
  {
    id: 'a2',
    formType: 'winterization',
    formId: FORM_ID,
    kind: 'document',
    s3Key: 'media/needs/winterization/document/y.pdf',
    publicUrl: null,
    originalName: 'guarantee.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    sortOrder: 0,
  },
] as unknown as NeedsFormAttachment[];

function makeService(): WinterizationXlsxExportService {
  const qb = {
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    getMany: jest.fn().mockResolvedValue(sampleForms),
  };
  qb.andWhere.mockReturnValue(qb);
  qb.orderBy.mockReturnValue(qb);

  const formRepo = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  } as unknown as Repository<WinterizationForm>;

  const needRepo = {
    find: jest.fn().mockResolvedValue(sampleNeeds),
  } as unknown as Repository<WinterizationFormNeed>;

  const attachmentRepo = {
    find: jest.fn().mockResolvedValue(sampleAttachments),
  } as unknown as Repository<NeedsFormAttachment>;

  return new WinterizationXlsxExportService(formRepo, needRepo, attachmentRepo);
}

/** Flatten a row's cells to primitive values for `toContain` assertions. */
function rowValues(sheet: ExcelJS.Worksheet, rowNumber: number): unknown[] {
  const raw = sheet.getRow(rowNumber).values;
  return Array.isArray(raw) ? raw : [];
}

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  // exceljs types `load` against its own Buffer (ArrayBuffer-based); a Node
  // Buffer is accepted at runtime, so bridge the nominal type mismatch.
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  return wb;
}

describe('WinterizationXlsxExportService', () => {
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
      'Needs',
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
    expect(dataRow).toContain('Institution / facility'); // applicantType
    expect(dataRow).toContain('Education facility'); // facilityKind
    expect(dataRow).toContain('By 1 October'); // needBy
    expect(dataRow).toContain('New'); // status
    // array → joined labels
    expect(dataRow).toContain('Solid fuel, Generators / backup power');
    // boolean → Yes/No
    expect(dataRow).toContain('Yes'); // consentGiven / solidFuelStorageAvailable
    // must NOT leak the raw enum key
    expect(dataRow).not.toContain('institution');

    const files = wb.getWorksheet('Files');
    expect(rowValues(files as ExcelJS.Worksheet, 2)).toContain('Photo');
  });

  it('emits one Needs row per specification position with generator attributes', async () => {
    const service = makeService();
    const wb = await loadWorkbook(await service.buildWorkbook({ lang: 'en' }));
    const needs = wb.getWorksheet('Needs') as ExcelJS.Worksheet;

    // header + 2 spec rows
    expect(needs.rowCount).toBe(1 + sampleNeeds.length);

    const coal = rowValues(needs, 2);
    expect(coal).toContain('Coal');
    expect(coal).toContain('Solid fuel');
    expect(coal).toContain(120); // numeric, not the '120.00' string from pg
    expect(coal).toContain('t');

    const generator = rowValues(needs, 3);
    expect(generator).toContain('Generator');
    expect(generator).toContain(60); // powerKw
    expect(generator).toContain('Diesel');
    expect(generator).toContain('Boiler house');
  });

  it('keeps category-level scalars on Applications, not on Needs', async () => {
    const service = makeService();
    const wb = await loadWorkbook(await service.buildWorkbook({ lang: 'en' }));

    const appsHeaders = rowValues(
      wb.getWorksheet('Applications') as ExcelJS.Worksheet,
      1,
    );
    const needsHeaders = rowValues(
      wb.getWorksheet('Needs') as ExcelJS.Worksheet,
      1,
    );

    // §14.3 п.2 — a category-level scalar repeated per spec row would be
    // double-counted by the budget model.
    expect(appsHeaders).toContain('Solid-fuel boilers');
    expect(appsHeaders).toContain('Resilience point capacity');
    expect(appsHeaders).toContain('Fuel: months needed');
    expect(needsHeaders).not.toContain('Solid-fuel boilers');
    expect(needsHeaders).not.toContain('Fuel: months needed');
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
      'Потреби',
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
      rowValues(uaWb.getWorksheet('Потреби') as ExcelJS.Worksheet, 2),
    ).toContain('Вугілля');
  });

  it('applies the findAll-style filters to the query builder', async () => {
    // standalone jest.fn()s FIRST, then composed into the repo objects.
    // Asserting on `needRepo.find` after the `as unknown as Repository<...>`
    // cast reads a real class method off a typed object, which trips
    // @typescript-eslint/unbound-method — same pattern (and same reason) as the
    // note at the top of recovery.service.spec.ts.
    const qb = {
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    qb.andWhere.mockReturnValue(qb);
    qb.orderBy.mockReturnValue(qb);
    const needFind = jest.fn().mockResolvedValue([]);
    const attachmentFind = jest.fn().mockResolvedValue([]);
    const formRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    } as unknown as Repository<WinterizationForm>;
    const needRepo = {
      find: needFind,
    } as unknown as Repository<WinterizationFormNeed>;
    const attachmentRepo = {
      find: attachmentFind,
    } as unknown as Repository<NeedsFormAttachment>;

    const service = new WinterizationXlsxExportService(
      formRepo,
      needRepo,
      attachmentRepo,
    );
    await service.buildWorkbook({
      status: FormStatus.NEW,
      region: 'Донец',
      applicantType: 'institution',
      facilityKind: 'education',
      needCategory: 'solid_fuel',
      urgency: 'critical',
      search: 'CSD-W',
      dateFrom: '2026-01-01',
      dateTo: '2026-12-31',
      lang: 'en',
    });

    // 9 filters applied + createdAt ordering, no child queries on empty result.
    expect(qb.andWhere).toHaveBeenCalledTimes(9);
    expect(qb.orderBy).toHaveBeenCalledWith('f.createdAt', 'DESC');
    expect(needFind).not.toHaveBeenCalled();
    expect(attachmentFind).not.toHaveBeenCalled();
  });
});

describe('winterization XLSX labels — completeness', () => {
  const cases: readonly [
    string,
    readonly string[],
    Record<string, [string, string]>,
  ][] = [
    ['applicantType', WINTERIZATION_APPLICANT_TYPES, APPLICANT_TYPE_LABELS],
    ['facilityKind', FACILITY_KINDS, FACILITY_KIND_LABELS],
    ['heatingSource', HEATING_SOURCES, HEATING_SOURCE_LABELS],
    ['backupPower', BACKUP_POWER_OPTIONS, BACKUP_POWER_LABELS],
    ['buildingCondition', BUILDING_CONDITIONS, BUILDING_CONDITION_LABELS],
    ['frontlineStatus', FRONTLINE_STATUSES, FRONTLINE_STATUS_LABELS],
    ['needCategory', NEED_CATEGORIES, NEED_CATEGORY_LABELS],
    ['needItem', NEED_ITEMS, NEED_ITEM_LABELS],
    ['needUnit', NEED_UNITS, NEED_UNIT_LABELS],
    ['generatorFuelType', GENERATOR_FUEL_TYPES, GENERATOR_FUEL_TYPE_LABELS],
    ['generatorPurpose', GENERATOR_PURPOSES, GENERATOR_PURPOSE_LABELS],
    [
      'resiliencePointStatus',
      RESILIENCE_POINT_STATUSES,
      RESILIENCE_POINT_STATUS_LABELS,
    ],
    ['needBy', NEED_BY_OPTIONS, NEED_BY_LABELS],
    ['urgency', WINTERIZATION_URGENCY_OPTIONS, URGENCY_LABELS],
    ['costBasis', WINTERIZATION_COST_BASIS_OPTIONS, COST_BASIS_LABELS],
    ['cofinancing', WINTERIZATION_COFINANCING_OPTIONS, COFINANCING_LABELS],
    ['logistics', LOGISTICS_OPTIONS, LOGISTICS_LABELS],
    ['docsAvailable', WINTERIZATION_DOCS_OPTIONS, DOCS_AVAILABLE_LABELS],
  ];

  it.each(cases)(
    '%s: every option has a ua + en label',
    (_name, values, map) => {
      const missing = values.filter((v) => {
        const pair = map[v];
        return !pair || !pair[0] || !pair[1];
      });
      expect(missing).toEqual([]);
    },
  );
});
