import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormArray,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocationSelectorComponent } from '../../../shared/components/location-selector/location-selector';
import { LocationValue } from '../../../shared/interfaces/location.interfaces';
import { environment } from '../../../../environments/environment';

type ComplaintCategory = 'service_quality' | 'staff_behavior' | 'corruption' | 'delay' | 'other';

@Component({
  selector: 'app-complaint-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, LocationSelectorComponent],
  template: `
    <div class="cf">

      @if (submitted()) {
        <div class="cf__success">
          ✅ {{ 'complaint.form.success' | translate }}
        </div>
      } @else {
        <div class="cf__header">
          <h2>{{ 'complaint.form.title' | translate }}</h2>
          <p class="cf__subtitle">{{ 'complaint.form.subtitle' | translate }}</p>
        </div>

        <form [formGroup]="form" class="cf__form" novalidate>

          <!-- Category -->
          <div class="form-field">
            <label>{{ 'complaint.form.category' | translate }} *</label>
            <select formControlName="category">
              <option value="" disabled>—</option>
              @for (cat of categories; track cat) {
                <option [value]="cat">
                  {{ 'complaint.category.' + cat | translate }}
                </option>
              }
            </select>
            @if (form.get('category')?.invalid && form.get('category')?.touched) {
              <span class="err">Required</span>
            }
          </div>

          <!-- Description -->
          <div class="form-field">
            <label>{{ 'complaint.form.description' | translate }} *</label>
            <textarea formControlName="description" rows="6"></textarea>
            @if (form.get('description')?.invalid && form.get('description')?.touched) {
              <span class="err">Required</span>
            }
          </div>

          <!-- Expected resolution -->
          <div class="form-field">
            <label>{{ 'complaint.form.expectedResolution' | translate }}</label>
            <textarea formControlName="expectedResolution" rows="3"></textarea>
          </div>

          <!-- Email (optional) -->
          <div class="form-field">
            <label>{{ 'complaint.form.email' | translate }}</label>
            <input formControlName="email" type="email" />
            <span class="hint">{{ 'complaint.form.emailHint' | translate }}</span>
            @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
              <span class="err">Invalid email</span>
            }
          </div>

          <!-- Location (optional) -->
          <div class="form-field">
            <label>{{ 'complaint.form.location' | translate }}</label>
            <app-location-selector
              formControlName="location"
              [isUa]="lang === 'ua'"
            />
          </div>

          <!-- Attachments (S3/Drive links) -->
          <div class="form-field">
            <label>{{ 'complaint.form.attachments' | translate }}</label>

            @for (ctrl of attachmentsArray.controls; track $index; let i = $index) {
              <div [formGroup]="asGroup(ctrl)" class="cf__attachment-row">
                <input
                  formControlName="name"
                  type="text"
                  [placeholder]="'complaint.form.attachmentName' | translate"
                />
                <input
                  formControlName="url"
                  type="url"
                  [placeholder]="'complaint.form.attachmentUrl' | translate"
                />
                <button type="button" class="btn-remove" (click)="removeAttachment(i)">✕</button>
              </div>
            }

            <button type="button" class="btn-add" (click)="addAttachment()">
              + {{ 'complaint.form.addAttachment' | translate }}
            </button>
          </div>

          <!-- Historical submission date -->
          <div class="form-field">
            <label>{{ 'complaint.form.submittedAt' | translate }}</label>
            <input formControlName="submittedAt" type="date" />
          </div>

          <!-- Actions -->
          <div class="cf__actions">
            @if (error()) {
              <p class="err">{{ error() }}</p>
            }
            <button
              type="button"
              class="btn-primary"
              [disabled]="saving() || form.invalid"
              (click)="submit()"
            >
              {{ saving() ? ('common.saving' | translate) : ('complaint.form.submit' | translate) }}
            </button>
          </div>

        </form>
      }
    </div>
  `,
  styles: [`
    .cf {
      max-width: 640px;
      &__header { margin-bottom: 1.5rem; }
      h2 { font-size: 1.375rem; color: #1a365d; margin: 0 0 0.25rem; }
      &__subtitle { color: #718096; font-size: 0.875rem; margin: 0; }
      &__form { display: flex; flex-direction: column; gap: 1.25rem; }
      &__attachment-row {
        display: grid;
        grid-template-columns: 1fr 2fr auto;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        align-items: center;
      }
      &__actions { display: flex; justify-content: flex-end; padding-top: 0.5rem; }
      &__success {
        padding: 1.25rem;
        background: #f0fff4;
        border: 1px solid #9ae6b4;
        border-radius: 8px;
        color: #276749;
        font-size: 0.9375rem;
      }
    }
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
    .hint { font-size: 0.8125rem; color: #a0aec0; }
    .err { color: #e53e3e; font-size: 0.8125rem; }
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
    .btn-add {
      padding: 0.375rem 0.875rem;
      background: #fff;
      border: 1px dashed #cbd5e0;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #4a5568;
      cursor: pointer;
      align-self: flex-start;
      &:hover { border-color: #2b6cb0; color: #2b6cb0; }
    }
    .btn-remove {
      padding: 0.375rem 0.625rem;
      background: none;
      border: 1px solid #fed7d7;
      border-radius: 6px;
      color: #e53e3e;
      cursor: pointer;
      font-size: 0.8125rem;
    }
    @media (max-width: 640px) {
      .cf__attachment-row { grid-template-columns: 1fr; }
    }
  `],
})
export class ComplaintFormComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private translate = inject(TranslateService);

  protected saving = signal(false);
  protected submitted = signal(false);
  protected error = signal<string | null>(null);

  protected get lang(): string { return this.translate.currentLang ?? 'ua'; }

  protected readonly categories: ComplaintCategory[] = [
    'service_quality',
    'staff_behavior',
    'corruption',
    'delay',
    'other',
  ];

  protected form = this.fb.group({
    category: ['' as ComplaintCategory | '', Validators.required],
    description: ['', Validators.required],
    expectedResolution: [''],
    email: ['', Validators.email],
    location: [null as LocationValue | null],
    submittedAt: [''],
    attachments: this.fb.array([]),
  });

  protected get attachmentsArray(): FormArray {
    return this.form.get('attachments') as FormArray;
  }

  // Template helper: cast AbstractControl to FormGroup for nested formGroup directive
  protected asGroup(ctrl: AbstractControl) {
    return ctrl as ReturnType<FormBuilder['group']>;
  }

  protected addAttachment(): void {
    this.attachmentsArray.push(
      this.fb.group({ name: [''], url: [''] }),
    );
  }

  protected removeAttachment(index: number): void {
    this.attachmentsArray.removeAt(index);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const loc = raw.location as LocationValue | null;

    // Filter out empty attachment rows
    const attachments = (raw.attachments as { name: string; url: string }[])
      .filter((a) => a.url.trim());

    const payload = {
      category: raw.category,
      description: raw.description,
      ...(raw.expectedResolution && { expectedResolution: raw.expectedResolution }),
      ...(raw.email && { email: raw.email }),
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
      ...(attachments.length && { attachments }),
      ...(raw.submittedAt && { submittedAt: raw.submittedAt }),
    };

    this.http.post(`${environment.apiUrl}/complaints`, payload).subscribe({
      next: () => this.submitted.set(true),
      error: () => {
        this.error.set('Error submitting. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
