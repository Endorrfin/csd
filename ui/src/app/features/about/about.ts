// ui/src/app/features/about/about.ts
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { ApiService } from '../../core/services/api.service';
import { QuillHtmlPipe } from '../../shared/pipes/quill-html.pipe';
import { AboutDocument, AboutDocumentType, AboutSection } from '../admin/about/about.interfaces';
import { PageTitleService } from '../../core/services/page-title.service';

interface PublicAboutResponse {
  sections: AboutSection[];
  documents: AboutDocument[];
}

const DOCUMENT_TYPE_ORDER: AboutDocumentType[] = [
  'POLICY',
  'PROCEDURE',
  'REGULATION',
  'CODE',
  'REPORT',
];

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TranslateModule, QuillHtmlPipe],
  template: `
    <div class="about-page">
      <h1>{{ 'about.page.title' | translate }}</h1>

      @if (loading()) {
        <div class="state state-loading">{{ 'common.loading' | translate }}</div>
      } @else if (errorMessage()) {
        <div class="state state-error">{{ errorMessage() }}</div>
      } @else if (sections().length === 0 && documents().length === 0) {
        <div class="state state-empty">{{ 'about.page.empty' | translate }}</div>
      } @else {
        <!-- SECTIONS -->
        @for (section of sections(); track section.id) {
          <section class="about-section">
            <h2>{{ getTitle(section) }}</h2>

            <!-- KEY_FACTS — render as stats cards instead of prose -->
            @if (section.key === 'KEY_FACTS') {
              @let facts = getKeyFacts(section);
              @if (facts.length > 0) {
                <div class="key-facts-grid">
                  @for (item of facts; track $index) {
                    <div class="fact-card">
                      <div class="fact-value">{{ item.value }}</div>
                      <div class="fact-label">
                        {{ isUa() ? item.labelUa : item.labelEn }}
                      </div>
                    </div>
                  }
                </div>
              }
            }

            <!-- Prose content (Quill HTML) — also rendered for KEY_FACTS as optional intro -->
            @if (getContent(section); as content) {
              <div class="rich-text" [innerHTML]="content | quillHtml"></div>
            }
          </section>
        }

        <!-- DOCUMENTS REGISTRY -->
        @if (documents().length > 0) {
          <section class="about-section documents-section">
            <h2>{{ 'about.page.documentsHeading' | translate }}</h2>

            @for (group of documentsByType(); track group.type) {
              <div class="doc-group">
                <h3>
                  {{ 'about.page.documentTypes.' + group.type | translate }}
                  <span class="doc-count">({{ group.docs.length }})</span>
                </h3>

                <ul class="doc-list">
                  @for (doc of group.docs; track doc.id) {
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
                        @if (doc.fileUrl) {
                          <a [href]="doc.fileUrl" target="_blank" rel="noopener" class="doc-link">
                            📄 {{ 'about.page.viewFile' | translate }}
                          </a>
                        }
                      </div>
                    </li>
                  }
                </ul>
              </div>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [
    `
      .about-page {
        max-width: 1024px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }
      .about-page > h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1a365d;
        margin: 0 0 2rem;
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

      .about-section {
        margin-bottom: 3rem;
      }
      .about-section h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e2e8f0;
      }

      /* KEY_FACTS — cards visually consistent with home page impact-stats */
      .key-facts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
      }
      .fact-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem 1rem;
        text-align: center;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }
      .fact-value {
        font-size: 2rem;
        font-weight: 700;
        color: #1a365d;
        line-height: 1.1;
        margin-bottom: 0.5rem;
      }
      .fact-label {
        font-size: 0.85rem;
        color: #64748b;
        line-height: 1.4;
      }

      /* Rich text from Quill — keep typography readable */
      .rich-text {
        line-height: 1.7;
        color: #2d3748;
        font-size: 1rem;
      }
      .rich-text ::ng-deep p {
        margin: 0 0 1rem;
      }
      .rich-text ::ng-deep p:last-child {
        margin-bottom: 0;
      }
      .rich-text ::ng-deep ul,
      .rich-text ::ng-deep ol {
        margin: 0 0 1rem;
        padding-left: 1.5rem;
      }
      .rich-text ::ng-deep li {
        margin-bottom: 0.25rem;
      }
      .rich-text ::ng-deep h1,
      .rich-text ::ng-deep h2,
      .rich-text ::ng-deep h3 {
        color: #1a365d;
        margin: 1.5rem 0 0.75rem;
      }
      .rich-text ::ng-deep a {
        color: #2b6cb0;
        text-decoration: underline;
      }
      .rich-text ::ng-deep blockquote {
        border-left: 4px solid #cbd5e0;
        padding-left: 1rem;
        margin: 1rem 0;
        color: #475569;
      }

      /* Documents registry */
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
      .doc-link {
        color: #2b6cb0;
        text-decoration: none;
        font-weight: 500;
        margin-left: auto;
      }
      .doc-link:hover {
        text-decoration: underline;
      }

      @media (max-width: 640px) {
        .about-page > h1 {
          font-size: 1.6rem;
        }
        .about-section h2 {
          font-size: 1.25rem;
        }
        .doc-link {
          margin-left: 0;
        }
      }
    `,
  ],
})
export class AboutComponent implements OnInit {
  private readonly api = inject(ApiService);
  // === ADDED: Page title service for SEO ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  // ----- State -----
  loading = signal(true);
  errorMessage = signal('');
  sections = signal<AboutSection[]>([]);
  documents = signal<AboutDocument[]>([]);

  // ----- Computed -----
  // pre-grouped documents, in fixed type order, only types with content
  documentsByType = computed<{ type: AboutDocumentType; docs: AboutDocument[] }[]>(() => {
    const all = this.documents();
    return DOCUMENT_TYPE_ORDER.map((type) => ({
      type,
      docs: all.filter((d) => d.documentType === type),
    })).filter((g) => g.docs.length > 0);
  });

  // signal-based language flag (reactive in zoneless) — call as isUa() everywhere
  protected readonly isUa = inject(LanguageService).isUa;

  ngOnInit(): void {
    this.loadAbout();
    this.pageTitle.setTitle('about.page.title');
  }

  private loadAbout(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.api.get<PublicAboutResponse>('about').subscribe({
      next: (res) => {
        this.sections.set(res.sections);
        this.documents.set(res.documents);
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

  // ----- Helpers (used in template, kept simple for type-safety) -----

  getTitle(s: AboutSection): string {
    return this.isUa() ? s.titleUa : s.titleEn;
  }

  getContent(s: AboutSection): string | null {
    return this.isUa() ? s.contentUa : s.contentEn;
  }

  getKeyFacts(s: AboutSection) {
    return s.metadata?.items ?? [];
  }

  getDocTitle(d: AboutDocument): string {
    return this.isUa() ? d.titleUa : d.titleEn;
  }

  getDocDescription(d: AboutDocument): string | null {
    return this.isUa() ? d.descriptionUa : d.descriptionEn;
  }
}
