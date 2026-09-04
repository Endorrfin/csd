// ui/src/app/features/about/about.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../core/services/language.service';
import { ApiService } from '../../core/services/api.service';
import { QuillHtmlPipe } from '../../shared/pipes/quill-html.pipe';
import { AboutSection } from '../admin/about/about.interfaces';
import { PageTitleService } from '../../core/services/page-title.service';

// PR-D3 — the registry moved to the "Documents" sub-tab
// (features/about/documents/about-documents.ts), so GET /api/about is sections-only
// and this component no longer knows about documents at all.
interface PublicAboutResponse {
  sections: AboutSection[];
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, TranslateModule, QuillHtmlPipe],
  template: `
    <div class="about-page">
      <!-- PR-D3 — <h1> now lives in AboutShellComponent, above the tabs. -->
      @if (loading()) {
        <div class="state state-loading">{{ 'common.loading' | translate }}</div>
      } @else if (errorMessage()) {
        <div class="state state-error">{{ errorMessage() }}</div>
      } @else if (sections().length === 0) {
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
      }
    </div>
  `,
  styles: [
    `
      /* PR-D3 — the page container and <h1> moved to AboutShellComponent;
         this component now renders inside the shell's <router-outlet>. */
      .about-page {
        display: block;
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

      /* PR-D3 — .doc-* styles moved with the registry to
         features/about/documents/about-documents.ts. */

      @media (max-width: 640px) {
        .about-section h2 {
          font-size: 1.25rem;
        }
      }
    `,
  ],
})
export class AboutComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly isUa = inject(LanguageService).isUa;

  // inject page title service for dynamic SEO tags
  private readonly pageTitle = inject(PageTitleService);

  // ----- State -----
  loading = signal(true);
  errorMessage = signal('');
  sections = signal<AboutSection[]>([]);

  ngOnInit(): void {
    // PR-D3 — the page title is set by AboutShellComponent for both sub-tabs.
    this.loadAbout();
    // update page dynamic metadata and SEO tags
    this.pageTitle.updateSeo('about.page.title', 'about.page.description');
  }

  private loadAbout(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.api.get<PublicAboutResponse>('about').subscribe({
      next: (res) => {
        this.sections.set(res.sections);
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
}
