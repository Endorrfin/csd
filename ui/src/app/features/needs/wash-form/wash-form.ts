// ui/src/app/features/needs/wash-form/wash-form.ts
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { LocationSelectorComponent } from '../../../shared/components/location-selector/location-selector';
import { LocationValue } from '../../../shared/interfaces/location.interfaces';
import { ApiService } from '../../../core/services/api.service';
import { TranslateService } from '@ngx-translate/core';
import {
  EquipmentCategory,
  EquipmentItem,
  CreateWashFormPayload,
  CreateBoreholePayload,
  CreateTowerPayload,
  CreatePurificationPayload,
  CreatePumpPayload,
  PumpPurpose,
  PUMP_PURPOSE_LABELS,
  getUnitLabel,
  WashFormDetail,
  UpdateWashFormFullPayload,
} from './wash-form.interfaces';
import {
  LucideAngularModule,
  Info,
  Building2,
  Drill,
  Waves,
  FlaskConical,
  Wrench,
  Boxes,
  ClipboardCheck,
  Check,
  Plus,
  X as XIcon,
  ChevronDown, // collapse/expand chevron.
  Search, // search input icon.
} from 'lucide-angular';

// decorator moved to templateUrl + styleUrl (Angular 17+ singular).
@Component({
  selector: 'app-wash-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationSelectorComponent, LucideAngularModule],
  templateUrl: './wash-form.html',
  styleUrl: './wash-form.scss',
})
export class WashFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }
  readonly getUnitLabel = getUnitLabel;

  readonly icons = {
    info: Info,
    object: Building2,
    borehole: Drill,
    tower: Waves,
    purification: FlaskConical,
    pump: Wrench,
    equipment: Boxes,
    review: ClipboardCheck,
    check: Check,
    plus: Plus,
    remove: XIcon,
    chevron: ChevronDown,
    search: Search,
  };

  /** exposed for template — pump purpose options. */
  readonly pumpPurposes: PumpPurpose[] = ['borehole', 'surface', 'drainage_sewage', 'other'];
  readonly PUMP_PURPOSE_LABELS = PUMP_PURPOSE_LABELS;

  currentStep = signal(0);
  submitted = signal(false);
  submitting = signal(false);
  submitError = signal(false);
  stepInvalid = signal(false);

  catalogLoading = signal(true);
  categories = signal<EquipmentCategory[]>([]);
  private itemsMap = new Map<string, EquipmentItem>();

  /** 'create' = public submit; 'edit' = admin edit, emits `saved` instead of POST. */
  @Input() mode: 'create' | 'edit' = 'create';

  /** Existing form to patch into reactive state when mode === 'edit'. */
  @Input() initialData: WashFormDetail | null = null;

  /** Parent's PATCH in-flight state — used to disable submit during save. */
  @Input() externalSaving = false;

  /** Fired in edit mode on submit — parent calls PATCH /full. */
  @Output() saved = new EventEmitter<UpdateWashFormFullPayload>();

  /** Fired when user clicks Cancel in edit mode. */
  @Output() cancelled = new EventEmitter<void>();

  // ══════════════════════════════════════════════════════════════
  // Equipment multi-select state (Task 5c)
  // ══════════════════════════════════════════════════════════════

  /** Map of selected equipment items: equipmentItemId → { quantity, notes }. */
  selectedEquipment = signal<Map<string, { quantity: number | null; notes: string }>>(new Map());

  /** Set of expanded category IDs. */
  expandedCategories = signal<Set<string>>(new Set());

  /** Global search query (filters visible items across all categories). */
  equipmentSearch = signal('');

  /**
   * 8 steps with semantic group colour and icon.
   * Groups: 'primary' (blue) | 'infra' (teal) | 'equipment' (amber) | 'review' (gray).
   * 4 infra steps use SVG icons from /assets/icons/activities/
   * (visual consistency with the public Activity Map sidebar).
   * Other steps keep lucide icons via `iconKey`.
   */
  steps = [
    {
      key: 'general',
      labelUa: 'Інфо',
      labelEn: 'Info',
      optional: false,
      group: 'primary',
      iconKey: 'info' as const,
      iconSrc: null,
    },
    {
      key: 'object',
      labelUa: 'Обʼєкт',
      labelEn: 'Object',
      optional: false,
      group: 'primary',
      iconKey: 'object' as const,
      iconSrc: null,
    },
    {
      key: 'borehole',
      labelUa: 'Буріння',
      labelEn: 'Borehole',
      optional: true,
      group: 'infra',
      iconKey: null,
      iconSrc: '/assets/icons/activities/borehole.svg',
    },
    {
      key: 'tower',
      labelUa: 'Башти',
      labelEn: 'Towers',
      optional: true,
      group: 'infra',
      iconKey: null,
      iconSrc: '/assets/icons/activities/water-tower.svg',
    },
    {
      key: 'purification',
      labelUa: 'Очищення',
      labelEn: 'Purify',
      optional: true,
      group: 'infra',
      iconKey: null,
      iconSrc: '/assets/icons/activities/purification-system.svg',
    },
    {
      key: 'pumps',
      labelUa: 'Насоси',
      labelEn: 'Pumps',
      optional: true,
      group: 'infra',
      iconKey: null,
      iconSrc: '/assets/icons/activities/pumps.svg',
    },
    {
      key: 'equipment',
      labelUa: 'Обладнання',
      labelEn: 'Equipment',
      optional: true,
      group: 'equipment',
      iconKey: 'equipment' as const,
      iconSrc: null,
    },
    {
      key: 'review',
      labelUa: 'Перевірка',
      labelEn: 'Review',
      optional: false,
      group: 'review',
      iconKey: 'review' as const,
      iconSrc: null,
    },
  ] as const;

  /**
   * in Task 5b: repeatable arrays for boreholes / towers /
   * purifications / pumps. Each starts empty — user clicks "+ Add" to
   * create the first entry.
   *
   * headPhone uses digits-only control (10 digits after +380).
   * Full submit concatenates '+380' + digits.
   */
  form: FormGroup = this.fb.group({
    location: [null, [Validators.required]],
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    headName: ['', [Validators.required, Validators.minLength(2)]],
    headPhoneDigits: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    objectName: ['', [Validators.required, Validators.minLength(2)]],
    dependentPopulation: [null, [Validators.required, Validators.min(1)]],
    socialFacilities: [''],
    installationDeadline: [''],
    replacementReason: ['', [Validators.required, Validators.minLength(10)]],
    boreholes: this.fb.array([] as FormGroup[]),
    towers: this.fb.array([] as FormGroup[]),
    purifications: this.fb.array([] as FormGroup[]),
    pumps: this.fb.array([] as FormGroup[]),
  });

  // typed accessors for new repeatable arrays.
  get boreholesArray(): FormArray {
    return this.form.get('boreholes') as FormArray;
  }
  get towersArray(): FormArray {
    return this.form.get('towers') as FormArray;
  }
  get purificationsArray(): FormArray {
    return this.form.get('purifications') as FormArray;
  }
  get pumpsArray(): FormArray {
    return this.form.get('pumps') as FormArray;
  }
  /** Convenience for template: FormGroup at index. */
  boreholeAt(i: number): FormGroup {
    return this.boreholesArray.at(i) as FormGroup;
  }
  towerAt(i: number): FormGroup {
    return this.towersArray.at(i) as FormGroup;
  }
  purificationAt(i: number): FormGroup {
    return this.purificationsArray.at(i) as FormGroup;
  }
  pumpAt(i: number): FormGroup {
    return this.pumpsArray.at(i) as FormGroup;
  }

  // ══════════════════════════════════════════════════════════════
  // Factory methods for repeatable rows
  // ══════════════════════════════════════════════════════════════

  /** validation ranges aligned with backend (7–50 / 1–800 / 1–30). */
  private createBoreholeGroup(): FormGroup {
    return this.fb.group({
      workType: ['', [Validators.required]],
      expectedFlowRate: [null, [Validators.required, Validators.min(7), Validators.max(50)]],
      hasAquiferInfo: [false],
      existingDepth: [null, [Validators.min(1), Validators.max(800)]],
      existingDebit: [null, [Validators.min(1), Validators.max(30)]],
      hasDesignInfo: [false],
      hasPassport: [false],
      oldLocation: [''],
      notes: [''],
    });
  }

  /** towerHeight now accepts '10' via template options. */
  private createTowerGroup(): FormGroup {
    return this.fb.group({
      towerType: ['', [Validators.required]],
      towerHeight: ['', [Validators.required]],
      customHeight: [null, [Validators.min(26)]],
      hasFoundation: [false],
      isFoundationSuitable: [false],
      needsFoundationReconstruction: [false],
      canSelfReconstruct: [false],
      canProvideCrane: [false],
      notes: [''],
    });
  }

  private createPurificationGroup(): FormGroup {
    return this.fb.group({
      hasRoom: [false],
      hasTemperatureControl: [false],
      hasWaterInletDrainage: [false],
      hasPowerSupply: [false],
      canMaintainSystem: [false],
      willingToProvideWater: [false],
      notes: [''],
    });
  }

  /** Pump — only purpose and quantity required; specs are free-form. */
  private createPumpGroup(): FormGroup {
    // build group then wire conditional validator on purposeOther
    const group = this.fb.group({
      purpose: ['', [Validators.required]],
      purposeOther: [''],
      brand: [''],
      model: [''],
      powerKw: [null],
      flowRateM3h: [null],
      headM: [null],
      diameterInches: [null],
      voltage: [''],
      phases: [null],
      quantity: [1, [Validators.required, Validators.min(1)]],
      notes: [''],
    });

    // purposeOther required only when purpose === 'other'
    group.get('purpose')!.valueChanges.subscribe((val) => {
      const otherCtrl = group.get('purposeOther')!;
      if (val === 'other') {
        otherCtrl.addValidators([Validators.required, Validators.minLength(2)]);
      } else {
        otherCtrl.clearValidators();
        otherCtrl.setValue('', { emitEvent: false });
      }
      otherCtrl.updateValueAndValidity();
    });

    return group;
  }

  // ══════════════════════════════════════════════════════════════
  // Add/remove handlers (template)
  // ══════════════════════════════════════════════════════════════

  addBorehole(): void {
    this.boreholesArray.push(this.createBoreholeGroup());
  }
  removeBorehole(i: number): void {
    this.boreholesArray.removeAt(i);
  }
  addTower(): void {
    this.towersArray.push(this.createTowerGroup());
  }
  removeTower(i: number): void {
    this.towersArray.removeAt(i);
  }
  addPurification(): void {
    this.purificationsArray.push(this.createPurificationGroup());
  }
  removePurification(i: number): void {
    this.purificationsArray.removeAt(i);
  }
  addPump(): void {
    this.pumpsArray.push(this.createPumpGroup());
  }
  removePump(i: number): void {
    this.pumpsArray.removeAt(i);
  }

  // ══════════════════════════════════════════════════════════════
  // Equipment accordion (Task 5c)
  // ══════════════════════════════════════════════════════════════

  /** Toggle a category's collapsed/expanded state. */
  toggleCategory(catId: string): void {
    this.expandedCategories.update((set) => {
      const next = new Set(set);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  isCategoryExpanded(catId: string): boolean {
    return this.expandedCategories().has(catId);
  }

  /** Checkbox handler for a single equipment item. */
  toggleItem(itemId: string): void {
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      if (next.has(itemId)) next.delete(itemId);
      else next.set(itemId, { quantity: null, notes: '' });
      return next;
    });
  }

  isItemSelected(itemId: string): boolean {
    return this.selectedEquipment().has(itemId);
  }

  getItemQuantity(itemId: string): number | null {
    return this.selectedEquipment().get(itemId)?.quantity ?? null;
  }

  setItemQuantity(itemId: string, value: string): void {
    const num = value === '' ? null : Number(value);
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      const entry = next.get(itemId);
      if (entry) next.set(itemId, { ...entry, quantity: num });
      return next;
    });
  }

  getItemNotes(itemId: string): string {
    return this.selectedEquipment().get(itemId)?.notes ?? '';
  }

  setItemNotes(itemId: string, value: string): void {
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      const entry = next.get(itemId);
      if (entry) next.set(itemId, { ...entry, notes: value });
      return next;
    });
  }

  /** Select every item in a category (pre-fills with qty=null for the user). */
  selectAllInCategory(cat: EquipmentCategory): void {
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      for (const item of this.filterCategoryItems(cat)) {
        if (!next.has(item.id)) next.set(item.id, { quantity: null, notes: '' });
      }
      return next;
    });
  }

  /** Remove every item in a category from selection. */
  clearCategory(cat: EquipmentCategory): void {
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      for (const item of cat.items) next.delete(item.id);
      return next;
    });
  }

  /** Items of a category matching the current global search. */
  filterCategoryItems(cat: EquipmentCategory): EquipmentItem[] {
    const q = this.equipmentSearch().toLowerCase().trim();
    if (!q) return cat.items;
    return cat.items.filter(
      (it) => it.nameUa.toLowerCase().includes(q) || it.nameEn.toLowerCase().includes(q),
    );
  }

  /** Count of matching items per category — used in the header badge. */
  categoryMatchCount(cat: EquipmentCategory): number {
    return this.filterCategoryItems(cat).length;
  }

  /** Count of selected items in a category — used in the header badge. */
  categorySelectedCount(cat: EquipmentCategory): number {
    const sel = this.selectedEquipment();
    return cat.items.filter((it) => sel.has(it.id)).length;
  }

  /** Total selected items count (shown in sticky header). */
  totalSelectedCount(): number {
    return this.selectedEquipment().size;
  }

  onEquipmentSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.equipmentSearch.set(val);
  }

  /** Lookup helper used by the review block. */
  getEquipmentItem(itemId: string): EquipmentItem | undefined {
    return this.itemsMap.get(itemId);
  }

  /** Phone digits helper — accepts only digits, max 10. */
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = digits;
    this.form.get('headPhoneDigits')?.setValue(digits, { emitEvent: false });
  }

  // 8 entries now. Index 5 (pumps) has no required fields.
  private stepFields: string[][] = [
    ['location', 'organizationName', 'headName', 'headPhoneDigits', 'email'],
    ['objectName', 'dependentPopulation', 'replacementReason'],
    [], // borehole
    [], // tower
    [], // purification
    [], // pumps
    [], // equipment
    [], // review
  ];

  ngOnInit(): void {
    this.loadCatalog();
    if (this.mode === 'edit' && this.initialData) {
      Promise.resolve().then(() => {
        this.patchFromInitialData(this.initialData!);
      });
    }
  }

  private loadCatalog(): void {
    this.api.get<EquipmentCategory[]>('equipment-catalog').subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.itemsMap.clear();
        for (const cat of cats) for (const item of cat.items) this.itemsMap.set(item.id, item);
        this.catalogLoading.set(false);
      },
      error: () => this.catalogLoading.set(false),
    });
  }

  // array-based section checks.
  isBoreholeFilled(): boolean {
    return this.boreholesArray.length > 0;
  }
  isWaterTowerFilled(): boolean {
    return this.towersArray.length > 0;
  }
  isPurificationFilled(): boolean {
    return this.purificationsArray.length > 0;
  }
  // new — pumps section.
  isPumpFilled(): boolean {
    return this.pumpsArray.length > 0;
  }
  hasEquipmentItems(): boolean {
    for (const entry of this.selectedEquipment().values()) {
      if (entry.quantity && entry.quantity > 0) return true;
    }
    return false;
  }
  hasAnySectionFilled(): boolean {
    return (
      this.isBoreholeFilled() ||
      this.isWaterTowerFilled() ||
      this.isPurificationFilled() ||
      this.isPumpFilled() ||
      this.hasEquipmentItems()
    );
  }

  /** Array of selected items with valid qty — used in submit and review. */
  getFilledEquipmentEntries(): {
    itemId: string;
    quantity: number;
    notes: string;
  }[] {
    const out: { itemId: string; quantity: number; notes: string }[] = [];
    for (const [itemId, entry] of this.selectedEquipment().entries()) {
      if (entry.quantity && entry.quantity > 0) {
        out.push({ itemId, quantity: entry.quantity, notes: entry.notes });
      }
    }
    return out;
  }

  // label helpers now accept the value as param — works for any index in a FormArray.
  getBoreholeWorkTypeLabel(value: string | null | undefined): string {
    if (!value) return '---';
    const m: Record<string, [string, string]> = {
      new_drilling: ['Буріння нової', 'New drilling'],
      repair_cleaning: ['Ремонт (чистка)', 'Repair (cleaning)'],
      new_near_existing: ['Нова поруч з існуючою', 'New near existing'],
    };
    return m[value] ? (this.isUa ? m[value][0] : m[value][1]) : '---';
  }
  getTowerTypeLabel(value: string | null | undefined): string {
    if (!value) return '---';
    const m: Record<string, [string, string]> = {
      vbr_15: ['ВБР-15 (15 м³)', 'VBR-15 (15 m³)'],
      vbr_25: ['ВБР-25 (25 м³)', 'VBR-25 (25 m³)'],
      vbr_50: ['ВБР-50 (50 м³)', 'VBR-50 (50 m³)'],
      vbr_over_50: ['ВБР понад 50 м³', 'VBR over 50 m³'],
    };
    return m[value] ? (this.isUa ? m[value][0] : m[value][1]) : '---';
  }
  getTowerHeightLabel(
    height: string | null | undefined,
    customHeight: number | null | undefined,
  ): string {
    if (!height) return '---';
    if (height === 'over_25') {
      return customHeight ? `${customHeight} m` : this.isUa ? 'Понад 25 м' : 'Over 25 m';
    }
    return `${height} m`;
  }
  getPumpPurposeLabel(value: PumpPurpose | null | undefined): string {
    if (!value) return '---';
    const labels = PUMP_PURPOSE_LABELS[value];
    return this.isUa ? labels.ua : labels.en;
  }

  /** Used by template for the AbstractControl type narrowing (no-op). */
  asFg(c: AbstractControl): FormGroup {
    return c as FormGroup;
  }

  isOptionalStep(): boolean {
    return this.steps[this.currentStep()]?.optional ?? false;
  }
  goToStep(s: number): void {
    if (s < this.currentStep()) this.currentStep.set(s);
  }
  nextStep(): void {
    if (this.validateCurrentStep()) {
      // clear invalid banner when moving forward.
      this.stepInvalid.set(false);
      this.currentStep.update((s) => Math.min(s + 1, this.steps.length - 1));
    }
  }
  skipStep(): void {
    this.currentStep.update((s) => Math.min(s + 1, this.steps.length - 1));
  }
  prevStep(): void {
    // clear invalid banner when navigating back.
    this.stepInvalid.set(false);
    this.currentStep.update((s) => Math.max(s - 1, 0));
  }

  /**
   * Mark all required fields of the current step as touched so validation
   * errors become visible. Also track the latest validation result for the
   * UI banner (see `stepInvalid`).
   */
  private validateCurrentStep(): boolean {
    const fields = this.stepFields[this.currentStep()];
    let valid = true;

    for (const f of fields) {
      const c = this.form.get(f);
      if (c) {
        c.markAsTouched();
        if ('controls' in c) {
          (c as FormGroup).markAllAsTouched();
        }
        if (c.invalid) valid = false;
      }
    }

    const arrayByStep: Record<number, FormArray> = {
      2: this.boreholesArray,
      3: this.towersArray,
      4: this.purificationsArray,
      5: this.pumpsArray,
    };
    const arr = arrayByStep[this.currentStep()];
    if (arr && arr.length > 0) {
      arr.markAllAsTouched();
      if (arr.invalid) valid = false;
    }

    this.stepInvalid.set(!valid);
    return valid;
  }

  showError(f: string): boolean {
    const c = this.form.get(f);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  showControlError(control: AbstractControl | null | undefined): boolean {
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  // ══════════════════════════════════════════════════════════════
  // NEW: hydrate form state from existing record (edit mode)
  // ══════════════════════════════════════════════════════════════
  private patchFromInitialData(d: WashFormDetail): void {
    // Reconstruct location object from flat fields. Empty strings keep
    // LocationSelector happy (it expects a populated object).
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
      headName: d.headName,
      headPhoneDigits: d.headPhone?.startsWith('+38') ? d.headPhone.slice(3) : (d.headPhone ?? ''),
      email: d.email,
      objectName: d.objectName,
      dependentPopulation: d.dependentPopulation,
      socialFacilities: d.socialFacilities ?? '',
      installationDeadline: d.installationDeadline ?? '',
      replacementReason: d.replacementReason,
    });

    // Repopulate FormArrays — clear() then push fresh groups.
    this.boreholesArray.clear();
    for (const b of d.boreholes ?? []) {
      const fg = this.createBoreholeGroup();
      fg.patchValue({
        workType: b.workType,
        expectedFlowRate: b.expectedFlowRate,
        hasAquiferInfo: b.hasAquiferInfo ?? false,
        existingDepth: b.existingDepth,
        existingDebit: b.existingDebit,
        hasDesignInfo: b.hasDesignInfo ?? false,
        hasPassport: b.hasPassport ?? false,
        oldLocation: b.oldLocation ?? '',
        notes: b.notes ?? '',
      });
      this.boreholesArray.push(fg);
    }

    this.towersArray.clear();
    for (const t of d.towers ?? []) {
      const fg = this.createTowerGroup();
      fg.patchValue({
        towerType: t.towerType,
        towerHeight: t.towerHeight,
        customHeight: t.customHeight,
        hasFoundation: t.hasFoundation,
        isFoundationSuitable: t.isFoundationSuitable,
        needsFoundationReconstruction: t.needsFoundationReconstruction,
        canSelfReconstruct: t.canSelfReconstruct,
        canProvideCrane: t.canProvideCrane,
        notes: t.notes ?? '',
      });
      this.towersArray.push(fg);
    }

    this.purificationsArray.clear();
    for (const p of d.purifications ?? []) {
      const fg = this.createPurificationGroup();
      fg.patchValue({
        hasRoom: p.hasRoom,
        hasTemperatureControl: p.hasTemperatureControl,
        hasWaterInletDrainage: p.hasWaterInletDrainage,
        hasPowerSupply: p.hasPowerSupply,
        canMaintainSystem: p.canMaintainSystem,
        willingToProvideWater: p.willingToProvideWater,
        notes: p.notes ?? '',
      });
      this.purificationsArray.push(fg);
    }

    this.pumpsArray.clear();
    for (const p of d.pumps ?? []) {
      const fg = this.createPumpGroup();
      fg.patchValue({
        purpose: p.purpose,
        purposeOther: p.purposeOther ?? '',
        brand: p.brand ?? '',
        model: p.model ?? '',
        powerKw: p.powerKw,
        flowRateM3h: p.flowRateM3h,
        headM: p.headM,
        diameterInches: p.diameterInches,
        voltage: p.voltage ?? '',
        phases: p.phases,
        quantity: p.quantity,
        notes: p.notes ?? '',
      });
      this.pumpsArray.push(fg);
    }

    // Equipment items → selectedEquipment Map. Сoerce quantity to number — backend returns NUMERIC as string
    const map = new Map<string, { quantity: number | null; notes: string }>();
    for (const it of d.items ?? []) {
      map.set(it.equipmentItemId, {
        quantity: it.quantity != null ? Number(it.quantity) : null,
        notes: it.notes ?? '',
      });
    }
    this.selectedEquipment.set(map);
  }

  // branch by mode — emit in edit, POST in create
  onSubmit(): void {
    if (this.submitting() || this.externalSaving || !this.hasAnySectionFilled()) return;

    const payload = this.buildPayload();

    if (this.mode === 'edit') {
      // Parent owns the PATCH /full call and any error/loading UX.
      this.saved.emit(payload);
      return;
    }

    // create mode — public submit (existing behaviour)
    this.submitting.set(true);
    this.submitError.set(false);
    this.api.post('needs-forms/wash', payload).subscribe({
      next: () => {
        this.submitted.set(true);
        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Submit error:', err);
        this.submitError.set(true);
        this.submitting.set(false);
      },
    });
  }

  // extracted from old onSubmit — same logic, both modes use it
  private buildPayload(): CreateWashFormPayload {
    const v = this.form.value;
    const loc: LocationValue | null = v.location;

    const payload: CreateWashFormPayload = {
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
      organizationName: v.organizationName,
      headName: v.headName,
      headPhone: `+38${v.headPhoneDigits}`,
      email: v.email,
      objectName: v.objectName,
      dependentPopulation: v.dependentPopulation,
      socialFacilities: v.socialFacilities || undefined,
      installationDeadline: v.installationDeadline || undefined,
      replacementReason: v.replacementReason,
    };

    // edit-mode replace-semantics — always send arrays (even if empty)
    // so backend can clear sections the user removed. In create mode we
    // optimise by sending only non-empty arrays.
    const sendEmpty = this.mode === 'edit';

    if (this.boreholesArray.length || sendEmpty) {
      payload.boreholes = this.boreholesArray.controls.map((c, idx): CreateBoreholePayload => {
        const bh = c.value;
        return {
          workType: bh.workType,
          expectedFlowRate: bh.expectedFlowRate,
          ...(bh.workType === 'new_near_existing'
            ? {
                hasAquiferInfo: bh.hasAquiferInfo ?? false,
                existingDepth: bh.existingDepth || undefined,
                existingDebit: bh.existingDebit || undefined,
                hasDesignInfo: bh.hasDesignInfo ?? false,
                hasPassport: bh.hasPassport ?? false,
                oldLocation: bh.oldLocation || undefined,
              }
            : {}),
          ...(bh.notes ? { notes: bh.notes } : {}),
          sortOrder: idx,
        };
      });
    }

    if (this.towersArray.length || sendEmpty) {
      payload.towers = this.towersArray.controls.map((c, idx): CreateTowerPayload => {
        const wt = c.value;
        return {
          towerType: wt.towerType,
          towerHeight: wt.towerHeight,
          hasFoundation: wt.hasFoundation ?? false,
          isFoundationSuitable: wt.isFoundationSuitable ?? false,
          needsFoundationReconstruction: wt.needsFoundationReconstruction ?? false,
          canSelfReconstruct: wt.canSelfReconstruct ?? false,
          canProvideCrane: wt.canProvideCrane ?? false,
          ...(wt.towerHeight === 'over_25' && wt.customHeight
            ? { customHeight: wt.customHeight }
            : {}),
          ...(wt.notes ? { notes: wt.notes } : {}),
          sortOrder: idx,
        };
      });
    }

    if (this.purificationsArray.length || sendEmpty) {
      payload.purifications = this.purificationsArray.controls.map(
        (c, idx): CreatePurificationPayload => {
          const ps = c.value;
          return {
            hasRoom: ps.hasRoom ?? false,
            hasTemperatureControl: ps.hasTemperatureControl ?? false,
            hasWaterInletDrainage: ps.hasWaterInletDrainage ?? false,
            hasPowerSupply: ps.hasPowerSupply ?? false,
            canMaintainSystem: ps.canMaintainSystem ?? false,
            willingToProvideWater: ps.willingToProvideWater ?? false,
            ...(ps.notes ? { notes: ps.notes } : {}),
            sortOrder: idx,
          };
        },
      );
    }

    if (this.pumpsArray.length || sendEmpty) {
      payload.pumps = this.pumpsArray.controls.map((c, idx): CreatePumpPayload => {
        const p = c.value;
        return {
          purpose: p.purpose,
          ...(p.purpose === 'other' && p.purposeOther ? { purposeOther: p.purposeOther } : {}),
          ...(p.brand ? { brand: p.brand } : {}),
          ...(p.model ? { model: p.model } : {}),
          ...(p.powerKw != null ? { powerKw: Number(p.powerKw) } : {}),
          ...(p.flowRateM3h != null ? { flowRateM3h: Number(p.flowRateM3h) } : {}),
          ...(p.headM != null ? { headM: Number(p.headM) } : {}),
          ...(p.diameterInches != null ? { diameterInches: Number(p.diameterInches) } : {}),
          ...(p.voltage ? { voltage: p.voltage } : {}),
          ...(p.phases != null ? { phases: Number(p.phases) } : {}),
          quantity: p.quantity ?? 1,
          ...(p.notes ? { notes: p.notes } : {}),
          sortOrder: idx,
        };
      });
    }

    const filled = this.getFilledEquipmentEntries();
    if (filled.length || sendEmpty) {
      payload.items = filled.map((e, idx) => ({
        equipmentItemId: e.itemId,
        quantity: e.quantity,
        ...(e.notes ? { notes: e.notes } : {}),
        sortOrder: idx,
      }));
    }

    return payload;
  }

  // cancel button handler (edit mode only)
  onCancel(): void {
    this.cancelled.emit();
  }

  resetForm(): void {
    this.form.reset();
    this.boreholesArray.clear();
    this.towersArray.clear();
    this.purificationsArray.clear();
    this.pumpsArray.clear();
    this.selectedEquipment.set(new Map());
    this.expandedCategories.set(new Set());
    this.equipmentSearch.set('');
    this.stepInvalid.set(false);
    this.currentStep.set(0);
    this.submitted.set(false);
    this.submitError.set(false);
  }
}
