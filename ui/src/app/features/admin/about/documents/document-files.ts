// ui/src/app/features/admin/about/documents/document-files.ts
// PR-D2 — language/version variants of one registry document.
// Upload path mirrors ui/src/app/shared/components/file-upload/file-upload.ts
// (presigned POST → direct-to-S3 POST → echo the key back), but hits the ADMIN
// endpoint instead of the Turnstile-guarded needs one, and attaches exactly one
// file per (locale, version) rather than a multi-file dropzone. ===
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../../core/services/api.service';
import { LanguageService } from '../../../../core/services/language.service';
import {
  AboutDocumentFile,
  AboutDocumentLocale,
  ALL_DOCUMENT_LOCALES,
  CreateAboutDocumentFileDto,
} from '../about.interfaces';

interface PresignedResponse {
  url: string;
  fields: Record<string, string>;
  s3Key: string;
}

// Must stay in sync with backend ABOUT_DOCUMENT_MAX_BYTES / ABOUT_DOCUMENT_MIME_TYPES.
// The S3 POST policy is the real gate; this check only spares the user a round trip.
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED_MIME = 'application/pdf';
const VERSION_PATTERN = /^v\d{1,3}$/;

@Component({
  selector: 'app-admin-about-document-files',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <section class="files">
      <h3>{{ 'about.admin.files.heading' | translate }}</h3>

      @if (errorMessage()) {
        <div class="banner banner-error">{{ errorMessage() }}</div>
      }

      <div class="upload-row">
        <div class="field">
          <label for="fileLocale">{{ 'about.admin.files.locale' | translate }}</label>
          <select id="fileLocale" [(ngModel)]="locale" name="fileLocale" [disabled]="busy()">
            @for (loc of allLocales; track loc) {
              <option [value]="loc">{{ loc.toUpperCase() }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="fileVersion">{{ 'about.admin.files.version' | translate }}</label>
          <input
            id="fileVersion"
            type="text"
            [(ngModel)]="version"
            name="fileVersion"
            placeholder="v1"
            [disabled]="busy()"
          />
        </div>

        <div class="field field-grow">
          <label for="filePicker">{{ 'about.admin.files.pick' | translate }}</label>
          <input
            #picker
            id="filePicker"
            type="file"
            accept="application/pdf"
            [disabled]="busy()"
            (change)="onPick($event, picker)"
          />
          <small class="hint">{{ 'about.admin.files.pickHint' | translate }}</small>
        </div>
      </div>

      @if (busy()) {
        <div class="progress">{{ 'about.admin.files.uploading' | translate }}</div>
      }

      @if (loading()) {
        <div class="muted">{{ 'common.loading' | translate }}</div>
      } @else if (files().length === 0) {
        <div class="muted">{{ 'about.admin.files.empty' | translate }}</div>
      } @else {
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ 'about.admin.files.locale' | translate }}</th>
              <th>{{ 'about.admin.files.version' | translate }}</th>
              <th>{{ 'about.admin.files.name' | translate }}</th>
              <th>{{ 'about.admin.files.size' | translate }}</th>
              <th>{{ 'about.admin.files.current' | translate }}</th>
              <th class="th-actions">{{ 'about.admin.documents.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (file of files(); track file.id) {
              <tr>
                <td>{{ file.locale.toUpperCase() }}</td>
                <td>{{ file.version }}</td>
                <td class="td-name" [title]="file.originalName">{{ file.originalName }}</td>
                <td>{{ formatSize(file.sizeBytes) }}</td>
                <td>
                  @if (file.isCurrent) {
                    <span class="badge badge-current">✓</span>
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
                <td class="td-actions">
                  <button type="button" class="btn-link" (click)="openFile(file)">
                    {{ 'about.admin.files.open' | translate }}
                  </button>
                  <button
                    type="button"
                    class="btn-link btn-danger"
                    [disabled]="busy()"
                    (click)="removeFile(file)"
                  >
                    {{ 'about.admin.common.delete' | translate }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: [
    `
      .files {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e2e8f0;
      }
      .files h3 {
        margin: 0 0 1rem;
        font-size: 1.1rem;
        font-weight: 600;
        color: #1a365d;
      }
      .banner-error {
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        border-radius: 6px;
        background: #fff5f5;
        border: 1px solid #fed7d7;
        color: #c53030;
        font-size: 0.9rem;
      }
      .upload-row {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
        align-items: flex-start;
        margin-bottom: 1rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .field-grow {
        flex: 1 1 260px;
      }
      .field label {
        font-size: 0.85rem;
        font-weight: 500;
        color: #4a5568;
      }
      .field select,
      .field input {
        padding: 0.5rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
      }
      .hint {
        font-size: 0.78rem;
        color: #718096;
      }
      .progress {
        margin-bottom: 1rem;
        font-size: 0.9rem;
        color: #2b6cb0;
      }
      .muted {
        color: #a0aec0;
        font-size: 0.9rem;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.9rem;
      }
      .data-table th,
      .data-table td {
        padding: 0.5rem 0.6rem;
        border-bottom: 1px solid #edf2f7;
        text-align: left;
      }
      .data-table th {
        font-weight: 600;
        color: #4a5568;
      }
      .td-name {
        max-width: 320px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .th-actions,
      .td-actions {
        text-align: right;
        white-space: nowrap;
      }
      .badge-current {
        color: #2f855a;
        font-weight: 700;
      }
      .btn-link {
        appearance: none;
        border: 0;
        background: none;
        padding: 0 0.4rem;
        font: inherit;
        font-size: 0.85rem;
        color: #2b6cb0;
        cursor: pointer;
      }
      .btn-link:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .btn-danger {
        color: #c53030;
      }
    `,
  ],
})
export class DocumentFilesComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly isUa = inject(LanguageService).isUa;

  @Input({ required: true }) documentId!: string;
  /** Register code — only used to prefill the S3 key on the backend, shown for context. */
  @Input({ required: true }) code!: string;
  @Input() defaultVersion = 'v1';

  /** Emitted after any change so the parent can refresh its own view of the document. */
  @Output() filesChanged = new EventEmitter<AboutDocumentFile[]>();

  readonly allLocales = ALL_DOCUMENT_LOCALES;

  locale: AboutDocumentLocale = 'ua';
  version = 'v1';

  files = signal<AboutDocumentFile[]>([]);
  loading = signal(false);
  busy = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    this.version = VERSION_PATTERN.test(this.defaultVersion) ? this.defaultVersion : 'v1';
    this.loadFiles();
  }

  onPick(event: Event, picker: HTMLInputElement): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    // Reset the input so picking the same file twice still fires (change).
    void this.upload(file).finally(() => (picker.value = ''));
  }

  openFile(file: AboutDocumentFile): void {
    this.api.get<{ url: string }>(`about/admin/files/${file.id}/url`).subscribe({
      next: (res) => window.open(res.url, '_blank', 'noopener'),
      error: (err: unknown) => this.errorMessage.set(this.apiMessage(err)),
    });
  }

  removeFile(file: AboutDocumentFile): void {
    // Deleting the row does NOT delete the S3 object — see AboutService.removeDocument.
    if (!confirm(this.isUa() ? 'Видалити файл?' : 'Delete this file?')) {
      return;
    }
    this.busy.set(true);
    this.api.delete<void>(`about/admin/files/${file.id}`).subscribe({
      next: () => {
        this.busy.set(false);
        this.loadFiles();
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.errorMessage.set(this.apiMessage(err));
      },
    });
  }

  formatSize(bytes: number): string {
    return `${Math.round(bytes / 1024)} KB`;
  }

  // ----- internals -----

  private loadFiles(): void {
    this.loading.set(true);
    this.api.get<AboutDocumentFile[]>(`about/admin/documents/${this.documentId}/files`).subscribe({
      next: (list) => {
        this.files.set(list);
        this.loading.set(false);
        this.filesChanged.emit(list);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.apiMessage(err));
      },
    });
  }

  private async upload(file: File): Promise<void> {
    this.errorMessage.set('');

    if (file.type !== ACCEPTED_MIME) {
      this.errorMessage.set(this.isUa() ? 'Дозволено лише PDF' : 'Only PDF files are allowed');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.errorMessage.set(
        this.isUa()
          ? `Файл завеликий: ${this.formatSize(file.size)}, ліміт 4096 KB`
          : `File too large: ${this.formatSize(file.size)}, limit is 4096 KB`,
      );
      return;
    }
    if (!VERSION_PATTERN.test(this.version)) {
      this.errorMessage.set(
        this.isUa() ? 'Версія має виглядати як v1' : 'Version must look like v1',
      );
      return;
    }

    this.busy.set(true);
    try {
      // 1) presigned POST from our API (JWT + ADMIN role)
      const presigned = await firstValueFrom(
        this.api.post<PresignedResponse>('upload/about-doc-presigned', {
          code: this.code,
          locale: this.locale,
          version: this.version,
          contentType: ACCEPTED_MIME,
        }),
      );

      // 2) direct-to-S3 POST — `file` MUST be the last field of the form
      const formData = new FormData();
      Object.entries(presigned.fields).forEach(([k, v]) => formData.append(k, v));
      formData.append('file', file);

      let res: Response;
      try {
        res = await fetch(presigned.url, { method: 'POST', body: formData });
      } catch (e) {
        // fetch rejects only on network / CORS failures, never on HTTP 4xx.
        console.error(`[about-doc-upload] ${this.code} ${this.locale}: S3 unreachable`, e);
        this.errorMessage.set(
          this.isUa()
            ? 'S3 недоступний — імовірно CORS або мережа.'
            : 'S3 unreachable — likely CORS or network.',
        );
        return;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`[about-doc-upload] ${this.code} ${this.locale}: S3 ${res.status}`, body);
        this.errorMessage.set(this.s3Message(body));
        return;
      }

      // 3) attach — the backend re-derives the expected prefix from the document code
      const payload: CreateAboutDocumentFileDto = {
        locale: this.locale,
        version: this.version,
        s3Key: presigned.s3Key,
        originalName: file.name.slice(0, 255),
        mimeType: ACCEPTED_MIME,
        sizeBytes: file.size,
      };
      await firstValueFrom(
        this.api.post<AboutDocumentFile>(`about/admin/documents/${this.documentId}/files`, payload),
      );

      this.loadFiles();
    } catch (err: unknown) {
      this.errorMessage.set(this.apiMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  /** The S3 POST policy rejects size/type before the bytes are stored — say which. */
  private s3Message(body: string): string {
    const ua = this.isUa();
    if (body.includes('EntityTooLarge')) {
      return ua
        ? 'S3 відхилив файл: перевищено ліміт 4096 KB.'
        : 'S3 rejected the file: the 4096 KB limit was exceeded.';
    }
    if (body.includes('AccessDenied') || body.includes('SignatureDoesNotMatch')) {
      return ua
        ? 'S3 відхилив підпис — посилання застаріло. Спробуйте ще раз.'
        : 'S3 rejected the signature — the link expired. Try again.';
    }
    return ua ? 'S3 відхилив завантаження.' : 'S3 rejected the upload.';
  }

  private apiMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const message: unknown = err.error?.message;
      if (typeof message === 'string') {
        return message;
      }
      if (Array.isArray(message)) {
        return message.join(', ');
      }
    }
    return this.isUa() ? 'Помилка запиту' : 'Request failed';
  }
}
