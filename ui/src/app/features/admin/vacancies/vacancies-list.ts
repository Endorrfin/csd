// ui/src/app/features/admin/vacancies/vacancies-list.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import {
  EmploymentType,
  PaginatedVacancies,
  VacancyListItem,
  VacancyStatus,
} from '../../cooperation/vacancy/vacancy.interfaces';

// Active statuses shown in dropdown (CLOSED is legacy, remapped to HIRED)
const ACTIVE_STATUSES: VacancyStatus[] = [
  VacancyStatus.DRAFT,
  VacancyStatus.PUBLISHED,
  VacancyStatus.EXTENDED,
  VacancyStatus.ON_HOLD,
  VacancyStatus.SUSPENDED,
  VacancyStatus.CANCELLED,
  VacancyStatus.HIRED,
];

@Component({
  selector: 'app-admin-vacancies-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="list-header">
      <h2>
        {{ isUa ? 'Вакансії' : 'Vacancies' }}
        @if (total() > 0) {
          <span class="count">({{ total() }})</span>
        }
      </h2>
      <a routerLink="/cooperation/vacancy/new" class="btn-primary">
        + {{ isUa ? 'Нова вакансія' : 'New vacancy' }}
      </a>
    </div>

    <div class="filters">
      <input
        [placeholder]="isUa ? 'Пошук за назвою...' : 'Search by title...'"
        [(ngModel)]="searchQuery"
        (input)="onSearchChange()"
        class="filter-input filter-search"
      />
      <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa ? 'Всі статуси' : 'All statuses' }}</option>
        @for (s of activeStatuses; track s) {
          <option [value]="s">{{ 'vacancy.status.' + s | translate }}</option>
        }
      </select>
      <select [(ngModel)]="employmentFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa ? 'Всі типи' : 'All types' }}</option>
        <option value="full_time">{{ 'vacancy.employmentType.full_time' | translate }}</option>
        <option value="part_time">{{ 'vacancy.employmentType.part_time' | translate }}</option>
        <option value="volunteer">{{ 'vacancy.employmentType.volunteer' | translate }}</option>
      </select>
      <label class="filter-checkbox">
        <input type="checkbox" [(ngModel)]="activeDeadlineOnly" (change)="onFilterChange()" />
        {{ isUa ? 'Тільки з активним дедлайном' : 'Active deadline only' }}
      </label>
    </div>

    @if (successMessage()) {
      <div class="banner banner-success">{{ successMessage() }}</div>
    }
    @if (errorMessage()) {
      <div class="banner banner-error">{{ errorMessage() }}</div>
    }

    @if (loading()) {
      <div class="loading">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (items().length === 0) {
      <div class="empty">{{ isUa ? 'Вакансій не знайдено' : 'No vacancies found' }}</div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ isUa ? 'Створено' : 'Created' }}</th>
              <th>{{ isUa ? 'Статус' : 'Status' }}</th>
              <th>{{ isUa ? 'Назва' : 'Title' }}</th>
              <th>{{ isUa ? 'Тип' : 'Type' }}</th>
              <th>{{ isUa ? 'Регіон' : 'Region' }}</th>
              <th>{{ isUa ? 'Дедлайн' : 'Deadline' }}</th>
              <th>{{ isUa ? 'Зарплата' : 'Salary' }}</th>
              <th class="th-actions">{{ isUa ? 'Дії' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id; let i = $index) {
              <tr>
                <td class="td-num">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                <td class="td-date">{{ item.createdAt | date: 'dd.MM.yyyy' }}</td>

                <td>
                  <select
                    [ngModel]="item.status"
                    (ngModelChange)="onStatusChange(item, $event)"
                    [disabled]="savingId() === item.id"
                    class="status-select"
                    [attr.data-status]="item.status"
                  >
                    @for (s of activeStatuses; track s) {
                      <option [value]="s">{{ 'vacancy.status.' + s | translate }}</option>
                    }
                  </select>
                </td>

                <td class="td-title">
                  <a [routerLink]="['/cooperation/vacancy', item.id]" class="title-link">
                    {{ isUa ? item.titleUa : item.titleEn }}
                  </a>
                </td>
                <td class="td-meta">
                  {{ 'vacancy.employmentType.' + item.employmentType | translate }}
                </td>
                <td class="td-meta">{{ item.region || '—' }}</td>
                <td
                  class="td-date"
                  [class.td-deadline-expired]="isExpired(item.applicationDeadline)"
                >
                  {{
                    item.applicationDeadline ? (item.applicationDeadline | date: 'dd.MM.yyyy') : '—'
                  }}
                </td>
                <td class="td-meta">{{ item.salary || '—' }}</td>

                <td class="td-actions">
                  <a
                    [routerLink]="['/cooperation/vacancy', item.id, 'edit']"
                    class="action-btn action-edit"
                    [title]="isUa ? 'Редагувати' : 'Edit'"
                    >✎</a
                  >
                  @if (item.status === 'draft') {
                    <button
                      type="button"
                      class="action-btn action-delete"
                      [disabled]="savingId() === item.id"
                      (click)="onDelete(item)"
                      [title]="isUa ? 'Видалити чернетку' : 'Delete draft'"
                    >
                      ✕
                    </button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (totalPages() > 1) {
        <div class="pagination">
          <button class="btn-sm" [disabled]="currentPage <= 1" (click)="goPage(currentPage - 1)">
            {{ isUa ? 'Попередня' : 'Previous' }}
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages() }}</span>
          <button
            class="btn-sm"
            [disabled]="currentPage >= totalPages()"
            (click)="goPage(currentPage + 1)"
          >
            {{ isUa ? 'Наступна' : 'Next' }}
          </button>
        </div>
      }
    }
  `,
  styles: [
    `
      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .list-header h2 {
        font-size: 1.2rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0;
      }
      .count {
        color: #64748b;
        font-weight: 400;
      }
      .btn-primary {
        background: #2b6cb0;
        color: #fff;
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
      }
      .btn-primary:hover {
        background: #2c5282;
      }

      .filters {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
        align-items: center;
      }
      .filter-input {
        padding: 0.5rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.85rem;
        background: #fff;
      }
      .filter-search {
        flex: 1;
        min-width: 240px;
      }
      .filter-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        color: #475569;
        cursor: pointer;
      }

      .banner {
        padding: 0.6rem 1rem;
        border-radius: 6px;
        font-size: 0.85rem;
        margin-bottom: 1rem;
        border: 1px solid;
      }
      .banner-success {
        background: #f0fff4;
        color: #276749;
        border-color: #c6f6d5;
      }
      .banner-error {
        background: #fff5f5;
        color: #c53030;
        border-color: #fed7d7;
      }

      .table-wrap {
        overflow-x: auto;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .data-table th {
        text-align: left;
        padding: 0.65rem 0.5rem;
        border-bottom: 2px solid #e2e8f0;
        color: #64748b;
        font-weight: 600;
        font-size: 0.72rem;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .data-table td {
        padding: 0.65rem 0.5rem;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }
      .th-actions {
        text-align: center;
      }
      .td-num {
        text-align: center;
        color: #64748b;
      }
      .td-date {
        white-space: nowrap;
        color: #64748b;
        font-size: 0.8rem;
      }
      .td-deadline-expired {
        color: #c53030;
      }
      .td-meta {
        color: #475569;
      }

      .td-title {
        max-width: 280px;
      }
      .title-link {
        color: #1a365d;
        font-weight: 500;
        text-decoration: none;
      }
      .title-link:hover {
        color: #2b6cb0;
        text-decoration: underline;
      }

      /* Status palette — soft pastels, each status unique */
      .status-select {
        padding: 0.25rem 0.5rem;
        border: 1px solid transparent;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        cursor: pointer;
        min-width: 115px;
      }
      .status-select:disabled {
        opacity: 0.5;
        cursor: wait;
      }
      .status-select[data-status='draft'] {
        background: #fef3c7;
        color: #92400e;
      } /* amber */
      .status-select[data-status='published'] {
        background: #d1fae5;
        color: #065f46;
      } /* green */
      .status-select[data-status='extended'] {
        background: #ecfccb;
        color: #3f6212;
      } /* lime */
      .status-select[data-status='on_hold'] {
        background: #dbeafe;
        color: #1e40af;
      } /* blue */
      .status-select[data-status='suspended'] {
        background: #e2e8f0;
        color: #475569;
      } /* slate */
      .status-select[data-status='cancelled'] {
        background: #fee2e2;
        color: #991b1b;
      } /* red */
      .status-select[data-status='hired'] {
        background: #ccfbf1;
        color: #115e59;
      } /* teal */
      .status-select[data-status='closed'] {
        background: #f1f5f9;
        color: #64748b;
      } /* neutral (legacy) */

      .td-actions {
        text-align: center;
        white-space: nowrap;
      }
      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        margin: 0 2px;
        padding: 0;
        border-radius: 4px;
        font-size: 0.85rem;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        background: transparent;
        transition: all 0.15s;
      }
      .action-edit {
        color: #2b6cb0;
      }
      .action-edit:hover {
        background: #ebf8ff;
        border-color: #bee3f8;
      }
      .action-delete {
        color: #c53030;
      }
      .action-delete:hover {
        background: #fff5f5;
        border-color: #fed7d7;
      }
      .action-delete:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
        margin-top: 1.25rem;
      }
      .page-info {
        font-size: 0.85rem;
        color: #64748b;
      }
      .btn-sm {
        padding: 0.4rem 1rem;
        border: 1px solid #cbd5e0;
        background: #fff;
        border-radius: 6px;
        font-size: 0.8rem;
        cursor: pointer;
      }
      .btn-sm:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .btn-sm:not(:disabled):hover {
        background: #f8fafc;
      }

      .loading,
      .empty {
        text-align: center;
        padding: 3rem;
        color: #64748b;
        font-size: 0.95rem;
      }

      @media (max-width: 768px) {
        .filters {
          flex-direction: column;
          align-items: stretch;
        }
        .filter-search {
          min-width: auto;
        }
      }
    `,
  ],
})
export class AdminVacanciesListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);

  readonly activeStatuses = ACTIVE_STATUSES;

  items = signal<VacancyListItem[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  savingId = signal<string | null>(null);
  successMessage = signal('');
  errorMessage = signal('');

  currentPage = 1;
  pageSize = 20;
  searchQuery = '';
  statusFilter: VacancyStatus | '' = '';
  employmentFilter: EmploymentType | '' = '';
  activeDeadlineOnly = false;

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    const params: string[] = [`page=${this.currentPage}`, `limit=${this.pageSize}`];
    if (this.statusFilter) params.push(`status=${this.statusFilter}`);
    if (this.employmentFilter) params.push(`employmentType=${this.employmentFilter}`);
    if (this.searchQuery) params.push(`search=${encodeURIComponent(this.searchQuery)}`);
    if (this.activeDeadlineOnly) params.push('hasActiveDeadline=true');

    this.api.get<PaginatedVacancies>(`vacancies/admin/list?${params.join('&')}`).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.total.set(res.total);
        this.totalPages.set(Math.max(1, Math.ceil(res.total / res.limit)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onSearchChange(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadItems();
    }, 400);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadItems();
  }

  goPage(page: number): void {
    this.currentPage = page;
    this.loadItems();
  }

  // Red-highlight deadlines already in the past (visual cue for managers)
  isExpired(deadline: string | null): boolean {
    if (!deadline) return false;
    return new Date(deadline).getTime() < Date.now();
  }

  onStatusChange(item: VacancyListItem, newStatus: VacancyStatus): void {
    if (newStatus === item.status) return;

    const newLabel = this.translate.instant('vacancy.status.' + newStatus);
    const confirmMsg = this.isUa
      ? `Змінити статус на "${newLabel}"?`
      : `Change status to "${newLabel}"?`;

    if (!confirm(confirmMsg)) {
      // Force signal refresh to revert dropdown UI
      this.items.update((list) => [...list]);
      return;
    }

    this.savingId.set(item.id);
    this.clearMessages();

    this.api
      .patch<VacancyListItem>(`vacancies/${item.id}/status`, { status: newStatus })
      .subscribe({
        next: (updated) => {
          this.items.update((list) =>
            list.map((v) => (v.id === updated.id ? { ...v, status: updated.status } : v)),
          );
          this.savingId.set(null);
          this.flashSuccess(
            this.isUa ? `Статус оновлено: "${newLabel}"` : `Status updated to "${newLabel}"`,
          );
        },
        error: (err) => {
          this.savingId.set(null);
          this.flashError(err?.error?.message || 'Error');
          this.items.update((list) => [...list]);
        },
      });
  }

  onDelete(item: VacancyListItem): void {
    const title = this.isUa ? item.titleUa : item.titleEn;
    const confirmMsg = this.isUa
      ? `Видалити чернетку "${title}"? Цю дію не можна скасувати.`
      : `Delete draft "${title}"? This cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    this.savingId.set(item.id);
    this.clearMessages();

    this.api.delete(`vacancies/${item.id}`).subscribe({
      next: () => {
        this.items.update((list) => list.filter((v) => v.id !== item.id));
        this.total.update((t) => t - 1);
        this.savingId.set(null);
        this.flashSuccess(this.isUa ? 'Чернетку видалено' : 'Draft deleted');
      },
      error: (err) => {
        this.savingId.set(null);
        this.flashError(err?.error?.message || 'Error');
      },
    });
  }

  private flashSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(''), 4000);
  }

  private flashError(msg: string): void {
    this.errorMessage.set(msg);
    setTimeout(() => this.errorMessage.set(''), 5000);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}
