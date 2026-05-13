// ui/src/app/features/admin/about/sections/section-edit.ts
import {
  Component,
  PLATFORM_ID,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuillEditorComponent } from 'ngx-quill';
import { ApiService } from '../../../../core/services/api.service';
import { QUILL_MODULES } from '../../../../shared/config/quill.config';
import {
  AboutSection,
  AboutSectionKey,
  ALL_SECTION_KEYS,
  CreateAboutSectionDto,
  KeyFactItem,
  UpdateAboutSectionDto,
} from '../about.interfaces';

@Component({
  selector: 'app-admin-about-section-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, QuillEditorComponent],
  template: `
    <div class="form-header">
      <h2>
        {{
          isEditMode()
            ? ('about.admin.sections.editTitle' | translate)
            : ('about.admin.sections.createTitle' | translate)
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
    } @else if (!isEditMode() && availableKeys().length === 0) {
      <div class="empty">{{ 'about.admin.sections.allKeysUsed' | translate }}</div>
    } @else {
      <form (submit)="$event.preventDefault(); onSave()" class="form">
        <!-- KEY (immutable after creation) -->
        <div class="field">
          <label for="key">{{ 'about.admin.sections.keyLabel' | translate }} *</label>
          @if (isEditMode()) {
            <input id="key" type="text" [value]="key()" disabled />
            <small class="hint">{{ 'about.admin.sections.keyHint' | translate }}</small>
          } @else {
            <select
              id="key"
              [ngModel]="key()"
              (ngModelChange)="key.set($event)"
              name="key"
              required
            >
              @for (k of availableKeys(); track k) {
                <option [value]="k">
                  {{ k }} — {{ 'about.admin.sectionKey.' + k | translate }}
                </option>
              }
            </select>
          }
        </div>

        <!-- TITLES -->
        <div class="field">
          <label for="titleUa">{{ 'about.admin.sections.titleUa' | translate }} *</label>
          <input id="titleUa" type="text" [(ngModel)]="titleUa" name="titleUa" required />
        </div>

        <div class="field">
          <label for="titleEn">{{ 'about.admin.sections.titleEn' | translate }} *</label>
          <input id="titleEn" type="text" [(ngModel)]="titleEn" name="titleEn" required />
        </div>

        <!-- CONTENT UA (Quill, browser-only to avoid SSR errors) -->
        <div class="field">
          <label>{{ 'about.admin.sections.contentUa' | translate }}</label>
          @if (isBrowser) {
            <quill-editor
              [(ngModel)]="contentUa"
              [modules]="quillModules"
              name="contentUa"
              format="html"
              [styles]="{ height: '240px' }"
            />
          } @else {
            <div class="ssr-placeholder">{{ 'common.loading' | translate }}</div>
          }
        </div>

        <!-- CONTENT EN -->
        <div class="field">
          <label>{{ 'about.admin.sections.contentEn' | translate }}</label>
          @if (isBrowser) {
            <quill-editor
              [(ngModel)]="contentEn"
              [modules]="quillModules"
              name="contentEn"
              format="html"
              [styles]="{ height: '240px' }"
            />
          } @else {
            <div class="ssr-placeholder">{{ 'common.loading' | translate }}</div>
          }
        </div>

        <!-- KEY_FACTS metadata: visible ONLY when key === KEY_FACTS -->
        @if (isKeyFacts()) {
          <fieldset class="metadata-block">
            <legend>{{ 'about.admin.sections.metadataTitle' | translate }}</legend>

            @if (metadataItems.length === 0) {
              <p class="muted">
                {{
                  isUa
                    ? 'Поки немає жодного факту. Додайте перший нижче.'
                    : 'No facts yet. Add the first one below.'
                }}
              </p>
            }

            @for (item of metadataItems; track $index; let i = $index) {
              <div class="fact-row">
                <input
                  type="text"
                  [(ngModel)]="item.labelUa"
                  [name]="'factLabelUa_' + i"
                  [placeholder]="'about.admin.sections.factLabelUa' | translate"
                />
                <input
                  type="text"
                  [(ngModel)]="item.labelEn"
                  [name]="'factLabelEn_' + i"
                  [placeholder]="'about.admin.sections.factLabelEn' | translate"
                />
                <input
                  type="text"
                  [(ngModel)]="item.value"
                  [name]="'factValue_' + i"
                  [placeholder]="'about.admin.sections.factValue' | translate"
                />
                <button
                  type="button"
                  class="action-btn action-delete"
                  (click)="onRemoveFact(i)"
                  [title]="isUa ? 'Видалити' : 'Remove'"
                >
                  ✕
                </button>
              </div>
            }

            <button type="button" class="btn-secondary btn-add-fact" (click)="onAddFact()">
              {{ 'about.admin.sections.metadataAdd' | translate }}
            </button>
          </fieldset>
        }

        <!-- SORT ORDER & PUBLISH -->
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
            {{ 'about.admin.sections.isPublished' | translate }}
          </label>
        </div>

        <!-- ACTIONS -->
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
      .field input[type='text'],
      .field input[type='number'],
      .field select {
        padding: 0.55rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
        background: #fff;
      }
      .field input:disabled {
        background: #f8fafc;
        color: #64748b;
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
      .ssr-placeholder {
        padding: 1rem;
        background: #f8fafc;
        border: 1px dashed #cbd5e0;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 0.85rem;
      }
      .metadata-block {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem 1.25rem;
        background: #f8fafc;
        margin: 0;
      }
      .metadata-block legend {
        padding: 0 0.5rem;
        font-weight: 600;
        color: #1a365d;
        font-size: 0.9rem;
      }
      .muted {
        color: #64748b;
        font-size: 0.85rem;
        margin: 0.25rem 0 0.75rem;
      }
      .fact-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr auto;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        align-items: center;
      }
      .fact-row input {
        padding: 0.45rem 0.6rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 4px;
        font-size: 0.85rem;
        cursor: pointer;
        border: 1px solid transparent;
        background: transparent;
      }
      .action-delete {
        color: #c53030;
      }
      .action-delete:hover {
        background: #fff5f5;
        border-color: #fed7d7;
      }
      .btn-add-fact {
        margin-top: 0.5rem;
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
      .loading,
      .empty {
        text-align: center;
        padding: 2rem;
        color: #64748b;
        font-size: 0.95rem;
      }

      @media (max-width: 640px) {
        .fact-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminAboutSectionEditComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly quillModules = QUILL_MODULES;
  // CHANGED: Quill needs `document` — skip render during SSR pre-rendering pass
  readonly isBrowser = isPlatformBrowser(this.platformId);

  // ----- State -----
  id = signal<string | null>(null);
  loading = signal(false);
  saving = signal(false);
  errorMessage = signal('');

  // ----- Form fields -----
  key = signal<AboutSectionKey>('INTRO');
  titleUa = '';
  titleEn = '';
  contentUa: string | null = '';
  contentEn: string | null = '';
  isPublished = false;
  sortOrder = 0;
  // CHANGED: plain array (not signal) — keeps [(ngModel)] inside @for simple
  metadataItems: KeyFactItem[] = [];

  // ----- Computed -----
  isEditMode = computed(() => this.id() !== null);
  isKeyFacts = computed(() => this.key() === 'KEY_FACTS');

  private usedKeys = signal<Set<AboutSectionKey>>(new Set());
  availableKeys = computed(() =>
    ALL_SECTION_KEYS.filter((k) => !this.usedKeys().has(k)),
  );

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id.set(idParam);
      this.loadSection(idParam);
    } else {
      this.loadUsedKeys();
    }
  }

  private loadSection(id: string): void {
    this.loading.set(true);
    this.api.get<AboutSection>(`about/admin/sections/${id}`).subscribe({
      next: (s) => {
        this.key.set(s.key);
        this.titleUa = s.titleUa;
        this.titleEn = s.titleEn;
        this.contentUa = s.contentUa ?? '';
        this.contentEn = s.contentEn ?? '';
        this.isPublished = s.isPublished;
        this.sortOrder = s.sortOrder;
        this.metadataItems = s.metadata?.items ? [...s.metadata.items] : [];
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Failed to load section');
        this.loading.set(false);
      },
    });
  }

  // CHANGED: in create mode, fetch existing sections to exclude their keys from dropdown
  private loadUsedKeys(): void {
    this.loading.set(true);
    this.api.get<AboutSection[]>('about/admin/sections').subscribe({
      next: (list) => {
        this.usedKeys.set(new Set(list.map((s) => s.key)));
        const available = this.availableKeys();
        if (available.length > 0) {
          this.key.set(available[0]);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onAddFact(): void {
    this.metadataItems.push({ labelUa: '', labelEn: '', value: '' });
  }

  onRemoveFact(index: number): void {
    this.metadataItems.splice(index, 1);
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

    // CHANGED: only send metadata for KEY_FACTS sections; filter out empty rows
    const cleanedItems = this.metadataItems.filter(
      (it) => it.labelUa.trim() || it.labelEn.trim() || it.value.trim(),
    );
    const metadata =
      this.isKeyFacts() && cleanedItems.length > 0 ? { items: cleanedItems } : undefined;

    const basePayload = {
      titleUa: this.titleUa.trim(),
      titleEn: this.titleEn.trim(),
      contentUa: this.contentUa?.trim() || undefined,
      contentEn: this.contentEn?.trim() || undefined,
      isPublished: this.isPublished,
      sortOrder: this.sortOrder,
      metadata,
    };

    const request$ = this.isEditMode()
      ? this.api.patch<AboutSection>(
        `about/admin/sections/${this.id()}`,
        basePayload satisfies UpdateAboutSectionDto,
      )
      : this.api.post<AboutSection>('about/admin/sections', {
        key: this.key(),
        ...basePayload,
      } satisfies CreateAboutSectionDto);

    request$.subscribe({
      next: () => this.router.navigate(['/admin/about/sections']),
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err?.error?.message || 'Save failed');
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/admin/about/sections']);
  }
}
