// ui/src/app/features/admin/about/documents/document-edit.ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import {
  AboutDocument,
  AboutDocumentType,
  ALL_DOCUMENT_TYPES,
  CreateAboutDocumentDto,
  UpdateAboutDocumentDto,
} from '../about.interfaces';

@Component({
  selector: 'app-admin-about-document-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="form-header">
      <h2>
        {{
          isEditMode()
            ? ('about.admin.documents.editTitle' | translate)
            : ('about.admin.documents.createTitle' | translate)
        }}
      </h2>
      <a routerLink=".." class="btn-secondary">
        ← {{ 'about.admin.common.back' | translate }}
      </a>
    </div>

    @if (errorMessage()) {
      <div class="banner banner-error">{{ errorMessage() }}</div>
    }

    @if (loading()) {
      <div class="loading">{{ 'common.loading' | translate }}</div>
    } @else {
      <form (submit)="$event.preventDefault(); onSave()" class="form">
        <div class="row">
          <div class="field">
            <label for="documentType">
              {{ 'about.admin.documents.typeLabel' | translate }} *
            </label>
            <select
              id="documentType"
              [(ngModel)]="documentType"
              name="documentType"
              required
            >
              @for (t of allDocumentTypes; track t) {
                <option [value]="t">{{ 'about.admin.documentType.' + t | translate }}</option>
              }
            </select>
          </div>

          <div class="field">
            <label for="version">{{ 'about.admin.documents.versionLabel' | translate }}</label>
            <input
              id="version"
              type="text"
              [(ngModel)]="version"
              name="version"
              placeholder="v1.0"
            />
          </div>

          <div class="field">
            <label for="lastReviewDate">
              {{ 'about.admin.documents.lastReviewDateLabel' | translate }}
            </label>
            <input
              id="lastReviewDate"
              type="date"
              [(ngModel)]="lastReviewDate"
              name="lastReviewDate"
            />
          </div>
        </div>

        <div class="field">
          <label for="titleUa">{{ 'about.admin.documents.titleUa' | translate }} *</label>
          <input id="titleUa" type="text" [(ngModel)]="titleUa" name="titleUa" required />
        </div>

        <div class="field">
          <label for="titleEn">{{ 'about.admin.documents.titleEn' | translate }} *</label>
          <input id="titleEn" type="text" [(ngModel)]="titleEn" name="titleEn" required />
        </div>

        <div class="field">
          <label for="descriptionUa">
            {{ 'about.admin.documents.descriptionUa' | translate }}
          </label>
          <textarea
            id="descriptionUa"
            [(ngModel)]="descriptionUa"
            name="descriptionUa"
            rows="3"
          ></textarea>
        </div>

        <div class="field">
          <label for="descriptionEn">
            {{ 'about.admin.documents.descriptionEn' | translate }}
          </label>
          <textarea
            id="descriptionEn"
            [(ngModel)]="descriptionEn"
            name="descriptionEn"
            rows="3"
          ></textarea>
        </div>

        <div class="field">
          <label for="fileUrl">{{ 'about.admin.documents.fileUrlLabel' | translate }}</label>
          <input
            id="fileUrl"
            type="url"
            [(ngModel)]="fileUrl"
            name="fileUrl"
            placeholder="https://..."
          />
          <small class="hint">{{ 'about.admin.documents.fileUrlHint' | translate }}</small>
        </div>

        <div class="row">
          <div class="field">
            <label for="sortOrder">{{ 'about.admin.sections.sortOrder' | translate }}</label>
            <input
              id="sortOrder"
              type="number"
              [(ngModel)]="sortOrder"
              name="sortOrder"
              min="0"
            />
          </div>

          <label class="field-checkbox">
            <input type="checkbox" [(ngModel)]="isPublished" name="isPublished" />
            {{ 'about.admin.documents.isPublished' | translate }}
          </label>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" (click)="onCancel()">
            {{ 'about.admin.common.cancel' | translate }}
          </button>
          <button type="submit" class="btn-primary" [disabled]="saving()">
            @if (saving()) {
              {{ 'common.saving' | translate }}
            } @else {
              {{ 'about.admin.common.save' | translate }}
            }
          </button>
        </div>
      </form>
    }
  `,
  styles: [
    `
      .form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .form-header h2 {
        font-size: 1.2rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0;
      }
      .form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        max-width: 880px;
      }
      .row {
        display: flex;
        gap: 1.5rem;
        align-items: flex-end;
        flex-wrap: wrap;
      }
      .row .field {
        flex: 1;
        min-width: 200px;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }
      .field label {
        font-size: 0.85rem;
        font-weight: 500;
        color: #2d3748;
      }
      .field input,
      .field select,
      .field textarea {
        padding: 0.55rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
        background: #fff;
        font-family: inherit;
      }
      .field textarea {
        resize: vertical;
      }
      .hint {
        font-size: 0.75rem;
        color: #64748b;
      }
      .field-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #2d3748;
        cursor: pointer;
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding-top: 1rem;
        border-top: 1px solid #e2e8f0;
      }
      .btn-primary {
        background: #2b6cb0;
        color: #fff;
        padding: 0.6rem 1.5rem;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-primary:not(:disabled):hover {
        background: #2c5282;
      }
      .btn-secondary {
        background: #fff;
        color: #475569;
        padding: 0.5rem 1rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
      }
      .btn-secondary:hover {
        background: #f8fafc;
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
      .loading {
        text-align: center;
        padding: 2rem;
        color: #64748b;
      }
    `,
  ],
})
export class AdminAboutDocumentEditComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly allDocumentTypes = ALL_DOCUMENT_TYPES;

  // ----- State -----
  id = signal<string | null>(null);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  // ----- Form fields -----
  titleUa = '';
  titleEn = '';
  descriptionUa = '';
  descriptionEn = '';
  documentType: AboutDocumentType = 'POLICY';
  fileUrl = '';
  version = '';
  lastReviewDate = ''; // YYYY-MM-DD for native <input type="date">
  isPublished = false;
  sortOrder = 0;

  isEditMode = computed(() => this.id() !== null);

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id.set(idParam);
      this.loadDocument(idParam);
    }
  }

  private loadDocument(id: string): void {
    this.loading.set(true);
    this.api.get<AboutDocument>(`about/admin/documents/${id}`).subscribe({
      next: (d) => {
        this.titleUa = d.titleUa;
        this.titleEn = d.titleEn;
        this.descriptionUa = d.descriptionUa ?? '';
        this.descriptionEn = d.descriptionEn ?? '';
        this.documentType = d.documentType;
        this.fileUrl = d.fileUrl ?? '';
        this.version = d.version ?? '';
        // CHANGED: backend sends ISO date; trim to YYYY-MM-DD for date input
        this.lastReviewDate = d.lastReviewDate ? d.lastReviewDate.substring(0, 10) : '';
        this.isPublished = d.isPublished;
        this.sortOrder = d.sortOrder;
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to load document');
        this.loading.set(false);
      },
    });
  }

  onSave(): void {
    if (!this.titleUa.trim() || !this.titleEn.trim()) {
      this.errorMessage.set(
        this.isUa ? 'Заголовки UA та EN обов\'язкові' : 'UA and EN titles are required',
      );
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');

    // CHANGED: send undefined for empty optional fields (DTO IsOptional rules)
    const payload: CreateAboutDocumentDto = {
      titleUa: this.titleUa.trim(),
      titleEn: this.titleEn.trim(),
      descriptionUa: this.descriptionUa.trim() || undefined,
      descriptionEn: this.descriptionEn.trim() || undefined,
      documentType: this.documentType,
      fileUrl: this.fileUrl.trim() || undefined,
      version: this.version.trim() || undefined,
      lastReviewDate: this.lastReviewDate || undefined,
      isPublished: this.isPublished,
      sortOrder: this.sortOrder,
    };

    const request$ = this.isEditMode()
      ? this.api.patch<AboutDocument>(
        `about/admin/documents/${this.id()}`,
        payload satisfies UpdateAboutDocumentDto,
      )
      : this.api.post<AboutDocument>('about/admin/documents', payload);

    request$.subscribe({
      next: () => this.router.navigate(['/admin/about/documents']),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Save failed');
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/about/documents']);
  }
}
