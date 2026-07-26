import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
import { PageTitleService } from '../../../core/services/page-title.service';
// typed status + sortable field keys
type FormStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'in_progress' | 'completed';

type SortField = 'createdAt' | 'organizationName' | 'region' | 'dependentPopulation' | 'status';
type SortDir = 'ASC' | 'DESC';

// align with new multi-section schema (arrays, not singular)
interface WashFormSummary {
  id: string;
  region: string;
  organizationName: string;
  headName: string;
  email: string;
  objectName: string;
  dependentPopulation: number;
  status: FormStatus;
  createdAt: string;
  items: unknown[];
  boreholes?: unknown[];
  towers?: unknown[];
  purifications?: unknown[];
  pumps?: unknown[];
}

interface PaginatedResponse {
  data: WashFormSummary[];
  total: number;
  page: number;
  limit: number;
}

@Component({
  selector: 'app-wash-forms-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="list-header">
      <h2>
        {{ isUa ? 'WASH' : 'WASH Forms' }}
        @if (total() > 0) {
          <span class="count">({{ total() }})</span>
        }
      </h2>
      <!-- CSV → XLSX, with disabled state during download -->
      <button class="btn btn-export" (click)="exportXlsx()" [disabled]="exporting()">
        @if (exporting()) {
          {{ isUa ? 'Експортується...' : 'Exporting...' }}
        } @else {
          {{ isUa ? 'Експорт XLSX' : 'Export XLSX' }}
        }
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input
        [placeholder]="
          isUa ? 'Пошук по організації, ПІБ, email...' : 'Search by org, name, email...'
        "
        [(ngModel)]="searchQuery"
        (input)="onSearchChange()"
        class="filter-input filter-search"
      />
      <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa ? 'Всі статуси' : 'All statuses' }}</option>
        @for (s of STATUSES; track s) {
          <option [value]="s">{{ getStatusLabel(s) }}</option>
        }
      </select>
      <input
        [placeholder]="isUa ? 'Область' : 'Region'"
        [(ngModel)]="regionFilter"
        (input)="onSearchChange()"
        class="filter-input filter-region"
      />
      <!-- date range -->
      <label class="filter-date">
        <span>{{ isUa ? 'Від' : 'From' }}</span>
        <input
          type="date"
          [(ngModel)]="dateFrom"
          (change)="onFilterChange()"
          class="filter-input"
        />
      </label>
      <label class="filter-date">
        <span>{{ isUa ? 'До' : 'To' }}</span>
        <input type="date" [(ngModel)]="dateTo" (change)="onFilterChange()" class="filter-input" />
      </label>
      @if (hasActiveFilters()) {
        <button class="btn btn-link" (click)="clearFilters()">
          {{ isUa ? 'Скинути фільтри' : 'Clear filters' }}
        </button>
      }
    </div>

    <!-- Bulk action bar — appears only when selection exists -->
    @if (hasSelection()) {
      <div class="bulk-bar">
        <span class="bulk-count">
          {{ isUa ? 'Вибрано:' : 'Selected:' }} <strong>{{ selectedIds().size }}</strong>
        </span>
        <select [(ngModel)]="bulkStatus" class="filter-input">
          <option value="">{{ isUa ? 'Змінити статус на...' : 'Change status to...' }}</option>
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
            {{ isUa ? 'Застосовується...' : 'Applying...' }}
          } @else {
            {{ isUa ? 'Застосувати' : 'Apply' }}
          }
        </button>
        <button class="btn btn-link" (click)="clearSelection()">
          {{ isUa ? 'Скасувати' : 'Cancel' }}
        </button>
      </div>
    }

    @if (loading()) {
      <div class="loading">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (forms().length === 0) {
      <div class="empty">{{ isUa ? 'Заявки не знайдено' : 'No forms found' }}</div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <!-- select-all checkbox -->
              <th class="th-check">
                <input
                  type="checkbox"
                  [checked]="allOnPageSelected()"
                  (change)="toggleAllOnPage($event)"
                />
              </th>
              <th>#</th>
              <!-- sortable headers -->
              <th class="sortable" (click)="toggleSort('createdAt')">
                {{ isUa ? 'Дата' : 'Date' }}{{ sortIndicator('createdAt') }}
              </th>
              <th class="sortable" (click)="toggleSort('status')">
                {{ isUa ? 'Статус' : 'Status' }}{{ sortIndicator('status') }}
              </th>
              <th class="sortable" (click)="toggleSort('region')">
                {{ isUa ? 'Область' : 'Region' }}{{ sortIndicator('region') }}
              </th>
              <th class="sortable" (click)="toggleSort('organizationName')">
                {{ isUa ? 'Організація' : 'Organization' }}{{ sortIndicator('organizationName') }}
              </th>
              <th>{{ isUa ? 'Обʼєкт' : 'Object' }}</th>
              <th class="sortable" (click)="toggleSort('dependentPopulation')">
                {{ isUa ? 'Людей' : 'People' }}{{ sortIndicator('dependentPopulation') }}
              </th>
              <th>{{ isUa ? 'Розділи' : 'Sections' }}</th>
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
                <!-- row checkbox — stops propagation so it doesn't open detail -->
                <td class="td-check" (click)="$event.stopPropagation()">
                  <input
                    type="checkbox"
                    [checked]="isSelected(f.id)"
                    (change)="toggleRow(f.id, $event)"
                  />
                </td>
                <td class="td-num">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                <td class="td-date">{{ f.createdAt | date: 'dd.MM.yyyy' }}</td>
                <td>
                  <span class="status-badge" [attr.data-status]="f.status">{{
                    getStatusLabel(f.status)
                  }}</span>
                </td>
                <td>{{ f.region }}</td>
                <td class="td-org">{{ f.organizationName }}</td>
                <td>{{ f.objectName }}</td>
                <td class="td-num">{{ f.dependentPopulation }}</td>
                <td class="td-sections">{{ getSections(f) }}</td>
                <td class="td-action"><span class="arrow">&#8250;</span></td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination">
        <!-- page size selector -->
        <label class="page-size">
          <span>{{ isUa ? 'На сторінці:' : 'Per page:' }}</span>
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
              {{ isUa ? 'Попередня' : 'Previous' }}
            </button>
            <span class="page-info">{{ currentPage }} / {{ totalPages() }}</span>
            <button
              class="btn btn-sm"
              [disabled]="currentPage >= totalPages()"
              (click)="goPage(currentPage + 1)"
            >
              {{ isUa ? 'Наступна' : 'Next' }}
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
        min-width: 200px;
      }
      .filter-region {
        width: 160px;
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

      /* bulk action bar */
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
      .td-date {
        white-space: nowrap;
        color: #64748b;
        font-size: 0.8rem;
      }
      .td-org {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .td-sections {
        font-size: 0.75rem;
        color: #64748b;
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
export class WashFormsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  // === ADDED: Page title service for SEO ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  // ───── State ─────
  forms = signal<WashFormSummary[]>([]);
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
  regionFilter = '';
  dateFrom = ''; // NEW
  dateTo = ''; // NEW

  // ───── Sorting ─────
  sortBy: SortField = 'createdAt'; // NEW
  sortOrder: SortDir = 'DESC'; // NEW

  // ───── Bulk selection ─────
  selectedIds = signal<Set<string>>(new Set()); // NEW
  bulkStatus: FormStatus | '' = ''; // NEW

  // derived flags
  allOnPageSelected = computed(() => {
    const sel = this.selectedIds();
    const rows = this.forms();
    return rows.length > 0 && rows.every((r) => sel.has(r.id));
  });
  hasSelection = computed(() => this.selectedIds().size > 0);

  readonly STATUSES: readonly FormStatus[] = [
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
    this.pageTitle.setTitle('admin_titles.wash_forms', true);
  }

  // URLSearchParams (safer encoding) + sort + date range params
  loadForms(): void {
    this.loading.set(true);
    const params = new URLSearchParams();
    params.set('page', String(this.currentPage));
    params.set('limit', String(this.pageSize));
    params.set('sortBy', this.sortBy);
    params.set('sortOrder', this.sortOrder);
    if (this.statusFilter) params.set('status', this.statusFilter);
    if (this.regionFilter) params.set('region', this.regionFilter);
    if (this.searchQuery) params.set('search', this.searchQuery);
    if (this.dateFrom) params.set('dateFrom', this.dateFrom);
    if (this.dateTo) params.set('dateTo', this.dateTo);

    this.api.get<PaginatedResponse>(`needs-forms/wash?${params.toString()}`).subscribe({
      next: (res) => {
        this.forms.set(res.data);
        this.total.set(res.total);
        this.totalPages.set(Math.max(1, Math.ceil(res.total / res.limit)));
        this.loading.set(false);
        this.pruneStaleSelection(); // NEW
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

  // instant filter changes (status / dates / page size)
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadForms();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.statusFilter ||
      this.regionFilter ||
      this.dateFrom ||
      this.dateTo
    );
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
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

  // header click → toggle direction or switch column with sensible default
  toggleSort(field: SortField): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    } else {
      this.sortBy = field;
      this.sortOrder = field === 'createdAt' || field === 'dependentPopulation' ? 'DESC' : 'ASC';
    }
    this.loadForms();
  }

  sortIndicator(field: SortField): string {
    if (this.sortBy !== field) return '';
    return this.sortOrder === 'ASC' ? ' ▲' : ' ▼';
  }

  // ───── Selection ─────  (all NEW below)

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

  /** Drop selected IDs that are no longer visible (after filter/page change). */
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
    const confirmMsg = this.isUa
      ? `Змінити статус для ${ids.length} заявок на «${this.getStatusLabel(status)}»?`
      : `Change status of ${ids.length} forms to "${this.getStatusLabel(status)}"?`;
    if (!confirm(confirmMsg)) return;

    this.bulkApplying.set(true);
    this.api
      .patch<{ updated: number; skipped: number }>('needs-forms/wash/bulk', { ids, status })
      .subscribe({
        next: () => {
          this.bulkApplying.set(false);
          this.bulkStatus = '';
          this.clearSelection();
          this.loadForms();
        },
        error: (err: HttpErrorResponse) => {
          this.bulkApplying.set(false);
          alert((this.isUa ? 'Помилка: ' : 'Error: ') + (err.error?.message ?? err.message));
        },
      });
  }

  openDetail(id: string): void {
    this.router.navigate(['/admin', 'wash-forms', id]);
  }

  // CSV → XLSX, with loading/error handling and URLSearchParams
  exportXlsx(): void {
    this.exporting.set(true);
    const params = new URLSearchParams();
    params.set('lang', this.isUa ? 'ua' : 'en');
    if (this.statusFilter) params.set('status', this.statusFilter);
    if (this.regionFilter) params.set('region', this.regionFilter);
    if (this.searchQuery) params.set('search', this.searchQuery);
    if (this.dateFrom) params.set('dateFrom', this.dateFrom);
    if (this.dateTo) params.set('dateTo', this.dateTo);

    const token = localStorage.getItem('token');
    fetch(`${environment.apiUrl}/api/needs-forms/wash/export-xlsx?${params}`, {
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
        a.download = `wash-forms-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err: Error) => {
        alert((this.isUa ? 'Помилка експорту: ' : 'Export error: ') + err.message);
      })
      .finally(() => this.exporting.set(false));
  }

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
    return v ? (this.isUa ? v[0] : v[1]) : status;
  }

  // now reads array lengths (boreholes/towers/purifications/pumps)
  getSections(f: WashFormSummary): string {
    const parts: string[] = [];
    if (f.boreholes?.length) parts.push(`${this.isUa ? 'Бур.' : 'Bore'} ${f.boreholes.length}`);
    if (f.towers?.length) parts.push(`${this.isUa ? 'Башта' : 'Tower'} ${f.towers.length}`);
    if (f.purifications?.length)
      parts.push(`${this.isUa ? 'Очищ.' : 'Purif'} ${f.purifications.length}`);
    if (f.pumps?.length) parts.push(`${this.isUa ? 'Помпа' : 'Pump'} ${f.pumps.length}`);
    if (f.items?.length) parts.push(`${f.items.length} ${this.isUa ? 'поз.' : 'items'}`);
    return parts.join(', ') || '---';
  }
}
