// ui/src/app/features/admin/procurements/procurements-list.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import {
  PaginatedProcurements,
  ProcurementCategory,
  ProcurementListItem,
  ProcurementMethod,
  ProcurementStatus,
} from '../../cooperation/procurement/procurement.interfaces';

// Active statuses available in admin UI dropdown (CLOSED is legacy, hidden)
const ACTIVE_STATUSES: ProcurementStatus[] = [
  ProcurementStatus.DRAFT,
  ProcurementStatus.PUBLISHED,
  ProcurementStatus.EXTENDED,
  ProcurementStatus.EVALUATION,
  ProcurementStatus.AWARDED,
  ProcurementStatus.SUSPENDED,
  ProcurementStatus.CANCELLED,
  ProcurementStatus.COMPLETED,
];

@Component({
  selector: 'app-admin-procurements-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  template: `
    <div class="list-header">
      <h2>
        {{ isUa ? 'Закупки' : 'Procurements' }}
        @if (total() > 0) {
          <span class="count">({{ total() }})</span>
        }
      </h2>
      <a routerLink="/cooperation/procurement/new" class="btn btn-primary">
        + {{ isUa ? 'Новий тендер' : 'New tender' }}
      </a>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input
        [placeholder]="
          isUa
            ? 'Пошук за назвою, реф. номером, донором...'
            : 'Search by title, reference, donor...'
        "
        [(ngModel)]="searchQuery"
        (input)="onSearchChange()"
        class="filter-input filter-search"
      />
      <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa ? 'Всі статуси' : 'All statuses' }}</option>
        @for (s of activeStatuses; track s) {
          <option [value]="s">{{ 'procurement.status.' + s | translate }}</option>
        }
      </select>
      <select [(ngModel)]="categoryFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa ? 'Всі категорії' : 'All categories' }}</option>
        <option value="goods">{{ 'procurement.category.goods' | translate }}</option>
        <option value="works">{{ 'procurement.category.works' | translate }}</option>
        <option value="services">{{ 'procurement.category.services' | translate }}</option>
      </select>
      <select [(ngModel)]="methodFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa ? 'Всі методи' : 'All methods' }}</option>
        <option value="open_tender">{{ 'procurement.method.open_tender' | translate }}</option>
        <option value="rfq">{{ 'procurement.method.rfq' | translate }}</option>
        <option value="rfp">{{ 'procurement.method.rfp' | translate }}</option>
      </select>
    </div>

    <!-- Banners -->
    @if (successMessage()) {
      <div class="banner banner-success">{{ successMessage() }}</div>
    }
    @if (errorMessage()) {
      <div class="banner banner-error">{{ errorMessage() }}</div>
    }

    @if (loading()) {
      <div class="loading">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (items().length === 0) {
      <div class="empty">{{ isUa ? 'Закупок не знайдено' : 'No procurements found' }}</div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ isUa ? 'Створено' : 'Created' }}</th>
              <th>{{ isUa ? 'Статус' : 'Status' }}</th>
              <th>{{ isUa ? 'Назва / Ref' : 'Title / Ref' }}</th>
              <th>{{ isUa ? 'Метод' : 'Method' }}</th>
              <th>{{ isUa ? 'Категорія' : 'Category' }}</th>
              <th>{{ isUa ? 'Донор' : 'Donor' }}</th>
              <th>{{ isUa ? 'Дедлайн' : 'Deadline' }}</th>
              <th class="th-actions">{{ isUa ? 'Дії' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id; let i = $index) {
              <tr>
                <td class="td-num">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                <td class="td-date">{{ item.createdAt | date: 'dd.MM.yyyy' }}</td>

                <!-- Status: badge + inline dropdown -->
                <td>
                  <select
                    [ngModel]="item.status"
                    (ngModelChange)="onStatusChange(item, $event)"
                    [disabled]="savingId() === item.id"
                    class="status-select"
                    [attr.data-status]="item.status"
                  >
                    @for (s of activeStatuses; track s) {
                      <option [value]="s">{{ 'procurement.status.' + s | translate }}</option>
                    }
                  </select>
                </td>

                <td class="td-title">
                  <a [routerLink]="['/cooperation/procurement', item.id]" class="title-link">
                    {{ isUa ? item.tenderTitleUa : item.tenderTitleEn }}
                  </a>
                  @if (item.referenceNumber) {
                    <div class="ref-num">{{ item.referenceNumber }}</div>
                  }
                </td>

                <td class="td-meta">
                  @if (item.procurementMethod) {
                    {{ 'procurement.method.' + item.procurementMethod | translate }}
                  } @else {
                    —
                  }
                </td>
                <td class="td-meta">
                  @if (item.procurementCategory) {
                    {{ 'procurement.category.' + item.procurementCategory | translate }}
                  } @else {
                    —
                  }
                </td>
                <td class="td-meta">{{ item.donor || '—' }}</td>
                <td class="td-date">
                  {{
                    item.bidSubmissionDeadline
                      ? (item.bidSubmissionDeadline | date: 'dd.MM.yyyy')
                      : '—'
                  }}
                </td>

                <!-- Actions -->
                <td class="td-actions">
                  <a
                    [routerLink]="['/cooperation/procurement', item.id, 'edit']"
                    class="action-btn action-edit"
                    [title]="isUa ? 'Редагувати' : 'Edit'"
                  >
                    ✎
                  </a>
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

      <!-- Pagination -->
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
      .ref-num {
        font-size: 0.7rem;
        color: #94a3b8;
        margin-top: 0.15rem;
        font-family: monospace;
      }

      /* Status select styled as colored badge — uses data-status to pick colors */
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
      /* Status colors — each of 8 active statuses has a unique palette */

      /* Draft — amber/yellow (неопубліковано, потребує уваги) */
      .status-select[data-status='draft'] {
        background: #fef3c7;
        color: #92400e;
      }

      /* Published — green (активний тендер) */
      .status-select[data-status='published'] {
        background: #d1fae5;
        color: #065f46;
      }

      /* Extended — lime (подовжений, відрізняється від published) */
      .status-select[data-status='extended'] {
        background: #ecfccb;
        color: #3f6212;
      }

      /* Evaluation — blue (на розгляді) */
      .status-select[data-status='evaluation'] {
        background: #dbeafe;
        color: #1e40af;
      }

      /* Awarded — purple (обрано переможця) */
      .status-select[data-status='awarded'] {
        background: #e9d5ff;
        color: #6b21a8;
      }

      /* Suspended — slate gray (призупинено) */
      .status-select[data-status='suspended'] {
        background: #e2e8f0;
        color: #475569;
      }

      /* Cancelled — red (скасовано) */
      .status-select[data-status='cancelled'] {
        background: #fee2e2;
        color: #991b1b;
      }

      /* Completed — teal (успішно завершено, відрізняється від published green) */
      .status-select[data-status='completed'] {
        background: #628141;
        color: #ffffff;
      }

      /* Closed — neutral (legacy, hidden from dropdown but may render on old rows) */
      .status-select[data-status='closed'] {
        background: #f1f5f9;
        color: #64748b;
      }

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
        }
        .filter-search {
          min-width: auto;
        }
      }
    `,
  ],
})
export class AdminProcurementsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly activeStatuses = ACTIVE_STATUSES;

  items = signal<ProcurementListItem[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  savingId = signal<string | null>(null);
  successMessage = signal('');
  errorMessage = signal('');

  currentPage = 1;
  pageSize = 20;
  searchQuery = '';
  statusFilter: ProcurementStatus | '' = '';
  categoryFilter: ProcurementCategory | '' = '';
  methodFilter: ProcurementMethod | '' = '';

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
    if (this.categoryFilter) params.push(`category=${this.categoryFilter}`);
    if (this.methodFilter) params.push(`method=${this.methodFilter}`);
    if (this.searchQuery) params.push(`search=${encodeURIComponent(this.searchQuery)}`);

    this.api.get<PaginatedProcurements>(`procurement/admin/list?${params.join('&')}`).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.total.set(res.total);
        this.totalPages.set(Math.max(1, Math.ceil(res.total / res.limit)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // Debounced search to avoid hammering API on every keystroke
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

  onStatusChange(item: ProcurementListItem, newStatus: ProcurementStatus): void {
    if (newStatus === item.status) return;

    const newLabel = this.translate.instant('procurement.status.' + newStatus);
    const confirmMsg = this.isUa
      ? `Змінити статус на "${newLabel}"?`
      : `Change status to "${newLabel}"?`;

    if (!confirm(confirmMsg)) {
      // Force-refresh row to revert dropdown UI
      this.items.update((list) => [...list]);
      return;
    }

    this.savingId.set(item.id);
    this.clearMessages();

    this.api
      .patch<ProcurementListItem>(`procurement/${item.id}/status`, { status: newStatus })
      .subscribe({
        next: (updated) => {
          this.items.update((list) =>
            list.map((p) => (p.id === updated.id ? { ...p, status: updated.status } : p)),
          );
          this.savingId.set(null);
          this.flashSuccess(
            this.isUa ? `Статус оновлено: "${newLabel}"` : `Status updated to "${newLabel}"`,
          );
        },
        error: (err) => {
          this.savingId.set(null);
          this.flashError(err?.error?.message || 'Error');
          // Revert dropdown UI to previous status
          this.items.update((list) => [...list]);
        },
      });
  }

  onDelete(item: ProcurementListItem): void {
    const title = this.isUa ? item.tenderTitleUa : item.tenderTitleEn;
    const confirmMsg = this.isUa
      ? `Видалити чернетку "${title}"? Цю дію не можна скасувати.`
      : `Delete draft "${title}"? This cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    this.savingId.set(item.id);
    this.clearMessages();

    this.api.delete(`procurement/${item.id}`).subscribe({
      next: () => {
        this.items.update((list) => list.filter((p) => p.id !== item.id));
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
