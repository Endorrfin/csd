import { Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocationSelectorComponent } from '../../../shared/components/location-selector/location-selector';
import { LocationValue } from '../../../shared/interfaces/location.interfaces';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-testimonial-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule, LocationSelectorComponent],
  template: `
    <div class="tf">
      <div class="tf__nav">
        <a routerLink=".." class="back-link">← {{ 'common.back' | translate }}</a>
      </div>

      @if (submitted()) {
        <div class="tf__success">
          ✅ {{ 'testimonial.form.success' | translate }}
        </div>
      } @else {
        <h2>{{ 'testimonial.form.title' | translate }}</h2>

        <form [formGroup]="form" class="tf__form" novalidate>

          <!-- Author + Organization -->
          <div class="form-row">
            <div class="form-field">
              <label>{{ 'testimonial.form.authorName' | translate }} *</label>
              <input formControlName="authorName" type="text" />
              @if (form.get('authorName')?.invalid && form.get('authorName')?.touched) {
                <span class="err">Required</span>
              }
            </div>
            <div class="form-field">
              <label>{{ 'testimonial.form.organization' | translate }}</label>
              <input formControlName="organization" type="text" />
            </div>
          </div>

          <!-- Text -->
          <div class="form-field">
            <label>{{ 'testimonial.form.text' | translate }} *</label>
            <textarea formControlName="text" rows="5"></textarea>
            @if (form.get('text')?.invalid && form.get('text')?.touched) {
              <span class="err">Required</span>
            }
          </div>

          <!-- Rating -->
          <div class="form-field">
            <label>{{ 'testimonial.form.rating' | translate }}</label>
            <div class="tf__stars">
              @for (n of [1,2,3,4,5]; track n) {
                <button
                  type="button"
                  class="tf__star"
                  [class.tf__star--active]="n <= (form.get('rating')?.value ?? 0)"
                  (click)="setRating(n)"
                >★</button>
              }
              @if (form.get('rating')?.value) {
                <button type="button" class="tf__star-clear" (click)="setRating(0)">✕</button>
              }
            </div>
          </div>

          <!-- Location (optional) -->
          <div class="form-field">
            <label>{{ 'testimonial.form.location' | translate }}</label>
            <app-location-selector
              formControlName="location"
              [isUa]="lang === 'ua'"
            />
          </div>

          <!-- Historical date -->
          <div class="form-field">
            <label>{{ 'testimonial.form.publishedAt' | translate }}</label>
            <input formControlName="publishedAt" type="date" />
          </div>

          <!-- Actions -->
          <div class="tf__actions">
            @if (error()) {
              <p class="err">{{ error() }}</p>
            }
            <button
              type="button"
              class="btn-primary"
              [disabled]="saving() || form.invalid"
              (click)="submit()"
            >
              {{ saving() ? ('common.saving' | translate) : ('testimonial.form.submit' | translate) }}
            </button>
          </div>

        </form>
      }
    </div>
  `,
  styles: [`
    .tf {
      max-width: 640px;
      &__nav { margin-bottom: 1.5rem; }
      h2 { font-size: 1.375rem; color: #1a365d; margin: 0 0 1.5rem; }
      &__form { display: flex; flex-direction: column; gap: 1.25rem; }
      &__stars {
        display: flex;
        gap: 0.25rem;
        align-items: center;
      }
      &__star {
        font-size: 1.75rem;
        background: none;
        border: none;
        color: #e2e8f0;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        transition: color 0.1s;
        &--active { color: #f6ad55; }
        &:hover { color: #f6ad55; }
      }
      &__star-clear {
        background: none;
        border: none;
        color: #a0aec0;
        cursor: pointer;
        font-size: 0.875rem;
        margin-left: 0.25rem;
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
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      label { font-size: 0.875rem; font-weight: 500; color: #334155; }
      input, textarea {
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
    @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
  `],
})
export class TestimonialFormComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);

  protected saving = signal(false);
  protected submitted = signal(false);
  protected error = signal<string | null>(null);

  protected get lang(): string { return this.translate.currentLang ?? 'ua'; }

  protected form = this.fb.group({
    authorName: ['', Validators.required],
    organization: [''],
    text: ['', Validators.required],
    rating: [0],
    location: [null as LocationValue | null],
    publishedAt: [''],
  });

  protected setRating(n: number): void {
    this.form.get('rating')!.setValue(n);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const loc = raw.location as LocationValue | null;

    const payload = {
      authorName: raw.authorName!,
      ...(raw.organization && { organization: raw.organization }),
      text: raw.text!,
      ...(raw.rating && raw.rating > 0 && { rating: raw.rating }),
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
      ...(raw.publishedAt && { publishedAt: raw.publishedAt }),
    };

    this.http.post(`${environment.apiUrl}/testimonials`, payload).subscribe({
      next: () => this.submitted.set(true),
      error: () => {
        this.error.set('Error submitting. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
