import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SlicePipe } from '@angular/common';
import { ProcurementListItem } from './procurement.interfaces';


@Component({
  selector: 'app-procurement-list',
  standalone: true,
  imports: [RouterLink, TranslateModule, SlicePipe],
  template: `
    <div class="procurement-list">
      <div class="procurement-list__header">
        <div>
          <h1>{{ 'procurement.list.title' | translate }}</h1>
          <p class="procurement-list__subtitle">{{ 'procurement.list.subtitle' | translate }}</p>
        </div>
        <!-- Create button visible for manager and above -->
        @if (canManage()) {
          <a routerLink="new" class="btn btn--primary">
            + {{ 'procurement.list.createNew' | translate }}
          </a>
        }
      </div>

      @if (isLoading()) {
        <div class="loading">{{ 'common.loading' | translate }}</div>
      } @else if (items().length === 0) {
        <div class="empty-state">{{ 'procurement.list.empty' | translate }}</div>
      } @else {
        <div class="procurement-cards">
          @for (item of items(); track item.id) {
            <a [routerLink]="[item.id]" class="procurement-card">
              <div class="procurement-card__header">
                <span class="badge badge--method">
                  {{ 'procurement.method.' + item.procurementMethod | translate }}
                </span>
                @if (item.procurementCategory) {
                  <span class="badge badge--category">
                    {{ 'procurement.category.' + item.procurementCategory | translate }}
                  </span>
                }
                <span class="badge" [class]="'badge--' + item.status">
                  {{ 'procurement.status.' + item.status | translate }}
                </span>
              </div>

              <h3 class="procurement-card__title">
                {{ isUa ? item.tenderTitleUa : item.tenderTitleEn }}
              </h3>

              <div class="procurement-card__meta">
                @if (item.referenceNumber) {
                  <span>🔖 {{ item.referenceNumber }}</span>
                }
                @if (item.donor) {
                  <span>🏦 {{ item.donor }}</span>
                }
                @if (item.bidSubmissionDeadline) {
                  <span>
                    📅 {{ 'procurement.list.deadline' | translate }}:
                    {{ item.bidSubmissionDeadline | slice: 0 : 10 }}
                  </span>
                }
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .procurement-list {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;

      &__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        margin-bottom: 2rem;
        gap: 1rem;
        flex-wrap: wrap;

        h1 { font-size: 1.75rem; color: #1a365d; margin: 0 0 0.25rem; }
      }

      &__subtitle { color: #718096; margin: 0; font-size: 0.9375rem; }
    }

    .procurement-cards { display: flex; flex-direction: column; gap: 1rem; }

    .procurement-card {
      display: block;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      text-decoration: none;
      color: inherit;
      transition: box-shadow 0.15s, border-color 0.15s;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        border-color: #4299e1;
      }

      &__header { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }

      &__title {
        font-size: 1.0625rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 0.75rem;
      }

      &__meta {
        display: flex;
        gap: 1.25rem;
        flex-wrap: wrap;
        font-size: 0.875rem;
        color: #718096;
      }
    }

    .badge {
      display: inline-flex;
      padding: 0.2rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;

      &--method { background: #ebf8ff; color: #2b6cb0; }
      &--category { background: #faf5ff; color: #553c9a; }
      &--draft { background: #fefcbf; color: #744210; }
      &--published { background: #f0fff4; color: #276749; }
      &--closed { background: #fff5f5; color: #c53030; }
    }

    .btn {
      padding: 0.625rem 1.25rem;
      border-radius: 6px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      text-decoration: none;
      display: inline-flex;
      align-items: center;

      &--primary { background: #2b6cb0; color: white; &:hover { background: #2c5282; } }
    }

    .loading, .empty-state {
      text-align: center;
      padding: 3rem;
      color: #718096;
    }
  `],
})
export class ProcurementListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  readonly items = signal<ProcurementListItem[]>([]);
  readonly isLoading = signal(true);

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  canManage(): boolean {
    return this.auth.isManager;
  }

  ngOnInit(): void {
    this.api.get<ProcurementListItem[]>('procurement').subscribe({
      next: (data) => {
        this.items.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}
