import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocationSelectorComponent } from '../../../shared/components/location-selector/location-selector';
import { LocationValue } from '../../../shared/interfaces/location.interfaces';
import { ApiService } from '../../../core/services/api.service';
import { isPlatformBrowser } from '@angular/common';
import { QuillModule } from 'ngx-quill';
import { QUILL_MODULES } from '../../../shared/config/quill.config';

type EmploymentType = 'full_time' | 'part_time' | 'volunteer';
type VacancyStatus = 'draft' | 'published' | 'closed';

interface VacancyPayload {
  titleUa: string;
  titleEn: string;
  descriptionUa: string;
  descriptionEn: string;
  requirementsUa?: string;
  requirementsEn?: string;
  employmentType: EmploymentType;
  region?: string;
  regionEn?: string;
  district?: string;
  districtEn?: string;
  community?: string;
  communityEn?: string;
  communityCode?: string;
  settlement?: string;
  settlementEn?: string;
  settlementCode?: string;
  applicationDeadline?: string;
  salary?: string;
  publishedAt?: string;
  status: VacancyStatus;
}

@Component({
  selector: 'app-vacancy-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule, LocationSelectorComponent, QuillModule],
  template: `
    <div class="vf">
      <div class="vf__nav">
        <a routerLink=".." class="back-link">← {{ 'common.back' | translate }}</a>
      </div>

      <h2>
        {{ (isEdit ? 'vacancy.form.editTitle' : 'vacancy.form.createTitle') | translate }}
      </h2>

      <form [formGroup]="form" class="vf__form" novalidate>

        <!-- Title UA / EN -->
        <div class="form-row">
          <div class="form-field">
            <label>{{ 'vacancy.form.titleUa' | translate }} *</label>
            <input formControlName="titleUa" type="text" />
            @if (form.get('titleUa')?.invalid && form.get('titleUa')?.touched) {
              <span class="err">Required</span>
            }
          </div>
          <div class="form-field">
            <label>{{ 'vacancy.form.titleEn' | translate }} *</label>
            <input formControlName="titleEn" type="text" />
            @if (form.get('titleEn')?.invalid && form.get('titleEn')?.touched) {
              <span class="err">Required</span>
            }
          </div>
        </div>

        <!-- Employment type -->
        <div class="form-field">
          <label>{{ 'vacancy.form.employmentType' | translate }} *</label>
          <select formControlName="employmentType">
            @for (type of employmentTypes; track type) {
              <option [value]="type">
                {{ 'vacancy.employmentType.' + type | translate }}
              </option>
            }
          </select>
        </div>

        <!-- Description UA -->
        <div class="form-field">
          <label>{{ 'vacancy.form.descriptionUa' | translate }} *</label>
          @if (isBrowser) {
            <quill-editor formControlName="descriptionUa"
                          [modules]="quillModules"
                          [placeholder]="'vacancy.form.descriptionUa' | translate">
            </quill-editor>
          } @else {
            <textarea formControlName="descriptionUa" rows="5"></textarea>
          }
        </div>

        <!-- Description EN -->
        <div class="form-field">
          <label>{{ 'vacancy.form.descriptionEn' | translate }} *</label>
          @if (isBrowser) {
            <quill-editor formControlName="descriptionEn"
                          [modules]="quillModules"
                          placeholder="Job description...">
            </quill-editor>
          } @else {
            <textarea formControlName="descriptionEn" rows="5"></textarea>
          }
        </div>

        <!-- Requirements UA -->
        <div class="form-field">
          <label>{{ 'vacancy.form.requirementsUa' | translate }}</label>
          @if (isBrowser) {
            <quill-editor formControlName="requirementsUa"
                          [modules]="quillModules">
            </quill-editor>
          } @else {
            <textarea formControlName="requirementsUa" rows="4"></textarea>
          }
        </div>

        <!-- Requirements EN -->
        <div class="form-field">
          <label>{{ 'vacancy.form.requirementsEn' | translate }}</label>
          @if (isBrowser) {
            <quill-editor formControlName="requirementsEn"
                          [modules]="quillModules">
            </quill-editor>
          } @else {
            <textarea formControlName="requirementsEn" rows="4"></textarea>
          }
        </div>

        <!-- Location -->
        <div class="form-field">
          <label>{{ 'vacancy.detail.location' | translate }}</label>
          <app-location-selector
            formControlName="location"
            [isUa]="lang === 'ua'"
          />
        </div>

        <!-- Deadline + Salary -->
        <div class="form-row">
          <div class="form-field">
            <label>{{ 'vacancy.form.applicationDeadline' | translate }}</label>
            <input formControlName="applicationDeadline" type="date" />
          </div>
          <div class="form-field">
            <label>{{ 'vacancy.form.salary' | translate }}</label>
            <input
              formControlName="salary"
              type="text"
              [placeholder]="'vacancy.form.salaryPlaceholder' | translate"
            />
          </div>
        </div>

        <!-- Historical publication date -->
        <div class="form-field">
          <label>{{ 'vacancy.form.publishedAt' | translate }}</label>
          <input formControlName="publishedAt" type="date" />
        </div>

        <!-- Actions -->
        <div class="vf__actions">
          @if (error()) {
            <p class="err">{{ error() }}</p>
          }
          <button
            type="button"
            class="btn-secondary"
            [disabled]="saving()"
            (click)="submit('draft')"
          >
            {{ saving() ? ('common.saving' | translate) : ('vacancy.form.saveDraft' | translate) }}
          </button>
          <button
            type="button"
            class="btn-primary"
            [disabled]="saving() || form.get('titleUa')?.invalid || form.get('titleEn')?.invalid"
            (click)="submit('published')"
          >
            {{ saving() ? ('common.saving' | translate) : ('vacancy.form.publish' | translate) }}
          </button>
        </div>

      </form>
    </div>
  `,
  styles: [`
    .vf {
      max-width: 720px;
      &__nav { margin-bottom: 1.5rem; }
      h2 { font-size: 1.375rem; color: #1a365d; margin: 0 0 1.5rem; }
      &__form { display: flex; flex-direction: column; gap: 1.25rem; }
      &__actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        padding-top: 0.5rem;
      }
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      label { font-size: 0.875rem; font-weight: 500; color: #334155; }
      input, select, textarea {
        padding: 0.55rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
        font-family: inherit;
        &:focus { outline: none; border-color: #2b6cb0; box-shadow: 0 0 0 3px rgba(43,108,176,.1); }
      }
      textarea { resize: vertical; }
    }
    .err { color: #e53e3e; font-size: 0.8125rem; }
    .back-link { color: #4a5568; text-decoration: none; font-size: 0.875rem; }
    .btn-primary {
      padding: 0.5rem 1.25rem;
      background: #2b6cb0;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .btn-secondary {
      padding: 0.5rem 1.25rem;
      background: #fff;
      color: #4a5568;
      border: 1px solid #cbd5e0;
      border-radius: 6px;
      font-size: 0.9rem;
      cursor: pointer;
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
  `],
})
export class VacancyFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  protected saving = signal(false);
  protected error = signal<string | null>(null);
  protected isEdit = false;
  private editId: string | null = null;

  protected get lang(): string { return this.translate.currentLang ?? 'ua'; }

  protected readonly employmentTypes: EmploymentType[] = ['full_time', 'part_time', 'volunteer'];
  protected readonly isBrowser = isPlatformBrowser(this.platformId);
  protected readonly quillModules = QUILL_MODULES;

  protected form: FormGroup = this.fb.group({
    titleUa: ['', Validators.required],
    titleEn: ['', Validators.required],
    descriptionUa: ['', Validators.required],
    descriptionEn: ['', Validators.required],
    requirementsUa: [''],
    requirementsEn: [''],
    employmentType: ['full_time', Validators.required],
    location: [null],
    applicationDeadline: [''],
    salary: [''],
    publishedAt: [''],
  });

  ngOnInit(): void {
    this.editId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.editId;

    if (this.isEdit) {
      this.api
        .get<any>(`vacancies/${this.editId}`)
        .subscribe((v) => {
          this.form.patchValue({
            titleUa: v.titleUa,
            titleEn: v.titleEn,
            descriptionUa: v.descriptionUa,
            descriptionEn: v.descriptionEn,
            requirementsUa: v.requirementsUa ?? '',
            requirementsEn: v.requirementsEn ?? '',
            employmentType: v.employmentType,
            applicationDeadline: v.applicationDeadline
              ? v.applicationDeadline.substring(0, 10)
              : '',
            salary: v.salary ?? '',
            publishedAt: v.publishedAt ? v.publishedAt.substring(0, 10) : '',
            // Restore location from flat entity fields
            location: v.region
              ? {
                regionUa: v.region,
                regionEn: v.regionEn ?? '',
                districtUa: v.district ?? '',
                districtEn: v.districtEn ?? '',
                communityUa: v.community ?? '',
                communityEn: v.communityEn ?? '',
                communityCode: v.communityCode ?? '',
                settlementUa: v.settlement ?? '',
                settlementEn: v.settlementEn ?? '',
                settlementCode: v.settlementCode ?? '',
              }
              : null,
          });
        });
    }
  }

  protected submit(status: VacancyStatus): void {
    this.form.markAllAsTouched();

    if (status === 'published' &&
      (this.form.get('titleUa')?.invalid || this.form.get('titleEn')?.invalid)) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const loc = raw.location as LocationValue | null;

    const payload: VacancyPayload = {
      titleUa: raw.titleUa,
      titleEn: raw.titleEn,
      descriptionUa: raw.descriptionUa,
      descriptionEn: raw.descriptionEn,
      ...(raw.requirementsUa && { requirementsUa: raw.requirementsUa }),
      ...(raw.requirementsEn && { requirementsEn: raw.requirementsEn }),
      employmentType: raw.employmentType,
      // Map LocationValue → flat entity fields
      ...(loc && {
        region: loc.regionUa,
        regionEn: loc.regionEn,
        district: loc.districtUa || undefined,
        districtEn: loc.districtEn || undefined,
        community: loc.communityUa || undefined,
        communityEn: loc.communityEn || undefined,
        communityCode: loc.communityCode || undefined,
        settlement: loc.settlementUa || undefined,
        settlementEn: loc.settlementEn || undefined,
        settlementCode: loc.settlementCode || undefined,
      }),
      ...(raw.applicationDeadline && { applicationDeadline: raw.applicationDeadline }),
      ...(raw.salary && { salary: raw.salary }),
      ...(raw.publishedAt && { publishedAt: raw.publishedAt }),
      status,
    };

    const req$ = this.isEdit
      ? this.api.patch(`vacancies/${this.editId}`, payload)
      : this.api.post('vacancies', payload);

    req$.subscribe({
      next: () => this.router.navigate(['..'], { relativeTo: this.route }),
      error: () => {
        this.error.set('Error saving. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
