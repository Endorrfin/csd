import { Component, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LocationSelectorComponent } from '../../../shared/components/location-selector/location-selector';
import { LocationValue } from '../../../shared/interfaces/location.interfaces';
import { ApiService } from '../../../core/services/api.service';
import { AssistanceType, ASSISTANCE_TYPES, TestimonialPhoto } from './testimonial.interfaces';

// Client-side guardrails (server re-enforces via presigned POST conditions)
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const COMPRESS_MAX_DIMENSION = 1920;

interface PresignedPostResponse {
  url: string;
  fields: Record<string, string>;
  publicUrl: string;
}

@Component({
  selector: 'app-testimonial-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    LocationSelectorComponent,
  ],
  template: `
    <div class="tf">
      <div class="tf__nav">
        <a routerLink=".." class="back-link">← {{ 'common.back' | translate }}</a>
      </div>

      @if (submitted()) {
        <div class="tf__success">✅ {{ 'testimonial.form.success' | translate }}</div>
      } @else {
        <h2>{{ 'testimonial.form.title' | translate }}</h2>

        <form [formGroup]="form" class="tf__form" novalidate>
          <!-- CHANGED: block order reworked (name → org → location → assistance → evidence → text → rating → date) -->

          <!-- 1. Author -->
          <div class="form-field">
            <label>{{ 'testimonial.form.authorName' | translate }} *</label>
            <input formControlName="authorName" type="text" />
            @if (form.get('authorName')?.invalid && form.get('authorName')?.touched) {
              <span class="err">Required</span>
            }
          </div>

          <!-- 2. Organization -->
          <div class="form-field">
            <label>{{ 'testimonial.form.organization' | translate }}</label>
            <input formControlName="organization" type="text" />
          </div>

          <!-- 3. Location (optional) -->
          <div class="form-field">
            <label>{{ 'testimonial.form.location' | translate }}</label>
            <app-location-selector formControlName="location" [isUa]="lang === 'ua'" />
          </div>

          <!-- 4. Assistance types (multi-select) -->
          <div class="form-field">
            <label>{{ 'testimonial.form.assistanceTypes' | translate }}</label>
            <div class="tf__checks">
              @for (a of assistanceTypes; track a) {
                <label class="tf__check">
                  <input
                    type="checkbox"
                    [checked]="isAssistanceSelected(a)"
                    (change)="toggleAssistance(a)"
                  />
                  <span>{{ 'testimonial.assistance.' + a | translate }}</span>
                </label>
              }
            </div>
            @if (isAssistanceSelected(otherType)) {
              <input
                class="tf__other"
                type="text"
                [(ngModel)]="assistanceOther"
                [ngModelOptions]="{ standalone: true }"
                [placeholder]="'testimonial.form.assistanceOtherPlaceholder' | translate"
                maxlength="255"
              />
            }
          </div>

          <!-- 5. Evidence photos (upload + link, max 3) -->
          <div class="form-field">
            <label>{{ 'testimonial.form.evidence' | translate }}</label>
            <p class="tf__hint">{{ 'testimonial.form.evidenceHint' | translate }}</p>

            @if (photos().length > 0) {
              <div class="tf__photos">
                @for (p of photos(); track p.url; let i = $index) {
                  <div class="tf__photo">
                    <img [src]="p.url" [alt]="p.name || 'evidence'" />
                    <button
                      type="button"
                      class="tf__photo-remove"
                      (click)="removePhoto(i)"
                      [attr.aria-label]="'common.delete' | translate"
                    >
                      ✕
                    </button>
                  </div>
                }
              </div>
            }

            @if (photos().length < maxPhotos) {
              <div class="tf__photo-actions">
                <label class="tf__upload-btn" [class.is-busy]="uploading()">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    (change)="onPhotoSelected($event)"
                    [disabled]="uploading()"
                    hidden
                  />
                  {{
                    uploading()
                      ? ('common.loading' | translate)
                      : ('testimonial.form.evidenceUpload' | translate)
                  }}
                </label>

                <div class="tf__link-add">
                  <input
                    type="url"
                    [(ngModel)]="linkInput"
                    [ngModelOptions]="{ standalone: true }"
                    [placeholder]="'testimonial.form.evidenceLinkPlaceholder' | translate"
                  />
                  <button type="button" class="btn-secondary" (click)="addLink()">
                    {{ 'testimonial.form.evidenceAddLink' | translate }}
                  </button>
                </div>
              </div>
            }
            @if (photoError()) {
              <span class="err">{{ photoError() }}</span>
            }
          </div>

          <!-- 6. Text -->
          <div class="form-field">
            <label>{{ 'testimonial.form.text' | translate }} *</label>
            <textarea formControlName="text" rows="5"></textarea>
            @if (form.get('text')?.invalid && form.get('text')?.touched) {
              <span class="err">Required</span>
            }
          </div>

          <!-- 7. Rating -->
          <div class="form-field">
            <label>{{ 'testimonial.form.rating' | translate }}</label>
            <div class="tf__stars">
              @for (n of [1, 2, 3, 4, 5]; track n) {
                <button
                  type="button"
                  class="tf__star"
                  [class.tf__star--active]="n <= (form.get('rating')?.value ?? 0)"
                  (click)="setRating(n)"
                >
                  ★
                </button>
              }
              @if (form.get('rating')?.value) {
                <button type="button" class="tf__star-clear" (click)="setRating(0)">✕</button>
              }
            </div>
          </div>

          <!-- 8. Testimonial date -->
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
              {{
                saving() ? ('common.saving' | translate) : ('testimonial.form.submit' | translate)
              }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .tf {
        max-width: 640px;
        &__nav {
          margin-bottom: 1.5rem;
        }
        h2 {
          font-size: 1.375rem;
          color: #1a365d;
          margin: 0 0 1.5rem;
        }
        &__form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
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
          &--active {
            color: #f6ad55;
          }
          &:hover {
            color: #f6ad55;
          }
        }
        &__star-clear {
          background: none;
          border: none;
          color: #a0aec0;
          cursor: pointer;
          font-size: 0.875rem;
          margin-left: 0.25rem;
        }
        &__actions {
          display: flex;
          justify-content: flex-end;
          padding-top: 0.5rem;
        }
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
        label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #334155;
        }
        input,
        textarea {
          padding: 0.55rem 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 6px;
          font-size: 0.9rem;
          font-family: inherit;
          &:focus {
            outline: none;
            border-color: #2b6cb0;
            box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
          }
        }
        textarea {
          resize: vertical;
        }
      }
      .tf__hint {
        font-size: 0.8125rem;
        color: #718096;
        margin: 0;
      }
      .tf__checks {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 0.5rem;
      }
      .tf__check {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 400;
        color: #2d3748;
        cursor: pointer;
        input {
          width: auto;
          margin: 0;
        }
      }
      .tf__other {
        margin-top: 0.5rem;
      }
      .tf__photos {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .tf__photo {
        position: relative;
        width: 96px;
        height: 96px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
      .tf__photo-remove {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 22px;
        height: 22px;
        border: none;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        cursor: pointer;
        font-size: 0.75rem;
        line-height: 1;
      }
      .tf__photo-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }
      .tf__upload-btn {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: #edf2f7;
        border: 1px dashed #a0aec0;
        border-radius: 6px;
        font-size: 0.85rem;
        color: #2d3748;
        cursor: pointer;
        &.is-busy {
          opacity: 0.6;
          cursor: wait;
        }
      }
      .tf__link-add {
        display: flex;
        gap: 0.5rem;
        flex: 1;
        min-width: 240px;
        input {
          flex: 1;
        }
      }
      .btn-secondary {
        padding: 0.5rem 0.75rem;
        background: #fff;
        color: #2b6cb0;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.85rem;
        cursor: pointer;
      }
      .err {
        color: #e53e3e;
        font-size: 0.8125rem;
      }
      .back-link {
        color: #4a5568;
        text-decoration: none;
        font-size: 0.875rem;
      }
      .btn-primary {
        padding: 0.5rem 1.25rem;
        background: #2b6cb0;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    `,
  ],
})
export class TestimonialFormComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  protected saving = signal(false);
  protected submitted = signal(false);
  protected error = signal<string | null>(null);

  // === assistance types state ===
  protected readonly assistanceTypes = ASSISTANCE_TYPES;
  protected readonly otherType = AssistanceType.OTHER;
  protected selectedAssistance = signal<AssistanceType[]>([]);
  protected assistanceOther = '';

  // === evidence photos state ===
  protected readonly maxPhotos = MAX_PHOTOS;
  protected photos = signal<TestimonialPhoto[]>([]);
  protected uploading = signal(false);
  protected photoError = signal<string | null>(null);
  protected linkInput = '';

  protected get lang(): string {
    return this.translate.currentLang ?? 'ua';
  }

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

  // === assistance type helpers ===
  protected isAssistanceSelected(a: AssistanceType): boolean {
    return this.selectedAssistance().includes(a);
  }

  protected toggleAssistance(a: AssistanceType): void {
    this.selectedAssistance.update((list) =>
      list.includes(a) ? list.filter((x) => x !== a) : [...list, a],
    );
  }

  // === add evidence by external link ===
  protected addLink(): void {
    const url = this.linkInput.trim();
    this.photoError.set(null);
    if (!url) return;
    if (!/^https?:\/\/.+/i.test(url)) {
      this.photoError.set(this.translate.instant('testimonial.form.evidenceLinkInvalid'));
      return;
    }
    if (this.photos().length >= MAX_PHOTOS) return;
    this.photos.update((list) => [...list, { url }]);
    this.linkInput = '';
  }

  protected removePhoto(index: number): void {
    this.photos.update((list) => list.filter((_, i) => i !== index));
  }

  // === upload a photo to S3 via presigned POST ===
  protected async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file
    if (!file) return;

    this.photoError.set(null);

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      this.photoError.set(this.translate.instant('testimonial.form.evidenceTypeError'));
      return;
    }
    if (this.photos().length >= MAX_PHOTOS) return;

    this.uploading.set(true);
    try {
      const prepared = await this.compress(file);
      if (prepared.size > MAX_PHOTO_BYTES) {
        this.photoError.set(this.translate.instant('testimonial.form.evidenceSizeError'));
        return;
      }

      const presigned = await firstValueFrom(
        this.api.post<PresignedPostResponse>('upload/testimonial-presigned', {
          contentType: prepared.type,
        }),
      );

      const formData = new FormData();
      Object.entries(presigned.fields).forEach(([k, v]) => formData.append(k, v));
      formData.append('file', prepared);

      const res = await fetch(presigned.url, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);

      this.photos.update((list) => [...list, { url: presigned.publicUrl, name: file.name }]);
    } catch {
      this.photoError.set(this.translate.instant('testimonial.form.evidenceUploadError'));
    } finally {
      this.uploading.set(false);
    }
  }

  // Resize large images client-side; returns original if not in browser,
  // for PNGs (keep transparency), or on any failure.
  private async compress(file: File): Promise<File> {
    if (!isPlatformBrowser(this.platformId) || file.type === 'image/png') {
      return file;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, COMPRESS_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
      if (scale === 1 && file.size <= MAX_PHOTO_BYTES) return file;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85),
      );
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
        type: 'image/jpeg',
      });
    } catch {
      return file;
    }
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(null);

    const raw = this.form.getRawValue();
    const loc = raw.location as LocationValue | null;

    const assistance = this.selectedAssistance();
    const otherText =
      assistance.includes(AssistanceType.OTHER) && this.assistanceOther.trim()
        ? this.assistanceOther.trim()
        : undefined;

    const payload = {
      authorName: raw.authorName!,
      ...(raw.organization && { organization: raw.organization }),
      text: raw.text!,
      ...(raw.rating && raw.rating > 0 && { rating: raw.rating }),
      ...(this.photos().length > 0 && { photos: this.photos() }),
      ...(assistance.length > 0 && { assistanceTypes: assistance }),
      ...(otherText && { assistanceTypeOther: otherText }),
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

    this.api.post('testimonials', payload).subscribe({
      next: () => this.submitted.set(true),
      error: () => {
        this.error.set('Error submitting. Please try again.');
        this.saving.set(false);
      },
    });
  }
}
