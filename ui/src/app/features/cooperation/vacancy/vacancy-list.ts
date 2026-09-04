// ui/src/app/features/cooperation/vacancy/vacancy-list.ts
import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
// use shared interfaces + VacancyStatus enum
import { VacancyListItem, VacancyStatus } from './vacancy.interfaces';
import { PageTitleService } from '../../../core/services/page-title.service';

// Statuses counted as "open" on the public page (still accepting applications)
const OPEN_STATUSES: VacancyStatus[] = [VacancyStatus.PUBLISHED, VacancyStatus.EXTENDED];

@Component({
  selector: 'app-vacancy-list',
  standalone: true,
  imports: [RouterLink, TranslateModule, DatePipe],
  template: `
    <div class="vacancy-list">
      <div class="vacancy-list__header">
        <div>
          <h2>{{ 'vacancy.list.title' | translate }}</h2>
          <p class="subtitle">{{ 'vacancy.list.subtitle' | translate }}</p>
          <!-- Counter: X total, Y open right now -->
          @if (vacancies().length > 0) {
            <p class="stats">
              <span class="stats-total">{{ vacancies().length }}</span>
              {{ isUa ? 'всього' : 'total' }} ·
              <span class="stats-open">{{ openCount() }}</span>
              {{ isUa ? 'відкритих' : 'open' }}
            </p>
          }
        </div>
        @if (auth.isManager) {
          <a routerLink="new" class="btn-primary"> + {{ 'vacancy.list.createNew' | translate }} </a>
        }
      </div>

      @if (loading()) {
        <p class="state-msg">{{ 'common.loading' | translate }}</p>
      } @else if (vacancies().length === 0) {
        <p class="state-msg">{{ 'vacancy.list.empty' | translate }}</p>
      } @else {
        <div class="vacancy-grid">
          @for (v of vacancies(); track v.id) {
            <a [routerLink]="v.id" class="vacancy-card">
              <div class="vacancy-card__badges">
                <span class="badge-type">
                  {{ 'vacancy.employmentType.' + v.employmentType | translate }}
                </span>
                <!-- status badge with unified admin palette -->
                <span class="badge-status" [attr.data-status]="v.status">
                  {{ 'vacancy.status.' + v.status | translate }}
                </span>
              </div>
              <h3>{{ isUa ? v.titleUa : v.titleEn }}</h3>
              @if (v.region) {
                <p class="vacancy-card__meta">📍 {{ v.region }}</p>
              }
              @if (v.applicationDeadline) {
                <p class="vacancy-card__meta">
                  📅 {{ 'vacancy.list.deadline' | translate }}:
                  {{ v.applicationDeadline | date: 'dd.MM.yyyy' }}
                </p>
              }
              @if (v.salary) {
                <p class="vacancy-card__meta">💰 {{ v.salary }}</p>
              }
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .vacancy-list__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        gap: 1rem;
        h2 {
          font-size: 1.375rem;
          color: #1a365d;
          margin: 0 0 0.25rem;
        }
        .subtitle {
          color: #718096;
          font-size: 0.875rem;
          margin: 0 0 0.35rem;
        }
        .stats {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
        }
        .stats-total {
          font-weight: 600;
          color: #1a365d;
        }
        .stats-open {
          font-weight: 600;
          color: #065f46;
        }
      }

      .vacancy-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }
      .vacancy-card {
        display: block;
        padding: 1.25rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        text-decoration: none;
        color: inherit;
        transition:
          box-shadow 0.15s,
          border-color 0.15s;
        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-color: #bee3f8;
        }
        h3 {
          font-size: 1rem;
          margin: 0 0 0.5rem;
          color: #1a365d;
        }
        &__badges {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          margin-bottom: 0.625rem;
        }
        &__meta {
          font-size: 0.875rem;
          color: #718096;
          margin: 0.2rem 0 0;
        }
      }

      .badge-type {
        display: inline-block;
        font-size: 0.72rem;
        padding: 0.2rem 0.55rem;
        border-radius: 9999px;
        background: #ebf8ff;
        color: #2b6cb0;
      }

      /* status palette mirrors admin exactly */
      .badge-status {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 600;
        padding: 0.2rem 0.55rem;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      .badge-status[data-status='published'] {
        background: #d1fae5;
        color: #065f46;
      }
      .badge-status[data-status='extended'] {
        background: #ecfccb;
        color: #3f6212;
      }
      .badge-status[data-status='on_hold'] {
        background: #dbeafe;
        color: #1e40af;
      }
      .badge-status[data-status='suspended'] {
        background: #e2e8f0;
        color: #475569;
      }
      .badge-status[data-status='cancelled'] {
        background: #fee2e2;
        color: #991b1b;
      }
      .badge-status[data-status='hired'] {
        background: #ccfbf1;
        color: #115e59;
      }
      .badge-status[data-status='closed'] {
        background: #f1f5f9;
        color: #64748b;
      }

      .btn-primary {
        padding: 0.5rem 1rem;
        background: #2b6cb0;
        color: #fff;
        border-radius: 6px;
        text-decoration: none;
        font-size: 0.875rem;
        white-space: nowrap;
      }
      .state-msg {
        color: #718096;
      }
    `,
  ],
})
export class VacancyListComponent implements OnInit {
  private api = inject(ApiService);
  private translate = inject(TranslateService);

  // === ADDED: inject page title service for dynamic SEO tags ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  protected auth = inject(AuthService);

  protected vacancies = signal<VacancyListItem[]>([]);
  protected loading = signal(true);

  // computed count of currently open positions
  protected openCount = computed(
    () => this.vacancies().filter((v) => OPEN_STATUSES.includes(v.status)).length,
  );

  protected get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  ngOnInit(): void {
    this.api.get<VacancyListItem[]>('vacancies').subscribe({
      next: (data) => {
        this.vacancies.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    // === ADDED: update page dynamic metadata and SEO tags ===
    this.pageTitle.updateSeo('cooperation.tabs.vacancy', 'cooperation.descriptions.vacancy');
    // === END ADDED ===
  }
}
