// ui/src/app/features/admin/recovery-forms-list/recovery-forms-list.ts
// Admin list for the "Recovery" needs form (PR-5). Mirrors wash-forms-list
// (filters + sort + bulk status + XLSX export), but reads language from the
// signal-based LanguageService so it stays reactive under zoneless CD.
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/services/language.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { environment } from '../../../../environments/environment';
import {
  DAMAGE_CATEGORY_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  URGENCY_OPTIONS,
  RecoveryFormStatus,
  RecoveryFormSummary,
} from '../../needs/recovery-form/recovery-form.interfaces';

// Sortable columns must match RECOVERY_SORTABLE_COLUMNS on the backend.
type SortField = 'createdAt' | 'trackingNumber' | 'region' | 'estimatedCost' | 'status';
type SortDir = 'ASC' | 'DESC';

interface PaginatedResponse {
  data: RecoveryFormSummary[];
  total: number;
  page: number;
  limit: number;
}

@Component({
  selector: 'app-recovery-forms-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="list-header">
      <h2>
        {{ isUa() ? 'Заявки: Відновлення' : 'Recovery Forms' }}
        @if (total() > 0) {
          <span class="count">({{ total() }})</span>
        }
      </h2>
      <button class="btn btn-export" (click)="exportXlsx()" [disabled]="exporting()">
        @if (exporting()) {
          {{ isUa() ? 'Експортується...' : 'Exporting...' }}
        } @else {
          {{ isUa() ? 'Експорт XLSX' : 'Export XLSX' }}
        }
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input
        [placeholder]="
          isUa() ? 'Пошук: № заявки, обʼєкт, організація...' : 'Search: tracking №, object, org...'
        "
        [(ngModel)]="searchQuery"
        (input)="onSearchChange()"
        class="filter-input filter-search"
      />
      <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa() ? 'Всі статуси' : 'All statuses' }}</option>
        @for (s of STATUSES; track s) {
          <option [value]="s">{{ getStatusLabel(s) }}</option>
        }
      </select>
      <select [(ngModel)]="objectTypeFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa() ? 'Тип обʼєкта' : 'Object type' }}</option>
        @for (o of objectTypeOptions; track o.value) {
          <option [value]="o.value">{{ isUa() ? o.ua : o.en }}</option>
        }
      </select>
      <select [(ngModel)]="urgencyFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa() ? 'Терміновість' : 'Urgency' }}</option>
        @for (o of urgencyOptions; track o.value) {
          <option [value]="o.value">{{ isUa() ? o.ua : o.en }}</option>
        }
      </select>
      <input
        [placeholder]="isUa() ? 'Область' : 'Region'"
        [(ngModel)]="regionFilter"
        (input)="onSearchChange()"
        class="filter-input filter-region"
      />
      <label class="filter-date">
        <span>{{ isUa() ? 'Від' : 'From' }}</span>
        <input
          type="date"
          [(ngModel)]="dateFrom"
          (change)="onFilterChange()"
          class="filter-input"
        />
      </label>
      <label class="filter-date">
        <span>{{ isUa() ? 'До' : 'To' }}</span>
        <input type="date" [(ngModel)]="dateTo" (change)="onFilterChange()" class="filter-input" />
      </label>
      @if (hasActiveFilters()) {
        <button class="btn btn-link" (click)="clearFilters()">
          {{ isUa() ? 'Скинути фільтри' : 'Clear filters' }}
        </button>
      }
    </div>

    <!-- Bulk action bar -->
    @if (hasSelection()) {
      <div class="bulk-bar">
        <span class="bulk-count">
          {{ isUa() ? 'Вибрано:' : 'Selected:' }} <strong>{{ selectedIds().size }}</strong>
        </span>
        <select [(ngModel)]="bulkStatus" class="filter-input">
          <option value="">{{ isUa() ? 'Змінити статус на...' : 'Change status to...' }}</option>
          @for (s of STATUSES; track s) {
            <option [value]="s">{{ getStatusLabel(s) }}</option>
          }
        </select>
        <button
          class="btn btn-primary"
          [disabled]="!bulkStatus || bulkApplying()"
          (click)="applyBulkStatus()"
        >
          @if (bulkApplying()) {
            {{ isUa() ? 'Застосовується...' : 'Applying...' }}
          } @else {
            {{ isUa() ? 'Застосувати' : 'Apply' }}
          }
        </button>
        <button class="btn btn-link" (click)="clearSelection()">
          {{ isUa() ? 'Скасувати' : 'Cancel' }}
        </button>
      </div>
    }

    @if (loading()) {
      <div class="loading">{{ isUa() ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (forms().length === 0) {
      <div class="empty">{{ isUa() ? 'Заявки не знайдено' : 'No forms found' }}</div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th class="th-check">
                <input
                  type="checkbox"
                  [checked]="allOnPageSelected()"
                  (change)="toggleAllOnPage($event)"
                />
              </th>
              <th>#</th>
              <th class="sortable" (click)="toggleSort('trackingNumber')">
                {{ isUa() ? '№ заявки' : 'Tracking №' }}{{ sortIndicator('trackingNumber') }}
              </th>
              <th class="sortable" (click)="toggleSort('createdAt')">
                {{ isUa() ? 'Дата' : 'Date' }}{{ sortIndicator('createdAt') }}
              </th>
              <th class="sortable" (click)="toggleSort('status')">
                {{ isUa() ? 'Статус' : 'Status' }}{{ sortIndicator('status') }}
              </th>
              <th class="sortable" (click)="toggleSort('region')">
                {{ isUa() ? 'Область / громада' : 'Region / community'
                }}{{ sortIndicator('region') }}
              </th>
              <th>{{ isUa() ? 'Обʼєкт' : 'Object' }}</th>
              <th>{{ isUa() ? 'Тип' : 'Type' }}</th>
              <th>{{ isUa() ? 'Категорія' : 'Category' }}</th>
              <th class="sortable" (click)="toggleSort('estimatedCost')">
                {{ isUa() ? 'Бюджет, грн' : 'Budget, UAH' }}{{ sortIndicator('estimatedCost') }}
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (f of forms(); track f.id; let i = $index) {
              <tr
                class="clickable"
                [class.row-selected]="isSelected(f.id)"
                (click)="openDetail(f.id)"
              >
                <td class="td-check" (click)="$event.stopPropagation()">
                  <input
                    type="checkbox"
                    [checked]="isSelected(f.id)"
                    (change)="toggleRow(f.id, $event)"
                  />
                </td>
                <td class="td-num">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                <td class="td-track">{{ f.trackingNumber }}</td>
                <td class="td-date">{{ f.createdAt | date: 'dd.MM.yyyy' }}</td>
                <td>
                  <span class="status-badge" [attr.data-status]="f.status">{{
                    getStatusLabel(f.status)
                  }}</span>
                </td>
                <td class="td-loc">
                  <span class="loc-region">{{ isUa() ? f.region : f.regionEn }}</span>
                  @if (f.community) {
                    <span class="loc-community">{{ isUa() ? f.community : f.communityEn }}</span>
                  }
                </td>
                <td class="td-org">{{ f.objectName }}</td>
                <td>{{ objectTypeLabel(f.objectType) }}</td>
                <td>
                  <span class="cat-badge" [attr.data-cat]="f.damageCategory">{{
                    damageCategoryLabel(f.damageCategory)
                  }}</span>
                </td>
                <td class="td-cost">{{ formatCost(f.estimatedCost) }}</td>
                <td class="td-action"><span class="arrow">&#8250;</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <label class="page-size">
          <span>{{ isUa() ? 'На сторінці:' : 'Per page:' }}</span>
          <select [(ngModel)]="pageSize" (change)="onFilterChange()">
            <option [ngValue]="20">20</option>
            <option [ngValue]="50">50</option>
            <option [ngValue]="100">100</option>
          </select>
        </label>

        @if (totalPages() > 1) {
          <div class="pager">
            <button
              class="btn btn-sm"
              [disabled]="currentPage <= 1"
              (click)="goPage(currentPage - 1)"
            >
              {{ isUa() ? 'Попередня' : 'Previous' }}
            </button>
            <span class="page-info">{{ currentPage }} / {{ totalPages() }}</span>
            <button
              class="btn btn-sm"
              [disabled]="currentPage >= totalPages()"
              (click)="goPage(currentPage + 1)"
            >
              {{ isUa() ? 'Наступна' : 'Next' }}
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .list-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
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
      .btn {
        cursor: pointer;
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-export {
        background: #2b6cb0;
        color: #fff;
        padding: 0.5rem 1.25rem;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .btn-export:not(:disabled):hover {
        background: #2c5282;
      }
      .btn-primary {
        background: #2b6cb0;
        color: #fff;
        padding: 0.4rem 1rem;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .btn-primary:not(:disabled):hover {
        background: #2c5282;
      }
      .btn-link {
        background: transparent;
        border: none;
        color: #2b6cb0;
        font-size: 0.85rem;
        padding: 0.4rem 0.6rem;
      }
      .btn-link:hover {
        text-decoration: underline;
      }

      .filters {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1rem;
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
        min-width: 220px;
      }
      .filter-region {
        width: 150px;
      }
      .filter-date {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.8rem;
        color: #64748b;
      }
      .filter-date input {
        padding: 0.4rem 0.6rem;
      }

      .bulk-bar {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        padding: 0.65rem 1rem;
        margin-bottom: 1rem;
        background: #ebf4ff;
        border: 1px solid #bee3f8;
        border-radius: 6px;
      }
      .bulk-count {
        font-size: 0.85rem;
        color: #1a365d;
        margin-right: auto;
      }
      .bulk-count strong {
        color: #2b6cb0;
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
        font-size: 0.75rem;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .data-table th.sortable {
        cursor: pointer;
        user-select: none;
      }
      .data-table th.sortable:hover {
        color: #1a365d;
      }
      .th-check,
      .td-check {
        width: 32px;
        text-align: center;
      }
      .data-table td {
        padding: 0.65rem 0.5rem;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: top;
      }
      .clickable {
        cursor: pointer;
        transition: background 0.15s;
      }
      .clickable:hover {
        background: #f8fafc;
      }
      .row-selected {
        background: #ebf8ff;
      }
      .row-selected:hover {
        background: #d9edf7;
      }
      .td-num {
        text-align: center;
        color: #64748b;
      }
      .td-track {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.8rem;
        white-space: nowrap;
        color: #1e293b;
      }
      .td-date {
        white-space: nowrap;
        color: #64748b;
        font-size: 0.8rem;
      }
      .td-loc {
        max-width: 180px;
      }
      .loc-region {
        display: block;
      }
      .loc-community {
        display: block;
        font-size: 0.75rem;
        color: #64748b;
      }
      .td-org {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .td-cost {
        text-align: right;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }
      .td-action {
        text-align: center;
      }
      .arrow {
        font-size: 1.2rem;
        color: #94a3b8;
      }

      .status-badge {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        white-space: nowrap;
      }
      [data-status='new'] {
        background: #dbeafe;
        color: #1e40af;
      }
      [data-status='in_review'] {
        background: #fef3c7;
        color: #92400e;
      }
      [data-status='approved'] {
        background: #d1fae5;
        color: #065f46;
      }
      [data-status='rejected'] {
        background: #fee2e2;
        color: #991b1b;
      }
      [data-status='in_progress'] {
        background: #e0e7ff;
        color: #3730a3;
      }
      [data-status='completed'] {
        background: #d1fae5;
        color: #065f46;
      }

      .cat-badge {
        display: inline-block;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        white-space: nowrap;
        background: #f1f5f9;
        color: #475569;
      }
      [data-cat='category_1'] {
        background: #fef9c3;
        color: #854d0e;
      }
      [data-cat='category_2'] {
        background: #fed7aa;
        color: #9a3412;
      }
      [data-cat='category_3'] {
        background: #fecaca;
        color: #991b1b;
      }

      .pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        margin-top: 1.25rem;
        flex-wrap: wrap;
      }
      .page-size {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: #64748b;
      }
      .page-size select {
        padding: 0.3rem 0.5rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        background: #fff;
      }
      .pager {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-left: auto;
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
        .filter-search,
        .filter-region {
          min-width: auto;
          width: 100%;
        }
        .bulk-bar {
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class RecoveryFormsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly isUa = inject(LanguageService).isUa;
  private readonly pageTitle = inject(PageTitleService);

  // Option catalogs (single source = recovery-form.interfaces).
  protected readonly objectTypeOptions = OBJECT_TYPE_OPTIONS;
  protected readonly urgencyOptions = URGENCY_OPTIONS;

  // ───── State ─────
  forms = signal<RecoveryFormSummary[]>([]);
  total = signal(0);
  loading = signal(true);
  totalPages = signal(1);
  exporting = signal(false);
  bulkApplying = signal(false);

  // ───── Filters ─────
  currentPage = 1;
  pageSize = 20;
  searchQuery = '';
  statusFilter = '';
  objectTypeFilter = '';
  urgencyFilter = '';
  regionFilter = '';
  dateFrom = '';
  dateTo = '';

  // ───── Sorting ─────
  sortBy: SortField = 'createdAt';
  sortOrder: SortDir = 'DESC';

  // ───── Bulk selection ─────
  selectedIds = signal<Set<string>>(new Set());
  bulkStatus: RecoveryFormStatus | '' = '';

  allOnPageSelected = computed(() => {
    const sel = this.selectedIds();
    const rows = this.forms();
    return rows.length > 0 && rows.every((r) => sel.has(r.id));
  });
  hasSelection = computed(() => this.selectedIds().size > 0);

  readonly STATUSES: readonly RecoveryFormStatus[] = [
    'new',
    'in_review',
    'approved',
    'rejected',
    'in_progress',
    'completed',
  ];

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadForms();
    this.pageTitle.setTitle('admin_titles.recovery_forms', true);
  }

  loadForms(): void {
    this.loading.set(true);
    const params = new URLSearchParams();
    params.set('page', String(this.currentPage));
    params.set('limit', String(this.pageSize));
    params.set('sortBy', this.sortBy);
    params.set('sortOrder', this.sortOrder);
    if (this.statusFilter) params.set('status', this.statusFilter);
    if (this.objectTypeFilter) params.set('objectType', this.objectTypeFilter);
    if (this.urgencyFilter) params.set('urgency', this.urgencyFilter);
    if (this.regionFilter) params.set('region', this.regionFilter);
    if (this.searchQuery) params.set('search', this.searchQuery);
    if (this.dateFrom) params.set('dateFrom', this.dateFrom);
    if (this.dateTo) params.set('dateTo', this.dateTo);

    this.api.get<PaginatedResponse>(`needs-forms/recovery?${params.toString()}`).subscribe({
      next: (res) => {
        this.forms.set(res.data);
        this.total.set(res.total);
        this.totalPages.set(Math.max(1, Math.ceil(res.total / res.limit)));
        this.loading.set(false);
        this.pruneStaleSelection();
      },
      error: () => this.loading.set(false),
    });
  }

  onSearchChange(): void {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadForms();
    }, 400);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadForms();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.statusFilter ||
      this.objectTypeFilter ||
      this.urgencyFilter ||
      this.regionFilter ||
      this.dateFrom ||
      this.dateTo
    );
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.objectTypeFilter = '';
    this.urgencyFilter = '';
    this.regionFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
    this.loadForms();
  }

  goPage(page: number): void {
    this.currentPage = page;
    this.loadForms();
  }

  toggleSort(field: SortField): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = field;
      this.sortOrder = field === 'createdAt' || field === 'estimatedCost' ? 'DESC' : 'ASC';
    }
    this.loadForms();
  }

  sortIndicator(field: SortField): string {
    if (this.sortBy !== field) return '';
    return this.sortOrder === 'ASC' ? ' ▲' : ' ▼';
  }

  // ───── Selection ─────

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleRow(id: string, ev: Event): void {
    ev.stopPropagation();
    const next = new Set(this.selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selectedIds.set(next);
  }

  toggleAllOnPage(ev: Event): void {
    ev.stopPropagation();
    const next = new Set(this.selectedIds());
    const rows = this.forms();
    if (this.allOnPageSelected()) {
      rows.forEach((r) => next.delete(r.id));
    } else {
      rows.forEach((r) => next.add(r.id));
    }
    this.selectedIds.set(next);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  private pruneStaleSelection(): void {
    const visible = new Set(this.forms().map((f) => f.id));
    const next = new Set<string>();
    this.selectedIds().forEach((id) => {
      if (visible.has(id)) next.add(id);
    });
    if (next.size !== this.selectedIds().size) this.selectedIds.set(next);
  }

  applyBulkStatus(): void {
    if (!this.bulkStatus || this.selectedIds().size === 0) return;
    const ids = Array.from(this.selectedIds());
    const status = this.bulkStatus;
    const confirmMsg = this.isUa()
      ? `Змінити статус для ${ids.length} заявок на «${this.getStatusLabel(status)}»?`
      : `Change status of ${ids.length} forms to "${this.getStatusLabel(status)}"?`;
    if (!confirm(confirmMsg)) return;

    this.bulkApplying.set(true);
    this.api.patch<{ updated: number }>('needs-forms/recovery/bulk', { ids, status }).subscribe({
      next: () => {
        this.bulkApplying.set(false);
        this.bulkStatus = '';
        this.clearSelection();
        this.loadForms();
      },
      error: (err: HttpErrorResponse) => {
        this.bulkApplying.set(false);
        alert((this.isUa() ? 'Помилка: ' : 'Error: ') + (err.error?.message ?? err.message));
      },
    });
  }

  openDetail(id: string): void {
    this.router.navigate(['/admin', 'recovery-forms', id]);
  }

  exportXlsx(): void {
    this.exporting.set(true);
    const params = new URLSearchParams();
    params.set('lang', this.isUa() ? 'ua' : 'en');
    if (this.statusFilter) params.set('status', this.statusFilter);
    if (this.objectTypeFilter) params.set('objectType', this.objectTypeFilter);
    if (this.urgencyFilter) params.set('urgency', this.urgencyFilter);
    if (this.regionFilter) params.set('region', this.regionFilter);
    if (this.searchQuery) params.set('search', this.searchQuery);
    if (this.dateFrom) params.set('dateFrom', this.dateFrom);
    if (this.dateTo) params.set('dateTo', this.dateTo);

    const token = localStorage.getItem('token');
    fetch(`${environment.apiUrl}/api/needs-forms/recovery/export-xlsx?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recovery-forms-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err: Error) => {
        alert((this.isUa() ? 'Помилка експорту: ' : 'Export error: ') + err.message);
      })
      .finally(() => this.exporting.set(false));
  }

  // ───── Label helpers ─────

  getStatusLabel(status: string): string {
    const map: Record<string, [string, string]> = {
      new: ['Нова', 'New'],
      in_review: ['На розгляді', 'In review'],
      approved: ['Затверджено', 'Approved'],
      rejected: ['Відхилено', 'Rejected'],
      in_progress: ['В роботі', 'In progress'],
      completed: ['Завершено', 'Completed'],
    };
    const v = map[status];
    return v ? (this.isUa() ? v[0] : v[1]) : status;
  }

  objectTypeLabel(value: string): string {
    const o = this.objectTypeOptions.find((x) => x.value === value);
    return o ? (this.isUa() ? o.ua : o.en) : value;
  }

  damageCategoryLabel(value: string): string {
    const o = DAMAGE_CATEGORY_OPTIONS.find((x) => x.value === value);
    return o ? (this.isUa() ? o.ua : o.en) : value;
  }

  formatCost(value: number | string): string {
    const n = Number(value);
    if (!isFinite(n)) return '—';
    return n.toLocaleString(this.isUa() ? 'uk-UA' : 'en-US');
  }
}
