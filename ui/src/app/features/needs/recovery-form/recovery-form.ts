// ui/src/app/features/needs/recovery-form/recovery-form.ts
// public Recovery form ("Ремонт і відновлення соціальної
// інфраструктури"). Steps 1–4 (applicant, object+damage, beneficiaries,
// budget). PR-4 adds files (step 5) + review/consent/Turnstile/submit (step 6)
// → thank-you with tracking number. Reactive Forms with per-step validation;
// localStorage draft autosave. Zoneless-safe i18n via signal LanguageService. ===
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
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
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
import { RecoveryFormDraftService } from './recovery-form-draft.service';
import {
  ACCESSIBILITY_FEATURE_OPTIONS,
  APPLICANT_CATEGORY_OPTIONS,
  ASBESTOS_OPTIONS,
  AccessibilityFeature,
  COFINANCING_OPTIONS,
  COST_BASIS_OPTIONS,
  DAMAGE_CATEGORY_OPTIONS,
  DAMAGE_CAUSE_OPTIONS,
  DAMAGE_ELEMENTS,
  DESIRED_TIMELINE_OPTIONS,
  DOCS_AVAILABLE_OPTIONS,
  DocsAvailableOption,
  EDUCATION_MODE_OPTIONS,
  FUNCTIONING_STATUS_OPTIONS,
  HEALTH_FACILITY_KIND_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  OWNERSHIP_TYPE_OPTIONS,
  ObjectType,
  REMOTE_OPERATION_OPTIONS,
  CreateRecoveryFormPayload,
  LabeledOption,
  RecoveryAttachmentFull,
  RecoveryAttachmentPayload,
  RecoveryDamagePayload,
  RecoveryDataPayload,
  RecoveryFormDetail,
  SHELTER_STATUS_OPTIONS,
  SHELTER_TYPE_OPTIONS,
  URGENCY_OPTIONS,
  UpdateRecoveryFormFullPayload,
  WORK_CATEGORY_OPTIONS,
  WorkCategory,
} from './recovery-form.interfaces';

/** Group-level: at least one boolean child is true (checkbox groups). */
function atLeastOneBooleanChecked(group: AbstractControl): ValidationErrors | null {
  const val = (group.value ?? {}) as Record<string, boolean>;
  return Object.values(val).some(Boolean) ? null : { required: true };
}

/** Group-level: at least one damage row is checked. */
function atLeastOneDamageChecked(group: AbstractControl): ValidationErrors | null {
  const val = (group.value ?? {}) as Record<string, { checked?: boolean }>;
  return Object.values(val).some((row) => !!row?.checked) ? null : { required: true };
}

/** Six-step journey. Steps 5–6 (files, review) render placeholders in PR-3. */
const RECOVERY_STEPS: readonly FormStep[] = [
  { key: 'applicant', labelUa: 'Заявник', labelEn: 'Applicant', group: 'primary' },
  { key: 'object', labelUa: 'Обʼєкт', labelEn: 'Object', group: 'primary' },
  { key: 'beneficiaries', labelUa: 'Бенефіціари', labelEn: 'Beneficiaries', group: 'primary' },
  { key: 'budget', labelUa: 'Бюджет', labelEn: 'Budget', group: 'primary' },
  { key: 'files', labelUa: 'Файли', labelEn: 'Files', group: 'primary' },
  { key: 'review', labelUa: 'Перевірка', labelEn: 'Review', group: 'review' },
];

@Component({
  selector: 'app-recovery-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    LocationSelectorComponent,
    FormStepperComponent,
    FileUploadComponent,
    TurnstileComponent,
  ],
  templateUrl: './recovery-form.html',
  styleUrl: './recovery-form.scss',
})
export class RecoveryFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly draft = inject(RecoveryFormDraftService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isUa = inject(LanguageService).isUa;
  private readonly api = inject(ApiService);

  // ── Mode (PR-5): 'create' = public submit; 'edit' = admin edit (emits
  //    `saved` instead of POST; no Turnstile, no file upload, no draft). ──

  /** 'create' = public submit; 'edit' = admin full-edit (recovery-form-detail). */
  @Input() mode: 'create' | 'edit' = 'create';

  /** Existing record to hydrate the reactive form with when mode === 'edit'. */
  @Input() initialData: RecoveryFormDetail | null = null;

  /** Parent's PATCH /full in-flight state — disables Save during the request. */
  @Input() externalSaving = false;

  /** Edit mode: emitted on Save — parent calls PATCH /full. Files/consent are
   *  intentionally excluded from the payload (attachments stay untouched). */
  @Output() saved = new EventEmitter<UpdateRecoveryFormFullPayload>();

  /** Edit mode: emitted when the admin clicks Cancel. */
  @Output() cancelled = new EventEmitter<void>();

  protected get isEdit(): boolean {
    return this.mode === 'edit';
  }

  /** Cloudflare Turnstile SITE key (public). */
  protected readonly siteKey = environment.turnstileSiteKey;

  @ViewChild(TurnstileComponent) private turnstile?: TurnstileComponent;

  // File limits (mirror recovery.constants.ts / CreateRecoveryFormDto).
  protected readonly PHOTOS_MIN = 3;
  protected readonly PHOTOS_MAX = 10;
  protected readonly DOCUMENTS_MAX = 5;
  protected readonly PHOTO_MAX_BYTES = 5 * 1024 * 1024;
  protected readonly DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;
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

  /** Supplies a fresh Turnstile token per guarded call (upload + submit). */
  protected readonly tokenProvider = (): Promise<string> =>
    this.turnstile ? this.turnstile.getToken() : Promise.reject(new Error('Turnstile not ready'));

  // Option catalogs exposed to the template (single source = interfaces file).
  protected readonly applicantCategories = APPLICANT_CATEGORY_OPTIONS;
  protected readonly objectTypes = OBJECT_TYPE_OPTIONS;
  protected readonly workCategoryOptions = WORK_CATEGORY_OPTIONS;
  protected readonly ownershipTypes = OWNERSHIP_TYPE_OPTIONS;
  protected readonly damageElements = DAMAGE_ELEMENTS;
  protected readonly damageCauses = DAMAGE_CAUSE_OPTIONS;
  protected readonly damageCategories = DAMAGE_CATEGORY_OPTIONS;
  protected readonly functioningStatuses = FUNCTIONING_STATUS_OPTIONS;
  protected readonly accessibilityFeatureOptions = ACCESSIBILITY_FEATURE_OPTIONS;
  protected readonly educationModes = EDUCATION_MODE_OPTIONS;
  protected readonly shelterStatuses = SHELTER_STATUS_OPTIONS;
  protected readonly shelterTypes = SHELTER_TYPE_OPTIONS;
  protected readonly healthFacilityKinds = HEALTH_FACILITY_KIND_OPTIONS;
  protected readonly remoteOperationOptions = REMOTE_OPERATION_OPTIONS;
  protected readonly costBases = COST_BASIS_OPTIONS;
  protected readonly cofinancingOptions = COFINANCING_OPTIONS;
  protected readonly docsAvailableOptions = DOCS_AVAILABLE_OPTIONS;
  protected readonly desiredTimelines = DESIRED_TIMELINE_OPTIONS;
  protected readonly urgencyOptions = URGENCY_OPTIONS;
  protected readonly asbestosOptions = ASBESTOS_OPTIONS;

  protected readonly steps: readonly FormStep[] = RECOVERY_STEPS;

  protected readonly currentStep = signal(0);
  protected readonly stepInvalid = signal(false);
  protected readonly descLen = signal(0);

  protected readonly draftFound = signal(false);
  protected readonly draftSavedAt = signal(0);
  private pendingDraftValue: Record<string, unknown> | null = null;

  protected readonly form: FormGroup = this.fb.group({
    // ── Step 1: applicant + contacts ──
    location: [null as LocationValue | null, [Validators.required]],
    applicantCategory: ['', [Validators.required]],
    applicantCategoryOther: [''],
    organizationName: ['', [Validators.required, Validators.minLength(3)]],
    contactName: ['', [Validators.required, Validators.minLength(2)]],
    contactPosition: ['', [Validators.required, Validators.minLength(2)]],
    phoneDigits: ['', [Validators.required, Validators.pattern(/^0\d{9}$/)]],
    email: ['', [Validators.required, Validators.email]],
    messenger: [''],
    altContactName: ['', [Validators.minLength(2)]],
    altContactPhoneDigits: ['', [Validators.pattern(/^0\d{9}$/)]],
    website: ['', [Validators.pattern(/^https?:\/\/.+/i)]],

    // ── Step 2: object + damage ──
    objectName: ['', [Validators.required, Validators.minLength(3)]],
    objectType: ['', [Validators.required]],
    objectTypeOther: [''],
    streetAddress: [''],
    ownershipType: [''],
    ownershipTypeOther: [''],
    onApplicantBalance: [''],
    buildYear: [null as number | null, [Validators.min(1800), Validators.max(2026)]],
    totalArea: [null as number | null, [Validators.min(1), Validators.max(1_000_000)]],
    floors: [null as number | null, [Validators.min(1), Validators.max(30)]],
    workCategories: this.fb.group(
      {
        building_repair: [false],
        shelter_arrangement: [false],
        utilities: [false],
        equipment: [false],
      },
      { validators: atLeastOneBooleanChecked },
    ),
    damages: this.fb.group(
      {
        roof: this.damageRow(),
        windows: this.damageRow(),
        doors: this.damageRow(),
        facade: this.damageRow(),
        interior: this.damageRow(),
        heating: this.damageRow(),
        water_sewage: this.damageRow(),
        electricity: this.damageRow(),
        shelter: this.damageRow(),
      },
      { validators: atLeastOneDamageChecked },
    ),
    damageDescription: [
      '',
      [Validators.required, Validators.minLength(100), Validators.maxLength(1500)],
    ],
    damageCause: ['', [Validators.required]],
    damageCauseOther: [''],
    damageDate: ['', [Validators.pattern(/^\d{4}-(0[1-9]|1[0-2])$/)]],
    damageCategory: ['', [Validators.required]],
    functioningStatus: ['', [Validators.required]],
    accessibilityFeatures: this.fb.group({
      ramp: [false],
      accessible_wc: [false],
      wide_doors: [false],
      elevator: [false],
      none: [false],
    }),

    // ── Step 3: beneficiaries + conditional education/health ──
    directBeneficiaries: [null as number | null, [Validators.required, Validators.min(1)]],
    idpCount: [null as number | null, [Validators.required, Validators.min(0)]],
    childrenCount: [null as number | null, [Validators.required, Validators.min(0)]],
    pwdCount: [null as number | null, [Validators.required, Validators.min(0)]],
    elderlyCount: [null as number | null, [Validators.required, Validators.min(0)]],
    femaleCount: [null as number | null, [Validators.min(0)]],
    maleCount: [null as number | null, [Validators.min(0)]],
    indirectBeneficiaries: [null as number | null, [Validators.min(0)]],
    staffCount: [null as number | null, [Validators.min(0)]],
    canOperateRemotely: [''],
    educationMode: [''],
    shelterStatus: [''],
    shelterType: [''],
    shelterCapacity: [null as number | null, [Validators.min(1), Validators.max(10_000)]],
    healthFacilityKind: [''],
    suspendedServices: ['', [Validators.maxLength(1000)]],
    declarationsCount: [null as number | null, [Validators.min(0)]],

    // ── Step 4: budget / docs / timeline ──
    estimatedCost: [null as number | null, [Validators.required, Validators.min(1)]],
    costBasis: ['', [Validators.required]],
    cofinancing: ['', [Validators.required]],
    cofinancingDetails: [''],
    docsAvailable: this.fb.group(
      {
        survey_act_326: [false],
        defect_act: [false],
        cost_estimate: [false],
        design_docs: [false],
        design_expertise: [false],
        none: [false],
      },
      { validators: atLeastOneBooleanChecked },
    ),
    desiredTimeline: [''],
    urgency: [''],
    otherDonors: ['', [Validators.required]],
    otherDonorsDetails: [''],
    asbestosPresence: ['', [Validators.required]],
    cloudLink: ['', [Validators.pattern(/^https?:\/\/.+/i)]],

    // ── Step 6: consent ──
    consentGiven: [false, [Validators.requiredTrue]],
  });

  /** Required controls (or validated groups) per step index. Steps 5–6 (files,
   *  review) carry no controls in PR-3. */
  private readonly stepFields: string[][] = [
    [
      'location',
      'applicantCategory',
      'applicantCategoryOther',
      'organizationName',
      'contactName',
      'contactPosition',
      'phoneDigits',
      'email',
      'altContactName',
      'altContactPhoneDigits',
      'website',
    ],
    [
      'objectName',
      'objectType',
      'objectTypeOther',
      'ownershipTypeOther',
      'buildYear',
      'totalArea',
      'floors',
      'workCategories',
      'damages',
      'damageDescription',
      'damageCause',
      'damageCauseOther',
      'damageDate',
      'damageCategory',
      'functioningStatus',
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
      'educationMode',
      'shelterStatus',
      'shelterCapacity',
      'healthFacilityKind',
      'declarationsCount',
    ],
    [
      'estimatedCost',
      'costBasis',
      'cofinancing',
      'cofinancingDetails',
      'docsAvailable',
      'otherDonors',
      'otherDonorsDetails',
      'asbestosPresence',
      'cloudLink',
    ],
    [], // step 5 — files (validated by count in validateCurrentStep)
    ['consentGiven'], // step 6 — review + consent
  ];

  ngOnInit(): void {
    this.wireConditionalValidators();

    this.form
      .get('damageDescription')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.descLen.set(((v as string) || '').length));

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

  private damageRow(): FormGroup {
    return this.fb.group({
      checked: [false],
      volume: [null as number | null, [Validators.min(0.01), Validators.max(1_000_000)]],
    });
  }

  // ── Conditional validators (mirror ValidateIf in CreateRecoveryFormDto) ──

  private wireConditionalValidators(): void {
    const req2: ValidatorFn[] = [Validators.required, Validators.minLength(2)];
    const changes$ = (name: string) =>
      this.form.get(name)!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef));

    changes$('applicantCategory').subscribe((v) =>
      this.applyConditional('applicantCategoryOther', v === 'other', req2),
    );
    changes$('ownershipType').subscribe((v) =>
      this.applyConditional('ownershipTypeOther', v === 'other', req2),
    );
    changes$('damageCause').subscribe((v) =>
      this.applyConditional('damageCauseOther', v === 'other', req2),
    );
    changes$('objectType').subscribe((v) => {
      this.applyConditional('objectTypeOther', v === 'other', req2);
      this.applyConditional('educationMode', v === 'education', [Validators.required]);
      this.applyConditional('shelterStatus', v === 'education', [Validators.required]);
      this.applyConditional('healthFacilityKind', v === 'healthcare', [Validators.required]);
    });
    changes$('cofinancing').subscribe((v) =>
      this.applyConditional('cofinancingDetails', !!v && v !== 'no', req2),
    );
    changes$('otherDonors').subscribe((v) =>
      this.applyConditional('otherDonorsDetails', v === 'yes', [
        Validators.required,
        Validators.minLength(3),
      ]),
    );
  }

  /** Toggle a conditional control's validators; clears its value when hidden. */
  private applyConditional(name: string, active: boolean, validators: ValidatorFn[]): void {
    const c = this.form.get(name);
    if (!c) return;
    if (active) {
      c.setValidators(validators);
    } else {
      c.clearValidators();
      c.setValue('', { emitEvent: false });
    }
    c.updateValueAndValidity({ emitEvent: false });
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

  // ── Edit mode (admin): hydrate reactive state from an existing record ──

  /** Existing photos (read-only on the files step in edit mode). */
  protected get existingPhotos(): RecoveryAttachmentFull[] {
    return (this.initialData?.attachments ?? []).filter((a) => a.kind === 'photo');
  }

  /** Existing documents (read-only on the files step in edit mode). */
  protected get existingDocuments(): RecoveryAttachmentFull[] {
    return (this.initialData?.attachments ?? []).filter((a) => a.kind === 'document');
  }

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

  private patchFromInitialData(d: RecoveryFormDetail): void {
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
      applicantCategory: d.applicantCategory,
      applicantCategoryOther: d.applicantCategoryOther ?? '',
      organizationName: d.organizationName,
      contactName: d.contactName,
      contactPosition: d.contactPosition,
      phoneDigits: this.stripPhonePrefix(d.phone),
      email: d.email,
      messenger: d.messenger ?? '',
      altContactName: d.altContactName ?? '',
      altContactPhoneDigits: this.stripPhonePrefix(d.altContactPhone),
      website: d.website ?? '',

      objectName: d.objectName,
      objectType: d.objectType,
      objectTypeOther: d.objectTypeOther ?? '',
      streetAddress: d.streetAddress ?? '',
      ownershipType: d.ownershipType ?? '',
      ownershipTypeOther: d.ownershipTypeOther ?? '',
      onApplicantBalance: this.boolToRadio(d.onApplicantBalance),
      buildYear: d.buildYear,
      totalArea: d.totalArea != null ? Number(d.totalArea) : null,
      floors: d.floors,
      workCategories: this.checkboxGroupValue(WORK_CATEGORY_OPTIONS, d.workCategories),
      damageDescription: d.damageDescription,
      damageCause: d.damageCause,
      damageCauseOther: d.damageCauseOther ?? '',
      damageDate: d.damageDate ?? '',
      damageCategory: d.damageCategory,
      functioningStatus: d.functioningStatus,
      accessibilityFeatures: this.checkboxGroupValue(
        ACCESSIBILITY_FEATURE_OPTIONS,
        d.accessibilityFeatures,
      ),

      educationMode: d.educationMode ?? '',
      shelterStatus: d.shelterStatus ?? '',
      shelterType: d.shelterType ?? '',
      shelterCapacity: d.shelterCapacity,
      healthFacilityKind: d.healthFacilityKind ?? '',
      suspendedServices: d.suspendedServices ?? '',
      declarationsCount: d.declarationsCount,

      directBeneficiaries: d.directBeneficiaries,
      idpCount: d.idpCount,
      childrenCount: d.childrenCount,
      pwdCount: d.pwdCount,
      elderlyCount: d.elderlyCount,
      femaleCount: d.femaleCount,
      maleCount: d.maleCount,
      indirectBeneficiaries: d.indirectBeneficiaries,
      staffCount: d.staffCount,
      canOperateRemotely: d.canOperateRemotely ?? '',

      estimatedCost: d.estimatedCost != null ? Number(d.estimatedCost) : null,
      costBasis: d.costBasis,
      cofinancing: d.cofinancing,
      cofinancingDetails: d.cofinancingDetails ?? '',
      docsAvailable: this.checkboxGroupValue(DOCS_AVAILABLE_OPTIONS, d.docsAvailable),
      desiredTimeline: d.desiredTimeline ?? '',
      urgency: d.urgency ?? '',
      otherDonors: this.boolToRadio(d.otherDonors),
      otherDonorsDetails: d.otherDonorsDetails ?? '',
      asbestosPresence: d.asbestosPresence,
      cloudLink: d.cloudLink ?? '',

      // Consent was captured at submit time; keep the form valid without asking
      // the admin to re-consent (it is never sent back in the edit payload).
      consentGiven: true,
    });

    // Damage checklist is a fixed 9-row FormGroup {checked, volume}. Replace-map
    // from the stored children.
    const byElement = new Map(d.damages.map((r) => [r.element, r]));
    const damagesPatch: Record<string, { checked: boolean; volume: number | null }> = {};
    for (const def of DAMAGE_ELEMENTS) {
      const row = byElement.get(def.element);
      damagesPatch[def.element] = {
        checked: !!row,
        volume: row && row.volume != null ? Number(row.volume) : null,
      };
    }
    this.form.get('damages')!.patchValue(damagesPatch);

    this.descLen.set((d.damageDescription || '').length);
    this.form.updateValueAndValidity();
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
      c.markAsTouched();
      if ('controls' in c) (c as FormGroup).markAllAsTouched();
      if (c.invalid) valid = false;
    }
    // Step 5 — files are component state, not form controls.
    if (step === 4 && !this.filesValid()) valid = false;
    this.stepInvalid.set(!valid);
    return valid;
  }

  // ── Template error helpers ──

  protected showError(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  protected showGroupError(name: string): boolean {
    const c = this.form.get(name);
    return !!(c && c.hasError('required') && c.touched);
  }

  protected objectTypeIs(value: ObjectType): boolean {
    return this.form.get('objectType')!.value === value;
  }

  // ── Payload mapping (data portion; files + consent added in PR-4) ──

  buildPayload(): RecoveryDataPayload {
    const raw = this.form.getRawValue() as Record<string, unknown>;
    const loc = (raw['location'] ?? null) as LocationValue | null;
    const objectType = raw['objectType'] as ObjectType;

    return {
      applicantCategory: raw['applicantCategory'] as RecoveryDataPayload['applicantCategory'],
      ...(raw['applicantCategory'] === 'other'
        ? { applicantCategoryOther: this.str('applicantCategoryOther') }
        : {}),
      organizationName: this.str('organizationName') ?? '',

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
      contactPosition: this.str('contactPosition') ?? '',
      phone: `+38${raw['phoneDigits'] as string}`,
      email: this.str('email') ?? '',
      messenger: this.str('messenger'),
      altContactName: this.str('altContactName'),
      altContactPhone: raw['altContactPhoneDigits']
        ? `+38${raw['altContactPhoneDigits'] as string}`
        : undefined,
      website: this.str('website'),

      objectName: this.str('objectName') ?? '',
      objectType,
      ...(objectType === 'other' ? { objectTypeOther: this.str('objectTypeOther') } : {}),
      streetAddress: this.str('streetAddress'),
      ownershipType: (raw['ownershipType'] || undefined) as RecoveryDataPayload['ownershipType'],
      ...(raw['ownershipType'] === 'other'
        ? { ownershipTypeOther: this.str('ownershipTypeOther') }
        : {}),
      onApplicantBalance: this.triState(raw['onApplicantBalance'] as string),
      buildYear: this.num('buildYear'),
      totalArea: this.num('totalArea'),
      floors: this.num('floors'),
      workCategories: this.checkedKeys<WorkCategory>('workCategories'),
      damages: this.collectDamages(),
      damageDescription: this.str('damageDescription') ?? '',
      damageCause: raw['damageCause'] as RecoveryDataPayload['damageCause'],
      ...(raw['damageCause'] === 'other' ? { damageCauseOther: this.str('damageCauseOther') } : {}),
      damageDate: this.str('damageDate'),
      damageCategory: raw['damageCategory'] as RecoveryDataPayload['damageCategory'],
      functioningStatus: raw['functioningStatus'] as RecoveryDataPayload['functioningStatus'],
      accessibilityFeatures: this.optionalArray(
        this.checkedKeys<AccessibilityFeature>('accessibilityFeatures'),
      ),

      ...(objectType === 'education'
        ? {
            educationMode: (raw['educationMode'] ||
              undefined) as RecoveryDataPayload['educationMode'],
            shelterStatus: (raw['shelterStatus'] ||
              undefined) as RecoveryDataPayload['shelterStatus'],
            shelterType: (raw['shelterType'] || undefined) as RecoveryDataPayload['shelterType'],
            shelterCapacity: this.num('shelterCapacity'),
          }
        : {}),
      ...(objectType === 'healthcare'
        ? {
            healthFacilityKind: (raw['healthFacilityKind'] ||
              undefined) as RecoveryDataPayload['healthFacilityKind'],
            suspendedServices: this.str('suspendedServices'),
            declarationsCount: this.num('declarationsCount'),
          }
        : {}),

      directBeneficiaries: Number(raw['directBeneficiaries']),
      idpCount: Number(raw['idpCount']),
      childrenCount: Number(raw['childrenCount']),
      pwdCount: Number(raw['pwdCount']),
      elderlyCount: Number(raw['elderlyCount']),
      femaleCount: this.num('femaleCount'),
      maleCount: this.num('maleCount'),
      indirectBeneficiaries: this.num('indirectBeneficiaries'),
      staffCount: this.num('staffCount'),
      canOperateRemotely: (raw['canOperateRemotely'] ||
        undefined) as RecoveryDataPayload['canOperateRemotely'],

      estimatedCost: Number(raw['estimatedCost']),
      costBasis: raw['costBasis'] as RecoveryDataPayload['costBasis'],
      cofinancing: raw['cofinancing'] as RecoveryDataPayload['cofinancing'],
      ...(raw['cofinancing'] && raw['cofinancing'] !== 'no'
        ? { cofinancingDetails: this.str('cofinancingDetails') }
        : {}),
      docsAvailable: this.checkedKeys<DocsAvailableOption>('docsAvailable'),
      desiredTimeline: (raw['desiredTimeline'] ||
        undefined) as RecoveryDataPayload['desiredTimeline'],
      urgency: (raw['urgency'] || undefined) as RecoveryDataPayload['urgency'],
      otherDonors: raw['otherDonors'] === 'yes',
      ...(raw['otherDonors'] === 'yes'
        ? { otherDonorsDetails: this.str('otherDonorsDetails') }
        : {}),
      asbestosPresence: raw['asbestosPresence'] as RecoveryDataPayload['asbestosPresence'],
      cloudLink: this.str('cloudLink'),
    };
  }

  private collectDamages(): RecoveryDamagePayload[] {
    const group = (this.form.get('damages')?.value ?? {}) as Record<
      string,
      { checked?: boolean; volume?: number | null }
    >;
    const out: RecoveryDamagePayload[] = [];
    let sort = 0;
    for (const d of DAMAGE_ELEMENTS) {
      const row = group[d.element];
      if (!row?.checked) continue;
      out.push({
        element: d.element,
        ...(row.volume != null ? { volume: Number(row.volume) } : {}),
        sortOrder: sort++,
      });
    }
    return out;
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

  // ── Files (step 5) + submit (step 6) — PR-4 ──

  protected onPhotosChanged(files: UploadedFile[]): void {
    this.photos.set(files);
    if (this.currentStep() === 4) this.stepInvalid.set(false);
  }

  protected onDocumentsChanged(files: UploadedFile[]): void {
    this.documents.set(files);
  }

  protected filesValid(): boolean {
    const p = this.photos().length;
    return (
      p >= this.PHOTOS_MIN && p <= this.PHOTOS_MAX && this.documents().length <= this.DOCUMENTS_MAX
    );
  }

  protected canSubmit(): boolean {
    return this.filesValid() && this.form.get('consentGiven')!.value === true;
  }

  /** Bilingual label for a select/radio value (review step). */
  protected label(options: readonly LabeledOption<string>[], value: unknown): string {
    const o = options.find((x) => x.value === value);
    return o ? (this.isUa() ? o.ua : o.en) : '—';
  }

  private buildFullPayload(): CreateRecoveryFormPayload {
    const withSort = (f: UploadedFile, i: number): RecoveryAttachmentPayload => ({
      ...f,
      sortOrder: i,
    });
    const documents = this.documents();
    return {
      ...this.buildPayload(),
      photos: this.photos().map(withSort),
      ...(documents.length ? { documents: documents.map(withSort) } : {}),
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
      const token = await this.tokenProvider();
      const res = await firstValueFrom(
        this.api.post<{ id: string; trackingNumber: string }>(
          'needs-forms/recovery',
          this.buildFullPayload(),
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

  // ── Edit mode (admin) — emit the full payload; parent owns PATCH /full ──

  /** Validate every field and emit the payload. `buildPayload()` already
   *  excludes photos/documents/consent, so PATCH /full leaves attachments and
   *  the consent snapshot untouched (replace-semantics only for damages). */
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
