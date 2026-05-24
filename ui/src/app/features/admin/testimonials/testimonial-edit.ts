// ui/src/app/features/admin/testimonials/testimonial-edit.ts
import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LocationSelectorComponent } from '../../../shared/components/location-selector/location-selector';
import { LocationValue } from '../../../shared/interfaces/location.interfaces';
import {
  AssistanceType,
  ASSISTANCE_TYPES,
  TestimonialItem,
  TestimonialPhoto,
  TestimonialStatus,
} from '../../cooperation/testimonial/testimonial.interfaces';

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const COMPRESS_MAX_DIMENSION = 1920;

interface PresignedPostResponse {
  url: string;
  fields: Record<string, string>;
  publicUrl: string;
}

@Component({
  selector: 'app-admin-testimonial-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    LocationSelectorComponent,
  ],
  template: `
    <div class="edit">
      <div class="edit__nav">
        <a routerLink="/admin/testimonials" class="back-link">
          ← {{ isUa ? 'До списку' : 'Back to list' }}
        </a>
      </div>

      @if (loading()) {
        <div class="state">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
      } @else if (!form) {
        <div class="state">{{ isUa ? 'Відгук не знайдено' : 'Testimonial not found' }}</div>
      } @else {
        <h2>{{ isUa ? 'Редагування відгуку' : 'Edit testimonial' }}</h2>

        @if (errorMessage()) {
          <div class="banner banner-error">{{ errorMessage() }}</div>
        }

        <form [formGroup]="form" class="edit__form" novalidate>
          <div class="row">
            <div class="field">
              <label for="authorName">{{ isUa ? 'Автор' : 'Author' }} *</label>
              <input id="authorName" formControlName="authorName" type="text" />
            </div>
            <div class="field">
              <label for="organization">{{ isUa ? 'Організація' : 'Organization' }}</label>
              <input id="organization" formControlName="organization" type="text" />
            </div>
          </div>

          <div class="field">
            <label for="text">{{ isUa ? 'Текст' : 'Text' }} *</label>
            <textarea id="text" formControlName="text" rows="5"></textarea>
          </div>

          <div class="row">
            <div class="field">
              <label for="rating">{{ isUa ? 'Оцінка' : 'Rating' }}</label>
              <select id="rating" formControlName="rating">
                <option [ngValue]="0">{{ isUa ? 'Без оцінки' : 'No rating' }}</option>
                @for (n of [1, 2, 3, 4, 5]; track n) {
                  <option [ngValue]="n">{{ n }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="status">{{ isUa ? 'Статус' : 'Status' }}</label>
              <select id="status" formControlName="status">
                @for (s of statuses; track s) {
                  <option [ngValue]="s">{{ 'testimonial.status.' + s | translate }}</option>
                }
              </select>
            </div>
            <div class="field field--check">
              <label class="check">
                <input type="checkbox" formControlName="isVerified" />
                {{ isUa ? 'Верифіковано' : 'Verified' }}
              </label>
            </div>
          </div>

          <div class="field">
            <span class="field-label">{{ isUa ? 'Локація' : 'Location' }}</span>
            <app-location-selector formControlName="location" [isUa]="isUa" />
          </div>

          <!-- Assistance types -->
          <div class="field">
            <span class="field-label">{{ 'testimonial.form.assistanceTypes' | translate }}</span>
            <div class="checks">
              @for (a of assistanceTypes; track a) {
                <label class="check">
                  <input
                    type="checkbox"
                    [checked]="isAssistanceSelected(a)"
                    (change)="toggleAssistance(a)"
                  />
                  {{ 'testimonial.assistance.' + a | translate }}
                </label>
              }
            </div>
            @if (isAssistanceSelected(otherType)) {
              <input
                class="mt"
                type="text"
                [(ngModel)]="assistanceOther"
                [ngModelOptions]="{ standalone: true }"
                maxlength="255"
                [placeholder]="'testimonial.form.assistanceOtherPlaceholder' | translate"
              />
            }
          </div>

          <!-- Evidence photos -->
          <div class="field">
            <span class="field-label">{{ 'testimonial.form.evidence' | translate }}</span>
            @if (photos().length > 0) {
              <div class="photos">
                @for (p of photos(); track p.url; let i = $index) {
                  <div class="photo">
                    <img [src]="p.url" [alt]="p.name || ''" />
                    <button type="button" class="photo-remove" (click)="removePhoto(i)">✕</button>
                  </div>
                }
              </div>
            }
            @if (photos().length < maxPhotos) {
              <div class="photo-actions">
                <label class="upload-btn" [class.is-busy]="uploading()">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    (change)="onPhotoSelected($event)"
                    [disabled]="uploading()"
                    hidden
                  />
                  {{
                    uploading()
                      ? isUa
                        ? 'Завантаження...'
                        : 'Uploading...'
                      : ('testimonial.form.evidenceUpload' | translate)
                  }}
                </label>
                <div class="link-add">
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

          <div class="field">
            <label for="managerNotes">{{ isUa ? 'Примітки менеджера' : 'Manager notes' }}</label>
            <textarea id="managerNotes" formControlName="managerNotes" rows="3"></textarea>
          </div>

          <div class="actions">
            <a routerLink="/admin/testimonials" class="btn-sm">{{
              isUa ? 'Скасувати' : 'Cancel'
            }}</a>
            <button
              type="button"
              class="btn-primary"
              [disabled]="saving() || form.invalid"
              (click)="save()"
            >
              {{ saving() ? (isUa ? 'Збереження...' : 'Saving...') : isUa ? 'Зберегти' : 'Save' }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .edit {
        max-width: 720px;
      }
      .edit__nav {
        margin-bottom: 1.25rem;
      }
      .back-link {
        color: #4a5568;
        text-decoration: none;
        font-size: 0.875rem;
      }
      .edit h2 {
        font-size: 1.25rem;
        color: #1a365d;
        margin: 0 0 1.5rem;
      }
      .edit__form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .field--check {
        justify-content: flex-end;
      }
      .field label,
      .field-label {
        font-size: 0.85rem;
        font-weight: 500;
        color: #334155;
      }
      .field input[type='text'],
      .field input[type='url'],
      .field textarea,
      .field select {
        padding: 0.55rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
        font-family: inherit;
      }
      .field input:focus,
      .field textarea:focus,
      .field select:focus {
        outline: none;
        border-color: #2b6cb0;
        box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
      }
      textarea {
        resize: vertical;
      }
      .checks {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 0.5rem;
      }
      .check {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #2d3748;
        cursor: pointer;
      }
      .check input {
        width: auto;
      }
      .mt {
        margin-top: 0.5rem;
      }
      .photos {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
      }
      .photo {
        position: relative;
        width: 96px;
        height: 96px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #e2e8f0;
      }
      .photo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .photo-remove {
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
      }
      .photo-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
      }
      .upload-btn {
        display: inline-block;
        padding: 0.5rem 1rem;
        background: #edf2f7;
        border: 1px dashed #a0aec0;
        border-radius: 6px;
        font-size: 0.85rem;
        color: #2d3748;
        cursor: pointer;
      }
      .upload-btn.is-busy {
        opacity: 0.6;
        cursor: wait;
      }
      .link-add {
        display: flex;
        gap: 0.5rem;
        flex: 1;
        min-width: 240px;
      }
      .link-add input {
        flex: 1;
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
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding-top: 0.5rem;
      }
      .btn-sm {
        padding: 0.5rem 1rem;
        border: 1px solid #cbd5e0;
        background: #fff;
        border-radius: 6px;
        font-size: 0.85rem;
        cursor: pointer;
        text-decoration: none;
        color: #334155;
      }
      .btn-primary {
        padding: 0.5rem 1.25rem;
        background: #2b6cb0;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
      }
      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .state {
        text-align: center;
        padding: 3rem;
        color: #64748b;
      }
      .banner {
        padding: 0.6rem 1rem;
        border-radius: 6px;
        font-size: 0.85rem;
        margin-bottom: 1rem;
        border: 1px solid;
      }
      .banner-error {
        background: #fff5f5;
        color: #c53030;
        border-color: #fed7d7;
      }
      .err {
        color: #e53e3e;
        font-size: 0.8125rem;
      }
      @media (max-width: 640px) {
        .row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminTestimonialEditComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private platformId = inject(PLATFORM_ID);

  readonly statuses: TestimonialStatus[] = [
    TestimonialStatus.PENDING,
    TestimonialStatus.APPROVED,
    TestimonialStatus.REJECTED,
  ];
  readonly assistanceTypes = ASSISTANCE_TYPES;
  readonly otherType = AssistanceType.OTHER;
  readonly maxPhotos = MAX_PHOTOS;

  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');

  selectedAssistance = signal<AssistanceType[]>([]);
  assistanceOther = '';
  photos = signal<TestimonialPhoto[]>([]);
  uploading = signal(false);
  photoError = signal<string | null>(null);
  linkInput = '';

  private id!: string;

  // Built after data loads
  form!: FormGroup;

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      authorName: ['', Validators.required],
      organization: [''],
      text: ['', Validators.required],
      rating: [0],
      status: [TestimonialStatus.PENDING],
      isVerified: [false],
      managerNotes: [''],
      location: [null as LocationValue | null],
    });
  }

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    this.api.get<TestimonialItem>(`testimonials/${this.id}`).subscribe({
      next: (t) => {
        this.form = this.buildForm();
        this.form.patchValue({
          authorName: t.authorName,
          organization: t.organization ?? '',
          text: t.text,
          rating: t.rating ?? 0,
          status: t.status,
          isVerified: t.isVerified,
          managerNotes: t.managerNotes ?? '',
          location: this.toLocationValue(t),
        });
        this.selectedAssistance.set(t.assistanceTypes ?? []);
        this.assistanceOther = t.assistanceTypeOther ?? '';
        this.photos.set(t.photos ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private toLocationValue(t: TestimonialItem): LocationValue | null {
    if (!t.region && !t.regionEn) return null;
    return {
      regionUa: t.region ?? '',
      regionEn: t.regionEn ?? '',
      districtUa: t.district ?? '',
      districtEn: t.districtEn ?? '',
      communityUa: t.community ?? '',
      communityEn: t.communityEn ?? '',
      communityCode: t.communityCode ?? '',
      settlementUa: t.settlement ?? '',
      settlementEn: t.settlementEn ?? '',
      settlementCode: t.settlementCode ?? '',
    };
  }

  isAssistanceSelected(a: AssistanceType): boolean {
    return this.selectedAssistance().includes(a);
  }

  toggleAssistance(a: AssistanceType): void {
    this.selectedAssistance.update((list) =>
      list.includes(a) ? list.filter((x) => x !== a) : [...list, a],
    );
  }

  addLink(): void {
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

  removePhoto(index: number): void {
    this.photos.update((list) => list.filter((_, i) => i !== index));
  }

  async onPhotoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
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
      const res = await fetch(presigned.url, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
      this.photos.update((list) => [...list, { url: presigned.publicUrl, name: file.name }]);
    } catch {
      this.photoError.set(this.translate.instant('testimonial.form.evidenceUploadError'));
    } finally {
      this.uploading.set(false);
    }
  }

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

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const loc = raw.location as LocationValue | null;
    const assistance = this.selectedAssistance();

    const payload: Record<string, unknown> = {
      authorName: raw.authorName,
      organization: raw.organization || null,
      text: raw.text,
      rating: raw.rating && raw.rating > 0 ? raw.rating : null,
      status: raw.status,
      isVerified: raw.isVerified,
      managerNotes: raw.managerNotes || null,
      photos: this.photos(),
      assistanceTypes: assistance,
      assistanceTypeOther:
        assistance.includes(AssistanceType.OTHER) && this.assistanceOther.trim()
          ? this.assistanceOther.trim()
          : null,
      region: loc?.regionUa || null,
      regionEn: loc?.regionEn || null,
      district: loc?.districtUa || null,
      districtEn: loc?.districtEn || null,
      community: loc?.communityUa || null,
      communityEn: loc?.communityEn || null,
      communityCode: loc?.communityCode || null,
      settlement: loc?.settlementUa || null,
      settlementEn: loc?.settlementEn || null,
      settlementCode: loc?.settlementCode || null,
    };

    this.api.patch<TestimonialItem>(`testimonials/${this.id}`, payload).subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/admin/testimonials']);
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Error saving');
      },
    });
  }
}
