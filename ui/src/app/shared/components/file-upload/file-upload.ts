// ui/src/app/shared/components/file-upload/file-upload.ts
// shared presigned-upload dropzone. Client validates
// type/size/count, then uploads each file SEQUENTIALLY to the PRIVATE bucket:
// tokenProvider() → POST upload/needs-presigned (x-turnstile-token) → direct S3
// POST. Emits {s3Key,originalName,mimeType,sizeBytes} for done files. Previews
// come from local object URLs (private bucket returns no public URL). ===
import { Component, EventEmitter, Input, OnDestroy, Output, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/services/language.service';

/** One uploaded file, shape expected by the recovery submit payload. */
export interface UploadedFile {
  s3Key: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

interface NeedsPresignedResponse {
  url: string;
  fields: Record<string, string>;
  s3Key: string;
}

type EntryStatus = 'pending' | 'uploading' | 'done' | 'error';

interface UploadEntry {
  id: string;
  file: File;
  name: string;
  sizeBytes: number;
  mimeType: string;
  previewUrl: string | null;
  status: EntryStatus;
  s3Key: string | null;
  error: string | null;
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  template: `
    <div class="fu">
      <div
        class="fu-drop"
        role="button"
        tabindex="0"
        (click)="picker.click()"
        (keydown.enter)="picker.click()"
        (keydown.space)="picker.click(); $event.preventDefault()"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
      >
        <input
          #picker
          type="file"
          class="fu-input"
          [accept]="acceptAttr"
          multiple
          hidden
          (change)="onPick($event)"
        />
        <span class="fu-drop-icon" aria-hidden="true">⬆</span>
        <span class="fu-drop-text">{{
          isUa()
            ? 'Перетягніть сюди або натисніть, щоб вибрати'
            : 'Drag & drop here or click to select'
        }}</span>
        <span class="fu-drop-hint">{{ isUa() ? hintUa : hintEn }}</span>
      </div>

      @if (globalError()) {
        <div class="fu-error">{{ globalError() }}</div>
      }

      @if (entries().length) {
        <ul class="fu-list">
          @for (e of entries(); track e.id) {
            <li class="fu-item" [class.is-error]="e.status === 'error'">
              <div class="fu-thumb">
                @if (e.previewUrl) {
                  <img [src]="e.previewUrl" [alt]="e.name" />
                } @else {
                  <span class="fu-file-ext">{{ ext(e.name) }}</span>
                }
              </div>
              <div class="fu-meta">
                <span class="fu-name" [title]="e.name">{{ e.name }}</span>
                <span class="fu-sub">
                  {{ size(e.sizeBytes) }}
                  @if (e.status === 'uploading') {
                    <span class="fu-muted">· {{ isUa() ? 'завантаження…' : 'uploading…' }}</span>
                  } @else if (e.status === 'done') {
                    <span class="fu-ok">· ✓ {{ isUa() ? 'готово' : 'done' }}</span>
                  } @else if (e.status === 'error') {
                    <span class="fu-bad">· {{ e.error }}</span>
                  }
                </span>
              </div>
              <div class="fu-actions">
                @if (e.status === 'error') {
                  <button type="button" class="fu-btn" (click)="retry(e.id)">
                    {{ isUa() ? 'Ще раз' : 'Retry' }}
                  </button>
                }
                <button
                  type="button"
                  class="fu-btn fu-btn-x"
                  [attr.aria-label]="isUa() ? 'Видалити' : 'Remove'"
                  (click)="remove(e.id)"
                >
                  ✕
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .fu-drop {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        padding: 1.5rem 1rem;
        border: 2px dashed #cbd5e0;
        border-radius: 10px;
        background: #f8fafc;
        cursor: pointer;
        text-align: center;
        transition:
          border-color 0.15s,
          background 0.15s;
      }
      .fu-drop:hover,
      .fu-drop:focus-visible {
        border-color: #2b6cb0;
        background: #ebf8ff;
        outline: none;
      }
      .fu-drop-icon {
        font-size: 1.4rem;
        color: #2b6cb0;
      }
      .fu-drop-text {
        font-size: 0.9rem;
        color: #334155;
        font-weight: 500;
      }
      .fu-drop-hint {
        font-size: 0.75rem;
        color: #64748b;
      }
      .fu-error {
        margin-top: 0.5rem;
        font-size: 0.8rem;
        color: #e53e3e;
      }
      .fu-list {
        list-style: none;
        margin: 0.75rem 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .fu-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #fff;
      }
      .fu-item.is-error {
        border-color: #fecaca;
        background: #fff5f5;
      }
      .fu-thumb {
        width: 44px;
        height: 44px;
        border-radius: 6px;
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
      }
      .fu-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .fu-file-ext {
        font-size: 0.7rem;
        font-weight: 700;
        color: #475569;
      }
      .fu-meta {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .fu-name {
        font-size: 0.85rem;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .fu-sub {
        font-size: 0.75rem;
        color: #64748b;
      }
      .fu-muted {
        color: #64748b;
      }
      .fu-ok {
        color: #38a169;
      }
      .fu-bad {
        color: #e53e3e;
      }
      .fu-actions {
        display: flex;
        gap: 0.35rem;
        flex-shrink: 0;
      }
      .fu-btn {
        border: 1px solid #cbd5e0;
        background: #fff;
        color: #334155;
        border-radius: 6px;
        padding: 0.25rem 0.6rem;
        font-size: 0.75rem;
        cursor: pointer;
      }
      .fu-btn:hover {
        background: #f8fafc;
      }
      .fu-btn-x {
        color: #e53e3e;
        padding: 0.25rem 0.5rem;
      }
    `,
  ],
})
export class FileUploadComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  protected readonly isUa = inject(LanguageService).isUa;

  @Input({ required: true }) kind: 'photo' | 'document' = 'photo';
  /** Supplies a fresh single-use Turnstile token per upload. */
  @Input({ required: true }) tokenProvider!: () => Promise<string>;
  @Input() max = 10;
  @Input() maxBytes = 5 * 1024 * 1024;
  @Input() accept: readonly string[] = [];
  @Input() hintUa = '';
  @Input() hintEn = '';

  /** Emits the current list of successfully uploaded files on every change. */
  @Output() changed = new EventEmitter<UploadedFile[]>();

  protected readonly entries = signal<UploadEntry[]>([]);
  protected readonly globalError = signal<string | null>(null);
  private idSeq = 0;
  private queueRunning = false;

  protected get acceptAttr(): string {
    return this.accept.join(',');
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(input.files);
    input.value = '';
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.addFiles(event.dataTransfer?.files ?? null);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private addFiles(list: FileList | null): void {
    if (!list) return;
    this.globalError.set(null);
    let count = this.entries().length;
    const additions: UploadEntry[] = [];
    for (const file of Array.from(list)) {
      if (count >= this.max) {
        this.globalError.set(
          this.isUa() ? `Максимум ${this.max} файлів` : `Maximum ${this.max} files`,
        );
        break;
      }
      if (this.accept.length && !this.accept.includes(file.type)) {
        this.globalError.set(
          this.isUa() ? `Непідтримуваний тип: ${file.name}` : `Unsupported type: ${file.name}`,
        );
        continue;
      }
      if (file.size > this.maxBytes) {
        this.globalError.set(
          this.isUa()
            ? `Файл "${file.name}" більший за ${this.mb(this.maxBytes)} МБ`
            : `"${file.name}" exceeds ${this.mb(this.maxBytes)} MB`,
        );
        continue;
      }
      additions.push(this.makeEntry(file));
      count++;
    }
    if (additions.length) {
      this.entries.update((arr) => [...arr, ...additions]);
      void this.runQueue();
    }
  }

  private makeEntry(file: File): UploadEntry {
    const isImage = file.type.startsWith('image/');
    return {
      id: `f${this.idSeq++}`,
      file,
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      previewUrl: isImage ? URL.createObjectURL(file) : null,
      status: 'pending',
      s3Key: null,
      error: null,
    };
  }

  /** Uploads pending entries one at a time (single Turnstile widget → serial). */
  private async runQueue(): Promise<void> {
    if (this.queueRunning) return;
    this.queueRunning = true;
    try {
      let next = this.entries().find((e) => e.status === 'pending');
      while (next) {
        this.patchEntry(next.id, { status: 'uploading', error: null });
        await this.uploadOne(next);
        next = this.entries().find((e) => e.status === 'pending');
      }
    } finally {
      this.queueRunning = false;
    }
  }

  private async uploadOne(entry: UploadEntry): Promise<void> {
    // 1) Fresh single-use Turnstile token (both guarded endpoints need one).
    let token: string;
    try {
      token = await this.tokenProvider();
    } catch (e) {
      this.failEntry(
        entry,
        'turnstile',
        0,
        this.isUa()
          ? 'Перевірку безпеки не пройдено (Turnstile). Оновіть сторінку.'
          : 'Security check failed (Turnstile). Refresh the page.',
        e,
      );
      return;
    }

    // 2) Backend presigned POST — guarded, so may 403 (Turnstile) / 500 (config).
    let presigned: NeedsPresignedResponse;
    try {
      presigned = await firstValueFrom(
        this.api.post<NeedsPresignedResponse>(
          'upload/needs-presigned',
          { kind: this.kind, contentType: entry.mimeType },
          { 'x-turnstile-token': token },
        ),
      );
    } catch (e) {
      const status = e instanceof HttpErrorResponse ? e.status : 0;
      this.failEntry(entry, 'presign', status, this.presignMessage(status), e);
      return;
    }

    // 3) Direct-to-S3 POST — may fail on CORS / bucket policy / signature.
    let res: Response;
    try {
      const formData = new FormData();
      Object.entries(presigned.fields).forEach(([k, v]) => formData.append(k, v));
      formData.append('file', entry.file);
      res = await fetch(presigned.url, { method: 'POST', body: formData });
    } catch (e) {
      // fetch rejects only on network / CORS failures (not on HTTP 4xx/5xx).
      this.failEntry(
        entry,
        's3-network',
        0,
        this.isUa()
          ? 'S3 недоступний — імовірно CORS або мережа.'
          : 'S3 unreachable — likely CORS or network.',
        e,
      );
      return;
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.failEntry(entry, 's3', res.status, this.s3Message(res.status, body), body);
      return;
    }

    this.patchEntry(entry.id, { status: 'done', s3Key: presigned.s3Key, error: null });
    this.emitChange();
  }

  /** Log the real failure (stage + HTTP status) and surface a specific message. */
  private failEntry(
    entry: UploadEntry,
    stage: string,
    status: number,
    uiMessage: string,
    detail: unknown,
  ): void {
    console.error(
      `[recovery-upload] "${entry.name}" (${this.kind}) failed at ${stage}` +
        (status ? ` — HTTP ${status}` : ''),
      detail,
    );
    this.patchEntry(entry.id, { status: 'error', error: uiMessage });
    this.emitChange();
  }

  private presignMessage(status: number): string {
    const ua = this.isUa();
    if (status === 403) {
      return ua
        ? 'Перевірку безпеки відхилено (403). Оновіть сторінку і спробуйте ще раз.'
        : 'Security check rejected (403). Refresh and retry.';
    }
    if (status === 400) {
      return ua
        ? 'Сервер відхилив файл (400 — тип або розмір).'
        : 'Server rejected the file (400 — type or size).';
    }
    if (status === 0) {
      return ua ? 'Сервер недоступний (мережа або CORS).' : 'Server unreachable (network or CORS).';
    }
    if (status >= 500) {
      return ua ? `Помилка сервера (${status}).` : `Server error (${status}).`;
    }
    return ua ? `Помилка завантаження (${status}).` : `Upload failed (${status}).`;
  }

  private s3Message(status: number, body: string): string {
    const ua = this.isUa();
    const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? '';
    const suffix = code ? ` · ${code}` : '';
    if (status === 403) {
      return ua ? `S3 відхилив файл (403${suffix}).` : `S3 rejected the file (403${suffix}).`;
    }
    if (status === 400) {
      return ua ? `S3: некоректний запит (400${suffix}).` : `S3 bad request (400${suffix}).`;
    }
    return ua ? `S3: помилка ${status}${suffix}.` : `S3 error ${status}${suffix}.`;
  }

  protected retry(id: string): void {
    this.patchEntry(id, { status: 'pending', error: null });
    void this.runQueue();
  }

  protected remove(id: string): void {
    const entry = this.entries().find((e) => e.id === id);
    if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl);
    this.entries.update((arr) => arr.filter((e) => e.id !== id));
    this.emitChange();
  }

  private patchEntry(id: string, patch: Partial<UploadEntry>): void {
    this.entries.update((arr) => arr.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  private emitChange(): void {
    const done = this.entries().filter((e) => e.status === 'done' && e.s3Key);
    this.changed.emit(
      done.map((e) => ({
        s3Key: e.s3Key as string,
        originalName: e.name,
        mimeType: e.mimeType,
        sizeBytes: e.sizeBytes,
      })),
    );
  }

  protected size(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} ${this.isUa() ? 'МБ' : 'MB'}`;
    return `${Math.max(1, Math.round(bytes / 1024))} ${this.isUa() ? 'КБ' : 'KB'}`;
  }

  protected ext(name: string): string {
    const dot = name.lastIndexOf('.');
    return dot >= 0
      ? name
          .slice(dot + 1)
          .toUpperCase()
          .slice(0, 4)
      : 'FILE';
  }

  private mb(bytes: number): number {
    return Math.round(bytes / 1024 / 1024);
  }

  ngOnDestroy(): void {
    for (const e of this.entries()) {
      if (e.previewUrl) URL.revokeObjectURL(e.previewUrl);
    }
  }
}
