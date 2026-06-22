import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/services/language.service';
import { environment } from '../../../../environments/environment';
import {
  InquiryItem,
  InquiryReason,
  InquiryStatus,
  PaginatedInquiries,
} from './inquiry.interfaces';
import { InquiryDrawerComponent } from './inquiry-drawer';
import { PageTitleService } from '../../../core/services/page-title.service';

const STATUSES: InquiryStatus[] = [
  InquiryStatus.NEW,
  InquiryStatus.READ,
  InquiryStatus.REPLIED,
  InquiryStatus.ARCHIVED,
];

const REASONS: InquiryReason[] = [
  InquiryReason.PARTNERSHIP,
  InquiryReason.VOLUNTEERING,
  InquiryReason.PRESS,
  InquiryReason.GENERAL,
  InquiryReason.OTHER,
];

interface NotesModalState {
  item: InquiryItem;
  targetStatus: InquiryStatus;
  notes: string;
}

@Component({
  selector: 'app-admin-inquiries-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, InquiryDrawerComponent],
  template: `
    <div class="list-header">
      <h2>
        {{ isUa() ? 'Звернення' : 'Inquiries' }}
        @if (total() > 0) {
          <span class="count">({{ total() }})</span>
        }
      </h2>
      <button type="button" class="btn-export" (click)="exportCsv()">
        {{ isUa() ? 'Експорт CSV' : 'Export CSV' }}
      </button>
    </div>

    <div class="filters">
      <input
        [placeholder]="isUa() ? 'Пошук за текстом...' : 'Search by message...'"
        [(ngModel)]="searchQuery"
        (input)="onSearchChange()"
        class="filter-input filter-search"
      />
      <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa() ? 'Всі статуси' : 'All statuses' }}</option>
        @for (s of statuses; track s) {
          <option [value]="s">{{ 'inquiry.status.' + s | translate }}</option>
        }
      </select>
      <select [(ngModel)]="reasonFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa() ? 'Всі теми' : 'All reasons' }}</option>
        @for (r of reasons; track r) {
          <option [value]="r">{{ 'inquiry.reason.' + r | translate }}</option>
        }
      </select>
      <label
        class="filter-checkbox"
        [title]="isUa() ? 'Показати контактні дані' : 'Show contact info'"
      >
        <input type="checkbox" [(ngModel)]="showContactInfo" />
        {{ isUa() ? 'Показати PII' : 'Show contact info' }}
      </label>
    </div>

    @if (successMessage()) {
      <div class="banner banner-success">{{ successMessage() }}</div>
    }
    @if (errorMessage()) {
      <div class="banner banner-error">{{ errorMessage() }}</div>
    }

    @if (loading()) {
      <div class="loading">{{ isUa() ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (items().length === 0) {
      <div class="empty">{{ isUa() ? 'Звернень не знайдено' : 'No inquiries found' }}</div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ isUa() ? 'Дата' : 'Date' }}</th>
              <th>{{ isUa() ? 'Статус' : 'Status' }}</th>
              <th>{{ isUa() ? 'Тема' : 'Reason' }}</th>
              <th>{{ isUa() ? 'Повідомлення' : 'Message' }}</th>
              @if (showContactInfo) {
                <th>{{ isUa() ? 'Контакти' : 'Contact' }}</th>
              }
              <th class="th-actions">{{ isUa() ? 'Дії' : 'Actions' }}</th>
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
                      <option [value]="s">{{ 'inquiry.status.' + s | translate }}</option>
                    }
                  </select>
                </td>

                <td class="td-reason">
                  {{ 'inquiry.reason.' + item.reason | translate }}
                </td>

                <td class="td-message">
                  {{ truncate(item.message, 120) }}
                  @if (item.managerNotes) {
                    <span class="notes-marker" [title]="item.managerNotes">📝</span>
                  }
                </td>

                @if (showContactInfo) {
                  <td class="td-pii">
                    @if (item.name) {
                      <div>{{ item.name }}</div>
                    }
                    @if (item.email) {
                      <div class="td-pii-email">{{ item.email }}</div>
                    }
                    @if (item.phone) {
                      <div>{{ item.phone }}</div>
                    }
                    @if (item.messengerHandle) {
                      <div>{{ item.messengerHandle }}</div>
                    }
                    @if (!item.name && !item.email && !item.phone && !item.messengerHandle) {
                      —
                    }
                  </td>
                }

                <td class="td-actions" (click)="$event.stopPropagation()">
                  @if (item.status === 'archived') {
                    <button
                      type="button"
                      class="action-btn action-delete"
                      [disabled]="savingId() === item.id"
                      (click)="onDelete(item)"
                      [title]="isUa() ? 'Видалити архівне звернення' : 'Delete archived inquiry'"
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
            {{ isUa() ? 'Попередня' : 'Previous' }}
          </button>
          <span class="page-info">{{ currentPage }} / {{ totalPages() }}</span>
          <button
            class="btn-sm"
            [disabled]="currentPage >= totalPages()"
            (click)="goPage(currentPage + 1)"
          >
            {{ isUa() ? 'Наступна' : 'Next' }}
          </button>
        </div>
      }
    }

    <!-- Status change modal with optional notes -->
    @if (notesModal()) {
      <div
        class="modal-overlay"
        role="button"
        tabindex="0"
        (click)="closeNotesModal()"
        (keydown.enter)="closeNotesModal()"
        (keydown.space)="closeNotesModal(); $event.preventDefault()"
      >
        <div
          class="modal"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
        >
          <h3>{{ isUa() ? 'Примітки менеджера' : 'Manager notes' }}</h3>
          <p class="modal-hint">{{ isUa() ? 'Опційні примітки.' : 'Optional notes.' }}</p>
          <textarea
            [(ngModel)]="notesModal()!.notes"
            [placeholder]="isUa() ? 'Що було зроблено...' : 'What was done...'"
            rows="5"
            class="modal-textarea"
          ></textarea>
          <div class="modal-actions">
            <button type="button" class="btn-sm" (click)="closeNotesModal()">
              {{ isUa() ? 'Скасувати' : 'Cancel' }}
            </button>
            <button type="button" class="btn-primary" (click)="confirmStatusChange()">
              {{ isUa() ? 'Підтвердити' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Detail drawer -->
    @if (selectedItem()) {
      <app-inquiry-drawer [item]="selectedItem()!" (closed)="closeDrawer()" />
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
      .td-reason {
        color: #475569;
        font-size: 0.8rem;
        white-space: nowrap;
      }
      .td-message {
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

      .clickable {
        cursor: pointer;
        transition: background 0.15s;
      }
      .clickable:hover {
        background: #f8fafc;
      }

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
      }
      .status-select[data-status='read'] {
        background: #fef3c7;
        color: #92400e;
      }
      .status-select[data-status='replied'] {
        background: #d1fae5;
        color: #065f46;
      }
      .status-select[data-status='archived'] {
        background: #e2e8f0;
        color: #475569;
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
export class AdminInquiriesListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  // Signal-based language (zoneless-safe) instead of translate.currentLang getter
  protected readonly isUa = inject(LanguageService).isUa;

  readonly statuses = STATUSES;
  readonly reasons = REASONS;

  // === ADDED: Page title service for SEO ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  items = signal<InquiryItem[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  savingId = signal<string | null>(null);
  successMessage = signal('');
  errorMessage = signal('');

  selectedItem = signal<InquiryItem | null>(null);
  notesModal = signal<NotesModalState | null>(null);

  currentPage = 1;
  pageSize = 20;
  searchQuery = '';
  statusFilter: InquiryStatus | '' = '';
  reasonFilter: InquiryReason | '' = '';
  showContactInfo = false;

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadItems();
    this.pageTitle.setTitle('admin_titles.inquiries', true);
  }

  loadItems(): void {
    this.loading.set(true);
    const params = this.buildQueryParams();

    this.api.get<PaginatedInquiries>(`inquiries/admin/list?${params.join('&')}`).subscribe({
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
    if (this.reasonFilter) params.push(`reason=${this.reasonFilter}`);
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

  openDrawer(item: InquiryItem): void {
    this.selectedItem.set(item);
  }

  closeDrawer(): void {
    this.selectedItem.set(null);
  }

  onStatusChange(item: InquiryItem, newStatus: InquiryStatus): void {
    if (newStatus === item.status) return;
    // Notes are optional for every status — open the modal so the manager can add context
    this.notesModal.set({ item, targetStatus: newStatus, notes: item.managerNotes || '' });
    // Revert the dropdown UI until the modal confirms
    this.items.update((list) => [...list]);
  }

  closeNotesModal(): void {
    this.notesModal.set(null);
  }

  confirmStatusChange(): void {
    const state = this.notesModal();
    if (!state) return;

    const { item, targetStatus, notes } = state;
    this.savingId.set(item.id);
    this.clearMessages();

    const body: { status: InquiryStatus; managerNotes?: string } = { status: targetStatus };
    if (notes.trim()) body.managerNotes = notes.trim();

    this.api.patch<InquiryItem>(`inquiries/${item.id}/status`, body).subscribe({
      next: (updated) => {
        this.items.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
        if (this.selectedItem()?.id === updated.id) {
          this.selectedItem.set(updated);
        }
        this.savingId.set(null);
        const label = this.translate.instant('inquiry.status.' + targetStatus);
        this.flashSuccess(
          this.isUa() ? `Статус оновлено: "${label}"` : `Status updated to "${label}"`,
        );
      },
      error: (err) => {
        this.savingId.set(null);
        this.flashError(err?.error?.message || 'Error');
      },
    });

    this.closeNotesModal();
  }

  onDelete(item: InquiryItem): void {
    const confirmMsg = this.isUa()
      ? 'Видалити архівне звернення? Цю дію не можна скасувати.'
      : 'Delete archived inquiry? This cannot be undone.';

    if (!confirm(confirmMsg)) return;

    this.savingId.set(item.id);
    this.clearMessages();

    this.api.delete(`inquiries/${item.id}`).subscribe({
      next: () => {
        this.items.update((list) => list.filter((c) => c.id !== item.id));
        this.total.update((n) => n - 1);
        if (this.selectedItem()?.id === item.id) this.closeDrawer();
        this.savingId.set(null);
        this.flashSuccess(this.isUa() ? 'Звернення видалено' : 'Inquiry deleted');
      },
      error: (err) => {
        this.savingId.set(null);
        this.flashError(err?.error?.message || 'Error');
      },
    });
  }

  // CSV export via direct fetch (auth header needed, download via Blob)
  exportCsv(): void {
    const lang = this.isUa() ? 'ua' : 'en';
    const params: string[] = [`lang=${lang}`];
    if (this.statusFilter) params.push(`status=${this.statusFilter}`);
    if (this.reasonFilter) params.push(`reason=${this.reasonFilter}`);
    if (this.searchQuery) params.push(`search=${encodeURIComponent(this.searchQuery)}`);

    const token = localStorage.getItem('token');
    fetch(`${environment.apiUrl}/api/inquiries/admin/export?${params.join('&')}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => this.flashError(this.isUa() ? 'Помилка експорту' : 'Export failed'));
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
