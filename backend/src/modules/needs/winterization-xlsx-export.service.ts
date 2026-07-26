import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { FormStatus } from './entities/wash-form.entity';
import { WinterizationForm } from './entities/winterization-form.entity';
import { WinterizationFormNeed } from './entities/winterization-form-need.entity';
import { NeedsFormAttachment } from './entities/needs-form-attachment.entity';
import { WINTERIZATION_FORM_TYPE } from './winterization.constants';
// status + boolean labels are shared with WASH; reuse them.
import { labelBool, labelStatus } from './xlsx-export.labels';
import {
  labelApplicantType,
  labelAttachmentKind,
  labelBackupPower,
  labelBuildingCondition,
  labelCofinancing,
  labelCostBasis,
  labelDocsAvailable,
  labelFacilityKind,
  labelFrontlineStatus,
  labelGeneratorFuelType,
  labelGeneratorPurpose,
  labelHeatingSource,
  labelLogistics,
  labelNeedBy,
  labelNeedCategories,
  labelNeedCategory,
  labelNeedItem,
  labelNeedUnit,
  labelResiliencePointStatus,
  labelUrgency,
} from './winterization-xlsx-export.labels';

type Lang = 'ua' | 'en';

/** Column spec — key matches a row property. */
interface ColSpec {
  header: string;
  key: string;
  width: number;
}

/**
 * Filters accepted by the export — a mirror of WinterizationService.findAll
 * WITHOUT pagination, so the workbook always covers the analyst's whole
 * selection rather than the page they happen to be looking at.
 */
export interface WinterizationExportOptions {
  status?: FormStatus;
  region?: string;
  applicantType?: string;
  facilityKind?: string;
  needCategory?: string;
  urgency?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  lang: Lang;
}

/** Header fill colour per sheet (localized names, so colours are explicit). */
const APPLICATIONS_COLOR = 'FF1E3A8A'; // deep blue
const NEEDS_COLOR = 'FF0F766E'; // teal — "winter" counterpart of Damages
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
export class WinterizationXlsxExportService {
  constructor(
    @InjectRepository(WinterizationForm)
    private readonly formRepo: Repository<WinterizationForm>,
    @InjectRepository(WinterizationFormNeed)
    private readonly needRepo: Repository<WinterizationFormNeed>,
    @InjectRepository(NeedsFormAttachment)
    private readonly attachmentRepo: Repository<NeedsFormAttachment>,
  ) {}

  /**
   * Build the Winterization XLSX workbook for the given filters.
   *
   * Layout (implementation-plan §8):
   *  - Sheet 1 "Applications"/"Заявки" — 1 row per form, all scalar fields
   *    INCLUDING the category-level scalars (solidFuelBoilerCount,
   *    resiliencePointStatus, liquidFuelMonthsNeeded…). They are properties of
   *    the application, not of a specification line (§14.3 п.2) — putting them
   *    on the "Needs" sheet would double-count them once per row and break the
   *    budget model.
   *  - Sheet 2 "Needs"/"Потреби"       — 1 row per specification position. This
   *    is the direct input to the budget model (quantity × cluster reference
   *    cost), so it stays flat: no merged cells, no per-form grouping headers.
   *  - Sheet 3 "Files"/"Файли"         — 1 row per attachment (metadata only,
   *                                      NO presigned urls — private bucket).
   *
   * Household (`hh*`) columns are deliberately absent: the scenario is gated off
   * by WINTERIZATION_HOUSEHOLD_ENABLED and the server answers 422, so no such
   * form can exist yet (implementation-plan §7). They land with the flag.
   */
  async buildWorkbook(opts: WinterizationExportOptions): Promise<Buffer> {
    const lang: Lang = opts.lang === 'ua' ? 'ua' : 'en';

    // ── Load all forms matching the filters (no paging) ──
    const qb = this.formRepo.createQueryBuilder('f');

    if (opts.status) qb.andWhere('f.status = :status', { status: opts.status });
    if (opts.region)
      qb.andWhere('f.region ILIKE :region', { region: `%${opts.region}%` });
    if (opts.applicantType)
      qb.andWhere('f.applicantType = :applicantType', {
        applicantType: opts.applicantType,
      });
    if (opts.facilityKind)
      qb.andWhere('f.facilityKind = :facilityKind', {
        facilityKind: opts.facilityKind,
      });
    // needCategories is a text[] column — membership test, not equality.
    // `@> ARRAY[...]` (not `= ANY(...)`) so the GIN index can be used.
    if (opts.needCategory)
      qb.andWhere('f.needCategories @> ARRAY[:needCategory]::text[]', {
        needCategory: opts.needCategory,
      });
    if (opts.urgency)
      qb.andWhere('f.urgency = :urgency', { urgency: opts.urgency });
    if (opts.search)
      // trackingNumber / organizationName / facilityName only — never PII contacts.
      qb.andWhere(
        '(f.trackingNumber ILIKE :s OR f.organizationName ILIKE :s OR f.facilityName ILIKE :s)',
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
    const needs = ids.length
      ? await this.needRepo.find({
          where: { winterizationFormId: In(ids) },
          order: { sortOrder: 'ASC' },
        })
      : [];

    const attachments = ids.length
      ? await this.attachmentRepo.find({
          where: { formType: WINTERIZATION_FORM_TYPE, formId: In(ids) },
          order: { kind: 'ASC', sortOrder: 'ASC' },
        })
      : [];

    // Group children per form so the child sheets follow sheet-1 order
    // (createdAt DESC) with each form's rows contiguous.
    const needsByForm = groupBy(needs, (n) => n.winterizationFormId);
    const attachmentsByForm = groupBy(attachments, (a) => a.formId);

    // ── Build workbook ──
    const wb = new ExcelJS.Workbook();
    wb.creator = 'CSD Fund Portal';
    wb.created = new Date();

    this.buildApplicationsSheet(wb, forms, lang);
    this.buildNeedsSheet(wb, forms, needsByForm, lang);
    this.buildFilesSheet(wb, forms, attachmentsByForm, lang);

    // Node Buffer (per the export contract) — WASH returns ExcelJS.Buffer.
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  // ══════════════════════════════════════════════════════════════
  // Sheet 1: Applications (master — all scalar columns)
  // ══════════════════════════════════════════════════════════════

  private buildApplicationsSheet(
    wb: ExcelJS.Workbook,
    forms: WinterizationForm[],
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      {
        header: ua ? 'Номер заявки' : 'Tracking number',
        key: 'trackingNumber',
        width: 18,
      },
      {
        header: ua ? 'Дата створення' : 'Created at',
        key: 'createdAt',
        width: 18,
      },
      { header: ua ? 'Статус' : 'Status', key: 'status', width: 14 },

      // ── Location (5W / cluster «Where»): keep BOTH ua & en values ──
      {
        header: ua ? 'Область (Oblast)' : 'Oblast / region',
        key: 'region',
        width: 20,
      },
      {
        header: ua ? 'Область (EN)' : 'Oblast (EN)',
        key: 'regionEn',
        width: 20,
      },
      {
        header: ua ? 'Район (Raion)' : 'Raion / district',
        key: 'district',
        width: 20,
      },
      {
        header: ua ? 'Район (EN)' : 'Raion (EN)',
        key: 'districtEn',
        width: 20,
      },
      {
        header: ua ? 'Громада (Hromada)' : 'Hromada',
        key: 'community',
        width: 22,
      },
      {
        header: ua ? 'Громада (EN)' : 'Hromada (EN)',
        key: 'communityEn',
        width: 22,
      },
      {
        header: ua ? 'Код громади (Hromada P-code)' : 'Hromada P-code',
        key: 'communityCode',
        width: 16,
      },
      {
        header: ua ? 'Населений пункт (Settlement)' : 'Settlement',
        key: 'settlement',
        width: 22,
      },
      {
        header: ua ? 'Населений пункт (EN)' : 'Settlement (EN)',
        key: 'settlementEn',
        width: 22,
      },
      {
        header: ua ? 'Код НП (Settlement P-code)' : 'Settlement P-code',
        key: 'settlementCode',
        width: 16,
      },

      // ── Applicant ──
      {
        header: ua ? 'Тип заявника' : 'Applicant type',
        key: 'applicantType',
        width: 22,
      },
      {
        header: ua ? 'Організація' : 'Organization',
        key: 'organizationName',
        width: 28,
      },
      { header: ua ? 'ЄДРПОУ' : 'EDRPOU', key: 'edrpou', width: 12 },

      // ── Contacts ──
      {
        header: ua ? 'Контактна особа' : 'Contact name',
        key: 'contactName',
        width: 22,
      },
      { header: ua ? 'Посада' : 'Position', key: 'contactPosition', width: 20 },
      { header: ua ? 'Телефон' : 'Phone', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 24 },
      { header: ua ? 'Месенджер' : 'Messenger', key: 'messenger', width: 16 },
      {
        header: ua ? 'Дод. контакт (ПІБ)' : 'Alt contact name',
        key: 'altContactName',
        width: 22,
      },
      {
        header: ua ? 'Дод. контакт (тел.)' : 'Alt contact phone',
        key: 'altContactPhone',
        width: 16,
      },
      { header: ua ? 'Вебсайт' : 'Website', key: 'website', width: 24 },

      // ── Object / facility (institution scenario) ──
      {
        header: ua ? 'Назва закладу' : 'Facility name',
        key: 'facilityName',
        width: 28,
      },
      {
        header: ua ? 'Тип закладу' : 'Facility kind',
        key: 'facilityKind',
        width: 24,
      },
      {
        header: ua ? 'Тип закладу (інше)' : 'Facility kind (other)',
        key: 'facilityKindOther',
        width: 22,
      },
      {
        header: ua ? 'Адреса' : 'Street address',
        key: 'streetAddress',
        width: 26,
      },
      {
        header: ua ? 'Джерело опалення' : 'Heating source',
        key: 'heatingSource',
        width: 26,
      },
      {
        header: ua ? 'Опалення (інше)' : 'Heating source (other)',
        key: 'heatingSourceOther',
        width: 22,
      },
      {
        header: ua ? 'Опалювана площа, м²' : 'Heated area, m²',
        key: 'heatedArea',
        width: 16,
      },
      {
        header: ua ? 'Резервне живлення' : 'Backup power',
        key: 'backupPower',
        width: 18,
      },
      {
        header: ua ? 'Стан будівлі' : 'Building condition',
        key: 'buildingCondition',
        width: 24,
      },

      // ── Hromada scenario ──
      {
        header: ua ? 'Населення громади' : 'Population total',
        key: 'populationTotal',
        width: 16,
      },
      {
        header: ua ? 'Населених пунктів' : 'Settlements covered',
        key: 'settlementsCovered',
        width: 14,
      },
      {
        header: ua ? 'Статус громади' : 'Frontline status',
        key: 'frontlineStatus',
        width: 24,
      },
      {
        header: ua ? 'Цільові обʼєкти' : 'Target facilities',
        key: 'targetFacilities',
        width: 34,
      },

      // ── Needs (category level — item level lives on the "Needs" sheet) ──
      {
        header: ua ? 'Категорії потреб' : 'Need categories',
        key: 'needCategories',
        width: 38,
      },
      {
        header: ua ? 'Категорія (інше)' : 'Need category (other)',
        key: 'needCategoryOther',
        width: 24,
      },
      {
        header: ua ? 'Опис ситуації' : 'Situation description',
        key: 'situationDescription',
        width: 44,
      },
      {
        header: ua ? 'Котлів на твердому паливі' : 'Solid-fuel boilers',
        key: 'solidFuelBoilerCount',
        width: 14,
      },
      {
        header: ua ? 'Є склад для палива' : 'Fuel storage available',
        key: 'solidFuelStorageAvailable',
        width: 14,
      },
      {
        header: ua
          ? 'Опис ремонту теплопостачання'
          : 'Heating repair description',
        key: 'heatingRepairDescription',
        width: 40,
      },
      {
        header: ua ? 'Пункт незламності: статус' : 'Resilience point status',
        key: 'resiliencePointStatus',
        width: 18,
      },
      {
        header: ua
          ? 'Пункт незламності: місткість'
          : 'Resilience point capacity',
        key: 'resiliencePointCapacity',
        width: 14,
      },
      {
        header: ua ? 'Пальне: місяців потрібно' : 'Fuel: months needed',
        key: 'liquidFuelMonthsNeeded',
        width: 14,
      },

      // ── Beneficiaries (SADD) ──
      {
        header: ua ? 'Прямі бенефіціари' : 'Direct beneficiaries',
        key: 'directBeneficiaries',
        width: 14,
      },
      { header: ua ? 'ВПО' : 'IDPs', key: 'idpCount', width: 10 },
      { header: ua ? 'Діти' : 'Children', key: 'childrenCount', width: 10 },
      {
        header: ua ? 'Люди з інвалідністю' : 'PwD',
        key: 'pwdCount',
        width: 12,
      },
      {
        header: ua ? 'Літні (60+)' : 'Elderly (60+)',
        key: 'elderlyCount',
        width: 10,
      },
      { header: ua ? 'Жінки' : 'Female', key: 'femaleCount', width: 10 },
      { header: ua ? 'Чоловіки' : 'Male', key: 'maleCount', width: 10 },
      {
        header: ua ? 'Непрямі бенефіціари' : 'Indirect beneficiaries',
        key: 'indirectBeneficiaries',
        width: 14,
      },
      { header: ua ? 'Персонал' : 'Staff', key: 'staffCount', width: 10 },

      // ── Budget / logistics / docs ──
      { header: ua ? 'Потрібно до' : 'Needed by', key: 'needBy', width: 18 },
      { header: ua ? 'Терміновість' : 'Urgency', key: 'urgency', width: 14 },
      {
        header: ua ? 'Орієнтовна вартість, грн' : 'Estimated cost, UAH',
        key: 'estimatedCost',
        width: 18,
      },
      {
        header: ua ? 'Підстава оцінки' : 'Cost basis',
        key: 'costBasis',
        width: 26,
      },
      {
        header: ua ? 'Інші донори' : 'Other donors',
        key: 'otherDonors',
        width: 12,
      },
      {
        header: ua ? 'Інші донори (деталі)' : 'Other donors details',
        key: 'otherDonorsDetails',
        width: 26,
      },
      {
        header: ua ? 'Співфінансування' : 'Cofinancing',
        key: 'cofinancing',
        width: 16,
      },
      {
        header: ua ? 'Співфінансування (деталі)' : 'Cofinancing details',
        key: 'cofinancingDetails',
        width: 24,
      },
      {
        header: ua ? 'Логістичні можливості' : 'Logistics capacity',
        key: 'logistics',
        width: 34,
      },
      {
        header: ua ? 'Наявні документи' : 'Docs available',
        key: 'docsAvailable',
        width: 34,
      },
      {
        header: ua ? 'Хмарне посилання' : 'Cloud link',
        key: 'cloudLink',
        width: 26,
      },

      // ── Service fields ──
      {
        header: ua ? 'Згода надана' : 'Consent given',
        key: 'consentGiven',
        width: 12,
      },
      {
        header: ua ? 'Нотатки менеджера' : 'Manager notes',
        key: 'managerNotes',
        width: 32,
      },
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

        applicantType: labelApplicantType(f.applicantType, lang),
        organizationName: f.organizationName,
        edrpou: f.edrpou ?? '',

        contactName: f.contactName,
        contactPosition: f.contactPosition ?? '',
        phone: f.phone,
        email: f.email,
        messenger: f.messenger ?? '',
        altContactName: f.altContactName ?? '',
        altContactPhone: f.altContactPhone ?? '',
        website: f.website ?? '',

        facilityName: f.facilityName ?? '',
        facilityKind: labelFacilityKind(f.facilityKind, lang),
        facilityKindOther: f.facilityKindOther ?? '',
        streetAddress: f.streetAddress ?? '',
        heatingSource: labelHeatingSource(f.heatingSource, lang),
        heatingSourceOther: f.heatingSourceOther ?? '',
        heatedArea: f.heatedArea != null ? Number(f.heatedArea) : '',
        backupPower: labelBackupPower(f.backupPower, lang),
        buildingCondition: labelBuildingCondition(f.buildingCondition, lang),

        populationTotal: f.populationTotal ?? '',
        settlementsCovered: f.settlementsCovered ?? '',
        frontlineStatus: labelFrontlineStatus(f.frontlineStatus, lang),
        targetFacilities: f.targetFacilities ?? '',

        needCategories: labelNeedCategories(f.needCategories, lang),
        needCategoryOther: f.needCategoryOther ?? '',
        situationDescription: f.situationDescription ?? '',
        solidFuelBoilerCount: f.solidFuelBoilerCount ?? '',
        solidFuelStorageAvailable: labelBool(f.solidFuelStorageAvailable, lang),
        heatingRepairDescription: f.heatingRepairDescription ?? '',
        resiliencePointStatus: labelResiliencePointStatus(
          f.resiliencePointStatus,
          lang,
        ),
        resiliencePointCapacity: f.resiliencePointCapacity ?? '',
        liquidFuelMonthsNeeded: f.liquidFuelMonthsNeeded ?? '',

        directBeneficiaries: f.directBeneficiaries,
        idpCount: f.idpCount,
        childrenCount: f.childrenCount,
        pwdCount: f.pwdCount,
        elderlyCount: f.elderlyCount,
        femaleCount: f.femaleCount ?? '',
        maleCount: f.maleCount ?? '',
        indirectBeneficiaries: f.indirectBeneficiaries ?? '',
        staffCount: f.staffCount ?? '',

        needBy: labelNeedBy(f.needBy, lang),
        urgency: labelUrgency(f.urgency, lang),
        estimatedCost: f.estimatedCost != null ? Number(f.estimatedCost) : '',
        costBasis: labelCostBasis(f.costBasis, lang),
        otherDonors: labelBool(f.otherDonors, lang),
        otherDonorsDetails: f.otherDonorsDetails ?? '',
        cofinancing: labelCofinancing(f.cofinancing, lang),
        cofinancingDetails: f.cofinancingDetails ?? '',
        logistics: labelLogistics(f.logistics, lang),
        docsAvailable: labelDocsAvailable(f.docsAvailable, lang),
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
  // Sheet 2: Needs (1 row per specification position)
  // ══════════════════════════════════════════════════════════════

  /**
   * Flat by design: an analyst multiplies `quantity` by the Shelter Cluster
   * reference cost for the item (SN201B/SN201C/SN202A/SN203A — implementation
   * plan Додаток А) to draft a budget, so every row must stand on its own.
   * Oblast/hromada are repeated per row for exactly that reason — they make the
   * sheet pivotable without a lookup back into sheet 1.
   */
  private buildNeedsSheet(
    wb: ExcelJS.Workbook,
    forms: WinterizationForm[],
    needsByForm: Map<string, WinterizationFormNeed[]>,
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      {
        header: ua ? 'Номер заявки' : 'Tracking number',
        key: 'trackingNumber',
        width: 18,
      },
      { header: '#', key: 'sortOrder', width: 5 },
      {
        header: ua ? 'Область (Oblast)' : 'Oblast / region',
        key: 'region',
        width: 20,
      },
      {
        header: ua ? 'Громада (Hromada)' : 'Hromada',
        key: 'community',
        width: 22,
      },
      {
        header: ua ? 'Тип заявника' : 'Applicant type',
        key: 'applicantType',
        width: 22,
      },
      { header: ua ? 'Категорія' : 'Category', key: 'category', width: 32 },
      { header: ua ? 'Позиція' : 'Item', key: 'item', width: 28 },
      { header: ua ? 'Кількість' : 'Quantity', key: 'quantity', width: 12 },
      { header: ua ? 'Одиниця' : 'Unit', key: 'unit', width: 10 },
      {
        header: ua ? 'Потужність, кВт' : 'Power, kW',
        key: 'powerKw',
        width: 14,
      },
      { header: ua ? 'Паливо' : 'Fuel type', key: 'fuelType', width: 14 },
      { header: ua ? 'Призначення' : 'Purpose', key: 'purpose', width: 20 },
      { header: ua ? 'Деталі' : 'Details', key: 'details', width: 40 },
    ];

    const sheet = wb.addWorksheet(ua ? 'Потреби' : 'Needs');
    this.applyColumns(sheet, columns, NEEDS_COLOR);

    for (const f of forms) {
      for (const n of needsByForm.get(f.id) ?? []) {
        sheet.addRow({
          trackingNumber: f.trackingNumber,
          sortOrder: n.sortOrder + 1,
          region: ua ? f.region : (f.regionEn ?? f.region),
          community: ua
            ? (f.community ?? '')
            : (f.communityEn ?? f.community ?? ''),
          applicantType: labelApplicantType(f.applicantType, lang),
          category: labelNeedCategory(n.category, lang),
          item: labelNeedItem(n.item, lang),
          quantity: n.quantity != null ? Number(n.quantity) : '',
          unit: labelNeedUnit(n.unit, lang),
          powerKw: n.powerKw != null ? Number(n.powerKw) : '',
          fuelType: labelGeneratorFuelType(n.fuelType, lang),
          purpose: labelGeneratorPurpose(n.purpose, lang),
          details: n.details ?? '',
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
    forms: WinterizationForm[],
    attachmentsByForm: Map<string, NeedsFormAttachment[]>,
    lang: Lang,
  ): void {
    const ua = lang === 'ua';
    const columns: ColSpec[] = [
      {
        header: ua ? 'Номер заявки' : 'Tracking number',
        key: 'trackingNumber',
        width: 18,
      },
      { header: '#', key: 'sortOrder', width: 5 },
      { header: ua ? 'Тип' : 'Kind', key: 'kind', width: 14 },
      {
        header: ua ? 'Назва файлу' : 'Original name',
        key: 'originalName',
        width: 34,
      },
      { header: ua ? 'MIME-тип' : 'MIME type', key: 'mimeType', width: 28 },
      {
        header: ua ? 'Розмір, байт' : 'Size, bytes',
        key: 'sizeBytes',
        width: 14,
      },
      { header: ua ? 'Ключ S3' : 'S3 key', key: 's3Key', width: 52 },
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
  // Shared helpers (same style as RecoveryXlsxExportService)
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
