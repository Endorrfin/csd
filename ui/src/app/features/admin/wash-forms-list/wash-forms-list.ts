import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';

interface WashFormSummary {
  id: string;
  region: string;
  organizationName: string;
  headName: string;
  email: string;
  objectName: string;
  dependentPopulation: number;
  status: string;
  createdAt: string;
  items: unknown[];
  boreholeDrilling: unknown | null;
  waterTower: unknown | null;
  purificationSystem: unknown | null;
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
      <h2>{{ isUa ? 'WASH Заявки' : 'WASH Forms' }}
        @if (total() > 0) { <span class="count">({{ total() }})</span> }
      </h2>
      <button class="btn btn-export" (click)="exportCsv()">
        {{ isUa ? 'Експорт CSV' : 'Export CSV' }}
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input
        [placeholder]="isUa ? 'Пошук по організації, ПІБ, email...' : 'Search by org, name, email...'"
        [(ngModel)]="searchQuery"
        (input)="onSearchChange()"
        class="filter-input filter-search"
      />
      <select [(ngModel)]="statusFilter" (change)="loadForms()" class="filter-input">
        <option value="">{{ isUa ? 'Всі статуси' : 'All statuses' }}</option>
        <option value="new">{{ isUa ? 'Нова' : 'New' }}</option>
        <option value="in_review">{{ isUa ? 'На розгляді' : 'In review' }}</option>
        <option value="approved">{{ isUa ? 'Затверджено' : 'Approved' }}</option>
        <option value="rejected">{{ isUa ? 'Відхилено' : 'Rejected' }}</option>
        <option value="in_progress">{{ isUa ? 'В роботі' : 'In progress' }}</option>
        <option value="completed">{{ isUa ? 'Завершено' : 'Completed' }}</option>
      </select>
      <input
        [placeholder]="isUa ? 'Область' : 'Region'"
        [(ngModel)]="regionFilter"
        (input)="onSearchChange()"
        class="filter-input"
      />
    </div>

    @if (loading()) {
      <div class="loading">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (forms().length === 0) {
      <div class="empty">{{ isUa ? 'Заявки не знайдено' : 'No forms found' }}</div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ isUa ? 'Дата' : 'Date' }}</th>
              <th>{{ isUa ? 'Статус' : 'Status' }}</th>
              <th>{{ isUa ? 'Область' : 'Region' }}</th>
              <th>{{ isUa ? 'Організація' : 'Organization' }}</th>
              <th>{{ isUa ? 'Обʼєкт' : 'Object' }}</th>
              <th>{{ isUa ? 'Людей' : 'People' }}</th>
              <th>{{ isUa ? 'Розділи' : 'Sections' }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (f of forms(); track f.id; let i = $index) {
              <tr class="clickable" (click)="openDetail(f.id)">
                <td class="td-num">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                <td class="td-date">{{ f.createdAt | date:'dd.MM.yyyy' }}</td>
                <td><span class="status-badge" [attr.data-status]="f.status">{{ getStatusLabel(f.status) }}</span></td>
                <td>{{ f.region }}</td>
                <td class="td-org">{{ f.organizationName }}</td>
                <td>{{ f.objectName }}</td>
                <td class="td-num">{{ f.dependentPopulation }}</td>
                <td class="td-sections">{{ getSections(f) }}</td>
                <td class="td-action">
                  <span class="arrow">&#8250;</span>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (totalPages() > 1) {
        <div class="pagination">
          <button class="btn btn-sm" [disabled]="currentPage <= 1" (click)="goPage(currentPage - 1)">
            {{ isUa ? 'Попередня' : 'Previous' }}
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages() }}</span>
          <button class="btn btn-sm" [disabled]="currentPage >= totalPages()" (click)="goPage(currentPage + 1)">
            {{ isUa ? 'Наступна' : 'Next' }}
          </button>
        </div>
      }
    }
  `,
  styles: [`
    .list-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; }
    .list-header h2 { font-size:1.2rem; font-weight:600; color:#1a365d; margin:0; }
    .count { color:#64748b; font-weight:400; }
    .btn-export { background:#2b6cb0; color:#fff; padding:.5rem 1.25rem; border:none; border-radius:6px; font-size:.85rem; font-weight:500; cursor:pointer; }
    .btn-export:hover { background:#2c5282; }
    .filters { display:flex; gap:.75rem; margin-bottom:1.25rem; flex-wrap:wrap; }
    .filter-input { padding:.5rem .75rem; border:1px solid #cbd5e0; border-radius:6px; font-size:.85rem; }
    .filter-search { flex:1; min-width:200px; }
    .table-wrap { overflow-x:auto; }
    .data-table { width:100%; border-collapse:collapse; font-size:.85rem; }
    .data-table th { text-align:left; padding:.65rem .5rem; border-bottom:2px solid #e2e8f0; color:#64748b; font-weight:600; font-size:.75rem; text-transform:uppercase; white-space:nowrap; }
    .data-table td { padding:.65rem .5rem; border-bottom:1px solid #f1f5f9; }
    .clickable { cursor:pointer; transition:background .15s; }
    .clickable:hover { background:#f8fafc; }
    .td-num { text-align:center; color:#64748b; }
    .td-date { white-space:nowrap; color:#64748b; font-size:.8rem; }
    .td-org { max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .td-sections { font-size:.75rem; color:#64748b; }
    .td-action { text-align:center; }
    .arrow { font-size:1.2rem; color:#94a3b8; }
    .status-badge { display:inline-block; padding:.2rem .6rem; border-radius:4px; font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.03em; }
    [data-status="new"] { background:#dbeafe; color:#1e40af; }
    [data-status="in_review"] { background:#fef3c7; color:#92400e; }
    [data-status="approved"] { background:#d1fae5; color:#065f46; }
    [data-status="rejected"] { background:#fee2e2; color:#991b1b; }
    [data-status="in_progress"] { background:#e0e7ff; color:#3730a3; }
    [data-status="completed"] { background:#d1fae5; color:#065f46; }
    .pagination { display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:1.25rem; }
    .page-info { font-size:.85rem; color:#64748b; }
    .btn-sm { padding:.4rem 1rem; border:1px solid #cbd5e0; background:#fff; border-radius:6px; font-size:.8rem; cursor:pointer; }
    .btn-sm:disabled { opacity:.4; cursor:not-allowed; }
    .btn-sm:not(:disabled):hover { background:#f8fafc; }
    .loading,.empty { text-align:center; padding:3rem; color:#64748b; font-size:.95rem; }
    @media (max-width:768px) {
      .filters { flex-direction:column; }
      .filter-search { min-width:auto; }
    }
  `],
})
export class WashFormsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  get isUa(): boolean { return (this.translate.currentLang || 'ua') === 'ua'; }

  forms = signal<WashFormSummary[]>([]);
  total = signal(0);
  loading = signal(true);
  totalPages = signal(1);

  currentPage = 1;
  pageSize = 20;
  searchQuery = '';
  statusFilter = '';
  regionFilter = '';
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.loadForms(); }

  loadForms(): void {
    this.loading.set(true);
    const params: string[] = [`page=${this.currentPage}`, `limit=${this.pageSize}`];
    if (this.statusFilter) params.push(`status=${this.statusFilter}`);
    if (this.regionFilter) params.push(`region=${this.regionFilter}`);
    if (this.searchQuery) params.push(`search=${this.searchQuery}`);

    this.api.get<PaginatedResponse>(`needs-forms/wash?${params.join('&')}`).subscribe({
      next: (res) => {
        this.forms.set(res.data);
        this.total.set(res.total);
        this.totalPages.set(Math.ceil(res.total / res.limit));
        this.loading.set(false);
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

  goPage(page: number): void {
    this.currentPage = page;
    this.loadForms();
  }

  openDetail(id: string): void {
    this.router.navigate(['/admin', 'wash-forms', id]);
  }

  exportCsv(): void {
    const params: string[] = [];
    if (this.statusFilter) params.push(`status=${this.statusFilter}`);
    if (this.regionFilter) params.push(`region=${this.regionFilter}`);
    const qs = params.length ? `?${params.join('&')}` : '';
    const token = localStorage.getItem('token');

    // Direct download via fetch with auth header
    fetch(`${environment.apiUrl}/api/needs-forms/wash/export${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wash-forms-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  getStatusLabel(status: string): string {
    const map: Record<string, [string, string]> = {
      new: ['Нова', 'New'], in_review: ['На розгляді', 'In review'],
      approved: ['Затверджено', 'Approved'], rejected: ['Відхилено', 'Rejected'],
      in_progress: ['В роботі', 'In progress'], completed: ['Завершено', 'Completed'],
    };
    const v = map[status];
    return v ? (this.isUa ? v[0] : v[1]) : status;
  }

  getSections(f: WashFormSummary): string {
    const parts: string[] = [];
    if (f.boreholeDrilling) parts.push(this.isUa ? 'Бур.' : 'Bore');
    if (f.waterTower) parts.push(this.isUa ? 'Башта' : 'Tower');
    if (f.purificationSystem) parts.push(this.isUa ? 'Очищ.' : 'Purif');
    if (f.items?.length) parts.push(`${f.items.length} ${this.isUa ? 'поз.' : 'items'}`);
    return parts.join(', ') || '---';
  }
}
