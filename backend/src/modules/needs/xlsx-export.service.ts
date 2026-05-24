import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { WashForm, FormStatus } from './entities/wash-form.entity';
import {
  labelBool,
  labelBoreholeWorkType,
  labelEquipmentUnit,
  labelPumpPurpose,
  labelStatus,
  labelTowerHeight,
  labelTowerType,
} from './xlsx-export.labels';

type Lang = 'ua' | 'en';

/** Column spec — key matches a row property. */
interface ColSpec {
  header: string;
  key: string;
  width: number;
}

/** Header fill colour per sheet (pastel, Excel-friendly). */
const SHEET_COLORS: Record<string, string> = {
  Forms: 'FF1E3A8A', // deep blue
  Boreholes: 'FF0891B2', // cyan
  Towers: 'FF0F766E', // teal
  Purifications: 'FF2563EB', // blue
  Pumps: 'FFD97706', // amber
  Equipment: 'FF7C3AED', // violet
};

const HEADER_TEXT_COLOR = 'FFFFFFFF';

@Injectable()
export class XlsxExportService {
  constructor(
    @InjectRepository(WashForm)
    private readonly washFormRepo: Repository<WashForm>,
  ) {}

  /**
   * Build XLSX workbook for the given filters.
   *
   * Layout:
   *  - Sheet 1 "Forms"         — 1 row per form, all scalar fields.
   *  - Sheet 2 "Boreholes"     — 1 row per borehole, includes form_id for VLOOKUP.
   *  - Sheet 3 "Towers"
   *  - Sheet 4 "Purifications"
   *  - Sheet 5 "Pumps"
   *  - Sheet 6 "Equipment"     — 1 row per equipment item.
   *
   * Each sheet has a frozen header row, auto-filter on the header,
   * and a color-coded header band.
   */
  async buildWorkbook(options: {
    status?: FormStatus;
    region?: string;
    lang?: Lang;
  }): Promise<ExcelJS.Buffer> {
    const lang: Lang = options.lang === 'ua' ? 'ua' : 'en';

    // ── Load all forms + child arrays matching filters ──
    const qb = this.washFormRepo
      .createQueryBuilder('form')
      .leftJoinAndSelect('form.boreholes', 'borehole')
      .leftJoinAndSelect('form.towers', 'tower')
      .leftJoinAndSelect('form.purifications', 'purification')
      .leftJoinAndSelect('form.pumps', 'pump')
      .leftJoinAndSelect('form.items', 'item')
      .leftJoinAndSelect('item.equipmentItem', 'equipment')
      .leftJoinAndSelect('equipment.category', 'category')
      .orderBy('form.createdAt', 'DESC');

    if (options.status) {
      qb.andWhere('form.status = :status', { status: options.status });
    }
    if (options.region) {
      qb.andWhere('LOWER(form.region) LIKE :region', {
        region: `%${options.region.toLowerCase()}%`,
      });
    }

    const forms = await qb.getMany();

    // ── Build workbook ──
    const wb = new ExcelJS.Workbook();
    wb.creator = 'CSD Fund Portal';
    wb.created = new Date();

    this.buildFormsSheet(wb, forms, lang);
    this.buildBoreholesSheet(wb, forms, lang);
    this.buildTowersSheet(wb, forms, lang);
    this.buildPurificationsSheet(wb, forms, lang);
    this.buildPumpsSheet(wb, forms, lang);
    this.buildEquipmentSheet(wb, forms, lang);

    return wb.xlsx.writeBuffer();
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 1: Forms (master)
  // ══════════════════════════════════════════════════════════════

  private buildFormsSheet(
    wb: ExcelJS.Workbook,
    forms: WashForm[],
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      { header: ua ? 'ID заявки' : 'Form ID', key: 'formId', width: 38 },
      {
        header: ua ? 'Дата створення' : 'Created at',
        key: 'createdAt',
        width: 18,
      },
      { header: ua ? 'Статус' : 'Status', key: 'status', width: 14 },
      { header: ua ? 'Область' : 'Region', key: 'region', width: 20 },
      { header: ua ? 'Район' : 'District', key: 'district', width: 20 },
      { header: ua ? 'Громада' : 'Community', key: 'community', width: 22 },
      {
        header: ua ? 'Населений пункт' : 'Settlement',
        key: 'settlement',
        width: 22,
      },
      {
        header: ua ? 'Організація' : 'Organization',
        key: 'organizationName',
        width: 28,
      },
      {
        header: ua ? 'ПІБ керівника' : 'Head name',
        key: 'headName',
        width: 22,
      },
      { header: ua ? 'Телефон' : 'Phone', key: 'headPhone', width: 16 },
      { header: 'Email', key: 'email', width: 24 },
      {
        header: ua ? 'Назва обʼєкту' : 'Object name',
        key: 'objectName',
        width: 24,
      },
      {
        header: ua ? 'Залежне населення' : 'Dependent pop.',
        key: 'dependentPopulation',
        width: 14,
      },
      {
        header: ua ? 'Соц. установи' : 'Social facilities',
        key: 'socialFacilities',
        width: 28,
      },
      {
        header: ua ? 'Термін монтажу' : 'Install deadline',
        key: 'installationDeadline',
        width: 18,
      },
      {
        header: ua ? 'Причини заміни' : 'Replacement reason',
        key: 'replacementReason',
        width: 40,
      },
      {
        header: ua ? 'Свердловини (шт.)' : 'Boreholes (count)',
        key: 'boreholesCount',
        width: 10,
      },
      {
        header: ua ? 'Башти (шт.)' : 'Towers (count)',
        key: 'towersCount',
        width: 10,
      },
      {
        header: ua ? 'Очищення (шт.)' : 'Purifications (count)',
        key: 'purificationsCount',
        width: 10,
      },
      {
        header: ua ? 'Насоси (шт.)' : 'Pumps (count)',
        key: 'pumpsCount',
        width: 10,
      },
      {
        header: ua ? 'Обладнання (поз.)' : 'Equipment (items)',
        key: 'itemsCount',
        width: 10,
      },
      {
        header: ua ? 'Нотатки менеджера' : 'Manager notes',
        key: 'managerNotes',
        width: 32,
      },
    ];

    const sheet = wb.addWorksheet('Forms');
    this.applyColumns(sheet, columns, SHEET_COLORS.Forms);

    for (const f of forms) {
      sheet.addRow({
        formId: f.id,
        createdAt: f.createdAt,
        status: labelStatus(f.status, lang),
        region: ua ? f.region : f.regionEn || f.region,
        district: ua ? f.district : f.districtEn || f.district,
        community: ua ? f.community : f.communityEn || f.community,
        settlement: ua
          ? (f.settlement ?? '')
          : (f.settlementEn ?? f.settlement ?? ''),
        organizationName: f.organizationName,
        headName: f.headName,
        headPhone: f.headPhone,
        email: f.email,
        objectName: f.objectName,
        dependentPopulation: f.dependentPopulation,
        socialFacilities: f.socialFacilities ?? '',
        installationDeadline: f.installationDeadline ?? '',
        replacementReason: f.replacementReason,
        boreholesCount: f.boreholes?.length ?? 0,
        towersCount: f.towers?.length ?? 0,
        purificationsCount: f.purifications?.length ?? 0,
        pumpsCount: f.pumps?.length ?? 0,
        itemsCount: f.items?.length ?? 0,
        managerNotes: f.managerNotes ?? '',
      });
    }

    this.finaliseSheet(sheet, columns.length, 'createdAt');
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 2: Boreholes
  // ══════════════════════════════════════════════════════════════

  private buildBoreholesSheet(
    wb: ExcelJS.Workbook,
    forms: WashForm[],
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      { header: ua ? 'ID свердловини' : 'Borehole ID', key: 'id', width: 38 },
      { header: 'form_id', key: 'formId', width: 38 },
      { header: ua ? '#' : '#', key: 'sortOrder', width: 5 },
      { header: ua ? 'Область' : 'Region', key: 'region', width: 20 },
      {
        header: ua ? 'Організація' : 'Organization',
        key: 'organizationName',
        width: 28,
      },
      {
        header: ua ? 'Варіант робіт' : 'Work type',
        key: 'workType',
        width: 24,
      },
      {
        header: ua ? 'Очік. дебіт, м³/год' : 'Expected flow, m³/h',
        key: 'expectedFlowRate',
        width: 16,
      },
      {
        header: ua ? 'Глибина існуючої, м' : 'Existing depth, m',
        key: 'existingDepth',
        width: 14,
      },
      {
        header: ua ? 'Дебіт існуючої, м³/год' : 'Existing debit, m³/h',
        key: 'existingDebit',
        width: 16,
      },
      {
        header: ua ? 'Водоносний горизонт' : 'Aquifer info',
        key: 'hasAquiferInfo',
        width: 12,
      },
      {
        header: ua ? 'Дані конструкції' : 'Design info',
        key: 'hasDesignInfo',
        width: 12,
      },
      { header: ua ? 'Паспорт' : 'Passport', key: 'hasPassport', width: 10 },
      {
        header: ua ? 'Розташування старої' : 'Old location',
        key: 'oldLocation',
        width: 28,
      },
      { header: ua ? 'Примітки' : 'Notes', key: 'notes', width: 28 },
    ];

    const sheet = wb.addWorksheet('Boreholes');
    this.applyColumns(sheet, columns, SHEET_COLORS.Boreholes);

    for (const f of forms) {
      for (const b of f.boreholes ?? []) {
        sheet.addRow({
          id: b.id,
          formId: f.id,
          sortOrder: b.sortOrder + 1,
          region: ua ? f.region : f.regionEn || f.region,
          organizationName: f.organizationName,
          workType: labelBoreholeWorkType(b.workType, lang),
          expectedFlowRate: b.expectedFlowRate,
          existingDepth: b.existingDepth ?? '',
          existingDebit: b.existingDebit ?? '',
          hasAquiferInfo: labelBool(b.hasAquiferInfo, lang),
          hasDesignInfo: labelBool(b.hasDesignInfo, lang),
          hasPassport: labelBool(b.hasPassport, lang),
          oldLocation: b.oldLocation ?? '',
          notes: b.notes ?? '',
        });
      }
    }

    this.finaliseSheet(sheet, columns.length);
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 3: Towers
  // ══════════════════════════════════════════════════════════════

  private buildTowersSheet(
    wb: ExcelJS.Workbook,
    forms: WashForm[],
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      { header: ua ? 'ID башти' : 'Tower ID', key: 'id', width: 38 },
      { header: 'form_id', key: 'formId', width: 38 },
      { header: '#', key: 'sortOrder', width: 5 },
      { header: ua ? 'Область' : 'Region', key: 'region', width: 20 },
      {
        header: ua ? 'Організація' : 'Organization',
        key: 'organizationName',
        width: 28,
      },
      { header: ua ? 'Тип башти' : 'Tower type', key: 'towerType', width: 22 },
      { header: ua ? 'Висота' : 'Height', key: 'towerHeight', width: 14 },
      {
        header: ua ? 'Фундамент' : 'Foundation',
        key: 'hasFoundation',
        width: 12,
      },
      {
        header: ua ? 'Фундамент придатний' : 'Foundation suitable',
        key: 'isFoundationSuitable',
        width: 14,
      },
      {
        header: ua ? 'Реконструкція' : 'Needs reconstruction',
        key: 'needsFoundationReconstruction',
        width: 14,
      },
      {
        header: ua ? 'Своїми силами' : 'Self reconstruct',
        key: 'canSelfReconstruct',
        width: 14,
      },
      { header: ua ? 'Кран' : 'Crane', key: 'canProvideCrane', width: 10 },
      { header: ua ? 'Примітки' : 'Notes', key: 'notes', width: 28 },
    ];

    const sheet = wb.addWorksheet('Towers');
    this.applyColumns(sheet, columns, SHEET_COLORS.Towers);

    for (const f of forms) {
      for (const t of f.towers ?? []) {
        sheet.addRow({
          id: t.id,
          formId: f.id,
          sortOrder: t.sortOrder + 1,
          region: ua ? f.region : f.regionEn || f.region,
          organizationName: f.organizationName,
          towerType: labelTowerType(t.towerType, lang),
          towerHeight: labelTowerHeight(t.towerHeight, t.customHeight, lang),
          hasFoundation: labelBool(t.hasFoundation, lang),
          isFoundationSuitable: labelBool(t.isFoundationSuitable, lang),
          needsFoundationReconstruction: labelBool(
            t.needsFoundationReconstruction,
            lang,
          ),
          canSelfReconstruct: labelBool(t.canSelfReconstruct, lang),
          canProvideCrane: labelBool(t.canProvideCrane, lang),
          notes: t.notes ?? '',
        });
      }
    }

    this.finaliseSheet(sheet, columns.length);
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 4: Purifications
  // ══════════════════════════════════════════════════════════════

  private buildPurificationsSheet(
    wb: ExcelJS.Workbook,
    forms: WashForm[],
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      { header: ua ? 'ID системи' : 'Purification ID', key: 'id', width: 38 },
      { header: 'form_id', key: 'formId', width: 38 },
      { header: '#', key: 'sortOrder', width: 5 },
      { header: ua ? 'Область' : 'Region', key: 'region', width: 20 },
      {
        header: ua ? 'Організація' : 'Organization',
        key: 'organizationName',
        width: 28,
      },
      { header: ua ? 'Приміщення' : 'Room', key: 'hasRoom', width: 10 },
      {
        header: ua ? 'Температура' : 'Temperature',
        key: 'hasTemperatureControl',
        width: 12,
      },
      {
        header: ua ? 'Водопостачання/дренаж' : 'Water / drainage',
        key: 'hasWaterInletDrainage',
        width: 14,
      },
      { header: ua ? 'Електрика' : 'Power', key: 'hasPowerSupply', width: 10 },
      {
        header: ua ? 'Обслуговування' : 'Maintenance',
        key: 'canMaintainSystem',
        width: 12,
      },
      {
        header: ua ? 'Надання води' : 'Provide water',
        key: 'willingToProvideWater',
        width: 12,
      },
      { header: ua ? 'Примітки' : 'Notes', key: 'notes', width: 28 },
    ];

    const sheet = wb.addWorksheet('Purifications');
    this.applyColumns(sheet, columns, SHEET_COLORS.Purifications);

    for (const f of forms) {
      for (const p of f.purifications ?? []) {
        sheet.addRow({
          id: p.id,
          formId: f.id,
          sortOrder: p.sortOrder + 1,
          region: ua ? f.region : f.regionEn || f.region,
          organizationName: f.organizationName,
          hasRoom: labelBool(p.hasRoom, lang),
          hasTemperatureControl: labelBool(p.hasTemperatureControl, lang),
          hasWaterInletDrainage: labelBool(p.hasWaterInletDrainage, lang),
          hasPowerSupply: labelBool(p.hasPowerSupply, lang),
          canMaintainSystem: labelBool(p.canMaintainSystem, lang),
          willingToProvideWater: labelBool(p.willingToProvideWater, lang),
          notes: p.notes ?? '',
        });
      }
    }

    this.finaliseSheet(sheet, columns.length);
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 5: Pumps
  // ══════════════════════════════════════════════════════════════

  private buildPumpsSheet(
    wb: ExcelJS.Workbook,
    forms: WashForm[],
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      { header: ua ? 'ID насоса' : 'Pump ID', key: 'id', width: 38 },
      { header: 'form_id', key: 'formId', width: 38 },
      { header: '#', key: 'sortOrder', width: 5 },
      { header: ua ? 'Область' : 'Region', key: 'region', width: 20 },
      {
        header: ua ? 'Організація' : 'Organization',
        key: 'organizationName',
        width: 28,
      },
      { header: ua ? 'Призначення' : 'Purpose', key: 'purpose', width: 22 },
      {
        header: ua ? 'Уточнення' : 'Purpose details',
        key: 'purposeOther',
        width: 24,
      },
      { header: ua ? 'Бренд' : 'Brand', key: 'brand', width: 16 },
      { header: ua ? 'Модель' : 'Model', key: 'model', width: 28 },
      {
        header: ua ? 'Потужність, кВт' : 'Power, kW',
        key: 'powerKw',
        width: 14,
      },
      {
        header: ua ? 'Продуктивність, м³/год' : 'Flow rate, m³/h',
        key: 'flowRateM3h',
        width: 16,
      },
      { header: ua ? 'Напір, м' : 'Head, m', key: 'headM', width: 10 },
      {
        header: ua ? 'Діаметр, дюйм' : 'Diameter, inch',
        key: 'diameterInches',
        width: 12,
      },
      { header: ua ? 'Напруга' : 'Voltage', key: 'voltage', width: 12 },
      { header: ua ? 'Фази' : 'Phases', key: 'phases', width: 8 },
      { header: ua ? 'Кількість' : 'Quantity', key: 'quantity', width: 10 },
      { header: ua ? 'Примітки' : 'Notes', key: 'notes', width: 28 },
    ];

    const sheet = wb.addWorksheet('Pumps');
    this.applyColumns(sheet, columns, SHEET_COLORS.Pumps);

    for (const f of forms) {
      for (const p of f.pumps ?? []) {
        sheet.addRow({
          id: p.id,
          formId: f.id,
          sortOrder: p.sortOrder + 1,
          region: ua ? f.region : f.regionEn || f.region,
          organizationName: f.organizationName,
          purpose: labelPumpPurpose(p.purpose, lang),
          purposeOther: p.purposeOther ?? '',
          brand: p.brand ?? '',
          model: p.model ?? '',
          powerKw: p.powerKw != null ? Number(p.powerKw) : '',
          flowRateM3h: p.flowRateM3h != null ? Number(p.flowRateM3h) : '',
          headM: p.headM != null ? Number(p.headM) : '',
          diameterInches:
            p.diameterInches != null ? Number(p.diameterInches) : '',
          voltage: p.voltage ?? '',
          phases: p.phases ?? '',
          quantity: p.quantity,
          notes: p.notes ?? '',
        });
      }
    }

    this.finaliseSheet(sheet, columns.length);
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 6: Equipment
  // ══════════════════════════════════════════════════════════════

  private buildEquipmentSheet(
    wb: ExcelJS.Workbook,
    forms: WashForm[],
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      { header: ua ? 'ID рядка' : 'Row ID', key: 'id', width: 38 },
      { header: 'form_id', key: 'formId', width: 38 },
      { header: '#', key: 'sortOrder', width: 5 },
      { header: ua ? 'Область' : 'Region', key: 'region', width: 20 },
      {
        header: ua ? 'Організація' : 'Organization',
        key: 'organizationName',
        width: 28,
      },
      { header: ua ? 'Категорія' : 'Category', key: 'category', width: 24 },
      { header: ua ? 'Код LTA' : 'LTA code', key: 'ltaCode', width: 10 },
      { header: ua ? 'Позиція' : 'Item', key: 'itemName', width: 40 },
      { header: ua ? 'Кількість' : 'Quantity', key: 'quantity', width: 12 },
      { header: ua ? 'Од.' : 'Unit', key: 'unit', width: 8 },
      { header: ua ? 'Примітки' : 'Notes', key: 'notes', width: 28 },
    ];

    const sheet = wb.addWorksheet('Equipment');
    this.applyColumns(sheet, columns, SHEET_COLORS.Equipment);

    for (const f of forms) {
      for (const it of f.items ?? []) {
        const eq = it.equipmentItem;
        const cat = eq?.category;
        sheet.addRow({
          id: it.id,
          formId: f.id,
          sortOrder: it.sortOrder + 1,
          region: ua ? f.region : f.regionEn || f.region,
          organizationName: f.organizationName,
          category: cat ? (ua ? cat.nameUa : cat.nameEn) : '',
          ltaCode: eq?.ltaCode ?? '',
          itemName: eq ? (ua ? eq.nameUa : eq.nameEn) : '',
          quantity: it.quantity != null ? Number(it.quantity) : '',
          unit: labelEquipmentUnit(eq?.unit, lang),
          notes: it.notes ?? '',
        });
      }
    }

    this.finaliseSheet(sheet, columns.length);
  }

  // ══════════════════════════════════════════════════════════════
  // Shared helpers
  // ══════════════════════════════════════════════════════════════

  /** Apply column definitions and style the header band. */
  private applyColumns(
    sheet: ExcelJS.Worksheet,
    columns: ColSpec[],
    headerBgColor: string,
  ): void {
    sheet.columns = columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = {
      bold: true,
      color: { argb: HEADER_TEXT_COLOR },
      size: 11,
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerBgColor },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'left',
      wrapText: true,
    };
    headerRow.height = 28;
  }

  /**
   * Common per-sheet finalisation:
   *  - freeze header row,
   *  - attach auto-filter to the header range,
   *  - format created-at column as a date if provided.
   */
  private finaliseSheet(
    sheet: ExcelJS.Worksheet,
    columnCount: number,
    dateColumnKey?: string,
  ): void {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Auto-filter across the whole header row.
    const lastCol = this.columnLetter(columnCount);
    sheet.autoFilter = `A1:${lastCol}1`;

    if (dateColumnKey) {
      const col = sheet.getColumn(dateColumnKey);
      if (col) col.numFmt = 'yyyy-mm-dd hh:mm';
    }
  }

  /** Convert 1-based column number to spreadsheet letter (1 -> A, 27 -> AA). */
  private columnLetter(n: number): string {
    let s = '';
    let x = n;
    while (x > 0) {
      const rem = (x - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  }
}
