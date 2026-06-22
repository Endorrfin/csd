import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import {
  ComplaintCategory,
  ComplaintItem,
  ComplaintStatus,
  PaginatedComplaints,
} from '../../cooperation/complaint/complaint.interfaces';
import { ComplaintDrawerComponent } from './complaint-drawer';
import { environment } from '../../../../environments/environment';
import { PageTitleService } from '../../../core/services/page-title.service';

const STATUSES: ComplaintStatus[] = [
  ComplaintStatus.NEW,
  ComplaintStatus.IN_REVIEW,
  ComplaintStatus.RESOLVED,
  ComplaintStatus.CLOSED,
];

const CATEGORIES: ComplaintCategory[] = [
  ComplaintCategory.SERVICE_QUALITY,
  ComplaintCategory.STAFF_BEHAVIOR,
  ComplaintCategory.CORRUPTION,
  ComplaintCategory.DELAY,
  ComplaintCategory.OTHER,
];

// Statuses that REQUIRE managerNotes (resolved = what was done; closed = summary)
const NOTES_REQUIRED_STATUSES: ComplaintStatus[] = [
  ComplaintStatus.RESOLVED,
  ComplaintStatus.CLOSED,
];

interface NotesModalState {
  item: ComplaintItem;
  targetStatus: ComplaintStatus;
  notes: string;
}

@Component({
  selector: 'app-admin-complaints-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ComplaintDrawerComponent],
  template: `
    <div class="list-header">
      <h2>
        {{ isUa ? 'Скарги' : 'Complaints' }}
        @if (total() > 0) {
          <span class="count">({{ total() }})</span>
        }
      </h2>
      <button type="button" class="btn-export" (click)="exportCsv()">
        {{ isUa ? 'Експорт CSV' : 'Export CSV' }}
      </button>
    </div>

    <div class="filters">
      <input
        [placeholder]="isUa ? 'Пошук за описом...' : 'Search by description...'"
        [(ngModel)]="searchQuery"
        (input)="onSearchChange()"
        class="filter-input filter-search"
      />
      <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa ? 'Всі статуси' : 'All statuses' }}</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ 'complaint.status.' + s | translate }}</option>
        }
      </select>
      <select [(ngModel)]="categoryFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa ? 'Всі категорії' : 'All categories' }}</option>
        @for (c of categories; track c) {
          <option [value]="c">{{ 'complaint.category.' + c | translate }}</option>
        }
      </select>
      <label
        class="filter-checkbox"
        [title]="isUa ? 'Показати телефон та email' : 'Show phone and email'"
      >
        <input type="checkbox" [(ngModel)]="showContactInfo" />
        {{ isUa ? 'Показати PII' : 'Show contact info' }}
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
      <div class="empty">{{ isUa ? 'Скарг не знайдено' : 'No complaints found' }}</div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ isUa ? 'Дата' : 'Date' }}</th>
              <th>{{ isUa ? 'Статус' : 'Status' }}</th>
              <th>{{ isUa ? 'Категорія' : 'Category' }}</th>
              <th>{{ isUa ? 'Опис' : 'Description' }}</th>
              @if (showContactInfo) {
                <th>{{ isUa ? 'Контакти' : 'Contact' }}</th>
              }
              <th class="th-center">📎</th>
              <th class="th-actions">{{ isUa ? 'Дії' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id; let i = $index) {
              <tr class="clickable" (click)="openDrawer(item)">
                <td class="td-num">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                <td class="td-date">{{ item.createdAt | date: 'dd.MM.yyyy' }}</td>

                <td (click)="$event.stopPropagation()">
                  <select
                    [ngModel]="item.status"
                    (ngModelChange)="onStatusChange(item, $event)"
                    [disabled]="savingId() === item.id"
                    class="status-select"
                    [attr.data-status]="item.status"
                  >
                    @for (s of statuses; track s) {
                      <option [value]="s">{{ 'complaint.status.' + s | translate }}</option>
                    }
                  </select>
                </td>

                <td class="td-category">
                  {{ 'complaint.category.' + item.category | translate }}
                </td>

                <td class="td-description">
                  {{ truncate(item.description, 120) }}
                  @if (item.managerNotes) {
                    <span class="notes-marker" [title]="item.managerNotes">📝</span>
                  }
                </td>

                @if (showContactInfo) {
                  <td class="td-pii">
                    @if (item.phone) {
                      <div>{{ item.phone }}</div>
                    }
                    @if (item.email) {
                      <div class="td-pii-email">{{ item.email }}</div>
                    }
                    @if (!item.phone && !item.email) {
                      —
                    }
                  </td>
                }

                <td class="td-center">
                  @if (item.attachments?.length) {
                    <span class="attach-count">{{ item.attachments?.length }}</span>
                  } @else {
                    —
                  }
                </td>

                <td class="td-actions" (click)="$event.stopPropagation()">
                  @if (item.status === 'closed') {
                    <button
                      type="button"
                      class="action-btn action-delete"
                      [disabled]="savingId() === item.id"
                      (click)="onDelete(item)"
                      [title]="isUa ? 'Видалити закриту скаргу' : 'Delete closed complaint'"
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

    <!-- Status change modal with notes -->
    @if (notesModal()) {
      <!-- keyboard a11y — close on Enter/Space, focusable role=button -->
      <div
        class="modal-overlay"
        role="button"
        tabindex="0"
        (click)="closeNotesModal()"
        (keydown.enter)="closeNotesModal()"
        (keydown.space)="closeNotesModal(); $event.preventDefault()"
      >
        <!-- stop key/click bubbling to overlay; tabindex=-1 keeps it focusable (a11y) -->
        <div
          class="modal"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
        >
          <h3>
            {{ isUa ? 'Примітки менеджера' : 'Manager notes' }}
          </h3>
          <p class="modal-hint">
            @if (notesModal()!.targetStatus === 'resolved') {
              {{
                isUa
                  ? 'Опишіть, як було вирішено скаргу.'
                  : 'Describe how the complaint was resolved.'
              }}
            } @else if (notesModal()!.targetStatus === 'closed') {
              {{ isUa ? 'Фінальне резюме реагування.' : 'Final response summary.' }}
            } @else {
              {{ isUa ? 'Опційні примітки.' : 'Optional notes.' }}
            }
          </p>
          <textarea
            [(ngModel)]="notesModal()!.notes"
            [placeholder]="isUa ? 'Що було зроблено...' : 'What was done...'"
            rows="5"
            class="modal-textarea"
          ></textarea>
          <div class="modal-actions">
            <button type="button" class="btn-sm" (click)="closeNotesModal()">
              {{ isUa ? 'Скасувати' : 'Cancel' }}
            </button>
            <button
              type="button"
              class="btn-primary"
              [disabled]="!isNotesValid()"
              (click)="confirmStatusChange()"
            >
              {{ isUa ? 'Підтвердити' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Detail drawer -->
    @if (selectedItem()) {
      <app-complaint-drawer [item]="selectedItem()!" (closed)="closeDrawer()" />
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
      .btn-export {
        background: #2b6cb0;
        color: #fff;
        padding: 0.5rem 1.25rem;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
      }
      .btn-export:hover {
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
        vertical-align: top;
      }
      .th-center,
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
      .td-center {
        text-align: center;
      }
      .td-category {
        color: #475569;
        font-size: 0.8rem;
        white-space: nowrap;
      }
      .td-description {
        max-width: 360px;
        color: #334155;
        line-height: 1.4;
      }
      .td-pii {
        font-size: 0.8rem;
        color: #475569;
        white-space: nowrap;
      }
      .td-pii-email {
        color: #2b6cb0;
      }
      .notes-marker {
        cursor: help;
        margin-left: 0.25rem;
      }
      .attach-count {
        display: inline-block;
        min-width: 22px;
        padding: 0.1rem 0.4rem;
        background: #dbeafe;
        color: #1e40af;
        border-radius: 10px;
        font-size: 0.7rem;
        font-weight: 600;
      }

      .clickable {
        cursor: pointer;
        transition: background 0.15s;
      }
      .clickable:hover {
        background: #f8fafc;
      }

      /* Status palette — 4 unique colors */
      .status-select {
        padding: 0.25rem 0.5rem;
        border: 1px solid transparent;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        cursor: pointer;
        min-width: 105px;
      }
      .status-select:disabled {
        opacity: 0.5;
        cursor: wait;
      }
      .status-select[data-status='new'] {
        background: #dbeafe;
        color: #1e40af;
      } /* blue */
      .status-select[data-status='in_review'] {
        background: #fef3c7;
        color: #92400e;
      } /* amber */
      .status-select[data-status='resolved'] {
        background: #d1fae5;
        color: #065f46;
      } /* green */
      .status-select[data-status='closed'] {
        background: #e2e8f0;
        color: #475569;
      } /* slate */

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
        border-radius: 4px;
        font-size: 0.85rem;
        cursor: pointer;
        border: 1px solid transparent;
        background: transparent;
        transition: all 0.15s;
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

      .btn-primary {
        padding: 0.5rem 1rem;
        background: #2b6cb0;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        cursor: pointer;
      }
      .btn-primary:hover:not(:disabled) {
        background: #2c5282;
      }
      .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .loading,
      .empty {
        text-align: center;
        padding: 3rem;
        color: #64748b;
        font-size: 0.95rem;
      }

      /* Modal */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }
      .modal {
        background: #fff;
        border-radius: 8px;
        padding: 1.5rem;
        width: 100%;
        max-width: 480px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      }
      .modal h3 {
        margin: 0 0 0.5rem;
        font-size: 1.1rem;
        color: #1a365d;
      }
      .modal-hint {
        font-size: 0.8rem;
        color: #64748b;
        margin: 0 0 1rem;
      }
      .modal-textarea {
        width: 100%;
        padding: 0.65rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-family: inherit;
        font-size: 0.9rem;
        resize: vertical;
      }
      .modal-textarea:focus {
        outline: none;
        border-color: #2b6cb0;
        box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        margin-top: 1rem;
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
export class AdminComplaintsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);

  readonly statuses = STATUSES;
  readonly categories = CATEGORIES;

  // === ADDED: Page title service for SEO ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  items = signal<ComplaintItem[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  savingId = signal<string | null>(null);
  successMessage = signal('');
  errorMessage = signal('');

  selectedItem = signal<ComplaintItem | null>(null);
  notesModal = signal<NotesModalState | null>(null);

  currentPage = 1;
  pageSize = 20;
  searchQuery = '';
  statusFilter: ComplaintStatus | '' = '';
  categoryFilter: ComplaintCategory | '' = '';
  showContactInfo = false;

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  ngOnInit(): void {
    this.loadItems();
    this.pageTitle.setTitle('admin_titles.complaints', true);
  }

  loadItems(): void {
    this.loading.set(true);
    const params = this.buildQueryParams();

    this.api.get<PaginatedComplaints>(`complaints/admin/list?${params.join('&')}`).subscribe({
      next: (res) => {
        this.items.set(res.data);
        this.total.set(res.total);
        this.totalPages.set(Math.max(1, Math.ceil(res.total / res.limit)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private buildQueryParams(): string[] {
    const params: string[] = [`page=${this.currentPage}`, `limit=${this.pageSize}`];
    if (this.statusFilter) params.push(`status=${this.statusFilter}`);
    if (this.categoryFilter) params.push(`category=${this.categoryFilter}`);
    if (this.searchQuery) params.push(`search=${encodeURIComponent(this.searchQuery)}`);
    return params;
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

  truncate(text: string, max: number): string {
    if (!text) return '';
    return text.length <= max ? text : text.slice(0, max) + '…';
  }

  openDrawer(item: ComplaintItem): void {
    this.selectedItem.set(item);
  }

  closeDrawer(): void {
    this.selectedItem.set(null);
  }

  onStatusChange(item: ComplaintItem, newStatus: ComplaintStatus): void {
    if (newStatus === item.status) return;

    // resolved / closed → always open modal (notes required)
    // in_review / new → open modal with optional notes (pre-filled with existing if any)
    this.notesModal.set({
      item,
      targetStatus: newStatus,
      notes: item.managerNotes || '',
    });

    // Revert dropdown UI until modal confirms
    this.items.update((list) => [...list]);
  }

  isNotesValid(): boolean {
    const state = this.notesModal();
    if (!state) return false;

    // Required for resolved + closed; optional for new + in_review
    if (NOTES_REQUIRED_STATUSES.includes(state.targetStatus)) {
      return state.notes.trim().length > 0;
    }
    return true;
  }

  closeNotesModal(): void {
    this.notesModal.set(null);
  }

  confirmStatusChange(): void {
    const state = this.notesModal();
    if (!state || !this.isNotesValid()) return;

    const { item, targetStatus, notes } = state;
    this.savingId.set(item.id);
    this.clearMessages();

    const body: { status: ComplaintStatus; managerNotes?: string } = { status: targetStatus };
    // Only send notes if provided (don't overwrite existing with empty string)
    if (notes.trim()) body.managerNotes = notes.trim();

    this.api.patch<ComplaintItem>(`complaints/${item.id}/status`, body).subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
        // If drawer is showing this item, refresh it too
        if (this.selectedItem()?.id === updated.id) {
          this.selectedItem.set(updated);
        }
        this.savingId.set(null);
        const label = this.translate.instant('complaint.status.' + targetStatus);
        this.flashSuccess(
          this.isUa ? `Статус оновлено: "${label}"` : `Status updated to "${label}"`,
        );
      },
      error: (err) => {
        this.savingId.set(null);
        this.flashError(err?.error?.message || 'Error');
      },
    });

    this.closeNotesModal();
  }

  onDelete(item: ComplaintItem): void {
    const confirmMsg = this.isUa
      ? `Видалити закриту скаргу? Цю дію не можна скасувати.`
      : `Delete closed complaint? This cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    this.savingId.set(item.id);
    this.clearMessages();

    this.api.delete(`complaints/${item.id}`).subscribe({
      next: () => {
        this.items.update((list) => list.filter((c) => c.id !== item.id));
        this.total.update((n) => n - 1);
        if (this.selectedItem()?.id === item.id) this.closeDrawer();
        this.savingId.set(null);
        this.flashSuccess(this.isUa ? 'Скаргу видалено' : 'Complaint deleted');
      },
      error: (err) => {
        this.savingId.set(null);
        this.flashError(err?.error?.message || 'Error');
      },
    });
  }

  // CSV export via direct fetch (auth header needed, download via Blob)
  exportCsv(): void {
    const lang = this.isUa ? 'ua' : 'en';
    const params: string[] = [`lang=${lang}`];
    if (this.statusFilter) params.push(`status=${this.statusFilter}`);
    if (this.categoryFilter) params.push(`category=${this.categoryFilter}`);
    if (this.searchQuery) params.push(`search=${encodeURIComponent(this.searchQuery)}`);

    const token = localStorage.getItem('token');
    fetch(`${environment.apiUrl}/api/complaints/admin/export?${params.join('&')}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => this.flashError(this.isUa ? 'Помилка експорту' : 'Export failed'));
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
