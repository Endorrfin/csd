import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { FormStatus } from './entities/wash-form.entity';
import { RecoveryForm } from './entities/recovery-form.entity';
import { RecoveryFormDamage } from './entities/recovery-form-damage.entity';
import { NeedsFormAttachment } from './entities/needs-form-attachment.entity';
import { RECOVERY_FORM_TYPE } from './recovery.constants';
// status + boolean labels are shared with WASH; reuse them.
import { labelBool, labelStatus } from './xlsx-export.labels';
import {
  labelAccessibilityFeatures,
  labelApplicantCategory,
  labelAsbestos,
  labelCofinancing,
  labelCostBasis,
  labelDamageCategory,
  labelDamageCause,
  labelDamageElement,
  labelDamageUnit,
  labelDesiredTimeline,
  labelDocsAvailable,
  labelEducationMode,
  labelFunctioningStatus,
  labelHealthFacilityKind,
  labelObjectType,
  labelOwnershipType,
  labelRemoteOperation,
  labelShelterStatus,
  labelShelterType,
  labelUrgency,
  labelWorkCategories,
  labelAttachmentKind,
} from './recovery-xlsx-export.labels';

type Lang = 'ua' | 'en';

/** Column spec — key matches a row property. */
interface ColSpec {
  header: string;
  key: string;
  width: number;
}

/** Filters accepted by the export (mirror of RecoveryService.findAll, no paging). */
export interface RecoveryExportOptions {
  status?: FormStatus;
  region?: string;
  objectType?: string;
  applicantCategory?: string;
  urgency?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  lang: Lang;
}

/** Header fill colour per sheet (localized names, so colours are explicit). */
const APPLICATIONS_COLOR = 'FF1E3A8A'; // deep blue
const DAMAGES_COLOR = 'FFB45309'; // amber-brown
const FILES_COLOR = 'FF7C3AED'; // violet
const HEADER_TEXT_COLOR = 'FFFFFFFF';

/** Group rows into a Map by a derived key, preserving input order per bucket. */
function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }
  return map;
}

@Injectable()
export class RecoveryXlsxExportService {
  constructor(
    @InjectRepository(RecoveryForm)
    private readonly formRepo: Repository<RecoveryForm>,
    @InjectRepository(RecoveryFormDamage)
    private readonly damageRepo: Repository<RecoveryFormDamage>,
    @InjectRepository(NeedsFormAttachment)
    private readonly attachmentRepo: Repository<NeedsFormAttachment>,
  ) {}

  /**
   * Build the Recovery XLSX workbook for the given filters.
   *
   * Layout:
   *  - Sheet 1 "Applications"/"Заявки"   — 1 row per form, all scalar fields.
   *  - Sheet 2 "Damages"/"Пошкодження"   — 1 row per damaged element.
   *  - Sheet 3 "Files"/"Файли"           — 1 row per attachment (metadata only,
   *                                         NO presigned urls — private bucket).
   *
   * Filters mirror RecoveryService.findAll (status / region ILIKE / objectType /
   * applicantCategory / urgency / search / dateFrom / dateTo) but WITHOUT
   * pagination — every matching form is exported, ordered by createdAt DESC.
   */
  async buildWorkbook(opts: RecoveryExportOptions): Promise<Buffer> {
    const lang: Lang = opts.lang === 'ua' ? 'ua' : 'en';

    // ── Load all forms matching the filters (no paging) ──
    const qb = this.formRepo.createQueryBuilder('f');

    if (opts.status) qb.andWhere('f.status = :status', { status: opts.status });
    if (opts.region)
      qb.andWhere('f.region ILIKE :region', { region: `%${opts.region}%` });
    if (opts.objectType)
      qb.andWhere('f.objectType = :objectType', { objectType: opts.objectType });
    if (opts.applicantCategory)
      qb.andWhere('f.applicantCategory = :applicantCategory', {
        applicantCategory: opts.applicantCategory,
      });
    if (opts.urgency)
      qb.andWhere('f.urgency = :urgency', { urgency: opts.urgency });
    if (opts.search)
      qb.andWhere(
        '(f.trackingNumber ILIKE :s OR f.objectName ILIKE :s OR f.organizationName ILIKE :s)',
        { s: `%${opts.search}%` },
      );
    if (opts.dateFrom)
      qb.andWhere('f.createdAt >= :dateFrom', { dateFrom: opts.dateFrom });
    if (opts.dateTo)
      qb.andWhere("f.createdAt < (:dateTo::date + INTERVAL '1 day')", {
        dateTo: opts.dateTo,
      });

    qb.orderBy('f.createdAt', 'DESC');

    const forms = await qb.getMany();
    const ids = forms.map((f) => f.id);

    // ── Load children for the matched forms (guard empty IN) ──
    const damages = ids.length
      ? await this.damageRepo.find({
          where: { recoveryFormId: In(ids) },
          order: { sortOrder: 'ASC' },
        })
      : [];

    const attachments = ids.length
      ? await this.attachmentRepo.find({
          where: { formType: RECOVERY_FORM_TYPE, formId: In(ids) },
          order: { kind: 'ASC', sortOrder: 'ASC' },
        })
      : [];

    // Group children per form so the child sheets follow sheet-1 order
    // (createdAt DESC) with each form's rows contiguous.
    const damagesByForm = groupBy(damages, (d) => d.recoveryFormId);
    const attachmentsByForm = groupBy(attachments, (a) => a.formId);

    // ── Build workbook ──
    const wb = new ExcelJS.Workbook();
    wb.creator = 'CSD Fund Portal';
    wb.created = new Date();

    this.buildApplicationsSheet(wb, forms, lang);
    this.buildDamagesSheet(wb, forms, damagesByForm, lang);
    this.buildFilesSheet(wb, forms, attachmentsByForm, lang);

    // Node Buffer (per the export contract) — WASH returns ExcelJS.Buffer.
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 1: Applications (master — all scalar columns)
  // ══════════════════════════════════════════════════════════════

  private buildApplicationsSheet(
    wb: ExcelJS.Workbook,
    forms: RecoveryForm[],
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      { header: ua ? 'Номер заявки' : 'Tracking number', key: 'trackingNumber', width: 18 },
      { header: ua ? 'Дата створення' : 'Created at', key: 'createdAt', width: 18 },
      { header: ua ? 'Статус' : 'Status', key: 'status', width: 14 },

      // ── Location (5W / cluster «Where»): keep BOTH ua & en values ──
      { header: ua ? 'Область (Oblast)' : 'Oblast / region', key: 'region', width: 20 },
      { header: ua ? 'Область (EN)' : 'Oblast (EN)', key: 'regionEn', width: 20 },
      { header: ua ? 'Район (Raion)' : 'Raion / district', key: 'district', width: 20 },
      { header: ua ? 'Район (EN)' : 'Raion (EN)', key: 'districtEn', width: 20 },
      { header: ua ? 'Громада (Hromada)' : 'Hromada', key: 'community', width: 22 },
      { header: ua ? 'Громада (EN)' : 'Hromada (EN)', key: 'communityEn', width: 22 },
      { header: ua ? 'Код громади (Hromada P-code)' : 'Hromada P-code', key: 'communityCode', width: 16 },
      { header: ua ? 'Населений пункт (Settlement)' : 'Settlement', key: 'settlement', width: 22 },
      { header: ua ? 'Населений пункт (EN)' : 'Settlement (EN)', key: 'settlementEn', width: 22 },
      { header: ua ? 'Код НП (Settlement P-code)' : 'Settlement P-code', key: 'settlementCode', width: 16 },

      // ── Applicant ──
      { header: ua ? 'Категорія заявника' : 'Applicant category', key: 'applicantCategory', width: 26 },
      { header: ua ? 'Категорія (інше)' : 'Applicant category (other)', key: 'applicantCategoryOther', width: 22 },
      { header: ua ? 'Організація' : 'Organization', key: 'organizationName', width: 28 },

      // ── Contacts ──
      { header: ua ? 'Контактна особа' : 'Contact name', key: 'contactName', width: 22 },
      { header: ua ? 'Посада' : 'Position', key: 'contactPosition', width: 20 },
      { header: ua ? 'Телефон' : 'Phone', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 24 },
      { header: ua ? 'Месенджер' : 'Messenger', key: 'messenger', width: 16 },
      { header: ua ? 'Дод. контакт (ПІБ)' : 'Alt contact name', key: 'altContactName', width: 22 },
      { header: ua ? 'Дод. контакт (тел.)' : 'Alt contact phone', key: 'altContactPhone', width: 16 },
      { header: ua ? 'Вебсайт' : 'Website', key: 'website', width: 24 },

      // ── Object ──
      { header: ua ? 'Назва обʼєкту' : 'Object name', key: 'objectName', width: 28 },
      { header: ua ? 'Тип обʼєкту' : 'Object type', key: 'objectType', width: 22 },
      { header: ua ? 'Тип обʼєкту (інше)' : 'Object type (other)', key: 'objectTypeOther', width: 22 },
      { header: ua ? 'Адреса' : 'Street address', key: 'streetAddress', width: 26 },
      { header: ua ? 'Форма власності' : 'Ownership type', key: 'ownershipType', width: 18 },
      { header: ua ? 'Власність (інше)' : 'Ownership (other)', key: 'ownershipTypeOther', width: 20 },
      { header: ua ? 'На балансі заявника' : 'On applicant balance', key: 'onApplicantBalance', width: 14 },
      { header: ua ? 'Рік побудови' : 'Build year', key: 'buildYear', width: 12 },
      { header: ua ? 'Площа, м²' : 'Total area, m²', key: 'totalArea', width: 14 },
      { header: ua ? 'Поверхів' : 'Floors', key: 'floors', width: 10 },

      // ── Works & damage ──
      { header: ua ? 'Категорії робіт' : 'Work categories', key: 'workCategories', width: 34 },
      { header: ua ? 'Опис пошкоджень' : 'Damage description', key: 'damageDescription', width: 40 },
      { header: ua ? 'Причина пошкодження' : 'Damage cause', key: 'damageCause', width: 22 },
      { header: ua ? 'Причина (інше)' : 'Damage cause (other)', key: 'damageCauseOther', width: 22 },
      { header: ua ? 'Дата пошкодження' : 'Damage date', key: 'damageDate', width: 14 },
      { header: ua ? 'Категорія пошкодження' : 'Damage category', key: 'damageCategory', width: 24 },
      { header: ua ? 'Стан функціонування' : 'Functioning status', key: 'functioningStatus', width: 22 },
      { header: ua ? 'Доступність' : 'Accessibility features', key: 'accessibilityFeatures', width: 30 },

      // ── Conditional: education ──
      { header: ua ? 'Формат навчання' : 'Education mode', key: 'educationMode', width: 18 },
      { header: ua ? 'Стан укриття' : 'Shelter status', key: 'shelterStatus', width: 18 },
      { header: ua ? 'Тип укриття' : 'Shelter type', key: 'shelterType', width: 20 },
      { header: ua ? 'Місткість укриття' : 'Shelter capacity', key: 'shelterCapacity', width: 14 },

      // ── Conditional: healthcare ──
      { header: ua ? 'Тип медзакладу' : 'Health facility kind', key: 'healthFacilityKind', width: 20 },
      { header: ua ? 'Призупинені послуги' : 'Suspended services', key: 'suspendedServices', width: 30 },
      { header: ua ? 'Декларацій' : 'Declarations', key: 'declarationsCount', width: 12 },

      // ── Beneficiaries (SADD) ──
      { header: ua ? 'Прямі бенефіціари' : 'Direct beneficiaries', key: 'directBeneficiaries', width: 14 },
      { header: ua ? 'ВПО' : 'IDPs', key: 'idpCount', width: 10 },
      { header: ua ? 'Діти' : 'Children', key: 'childrenCount', width: 10 },
      { header: ua ? 'Люди з інвалідністю' : 'PwD', key: 'pwdCount', width: 12 },
      { header: ua ? 'Літні' : 'Elderly', key: 'elderlyCount', width: 10 },
      { header: ua ? 'Жінки' : 'Female', key: 'femaleCount', width: 10 },
      { header: ua ? 'Чоловіки' : 'Male', key: 'maleCount', width: 10 },
      { header: ua ? 'Непрямі бенефіціари' : 'Indirect beneficiaries', key: 'indirectBeneficiaries', width: 14 },
      { header: ua ? 'Персонал' : 'Staff', key: 'staffCount', width: 10 },
      { header: ua ? 'Дистанційна робота' : 'Can operate remotely', key: 'canOperateRemotely', width: 16 },

      // ── Budget / docs / timeline ──
      { header: ua ? 'Орієнтовна вартість, грн' : 'Estimated cost, UAH', key: 'estimatedCost', width: 18 },
      { header: ua ? 'Підстава оцінки' : 'Cost basis', key: 'costBasis', width: 22 },
      { header: ua ? 'Співфінансування' : 'Cofinancing', key: 'cofinancing', width: 16 },
      { header: ua ? 'Співфінансування (деталі)' : 'Cofinancing details', key: 'cofinancingDetails', width: 24 },
      { header: ua ? 'Наявні документи' : 'Docs available', key: 'docsAvailable', width: 34 },
      { header: ua ? 'Бажаний термін' : 'Desired timeline', key: 'desiredTimeline', width: 16 },
      { header: ua ? 'Терміновість' : 'Urgency', key: 'urgency', width: 20 },
      { header: ua ? 'Інші донори' : 'Other donors', key: 'otherDonors', width: 12 },
      { header: ua ? 'Інші донори (деталі)' : 'Other donors details', key: 'otherDonorsDetails', width: 26 },
      { header: ua ? 'Азбест' : 'Asbestos', key: 'asbestosPresence', width: 12 },
      { header: ua ? 'Хмарне посилання' : 'Cloud link', key: 'cloudLink', width: 26 },

      // ── Service fields ──
      { header: ua ? 'Згода надана' : 'Consent given', key: 'consentGiven', width: 12 },
      { header: ua ? 'Нотатки менеджера' : 'Manager notes', key: 'managerNotes', width: 32 },
      { header: ua ? 'Оновлено' : 'Updated at', key: 'updatedAt', width: 18 },
      { header: ua ? 'ID заявки' : 'Form ID', key: 'id', width: 38 },
    ];

    const sheet = wb.addWorksheet(ua ? 'Заявки' : 'Applications');
    this.applyColumns(sheet, columns, APPLICATIONS_COLOR);

    for (const f of forms) {
      sheet.addRow({
        trackingNumber: f.trackingNumber,
        createdAt: f.createdAt,
        status: labelStatus(f.status, lang),

        region: f.region,
        regionEn: f.regionEn ?? '',
        district: f.district ?? '',
        districtEn: f.districtEn ?? '',
        community: f.community ?? '',
        communityEn: f.communityEn ?? '',
        communityCode: f.communityCode ?? '',
        settlement: f.settlement ?? '',
        settlementEn: f.settlementEn ?? '',
        settlementCode: f.settlementCode ?? '',

        applicantCategory: labelApplicantCategory(f.applicantCategory, lang),
        applicantCategoryOther: f.applicantCategoryOther ?? '',
        organizationName: f.organizationName,

        contactName: f.contactName,
        contactPosition: f.contactPosition,
        phone: f.phone,
        email: f.email,
        messenger: f.messenger ?? '',
        altContactName: f.altContactName ?? '',
        altContactPhone: f.altContactPhone ?? '',
        website: f.website ?? '',

        objectName: f.objectName,
        objectType: labelObjectType(f.objectType, lang),
        objectTypeOther: f.objectTypeOther ?? '',
        streetAddress: f.streetAddress ?? '',
        ownershipType: labelOwnershipType(f.ownershipType, lang),
        ownershipTypeOther: f.ownershipTypeOther ?? '',
        onApplicantBalance: labelBool(f.onApplicantBalance, lang),
        buildYear: f.buildYear ?? '',
        totalArea: f.totalArea != null ? Number(f.totalArea) : '',
        floors: f.floors ?? '',

        workCategories: labelWorkCategories(f.workCategories, lang),
        damageDescription: f.damageDescription,
        damageCause: labelDamageCause(f.damageCause, lang),
        damageCauseOther: f.damageCauseOther ?? '',
        damageDate: f.damageDate ?? '',
        damageCategory: labelDamageCategory(f.damageCategory, lang),
        functioningStatus: labelFunctioningStatus(f.functioningStatus, lang),
        accessibilityFeatures: labelAccessibilityFeatures(f.accessibilityFeatures, lang),

        educationMode: labelEducationMode(f.educationMode, lang),
        shelterStatus: labelShelterStatus(f.shelterStatus, lang),
        shelterType: labelShelterType(f.shelterType, lang),
        shelterCapacity: f.shelterCapacity ?? '',

        healthFacilityKind: labelHealthFacilityKind(f.healthFacilityKind, lang),
        suspendedServices: f.suspendedServices ?? '',
        declarationsCount: f.declarationsCount ?? '',

        directBeneficiaries: f.directBeneficiaries,
        idpCount: f.idpCount,
        childrenCount: f.childrenCount,
        pwdCount: f.pwdCount,
        elderlyCount: f.elderlyCount,
        femaleCount: f.femaleCount ?? '',
        maleCount: f.maleCount ?? '',
        indirectBeneficiaries: f.indirectBeneficiaries ?? '',
        staffCount: f.staffCount ?? '',
        canOperateRemotely: labelRemoteOperation(f.canOperateRemotely, lang),

        estimatedCost: f.estimatedCost != null ? Number(f.estimatedCost) : '',
        costBasis: labelCostBasis(f.costBasis, lang),
        cofinancing: labelCofinancing(f.cofinancing, lang),
        cofinancingDetails: f.cofinancingDetails ?? '',
        docsAvailable: labelDocsAvailable(f.docsAvailable, lang),
        desiredTimeline: labelDesiredTimeline(f.desiredTimeline, lang),
        urgency: labelUrgency(f.urgency, lang),
        otherDonors: labelBool(f.otherDonors, lang),
        otherDonorsDetails: f.otherDonorsDetails ?? '',
        asbestosPresence: labelAsbestos(f.asbestosPresence, lang),
        cloudLink: f.cloudLink ?? '',

        consentGiven: labelBool(f.consentGiven, lang),
        managerNotes: f.managerNotes ?? '',
        updatedAt: f.updatedAt,
        id: f.id,
      });
    }

    this.finaliseSheet(sheet, columns.length, 'createdAt');
    const updatedCol = sheet.getColumn('updatedAt');
    if (updatedCol) updatedCol.numFmt = 'yyyy-mm-dd hh:mm';
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 2: Damages (1 row per damaged element)
  // ══════════════════════════════════════════════════════════════

  private buildDamagesSheet(
    wb: ExcelJS.Workbook,
    forms: RecoveryForm[],
    damagesByForm: Map<string, RecoveryFormDamage[]>,
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      { header: ua ? 'Номер заявки' : 'Tracking number', key: 'trackingNumber', width: 18 },
      { header: '#', key: 'sortOrder', width: 5 },
      { header: ua ? 'Елемент' : 'Element', key: 'element', width: 26 },
      { header: ua ? 'Обсяг' : 'Volume', key: 'volume', width: 12 },
      { header: ua ? 'Одиниця' : 'Unit', key: 'unit', width: 10 },
      { header: ua ? 'Примітки' : 'Notes', key: 'notes', width: 40 },
    ];

    const sheet = wb.addWorksheet(ua ? 'Пошкодження' : 'Damages');
    this.applyColumns(sheet, columns, DAMAGES_COLOR);

    for (const f of forms) {
      for (const d of damagesByForm.get(f.id) ?? []) {
        sheet.addRow({
          trackingNumber: f.trackingNumber,
          sortOrder: d.sortOrder + 1,
          element: labelDamageElement(d.element, lang),
          volume: d.volume != null ? Number(d.volume) : '',
          unit: labelDamageUnit(d.unit, lang),
          notes: d.notes ?? '',
        });
      }
    }

    this.finaliseSheet(sheet, columns.length);
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 3: Files (attachment metadata — NO presigned urls)
  // ══════════════════════════════════════════════════════════════

  private buildFilesSheet(
    wb: ExcelJS.Workbook,
    forms: RecoveryForm[],
    attachmentsByForm: Map<string, NeedsFormAttachment[]>,
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      { header: ua ? 'Номер заявки' : 'Tracking number', key: 'trackingNumber', width: 18 },
      { header: '#', key: 'sortOrder', width: 5 },
      { header: ua ? 'Тип' : 'Kind', key: 'kind', width: 14 },
      { header: ua ? 'Назва файлу' : 'Original name', key: 'originalName', width: 34 },
      { header: ua ? 'MIME-тип' : 'MIME type', key: 'mimeType', width: 28 },
      { header: ua ? 'Розмір, байт' : 'Size, bytes', key: 'sizeBytes', width: 14 },
      { header: ua ? 'Ключ S3' : 'S3 key', key: 's3Key', width: 48 },
    ];

    const sheet = wb.addWorksheet(ua ? 'Файли' : 'Files');
    this.applyColumns(sheet, columns, FILES_COLOR);

    for (const f of forms) {
      for (const a of attachmentsByForm.get(f.id) ?? []) {
        sheet.addRow({
          trackingNumber: f.trackingNumber,
          sortOrder: a.sortOrder + 1,
          kind: labelAttachmentKind(a.kind, lang),
          originalName: a.originalName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
          s3Key: a.s3Key,
        });
      }
    }

    this.finaliseSheet(sheet, columns.length);
  }

  // ══════════════════════════════════════════════════════════════
  // Shared helpers (same style as XlsxExportService / WASH)
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
    headerRow.font = { bold: true, color: { argb: HEADER_TEXT_COLOR }, size: 11 };
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
