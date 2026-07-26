// ui/src/app/features/needs/winterization-form/winterization-form.ts
// === ADDED: PR-W2 public Winterization form («Підготовка до зими»).
// Steps 1–5 (applicant, object+heating, winter needs, beneficiaries, budget).
// (PR-W3): steps 6–7 — files (presigned upload with
// formType='winterization'), review, consent, Turnstile, submit → thank-you.
// Reactive Forms with per-step validation + localStorage draft autosave.
// Zoneless-safe i18n via the signal-based LanguageService (no translate getter).
//
// The field contract mirrors backend winterization.constants.ts +
// CreateWinterizationFormDto, NOT §2 of the implementation plan — see §14.3 for
// the list of places where the implemented contract diverged from the plan. ===
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../core/services/language.service';
import { LocationSelectorComponent } from '../../../shared/components/location-selector/location-selector';
import { LocationValue } from '../../../shared/interfaces/location.interfaces';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import {
  FileUploadComponent,
  UploadedFile,
} from '../../../shared/components/file-upload/file-upload';
import { TurnstileComponent } from '../../../shared/components/turnstile/turnstile';
import {
  FormStep,
  FormStepperComponent,
} from '../../../shared/components/form-stepper/form-stepper';
import { WinterizationFormDraftService } from './winterization-form-draft.service';
import {
  APPLICANT_TYPE_OPTIONS,
  BACKUP_POWER_OPTIONS,
  CreateWinterizationFormPayload,
  LabeledOption,
  PHOTO_REQUIRED_CATEGORIES,
  WINTERIZATION_DOCUMENTS_MAX,
  WINTERIZATION_DOCUMENT_MAX_BYTES,
  WINTERIZATION_PHOTOS_MAX,
  WINTERIZATION_PHOTOS_MIN_FOR_WORKS,
  WINTERIZATION_PHOTO_MAX_BYTES,
  WinterizationAttachmentPayload,
  BUILDING_CONDITION_OPTIONS,
  COFINANCING_OPTIONS,
  COST_BASIS_OPTIONS,
  DOCS_AVAILABLE_OPTIONS,
  FACILITY_KIND_OPTIONS,
  FRONTLINE_STATUS_OPTIONS,
  GENERATOR_FUEL_TYPE_OPTIONS,
  GENERATOR_PURPOSE_OPTIONS,
  GENERATOR_ROWS_MAX,
  HEATING_APPLIANCE_ITEMS,
  HEATING_REPAIR_ITEMS,
  HEATING_SOURCE_OPTIONS,
  INSULATION_ITEMS,
  LIQUID_FUEL_ITEM_OPTIONS,
  LOGISTICS_OPTIONS,
  LogisticsOption,
  NEED_BY_OPTIONS,
  ORGANIZATION_NEED_CATEGORY_OPTIONS,
  NeedCategory,
  NeedItem,
  RESILIENCE_POINT_ITEMS,
  RESILIENCE_POINT_STATUS_OPTIONS,
  SOLID_FUEL_ITEMS,
  SOLID_FUEL_UNIT_OPTIONS,
  URGENCY_OPTIONS,
  WINTER_NFI_ITEMS,
  UpdateWinterizationFormFullPayload,
  WinterizationApplicantType,
  WinterizationAttachmentFull,
  WinterizationDataPayload,
  WinterizationDocsOption,
  WinterizationFormDetail,
  WinterizationNeedPayload,
} from './winterization-form.interfaces';

/** Group-level: at least one boolean child is true (plain checkbox groups). */
function atLeastOneBooleanChecked(group: AbstractControl): ValidationErrors | null {
  const val = (group.value ?? {}) as Record<string, boolean>;
  return Object.values(val).some(Boolean) ? null : { required: true };
}

/** Group-level: at least one `{checked, …}` row is ticked (spec checklists). */
function atLeastOneRowChecked(group: AbstractControl): ValidationErrors | null {
  const val = (group.value ?? {}) as Record<string, { checked?: boolean }>;
  return Object.values(val).some((row) => !!row?.checked) ? null : { required: true };
}

/**
 * Solid fuel is the strictest block: NEED_CATEGORY_RULES.solid_fuel demands both
 * a row AND a quantity, because «вугілля без тоннажу» cannot be budgeted. Every
 * ticked fuel therefore needs an amount, not just one of them — that also
 * satisfies the server rule by construction.
 */
function solidFuelRowsValid(group: AbstractControl): ValidationErrors | null {
  const val = (group.value ?? {}) as Record<string, { checked?: boolean; amount?: number | null }>;
  const ticked = Object.values(val).filter((row) => !!row?.checked);
  if (!ticked.length) return { required: true };
  const missing = ticked.some((row) => row.amount === null || row.amount === undefined);
  return missing ? { amountRequired: true } : null;
}

/** Array-level: at least `min` rows present (generators). */
function minRows(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null =>
    (control as FormArray).length >= min ? null : { required: true };
}

/** Seven-step journey; the last one is the review + submit gate. */
const WINTERIZATION_STEPS: readonly FormStep[] = [
  { key: 'applicant', labelUa: 'Заявник', labelEn: 'Applicant', group: 'primary' },
  { key: 'object', labelUa: 'Обʼєкт', labelEn: 'Object', group: 'primary' },
  { key: 'needs', labelUa: 'Потреби', labelEn: 'Needs', group: 'primary' },
  { key: 'beneficiaries', labelUa: 'Бенефіціари', labelEn: 'Beneficiaries', group: 'primary' },
  { key: 'budget', labelUa: 'Бюджет', labelEn: 'Budget', group: 'primary' },
  { key: 'files', labelUa: 'Файли', labelEn: 'Files', group: 'primary' },
  { key: 'review', labelUa: 'Перевірка', labelEn: 'Review', group: 'review' },
];

@Component({
  selector: 'app-winterization-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LocationSelectorComponent,
    FormStepperComponent,
    // CHANGED (PR-W3)
    FileUploadComponent,
    TurnstileComponent,
    RouterLink,
  ],
  templateUrl: './winterization-form.html',
  styleUrl: './winterization-form.scss',
})
export class WinterizationFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly draft = inject(WinterizationFormDraftService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isUa = inject(LanguageService).isUa;
  private readonly api = inject(ApiService); // CHANGED (PR-W3)

  // ── (PR-W4): 'create' = public submit; 'edit' = admin full-edit
  //    (winterization-form-detail). Edit mode emits `saved` instead of POSTing,
  //    and renders no Turnstile, no upload dropzones and no draft banner. ──

  /** 'create' = public submit; 'edit' = admin full-edit. */
  @Input() mode: 'create' | 'edit' = 'create';

  /** Existing record to hydrate the reactive form with when mode === 'edit'. */
  @Input() initialData: WinterizationFormDetail | null = null;

  /** Parent's PATCH /full in-flight state — disables Save during the request. */
  @Input() externalSaving = false;

  /** Edit mode: emitted on Save — the parent calls PATCH /full. Files, cloud
   *  link and consent are excluded by `buildPayload()`, so attachments and the
   *  consent snapshot survive the edit untouched. */
  @Output() saved = new EventEmitter<UpdateWinterizationFormFullPayload>();

  /** Edit mode: emitted when the admin clicks Cancel. */
  @Output() cancelled = new EventEmitter<void>();

  protected get isEdit(): boolean {
    return this.mode === 'edit';
  }

  /**
   * Households are designed but switched off at launch (implementation-plan §7).
   * The card stays visible with a «скоро» badge so the scenario is discoverable;
   * the real protection is the server-side 422 behind
   * WINTERIZATION_HOUSEHOLD_ENABLED — a disabled card guards nothing.
   */
  protected readonly householdEnabled = environment.winterizationHouseholdEnabled;

  // ── CHANGED (PR-W3): files, Turnstile and submit state ──

  /** Cloudflare Turnstile SITE key (public). */
  protected readonly siteKey = environment.turnstileSiteKey;

  @ViewChild(TurnstileComponent) private turnstile?: TurnstileComponent;

  /**
   * Supplies a fresh Turnstile token per guarded call (every presigned upload
   * plus the submit). Tokens are single-use, so this must not be memoised.
   */
  protected readonly tokenProvider = (): Promise<string> =>
    this.turnstile ? this.turnstile.getToken() : Promise.reject(new Error('Turnstile not ready'));

  // Counts mirror winterization.constants.ts; MIME/size rules are re-exported
  // there from recovery.constants.ts, i.e. identical to Recovery by design.
  protected readonly PHOTOS_MAX = WINTERIZATION_PHOTOS_MAX;
  protected readonly DOCUMENTS_MAX = WINTERIZATION_DOCUMENTS_MAX;
  protected readonly PHOTOS_MIN_FOR_WORKS = WINTERIZATION_PHOTOS_MIN_FOR_WORKS;
  protected readonly PHOTO_MAX_BYTES = WINTERIZATION_PHOTO_MAX_BYTES;
  protected readonly DOCUMENT_MAX_BYTES = WINTERIZATION_DOCUMENT_MAX_BYTES;
  protected readonly photoAccept = ['image/jpeg', 'image/png', 'image/webp'];
  protected readonly documentAccept = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
  ];

  protected readonly photos = signal<UploadedFile[]>([]);
  protected readonly documents = signal<UploadedFile[]>([]);

  protected readonly submitting = signal(false);
  protected readonly submitError = signal(false);
  protected readonly submitted = signal(false);
  protected readonly trackingNumber = signal('');

  // Option catalogs exposed to the template (single source = interfaces file).
  protected readonly applicantTypes = APPLICANT_TYPE_OPTIONS;
  protected readonly facilityKinds = FACILITY_KIND_OPTIONS;
  protected readonly heatingSources = HEATING_SOURCE_OPTIONS;
  protected readonly backupPowerOptions = BACKUP_POWER_OPTIONS;
  protected readonly buildingConditions = BUILDING_CONDITION_OPTIONS;
  protected readonly frontlineStatuses = FRONTLINE_STATUS_OPTIONS;
  protected readonly needCategoryOptions = ORGANIZATION_NEED_CATEGORY_OPTIONS;
  protected readonly solidFuelItems = SOLID_FUEL_ITEMS;
  protected readonly solidFuelUnits = SOLID_FUEL_UNIT_OPTIONS;
  protected readonly heatingApplianceItems = HEATING_APPLIANCE_ITEMS;
  protected readonly heatingRepairItems = HEATING_REPAIR_ITEMS;
  protected readonly insulationItems = INSULATION_ITEMS;
  protected readonly resiliencePointItems = RESILIENCE_POINT_ITEMS;
  protected readonly resiliencePointStatuses = RESILIENCE_POINT_STATUS_OPTIONS;
  protected readonly winterNfiItems = WINTER_NFI_ITEMS;
  protected readonly liquidFuelTypes = LIQUID_FUEL_ITEM_OPTIONS;
  protected readonly generatorFuelTypes = GENERATOR_FUEL_TYPE_OPTIONS;
  protected readonly generatorPurposes = GENERATOR_PURPOSE_OPTIONS;
  protected readonly needByOptions = NEED_BY_OPTIONS;
  protected readonly urgencyOptions = URGENCY_OPTIONS;
  protected readonly costBases = COST_BASIS_OPTIONS;
  protected readonly cofinancingOptions = COFINANCING_OPTIONS;
  protected readonly logisticsOptions = LOGISTICS_OPTIONS;
  protected readonly docsAvailableOptions = DOCS_AVAILABLE_OPTIONS;

  protected readonly GENERATOR_ROWS_MAX = GENERATOR_ROWS_MAX;
  protected readonly SITUATION_MIN = 50;
  protected readonly SITUATION_MAX = 1500;

  protected readonly steps: readonly FormStep[] = WINTERIZATION_STEPS;

  protected readonly currentStep = signal(0);
  protected readonly stepInvalid = signal(false);
  protected readonly situationLen = signal(0);

  protected readonly draftFound = signal(false);
  protected readonly draftSavedAt = signal(0);
  private pendingDraftValue: Record<string, unknown> | null = null;

  protected readonly form: FormGroup = this.fb.group({
    // ── Step 1: applicant type & contacts ──
    applicantType: ['', [Validators.required]],
    organizationName: ['', [Validators.required, Validators.minLength(3)]],
    edrpou: ['', [Validators.pattern(/^\d{8}$/)]],
    location: [null as LocationValue | null, [Validators.required]],
    contactName: ['', [Validators.required, Validators.minLength(2)]],
    contactPosition: ['', [Validators.required, Validators.minLength(2)]],
    phoneDigits: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
    email: ['', [Validators.required, Validators.email]],
    messenger: [''],
    altContactName: ['', [Validators.minLength(2)]],
    altContactPhoneDigits: ['', [Validators.pattern(/^0\d{9}$/)]],
    website: ['', [Validators.pattern(/^https?:\/\/.+/i)]],

    // ── Step 2a: institution (validators wired by applicantType) ──
    facilityName: [''],
    facilityKind: [''],
    facilityKindOther: [''],
    streetAddress: [''],
    heatingSource: [''],
    heatingSourceOther: [''],
    heatedArea: [null as number | null, [Validators.min(1), Validators.max(1_000_000)]],
    backupPower: [''],
    buildingCondition: [''],

    // ── Step 2b: municipality (all [I] — context, never blocking) ──
    populationTotal: [null as number | null, [Validators.min(1), Validators.max(10_000_000)]],
    settlementsCovered: [null as number | null, [Validators.min(1), Validators.max(1000)]],
    frontlineStatus: [''],
    targetFacilities: ['', [Validators.maxLength(500)]],

    // ── Step 3: winter needs ──
    needCategories: this.fb.group(
      {
        generators: [false],
        solid_fuel: [false],
        heating_appliances: [false],
        heating_system_repair: [false],
        insulation: [false],
        resilience_point_equipment: [false],
        winter_nfi: [false],
        liquid_fuel: [false],
        other: [false],
      },
      { validators: atLeastOneBooleanChecked },
    ),
    needCategoryOther: [''],
    situationDescription: [
      '',
      [Validators.required, Validators.minLength(50), Validators.maxLength(1500)],
    ],

    // generators — the only FormArray (≤5 rows, one per power rating)
    generators: this.fb.array<FormGroup>([]),

    // solid_fuel — 4 fixed subgroups + category-level scalars
    solidFuel: this.fb.group({
      coal: this.fuelRow('t'),
      pellets: this.fuelRow('t'),
      firewood: this.fuelRow('m3'),
      briquettes: this.fuelRow('t'),
    }),
    solidFuelBoilerCount: [null as number | null, [Validators.min(1), Validators.max(1000)]],
    solidFuelStorageAvailable: [''],

    // heating_appliances — 6 fixed subgroups
    heatingAppliances: this.fb.group({
      convector: this.qtyRow(),
      oil_heater: this.qtyRow(),
      fan_heater: this.qtyRow(),
      solid_fuel_stove: this.qtyRow(),
      potbelly_stove: this.qtyRow(),
      gas_heater: this.qtyRow(),
    }),

    // heating_system_repair — 5 fixed subgroups + mandatory description
    heatingRepair: this.fb.group({
      boiler: this.qtyRow(),
      heat_networks: this.qtyRow(),
      pumps: this.qtyRow(),
      heat_substation: this.qtyRow(),
      water_heating_equipment: this.qtyRow(),
    }),
    heatingRepairDescription: [''],

    // insulation — 4 fixed subgroups
    insulation: this.fb.group({
      windows: this.qtyRow(),
      doors: this.qtyRow(),
      roof: this.qtyRow(),
      facade: this.qtyRow(),
    }),

    // resilience_point_equipment — items + category-level scalars
    resiliencePoint: this.fb.group({
      generator: this.qtyRow(),
      heating: this.qtyRow(),
      furniture: this.qtyRow(),
      water_boiler: this.qtyRow(),
      connectivity: this.qtyRow(),
      powerbanks: this.qtyRow(),
      other: this.qtyRow(true),
    }),
    resiliencePointStatus: [''],
    resiliencePointCapacity: [null as number | null, [Validators.min(1), Validators.max(10_000)]],

    // winter_nfi — 7 fixed subgroups
    winterNfi: this.fb.group({
      blankets: this.qtyRow(),
      sleeping_bags: this.qtyRow(),
      thermal_underwear: this.qtyRow(),
      warm_clothing: this.qtyRow(),
      thermoses: this.qtyRow(),
      powerbanks: this.qtyRow(),
      flashlights: this.qtyRow(),
    }),

    // liquid_fuel — fuel type + litres/month become a row; months = form field
    liquidFuelType: [''],
    liquidFuelMonthlyLiters: [
      null as number | null,
      [Validators.min(1), Validators.max(1_000_000)],
    ],
    liquidFuelMonthsNeeded: [null as number | null, [Validators.min(1), Validators.max(6)]],

    // ── Step 4: beneficiaries ──
    directBeneficiaries: [
      null as number | null,
      [Validators.required, Validators.min(1), Validators.max(10_000_000)],
    ],
    idpCount: [null as number | null, [Validators.required, Validators.min(0)]],
    childrenCount: [null as number | null, [Validators.required, Validators.min(0)]],
    pwdCount: [null as number | null, [Validators.required, Validators.min(0)]],
    elderlyCount: [null as number | null, [Validators.required, Validators.min(0)]],
    femaleCount: [null as number | null, [Validators.min(0)]],
    maleCount: [null as number | null, [Validators.min(0)]],
    indirectBeneficiaries: [null as number | null, [Validators.min(0)]],
    staffCount: [null as number | null, [Validators.min(0)]],

    // ── Step 5: budget & coordination ──
    needBy: ['', [Validators.required]],
    urgency: ['', [Validators.required]],
    estimatedCost: [null as number | null, [Validators.min(1), Validators.max(10_000_000_000)]],
    costBasis: [''],
    otherDonors: ['', [Validators.required]],
    otherDonorsDetails: [''],
    cofinancing: ['', [Validators.required]],
    cofinancingDetails: ['', [Validators.maxLength(255)]],
    logistics: this.fb.group({
      own_transport: [false],
      storage: [false],
      staff_for_unloading: [false],
      none: [false],
    }),
    docsAvailable: this.fb.group({
      guarantee_letter: [false],
      council_decision: [false],
      survey_act: [false],
      defect_act: [false],
      cost_estimate: [false],
      tech_specs: [false],
      none: [false],
    }),

    // ── Step 6: files ──
    // CHANGED (PR-W3): photos/documents are component state (they are uploaded
    // out-of-band), only the cloud link is an actual control. The pattern keeps
    // it in step with the server's @IsUrl().
    cloudLink: ['', [Validators.pattern(/^https?:\/\/.+/i)]],

    // ── Step 7: consent ──
    consentGiven: [false, [Validators.requiredTrue]],
  });

  /** Required controls (or validated groups) per step index. */
  private readonly stepFields: string[][] = [
    [
      'applicantType',
      'organizationName',
      'edrpou',
      'location',
      'contactName',
      'contactPosition',
      'phoneDigits',
      'email',
      'altContactName',
      'altContactPhoneDigits',
      'website',
    ],
    [
      'facilityName',
      'facilityKind',
      'facilityKindOther',
      'heatingSource',
      'heatingSourceOther',
      'heatedArea',
      'backupPower',
      'populationTotal',
      'settlementsCovered',
      'targetFacilities',
    ],
    [
      'needCategories',
      'needCategoryOther',
      'situationDescription',
      'generators',
      'solidFuel',
      'solidFuelBoilerCount',
      'heatingAppliances',
      'heatingRepair',
      'heatingRepairDescription',
      'insulation',
      'resiliencePoint',
      'resiliencePointStatus',
      'resiliencePointCapacity',
      'winterNfi',
      'liquidFuelType',
      'liquidFuelMonthlyLiters',
      'liquidFuelMonthsNeeded',
    ],
    [
      'directBeneficiaries',
      'idpCount',
      'childrenCount',
      'pwdCount',
      'elderlyCount',
      'femaleCount',
      'maleCount',
      'indirectBeneficiaries',
      'staffCount',
    ],
    [
      'needBy',
      'urgency',
      'estimatedCost',
      'costBasis',
      'otherDonors',
      'otherDonorsDetails',
      'cofinancing',
      'cofinancingDetails',
    ],
    // CHANGED (PR-W3): step 6 — photos/documents are component state, checked
    // by filesValid() in validateCurrentStep(); only cloudLink is a control.
    ['cloudLink'],
    ['consentGiven'], // step 7 — review + consent
  ];

  ngOnInit(): void {
    this.wireConditionalValidators();

    this.form
      .get('situationDescription')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.situationLen.set(((v as string) || '').length));

    // Edit mode (admin): hydrate from the existing record; no drafts, no files.
    if (this.mode === 'edit') {
      if (this.initialData) {
        // Defer a microtask so LocationSelector (CVA) can accept the value.
        Promise.resolve().then(() => this.patchFromInitialData(this.initialData!));
      }
      return;
    }

    // Create mode (public): localStorage draft autosave + restore banner.
    this.form.valueChanges
      .pipe(debounceTime(800), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Never persist consent — the applicant must actively re-consent.
        const value = this.form.getRawValue() as Record<string, unknown>;
        delete value['consentGiven'];
        this.draft.save(value);
      });

    this.loadDraftBanner();
  }

  // ── Row factories ──

  /** solid_fuel row: the applicant chooses t vs m³ (SOLID_FUEL_UNITS). */
  private fuelRow(defaultUnit: 't' | 'm3'): FormGroup {
    return this.fb.group({
      checked: [false],
      amount: [null as number | null, [Validators.min(0.01), Validators.max(1_000_000)]],
      unit: [defaultUnit],
    });
  }

  /** Generic spec row: a checkbox plus an optional quantity (unit is derived
   *  server-side from NEED_ITEM_UNITS), and free-text `details` where the item
   *  has no meaningful unit (resilience point «Інше»). */
  private qtyRow(withDetails = false): FormGroup {
    const group: FormGroup = this.fb.group({
      checked: [false],
      qty: [null as number | null, [Validators.min(0.01), Validators.max(1_000_000)]],
    });
    if (withDetails) {
      group.addControl('details', this.fb.control('', [Validators.maxLength(500)]));
    }
    return group;
  }

  private generatorRow(): FormGroup {
    return this.fb.group({
      qty: [
        null as number | null,
        [Validators.required, Validators.min(1), Validators.max(1_000_000)],
      ],
      powerKw: [null as number | null, [Validators.min(0.1), Validators.max(5000)]],
      fuelType: [''],
      purpose: [''],
    });
  }

  protected get generatorRows(): FormArray<FormGroup> {
    return this.form.get('generators') as FormArray<FormGroup>;
  }

  protected addGeneratorRow(): void {
    if (this.generatorRows.length >= GENERATOR_ROWS_MAX) return;
    this.generatorRows.push(this.generatorRow());
  }

  protected removeGeneratorRow(index: number): void {
    this.generatorRows.removeAt(index);
  }

  // ── Conditional validators (mirror ValidateIf + the service's cross-field
  //    rules in winterization.service.ts / NEED_CATEGORY_RULES) ──

  private wireConditionalValidators(): void {
    const req2: ValidatorFn[] = [Validators.required, Validators.minLength(2)];
    const changes$ = (name: string) =>
      this.form.get(name)!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef));

    changes$('applicantType').subscribe((v) =>
      this.applyApplicantType(v as WinterizationApplicantType | ''),
    );
    changes$('facilityKind').subscribe((v) =>
      this.applyConditional('facilityKindOther', v === 'other', req2, ''),
    );
    changes$('heatingSource').subscribe((v) =>
      this.applyConditional('heatingSourceOther', v === 'other', req2, ''),
    );
    changes$('needCategories').subscribe(() => this.applyNeedCategories());
    changes$('estimatedCost').subscribe((v) =>
      this.applyConditional(
        'costBasis',
        v !== null && v !== '' && v !== undefined,
        [Validators.required],
        '',
      ),
    );
    changes$('otherDonors').subscribe((v) =>
      this.applyConditional(
        'otherDonorsDetails',
        v === 'yes',
        [Validators.required, Validators.minLength(3), Validators.maxLength(1000)],
        '',
      ),
    );
  }

  /**
   * Step 2 splits by applicant type: an institution describes one facility and
   * its heating, an ОМС describes the hromada. `contactPosition` is required for
   * both organization types and absent for a household (DTO `isOrganization`).
   */
  private applyApplicantType(type: WinterizationApplicantType | ''): void {
    const institution = type === 'institution';
    const organization = type !== '' && type !== 'household';

    this.applyConditional(
      'facilityName',
      institution,
      [Validators.required, Validators.minLength(3), Validators.maxLength(255)],
      '',
    );
    this.applyConditional('facilityKind', institution, [Validators.required], '');
    this.applyConditional('heatingSource', institution, [Validators.required], '');
    this.applyConditional('backupPower', institution, [Validators.required], '');
    this.applyConditional('contactPosition', organization, [
      Validators.required,
      Validators.minLength(2),
    ]);
    this.applyConditional('situationDescription', organization, [
      Validators.required,
      Validators.minLength(this.SITUATION_MIN),
      Validators.maxLength(this.SITUATION_MAX),
    ]);
    this.applyConditional('cofinancing', organization, [Validators.required], '');

    // Beneficiaries are mandatory for ОМС/інституція only (DTO ValidateIf);
    // for a household the server derives them from the household composition.
    for (const name of [
      'directBeneficiaries',
      'idpCount',
      'childrenCount',
      'pwdCount',
      'elderlyCount',
    ]) {
      const min = name === 'directBeneficiaries' ? 1 : 0;
      this.applyConditional(name, organization, [Validators.required, Validators.min(min)]);
    }

    // Facility name defaults to the organization name — for an institution the
    // two are usually the same string, and re-typing it is pure friction.
    if (institution && !this.form.get('facilityName')!.value) {
      this.form.get('facilityName')!.setValue(this.form.get('organizationName')!.value, {
        emitEvent: false,
      });
    }
  }

  /**
   * Each ticked category unlocks its spec block and its own minimums
   * (NEED_CATEGORY_RULES): every block needs ≥1 row; generators, solid_fuel and
   * liquid_fuel additionally need a quantity, otherwise the line cannot be
   * costed and the server rejects the submit with 400.
   *
   * Deselecting a category only drops its validators — the typed values stay so
   * that an accidental un-tick does not destroy them (they are excluded from the
   * payload by category anyway, and the server nulls scalars of unselected
   * categories on top of that).
   */
  private applyNeedCategories(): void {
    const on = (c: NeedCategory): boolean => this.hasCategory(c);

    this.applyConditional(
      'needCategoryOther',
      on('other'),
      [Validators.required, Validators.minLength(3), Validators.maxLength(500)],
      '',
    );

    // generators — ≥1 row, each row carries a mandatory quantity
    this.applyGroupValidator('generators', on('generators'), [minRows(1)]);
    if (on('generators') && this.generatorRows.length === 0) {
      this.addGeneratorRow();
    }

    this.applyGroupValidator('solidFuel', on('solid_fuel'), [solidFuelRowsValid]);
    this.applyGroupValidator('heatingAppliances', on('heating_appliances'), [atLeastOneRowChecked]);
    this.applyGroupValidator('heatingRepair', on('heating_system_repair'), [atLeastOneRowChecked]);
    this.applyConditional('heatingRepairDescription', on('heating_system_repair'), [
      Validators.required,
      Validators.minLength(30),
      Validators.maxLength(1000),
    ]);
    this.applyGroupValidator('insulation', on('insulation'), [atLeastOneRowChecked]);
    this.applyGroupValidator('resiliencePoint', on('resilience_point_equipment'), [
      atLeastOneRowChecked,
    ]);
    this.applyConditional(
      'resiliencePointStatus',
      on('resilience_point_equipment'),
      [Validators.required],
      '',
    );
    this.applyGroupValidator('winterNfi', on('winter_nfi'), [atLeastOneRowChecked]);

    // liquid_fuel: all three fields or nothing — a fuel line without litres and
    // a horizon is not a budget item (plan §2, крок 3).
    this.applyConditional('liquidFuelType', on('liquid_fuel'), [Validators.required], '');
    this.applyConditional('liquidFuelMonthlyLiters', on('liquid_fuel'), [
      Validators.required,
      Validators.min(1),
      Validators.max(1_000_000),
    ]);
    this.applyConditional('liquidFuelMonthsNeeded', on('liquid_fuel'), [
      Validators.required,
      Validators.min(1),
      Validators.max(6),
    ]);
  }

  /**
   * Toggle a conditional control's validators. `resetTo` is applied when the
   * control goes inactive — pass it only for selects/free text, never for the
   * blocks the applicant may re-enable (their values are worth keeping).
   */
  private applyConditional(
    name: string,
    active: boolean,
    validators: ValidatorFn[],
    resetTo?: unknown,
  ): void {
    const c = this.form.get(name);
    if (!c) return;
    if (active) {
      c.setValidators(validators);
    } else {
      c.clearValidators();
      if (resetTo !== undefined) c.setValue(resetTo, { emitEvent: false });
    }
    c.updateValueAndValidity({ emitEvent: false });
  }

  /** Same, for FormGroup/FormArray blocks (never resets the block's values). */
  private applyGroupValidator(name: string, active: boolean, validators: ValidatorFn[]): void {
    const c = this.form.get(name);
    if (!c) return;
    if (active) c.setValidators(validators);
    else c.clearValidators();
    c.updateValueAndValidity({ emitEvent: false });
  }

  // ── (PR-W4) Edit mode (admin): hydrate reactive state from a record ──

  /** Existing photos (read-only on the files step in edit mode). */
  protected get existingPhotos(): WinterizationAttachmentFull[] {
    return (this.initialData?.attachments ?? []).filter((a) => a.kind === 'photo');
  }

  /** Existing documents (read-only on the files step in edit mode). */
  protected get existingDocuments(): WinterizationAttachmentFull[] {
    return (this.initialData?.attachments ?? []).filter((a) => a.kind === 'document');
  }

  /** Tri-state radio backing a nullable boolean column. */
  private boolToRadio(v: boolean | null | undefined): string {
    if (v === true) return 'yes';
    if (v === false) return 'no';
    return '';
  }

  /** '+380XXXXXXXXX' → '0XXXXXXXXX' (10 digits) for the phoneDigits control. */
  private stripPhonePrefix(v: string | null | undefined): string {
    if (!v) return '';
    return v.startsWith('+38') ? v.slice(3) : v;
  }

  /** Build a {optionValue: boolean} map for a checkbox FormGroup. */
  private checkboxGroupValue<T extends string>(
    all: readonly LabeledOption<T>[],
    selected: readonly T[] | null | undefined,
  ): Record<T, boolean> {
    const set = new Set(selected ?? []);
    const out = {} as Record<T, boolean>;
    for (const o of all) out[o.value] = set.has(o.value);
    return out;
  }

  private numOrNull(v: number | string | null | undefined): number | null {
    return v === null || v === undefined || v === '' ? null : Number(v);
  }

  /**
   * Rebuild the whole form from a stored record.
   *
   * Order matters: `applicantType` + `needCategories` are patched FIRST, because
   * their valueChanges subscriptions rewire every conditional validator and
   * reset the controls of blocks that are switched off — doing it after the data
   * pass would wipe the values we just wrote. The generators FormArray is sized
   * before the patch for the same reason patchValue cannot grow a FormArray
   * (identical to restoreDraft()).
   */
  private patchFromInitialData(d: WinterizationFormDetail): void {
    const needs = d.needs ?? [];
    const generatorNeeds = needs
      .filter((n) => n.category === 'generators')
      .sort((a, b) => a.sortOrder - b.sortOrder);

    this.generatorRows.clear();
    for (let i = 0; i < Math.min(generatorNeeds.length, GENERATOR_ROWS_MAX); i++) {
      this.generatorRows.push(this.generatorRow());
    }

    // Pass 1 — the two controls every conditional validator hangs off.
    this.form.patchValue({
      applicantType: d.applicantType,
      needCategories: this.checkboxGroupValue(
        ORGANIZATION_NEED_CATEGORY_OPTIONS,
        d.needCategories.filter(
          (c) => c !== 'utilities_cash',
        ) as (typeof ORGANIZATION_NEED_CATEGORY_OPTIONS)[number]['value'][],
      ),
    });

    // Pass 2 — scalars.
    const liquidFuelNeed = needs.find((n) => n.category === 'liquid_fuel');
    this.form.patchValue({
      location: {
        regionUa: d.region,
        regionEn: d.regionEn,
        districtUa: d.district,
        districtEn: d.districtEn,
        communityUa: d.community,
        communityEn: d.communityEn,
        communityCode: d.communityCode,
        settlementUa: d.settlement ?? '',
        settlementEn: d.settlementEn ?? '',
        settlementCode: d.settlementCode ?? '',
      },
      organizationName: d.organizationName,
      edrpou: d.edrpou ?? '',
      contactName: d.contactName,
      contactPosition: d.contactPosition ?? '',
      phoneDigits: this.stripPhonePrefix(d.phone),
      email: d.email,
      messenger: d.messenger ?? '',
      altContactName: d.altContactName ?? '',
      altContactPhoneDigits: this.stripPhonePrefix(d.altContactPhone),
      website: d.website ?? '',

      facilityName: d.facilityName ?? '',
      facilityKind: d.facilityKind ?? '',
      facilityKindOther: d.facilityKindOther ?? '',
      streetAddress: d.streetAddress ?? '',
      heatingSource: d.heatingSource ?? '',
      heatingSourceOther: d.heatingSourceOther ?? '',
      heatedArea: this.numOrNull(d.heatedArea),
      backupPower: d.backupPower ?? '',
      buildingCondition: d.buildingCondition ?? '',

      populationTotal: d.populationTotal,
      settlementsCovered: d.settlementsCovered,
      frontlineStatus: d.frontlineStatus ?? '',
      targetFacilities: d.targetFacilities ?? '',

      needCategoryOther: d.needCategoryOther ?? '',
      situationDescription: d.situationDescription ?? '',
      solidFuelBoilerCount: d.solidFuelBoilerCount,
      solidFuelStorageAvailable: this.boolToRadio(d.solidFuelStorageAvailable),
      heatingRepairDescription: d.heatingRepairDescription ?? '',
      resiliencePointStatus: d.resiliencePointStatus ?? '',
      resiliencePointCapacity: d.resiliencePointCapacity,
      liquidFuelType: liquidFuelNeed?.item ?? '',
      liquidFuelMonthlyLiters: this.numOrNull(liquidFuelNeed?.quantity),
      liquidFuelMonthsNeeded: d.liquidFuelMonthsNeeded,

      directBeneficiaries: d.directBeneficiaries,
      idpCount: d.idpCount,
      childrenCount: d.childrenCount,
      pwdCount: d.pwdCount,
      elderlyCount: d.elderlyCount,
      femaleCount: d.femaleCount,
      maleCount: d.maleCount,
      indirectBeneficiaries: d.indirectBeneficiaries,
      staffCount: d.staffCount,

      needBy: d.needBy,
      urgency: d.urgency,
      estimatedCost: this.numOrNull(d.estimatedCost),
      costBasis: d.costBasis ?? '',
      otherDonors: this.boolToRadio(d.otherDonors),
      otherDonorsDetails: d.otherDonorsDetails ?? '',
      cofinancing: d.cofinancing ?? '',
      cofinancingDetails: d.cofinancingDetails ?? '',
      logistics: this.checkboxGroupValue(LOGISTICS_OPTIONS, d.logistics),
      docsAvailable: this.checkboxGroupValue(DOCS_AVAILABLE_OPTIONS, d.docsAvailable),

      // The cloud link is NOT part of the edit payload (buildPayload excludes
      // it, like photos/documents); it is shown read-only in the detail view.
      cloudLink: d.cloudLink ?? '',

      // Consent was captured at submit time; keep the form valid without asking
      // the admin to re-consent (it is never sent back in the edit payload).
      consentGiven: true,
    });

    // Pass 3 — the specification blocks (fixed-shape FormGroups).
    generatorNeeds.slice(0, GENERATOR_ROWS_MAX).forEach((n, i) => {
      this.generatorRows.at(i).patchValue({
        qty: this.numOrNull(n.quantity),
        powerKw: this.numOrNull(n.powerKw),
        fuelType: n.fuelType ?? '',
        purpose: n.purpose ?? '',
      });
    });

    const solidFuelPatch: Record<
      string,
      { checked: boolean; amount: number | null; unit: string }
    > = {};
    for (const def of SOLID_FUEL_ITEMS) {
      const row = needs.find((n) => n.category === 'solid_fuel' && n.item === def.item);
      solidFuelPatch[def.item] = {
        checked: !!row,
        amount: this.numOrNull(row?.quantity),
        unit: (row?.unit as 't' | 'm3') ?? def.defaultUnit,
      };
    }
    this.form.get('solidFuel')!.patchValue(solidFuelPatch);

    const simpleBlocks: readonly {
      category: NeedCategory;
      group: string;
      items: readonly { item: string }[];
    }[] = [
      {
        category: 'heating_appliances',
        group: 'heatingAppliances',
        items: HEATING_APPLIANCE_ITEMS,
      },
      { category: 'heating_system_repair', group: 'heatingRepair', items: HEATING_REPAIR_ITEMS },
      { category: 'insulation', group: 'insulation', items: INSULATION_ITEMS },
      {
        category: 'resilience_point_equipment',
        group: 'resiliencePoint',
        items: RESILIENCE_POINT_ITEMS,
      },
      { category: 'winter_nfi', group: 'winterNfi', items: WINTER_NFI_ITEMS },
    ];
    for (const block of simpleBlocks) {
      const patch: Record<string, Record<string, unknown>> = {};
      for (const def of block.items) {
        const row = needs.find((n) => n.category === block.category && n.item === def.item);
        const value: Record<string, unknown> = {
          checked: !!row,
          qty: this.numOrNull(row?.quantity),
        };
        // Only the resilience-point «Інше» row owns a `details` control.
        if (this.form.get([block.group, def.item, 'details'])) {
          value['details'] = row?.details ?? '';
        }
        patch[def.item] = value;
      }
      this.form.get(block.group)!.patchValue(patch);
    }

    this.situationLen.set((d.situationDescription ?? '').length);
    this.form.updateValueAndValidity();
  }

  // ── Draft banner ──

  private loadDraftBanner(): void {
    const existing = this.draft.load();
    if (!existing) return;
    this.pendingDraftValue = existing.value;
    this.draftSavedAt.set(existing.savedAt);
    this.draftFound.set(true);
  }

  restoreDraft(): void {
    if (this.pendingDraftValue) {
      // patchValue cannot grow a FormArray — size the generator rows first.
      const rows = this.pendingDraftValue['generators'];
      if (Array.isArray(rows)) {
        this.generatorRows.clear();
        for (let i = 0; i < Math.min(rows.length, GENERATOR_ROWS_MAX); i++) {
          this.generatorRows.push(this.generatorRow());
        }
      }
      this.form.patchValue(this.pendingDraftValue);
      this.form.markAsPristine();
    }
    this.pendingDraftValue = null;
    this.draftFound.set(false);
  }

  discardDraft(): void {
    this.draft.clear();
    this.pendingDraftValue = null;
    this.draftFound.set(false);
  }

  protected draftSavedLabel(): string {
    const ts = this.draftSavedAt();
    if (!ts) return '';
    return new Date(ts).toLocaleString(this.isUa() ? 'uk-UA' : 'en-GB');
  }

  // ── Navigation ──

  protected goToStep(s: number): void {
    if (s < this.currentStep()) {
      this.stepInvalid.set(false);
      this.currentStep.set(s);
    }
  }

  protected nextStep(): void {
    if (this.validateCurrentStep()) {
      this.stepInvalid.set(false);
      this.currentStep.update((s) => Math.min(s + 1, this.steps.length - 1));
    }
  }

  protected prevStep(): void {
    this.stepInvalid.set(false);
    this.currentStep.update((s) => Math.max(s - 1, 0));
  }

  private validateCurrentStep(): boolean {
    const step = this.currentStep();
    const fields = this.stepFields[step] ?? [];
    let valid = true;
    for (const f of fields) {
      const c = this.form.get(f);
      if (!c) continue;
      c.markAllAsTouched();
      if (c.invalid) valid = false;
    }
    // CHANGED (PR-W3): step 6 — files are component state, not form controls.
    // The ≥3-photo rule lives in WinterizationService, not in the DTO, so a
    // client that lets this through only fails at submit with a 400.
    if (step === 5 && !this.filesValid()) valid = false;
    this.stepInvalid.set(!valid);
    return valid;
  }

  // ── Template helpers ──

  protected showError(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  protected showGroupError(name: string, error = 'required'): boolean {
    const c = this.form.get(name);
    return !!(c && c.hasError(error) && c.touched);
  }

  protected applicantTypeIs(value: WinterizationApplicantType): boolean {
    return this.form.get('applicantType')!.value === value;
  }

  /** True while no applicant type is picked — step 2 has nothing to show yet. */
  protected get applicantTypeMissing(): boolean {
    return !this.form.get('applicantType')!.value;
  }

  protected hasCategory(category: NeedCategory): boolean {
    return this.form.get(['needCategories', category])?.value === true;
  }

  protected rowChecked(group: string, item: string): boolean {
    return this.form.get([group, item, 'checked'])?.value === true;
  }

  protected generatorRowInvalid(index: number, name: string): boolean {
    const c = this.generatorRows.at(index)?.get(name);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  // ── Payload mapping (data portion; files + consent land in PR-W3) ──

  buildPayload(): WinterizationDataPayload {
    const raw = this.form.getRawValue() as Record<string, unknown>;
    const loc = (raw['location'] ?? null) as LocationValue | null;
    const applicantType = raw['applicantType'] as WinterizationApplicantType;
    const institution = applicantType === 'institution';
    const municipality = applicantType === 'municipality';
    const estimatedCost = this.num('estimatedCost');

    return {
      applicantType,
      organizationName: this.str('organizationName') ?? '',
      edrpou: this.str('edrpou'),

      region: loc?.regionUa ?? '',
      regionEn: loc?.regionEn ?? '',
      district: loc?.districtUa ?? '',
      districtEn: loc?.districtEn ?? '',
      community: loc?.communityUa ?? '',
      communityEn: loc?.communityEn ?? '',
      communityCode: loc?.communityCode ?? '',
      settlement: loc?.settlementUa || undefined,
      settlementEn: loc?.settlementEn || undefined,
      settlementCode: loc?.settlementCode || undefined,

      contactName: this.str('contactName') ?? '',
      contactPosition: this.str('contactPosition'),
      phone: `+38${raw['phoneDigits'] as string}`,
      email: this.str('email') ?? '',
      messenger: this.str('messenger'),
      altContactName: this.str('altContactName'),
      altContactPhone: raw['altContactPhoneDigits']
        ? `+38${raw['altContactPhoneDigits'] as string}`
        : undefined,
      website: this.str('website'),

      // Only the block that belongs to the applicant type is sent. The server
      // nulls the foreign block anyway (§14.3 п.13) — this keeps the payload
      // honest instead of relying on that.
      ...(institution
        ? {
            facilityName: this.str('facilityName'),
            facilityKind: (raw['facilityKind'] ||
              undefined) as WinterizationDataPayload['facilityKind'],
            ...(raw['facilityKind'] === 'other'
              ? { facilityKindOther: this.str('facilityKindOther') }
              : {}),
            streetAddress: this.str('streetAddress'),
            heatingSource: (raw['heatingSource'] ||
              undefined) as WinterizationDataPayload['heatingSource'],
            ...(raw['heatingSource'] === 'other'
              ? { heatingSourceOther: this.str('heatingSourceOther') }
              : {}),
            heatedArea: this.num('heatedArea'),
            backupPower: (raw['backupPower'] ||
              undefined) as WinterizationDataPayload['backupPower'],
            buildingCondition: (raw['buildingCondition'] ||
              undefined) as WinterizationDataPayload['buildingCondition'],
            staffCount: this.num('staffCount'),
          }
        : {}),
      ...(municipality
        ? {
            populationTotal: this.num('populationTotal'),
            settlementsCovered: this.num('settlementsCovered'),
            frontlineStatus: (raw['frontlineStatus'] ||
              undefined) as WinterizationDataPayload['frontlineStatus'],
            targetFacilities: this.str('targetFacilities'),
          }
        : {}),

      needCategories: this.checkedKeys<NeedCategory>('needCategories'),
      ...(this.hasCategory('other') ? { needCategoryOther: this.str('needCategoryOther') } : {}),
      situationDescription: this.str('situationDescription'),
      needs: this.collectNeeds(),
      ...(this.hasCategory('solid_fuel')
        ? {
            solidFuelBoilerCount: this.num('solidFuelBoilerCount'),
            solidFuelStorageAvailable: this.triState(raw['solidFuelStorageAvailable'] as string),
          }
        : {}),
      ...(this.hasCategory('heating_system_repair')
        ? { heatingRepairDescription: this.str('heatingRepairDescription') }
        : {}),
      ...(this.hasCategory('resilience_point_equipment')
        ? {
            resiliencePointStatus: (raw['resiliencePointStatus'] ||
              undefined) as WinterizationDataPayload['resiliencePointStatus'],
            resiliencePointCapacity: this.num('resiliencePointCapacity'),
          }
        : {}),
      ...(this.hasCategory('liquid_fuel')
        ? { liquidFuelMonthsNeeded: this.num('liquidFuelMonthsNeeded') }
        : {}),

      directBeneficiaries: this.num('directBeneficiaries'),
      idpCount: this.num('idpCount'),
      childrenCount: this.num('childrenCount'),
      pwdCount: this.num('pwdCount'),
      elderlyCount: this.num('elderlyCount'),
      femaleCount: this.num('femaleCount'),
      maleCount: this.num('maleCount'),
      indirectBeneficiaries: this.num('indirectBeneficiaries'),

      needBy: raw['needBy'] as WinterizationDataPayload['needBy'],
      urgency: raw['urgency'] as WinterizationDataPayload['urgency'],
      estimatedCost,
      // costBasis is required by the DTO as soon as a cost figure is present.
      ...(estimatedCost !== undefined
        ? {
            costBasis: (raw['costBasis'] || undefined) as WinterizationDataPayload['costBasis'],
          }
        : {}),
      otherDonors: raw['otherDonors'] === 'yes',
      ...(raw['otherDonors'] === 'yes'
        ? { otherDonorsDetails: this.str('otherDonorsDetails') }
        : {}),
      cofinancing: (raw['cofinancing'] || undefined) as WinterizationDataPayload['cofinancing'],
      ...(raw['cofinancing'] && raw['cofinancing'] !== 'no'
        ? { cofinancingDetails: this.str('cofinancingDetails') }
        : {}),
      logistics: this.optionalArray(this.checkedKeys<LogisticsOption>('logistics')),
      docsAvailable: this.optionalArray(this.checkedKeys<WinterizationDocsOption>('docsAvailable')),
    };
  }

  /**
   * Flatten every unlocked spec block into `needs[]` rows.
   *
   * Contract notes (§14.3): `unit` is sent for solid_fuel only — everywhere else
   * the server derives it from NEED_ITEM_UNITS. `powerKw`/`fuelType`/`purpose`
   * ride on `generators` rows only. Rows of unselected categories are never
   * emitted (the server rejects orphan rows with 400).
   */
  private collectNeeds(): WinterizationNeedPayload[] {
    const out: WinterizationNeedPayload[] = [];
    const push = (row: Omit<WinterizationNeedPayload, 'sortOrder'>): void => {
      out.push({ ...row, sortOrder: out.length });
    };

    if (this.hasCategory('generators')) {
      for (const row of this.generatorRows.controls) {
        const v = row.getRawValue() as {
          qty: number | null;
          powerKw: number | null;
          fuelType: string;
          purpose: string;
        };
        push({
          category: 'generators',
          item: 'generator',
          ...(v.qty !== null ? { quantity: Number(v.qty) } : {}),
          ...(v.powerKw !== null ? { powerKw: Number(v.powerKw) } : {}),
          ...(v.fuelType ? { fuelType: v.fuelType as WinterizationNeedPayload['fuelType'] } : {}),
          ...(v.purpose ? { purpose: v.purpose as WinterizationNeedPayload['purpose'] } : {}),
        });
      }
    }

    if (this.hasCategory('solid_fuel')) {
      for (const def of SOLID_FUEL_ITEMS) {
        const row = this.specRow('solidFuel', def.item);
        if (!row?.checked) continue;
        push({
          category: 'solid_fuel',
          item: def.item,
          ...(row.amount !== null && row.amount !== undefined
            ? { quantity: Number(row.amount) }
            : {}),
          unit: (row.unit ?? def.defaultUnit) as WinterizationNeedPayload['unit'],
        });
      }
    }

    const simpleBlocks: readonly {
      category: NeedCategory;
      group: string;
      items: readonly { item: string }[];
    }[] = [
      {
        category: 'heating_appliances',
        group: 'heatingAppliances',
        items: HEATING_APPLIANCE_ITEMS,
      },
      { category: 'heating_system_repair', group: 'heatingRepair', items: HEATING_REPAIR_ITEMS },
      { category: 'insulation', group: 'insulation', items: INSULATION_ITEMS },
      {
        category: 'resilience_point_equipment',
        group: 'resiliencePoint',
        items: RESILIENCE_POINT_ITEMS,
      },
      { category: 'winter_nfi', group: 'winterNfi', items: WINTER_NFI_ITEMS },
    ];

    for (const block of simpleBlocks) {
      if (!this.hasCategory(block.category)) continue;
      for (const def of block.items) {
        const row = this.specRow(block.group, def.item);
        if (!row?.checked) continue;
        const details = (row.details ?? '').trim();
        push({
          category: block.category,
          item: def.item as NeedItem,
          ...(row.qty !== null && row.qty !== undefined ? { quantity: Number(row.qty) } : {}),
          ...(details ? { details } : {}),
        });
      }
    }

    if (this.hasCategory('liquid_fuel')) {
      const item = this.form.get('liquidFuelType')!.value as NeedItem | '';
      const liters = this.num('liquidFuelMonthlyLiters');
      if (item) {
        push({
          category: 'liquid_fuel',
          item,
          ...(liters !== undefined ? { quantity: liters } : {}),
        });
      }
    }

    return out;
  }

  /** Typed read of one `{checked, qty|amount, unit?, details?}` spec row. */
  private specRow(
    group: string,
    item: string,
  ):
    | {
        checked?: boolean;
        qty?: number | null;
        amount?: number | null;
        unit?: string | null;
        details?: string | null;
      }
    | undefined {
    return this.form.get([group, item])?.value as
      | {
          checked?: boolean;
          qty?: number | null;
          amount?: number | null;
          unit?: string | null;
          details?: string | null;
        }
      | undefined;
  }

  private checkedKeys<T extends string>(groupName: string): T[] {
    const group = (this.form.get(groupName)?.value ?? {}) as Record<string, boolean>;
    return Object.entries(group)
      .filter(([, checked]) => checked)
      .map(([key]) => key as T);
  }

  private optionalArray<T>(arr: T[]): T[] | undefined {
    return arr.length ? arr : undefined;
  }

  private triState(value: string): boolean | undefined {
    if (value === 'yes') return true;
    if (value === 'no') return false;
    return undefined;
  }

  private num(name: string): number | undefined {
    const v = this.form.get(name)?.value;
    return v === null || v === '' || v === undefined ? undefined : Number(v);
  }

  private str(name: string): string | undefined {
    const v = (this.form.get(name)?.value ?? '') as string;
    const t = v.trim();
    return t || undefined;
  }

  // ── CHANGED (PR-W3): files (step 6) + review/submit (step 7) ──

  protected onPhotosChanged(files: UploadedFile[]): void {
    this.photos.set(files);
    if (this.currentStep() === 5) this.stepInvalid.set(false);
  }

  protected onDocumentsChanged(files: UploadedFile[]): void {
    this.documents.set(files);
  }

  /**
   * ≥3 photos are demanded ONLY when a works-type category is selected
   * (PHOTO_REQUIRED_CATEGORIES = heating_system_repair | insulation): there they
   * are the evidence base for a BoQ, while a fuel or NFI request has nothing
   * meaningful to photograph. The rule lives in WinterizationService, not in the
   * DTO, so the applicant would otherwise only learn about it from a 400.
   */
  protected get photosRequired(): boolean {
    return PHOTO_REQUIRED_CATEGORIES.some((c) => this.hasCategory(c));
  }

  protected filesValid(): boolean {
    const photos = this.photos().length;
    if (photos > this.PHOTOS_MAX || this.documents().length > this.DOCUMENTS_MAX) return false;
    return this.photosRequired ? photos >= this.PHOTOS_MIN_FOR_WORKS : true;
  }

  protected canSubmit(): boolean {
    return this.filesValid() && this.form.get('consentGiven')!.value === true;
  }

  /** Bilingual label for a select/radio value (review step). */
  protected label(options: readonly LabeledOption<string>[], value: unknown): string {
    const o = options.find((x) => x.value === value);
    return o ? (this.isUa() ? o.ua : o.en) : '—';
  }

  /** Selected need categories as one bilingual line (review step). */
  protected selectedCategoryLabels(): string {
    const selected = this.checkedKeys<NeedCategory>('needCategories');
    if (!selected.length) return '—';
    return selected.map((c) => this.label(this.needCategoryOptions, c)).join(', ');
  }

  /** Specification rows the payload will carry — the review step shows the
   *  count rather than the rows themselves: 39 rows is the UI maximum. */
  protected needRowCount(): number {
    return this.collectNeeds().length;
  }

  /** Community line for the review step (settlement is optional). */
  protected locationLabel(): string {
    const loc = this.form.get('location')!.value as LocationValue | null;
    if (!loc) return '—';
    const ua = this.isUa();
    const community = (ua ? loc.communityUa : loc.communityEn) || '';
    const region = (ua ? loc.regionUa : loc.regionEn) || '';
    const settlement = (ua ? loc.settlementUa : loc.settlementEn) || '';
    return [settlement, community, region].filter(Boolean).join(', ') || '—';
  }

  /**
   * Wrap the data payload in the full submit shape. Kept separate from
   * buildPayload() for the same reason as in Recovery: an admin edit-mode must
   * be able to PATCH the data without touching attachments or the consent
   * snapshot. Empty file arrays are omitted rather than sent as `[]` — photos
   * are optional here (unlike Recovery), so `[]` would be noise.
   */
  private buildFullPayload(): CreateWinterizationFormPayload {
    const withSort = (f: UploadedFile, i: number): WinterizationAttachmentPayload => ({
      ...f,
      sortOrder: i,
    });
    const photos = this.photos();
    const documents = this.documents();
    return {
      ...this.buildPayload(),
      ...(photos.length ? { photos: photos.map(withSort) } : {}),
      ...(documents.length ? { documents: documents.map(withSort) } : {}),
      cloudLink: this.str('cloudLink'),
      consentGiven: true,
    };
  }

  protected async submit(): Promise<void> {
    this.form.get('consentGiven')!.markAsTouched();
    if (this.submitting() || !this.canSubmit()) {
      this.stepInvalid.set(true);
      return;
    }
    this.submitting.set(true);
    this.submitError.set(false);
    try {
      // Turnstile tokens are single-use — the uploads already spent theirs.
      const token = await this.tokenProvider();
      const res = await firstValueFrom(
        this.api.post<{ id: string; trackingNumber: string }>(
          'needs-forms/winterization',
          this.buildFullPayload(),
          // Header, not body: the endpoint runs forbidNonWhitelisted (§14.3 п.11).
          { 'x-turnstile-token': token },
        ),
      );
      this.trackingNumber.set(res.trackingNumber);
      this.submitted.set(true);
      this.draft.clear();
    } catch {
      this.submitError.set(true);
    } finally {
      this.submitting.set(false);
    }
  }

  // ── (PR-W4) Edit mode — emit the data payload; the parent owns PATCH /full ──

  /**
   * Validate every field and emit the payload. `buildPayload()` carries no
   * photos, documents, cloudLink or consent, so PATCH /full leaves the
   * attachments and the consent snapshot untouched — replace-semantics apply
   * only to `needs[]` and the scalars.
   */
  protected save(): void {
    if (this.externalSaving) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.stepInvalid.set(true);
      return;
    }
    this.stepInvalid.set(false);
    this.saved.emit(this.buildPayload());
  }

  protected cancel(): void {
    this.cancelled.emit();
  }
}
