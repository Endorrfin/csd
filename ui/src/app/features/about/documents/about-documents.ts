// PR-D3 — "About us → Documents" sub-tab.
// The registry used to render at the bottom of /about; it now owns a page so the
// About page is not an endless scroll and the register has a shareable URL.
// The type filter lives in the `type` query param on purpose: chips are real links,
// so a filtered view can be sent to a donor and is rendered correctly by SSR. ===
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { ApiService } from '../../../core/services/api.service';
import {
  ALL_DOCUMENT_TYPES,
  AboutDocumentFileLink,
  AboutDocumentLocale,
  AboutDocumentType,
  PublicAboutDocument,
} from '../../admin/about/about.interfaces';
import { PageTitleService } from '../../../core/services/page-title.service';

// Reading order of the CSD register — not the declaration order of the union.
const DOCUMENT_TYPE_ORDER: AboutDocumentType[] = [
  'POLICY',
  'CODE',
  'MECHANISM',
  'REGULATION',
  'RULES',
  'PROCEDURE',
  'MANUAL',
  'DIRECTIVE',
  'TEMPLATE',
  'REPORT',
];

interface DocumentGroup {
  type: AboutDocumentType;
  docs: PublicAboutDocument[];
}

@Component({
  selector: 'app-about-documents',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <section class="documents">
      <h2>
        {{ 'about.page.documentsHeading' | translate }}
        @if (!loading() && documents().length > 0) {
          <span class="total">({{ documents().length }})</span>
        }
      </h2>

      @if (loading()) {
        <div class="state state-loading">{{ 'common.loading' | translate }}</div>
      } @else if (errorMessage()) {
        <div class="state state-error">{{ errorMessage() }}</div>
      } @else if (documents().length === 0) {
        <div class="state state-empty">{{ 'about.documents.empty' | translate }}</div>
      } @else {
        <!-- Type filter — anchors, not buttons: shareable, middle-clickable, SSR-safe -->
        <nav class="filters" [attr.aria-label]="'about.documents.filterLabel' | translate">
          <a
            class="chip"
            [class.chip--active]="activeType() === null"
            [attr.aria-current]="activeType() === null ? 'page' : null"
            [routerLink]="['/about/documents']"
          >
            {{ 'about.documents.filterAll' | translate }}
            <span class="chip-count">{{ documents().length }}</span>
          </a>
          @for (group of allGroups(); track group.type) {
            <a
              class="chip"
              [class.chip--active]="activeType() === group.type"
              [attr.aria-current]="activeType() === group.type ? 'page' : null"
              [routerLink]="['/about/documents']"
              [queryParams]="{ type: group.type }"
            >
              {{ 'about.page.documentTypes.' + group.type | translate }}
              <span class="chip-count">{{ group.docs.length }}</span>
            </a>
          }
        </nav>

        @for (group of visibleGroups(); track group.type) {
          <div class="doc-group">
            <h3>
              {{ 'about.page.documentTypes.' + group.type | translate }}
              <span class="doc-count">({{ group.docs.length }})</span>
            </h3>

            <ul class="doc-list">
              <!-- PR-D1 — the public payload has no uuid; the register code is the identity. -->
              @for (doc of group.docs; track doc.code) {
                <li class="doc-item">
                  <div class="doc-title">{{ getDocTitle(doc) }}</div>

                  @if (getDocDescription(doc); as desc) {
                    <p class="doc-desc">{{ desc }}</p>
                  }

                  <div class="doc-meta">
                    @if (doc.version) {
                      <span class="meta-tag">{{ doc.version }}</span>
                    }
                    @if (doc.lastReviewDate) {
                      <span class="meta-date">
                        {{ 'about.page.lastReview' | translate }}:
                        {{ doc.lastReviewDate | date: 'dd.MM.yyyy' }}
                      </span>
                    }
                    <!-- PR-D1 — no href in the payload. The link is requested per
                         document per language, so the whole registry can no longer be
                         scraped from one response. -->
                    @for (loc of doc.locales; track loc) {
                      <button
                        type="button"
                        class="doc-link"
                        [disabled]="pendingKey() === doc.code + ':' + loc"
                        (click)="openDocument(doc, loc)"
                      >
                        📄 {{ 'about.page.viewFile' | translate }} ·
                        {{ loc.toUpperCase() }}
                      </button>
                    }
                  </div>

                  @if (docErrorCode() === doc.code) {
                    <p class="doc-error">{{ docErrorMessage() }}</p>
                  }
                </li>
              }
            </ul>
          </div>
        }
      }
    </section>
  `,
  styles: [
    `
      .documents > h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 1.25rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e2e8f0;
      }
      .total {
        color: #94a3b8;
        font-weight: 400;
        font-size: 0.9rem;
      }

      .state {
        text-align: center;
        padding: 3rem 1rem;
        font-size: 0.95rem;
        border-radius: 8px;
      }
      .state-loading,
      .state-empty {
        color: #64748b;
      }
      .state-error {
        color: #c53030;
        background: #fff5f5;
        border: 1px solid #fed7d7;
      }

      .filters {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1.75rem;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.375rem 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        background: #fff;
        color: #475569;
        font-size: 0.85rem;
        text-decoration: none;
        transition:
          color 0.15s,
          border-color 0.15s,
          background 0.15s;

        &:hover {
          color: #2b6cb0;
          border-color: #bfdbfe;
        }

        /* Keyboard parity with :hover — the chips are the only filter control here. */
        &:focus-visible {
          outline: 2px solid #2b6cb0;
          outline-offset: 2px;
        }

        &--active {
          background: #2b6cb0;
          border-color: #2b6cb0;
          color: #fff;
          font-weight: 500;

          /* CHANGED: PR-D3 fix — .chip:hover (0,2,0) outranks .chip--active
             (0,1,0), so the generic hover colour was repainting the label blue on a
             blue pill and hiding it. This rule matches that specificity and comes
             later in the sheet, so it wins; the darker fill keeps hover feedback. */
          &:hover {
            color: #fff;
            background: #2c5282;
            border-color: #2c5282;
          }
        }
      }
      .chip-count {
        font-size: 0.75rem;
        opacity: 0.7;
      }

      .doc-group {
        margin-bottom: 2rem;
      }
      .doc-group:last-child {
        margin-bottom: 0;
      }
      .doc-group h3 {
        font-size: 1.05rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 0.75rem;
      }
      .doc-count {
        color: #94a3b8;
        font-weight: 400;
        font-size: 0.85rem;
      }
      .doc-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .doc-item {
        padding: 1rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        margin-bottom: 0.5rem;
      }
      .doc-item:last-child {
        margin-bottom: 0;
      }
      .doc-title {
        font-weight: 500;
        color: #1a365d;
        margin-bottom: 0.25rem;
        line-height: 1.4;
      }
      .doc-desc {
        font-size: 0.875rem;
        color: #475569;
        margin: 0.25rem 0 0.5rem;
        line-height: 1.5;
      }
      .doc-meta {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        align-items: center;
        font-size: 0.8rem;
        color: #64748b;
        margin-top: 0.5rem;
      }
      .meta-tag {
        background: #f1f5f9;
        color: #475569;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        font-weight: 500;
      }
      .meta-date {
        color: #64748b;
      }
      .doc-error {
        margin: 0.5rem 0 0;
        font-size: 0.85rem;
        color: #c53030;
      }
      .doc-link {
        appearance: none;
        border: 0;
        background: none;
        font: inherit;
        cursor: pointer;
        color: #2b6cb0;
        text-decoration: none;
        font-weight: 500;
        margin-left: auto;
      }
      .doc-link:hover:not(:disabled) {
        text-decoration: underline;
      }
      .doc-link:disabled {
        opacity: 0.5;
        cursor: progress;
      }

      @media (max-width: 640px) {
        .documents > h2 {
          font-size: 1.25rem;
        }
        .doc-link {
          margin-left: 0;
        }
      }
    `,
  ],
})
export class AboutDocumentsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly pageTitle = inject(PageTitleService);

  protected readonly isUa = inject(LanguageService).isUa;

  // ----- State -----
  loading = signal(true);
  errorMessage = signal('');
  documents = signal<PublicAboutDocument[]>([]);
  // one in-flight link request at a time
  pendingKey = signal('');
  docErrorCode = signal('');
  docErrorMessage = signal('');

  /** `?type=` — unknown values are ignored rather than producing an empty page. */
  private readonly typeParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('type'))),
    { initialValue: null },
  );

  activeType = computed<AboutDocumentType | null>(() => {
    const raw = this.typeParam();
    return raw && (ALL_DOCUMENT_TYPES as string[]).includes(raw)
      ? (raw as AboutDocumentType)
      : null;
  });

  /** Every type present in the register — drives the filter chips. */
  allGroups = computed<DocumentGroup[]>(() => {
    const all = this.documents();
    return DOCUMENT_TYPE_ORDER.map((type) => ({
      type,
      docs: all.filter((doc) => doc.documentType === type),
    })).filter((group) => group.docs.length > 0);
  });

  visibleGroups = computed<DocumentGroup[]>(() => {
    const type = this.activeType();
    return type === null
      ? this.allGroups()
      : this.allGroups().filter((group) => group.type === type);
  });

  ngOnInit(): void {
    this.loadDocuments();
    this.pageTitle.setTitle('about.page.documentsHeading');
  }

  private loadDocuments(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.api.get<PublicAboutDocument[]>('about/documents').subscribe({
      next: (docs) => {
        this.documents.set(docs);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(
          err?.error?.message || (this.isUa() ? 'Не вдалося завантажити' : 'Failed to load'),
        );
        this.loading.set(false);
      },
    });
  }

  getDocTitle(doc: PublicAboutDocument): string {
    return this.isUa() ? doc.titleUa : doc.titleEn;
  }

  getDocDescription(doc: PublicAboutDocument): string | null {
    return this.isUa() ? doc.descriptionUa : doc.descriptionEn;
  }

  /**
   * PR-D1 — fetch a short-lived link for ONE document in ONE language.
   * PR-D4 replaces window.open with the in-app viewer on /about/documents/:code
   * (ngx-extended-pdf-viewer, no download button). Until then the presigned URL is
   * opened directly: it is signed with `inline` disposition, expires in 5 minutes and
   * is issued per document — which is the part that closes the bulk-download hole.
   */
  openDocument(doc: PublicAboutDocument, locale: AboutDocumentLocale): void {
    const key = `${doc.code}:${locale}`;
    if (this.pendingKey() === key) {
      return;
    }
    this.pendingKey.set(key);
    this.docErrorCode.set('');

    this.api
      .get<AboutDocumentFileLink>(`about/documents/${doc.code}/file?locale=${locale}`)
      .subscribe({
        next: (link) => {
          this.pendingKey.set('');
          window.open(link.url, '_blank', 'noopener');
        },
        error: (err) => {
          this.pendingKey.set('');
          this.docErrorCode.set(doc.code);
          this.docErrorMessage.set(
            err?.error?.message ||
              (this.isUa() ? 'Не вдалося відкрити документ' : 'Could not open the document'),
          );
        },
      });
  }
}
