// ui/src/app/features/admin/testimonials/testimonials-list.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import {
  PaginatedTestimonials,
  TestimonialItem,
  TestimonialStatus,
} from '../../cooperation/testimonial/testimonial.interfaces';

// Active statuses shown in dropdown
const ACTIVE_STATUSES: TestimonialStatus[] = [
  TestimonialStatus.PENDING,
  TestimonialStatus.APPROVED,
  TestimonialStatus.REJECTED,
];

// State for the "reject reason" modal
interface RejectModalState {
  item: TestimonialItem;
  notes: string;
}

@Component({
  selector: 'app-admin-testimonials-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="list-header">
      <h2>
        {{ isUa ? 'Відгуки' : 'Testimonials' }}
        @if (total() > 0) { <span class="count">({{ total() }})</span> }
      </h2>
    </div>

    <div class="filters">
      <input
        [placeholder]="isUa ? 'Пошук за автором, організацією, текстом...' : 'Search by author, organization, text...'"
        [(ngModel)]="searchQuery"
        (input)="onSearchChange()"
        class="filter-input filter-search"
      />
      <select [(ngModel)]="statusFilter" (change)="onFilterChange()" class="filter-input">
        <option value="">{{ isUa ? 'Всі статуси' : 'All statuses' }}</option>
        @for (s of activeStatuses; track s) {
          <option [value]="s">{{ 'testimonial.status.' + s | translate }}</option>
        }
      </select>
      <label class="filter-checkbox">
        <input type="checkbox" [(ngModel)]="verifiedOnly" (change)="onFilterChange()" />
        {{ isUa ? 'Тільки верифіковані' : 'Verified only' }}
      </label>
    </div>

    @if (successMessage()) { <div class="banner banner-success">{{ successMessage() }}</div> }
    @if (errorMessage()) { <div class="banner banner-error">{{ errorMessage() }}</div> }

    @if (loading()) {
      <div class="loading">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (items().length === 0) {
      <div class="empty">{{ isUa ? 'Відгуків не знайдено' : 'No testimonials found' }}</div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ isUa ? 'Дата' : 'Date' }}</th>
              <th>{{ isUa ? 'Статус' : 'Status' }}</th>
              <th>{{ isUa ? 'Автор' : 'Author' }}</th>
              <th>{{ isUa ? 'Текст' : 'Text' }}</th>
              <th>{{ isUa ? 'Оцінка' : 'Rating' }}</th>
              <th class="th-center">{{ isUa ? 'Верифік.' : 'Verified' }}</th>
              <th class="th-actions">{{ isUa ? 'Дії' : 'Actions' }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id; let i = $index) {
              <tr>
                <td class="td-num">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
                <td class="td-date">{{ item.createdAt | date:'dd.MM.yyyy' }}</td>

                <td>
                  <select
                    [ngModel]="item.status"
                    (ngModelChange)="onStatusChange(item, $event)"
                    [disabled]="savingId() === item.id"
                    class="status-select"
                    [attr.data-status]="item.status">
                    @for (s of activeStatuses; track s) {
                      <option [value]="s">{{ 'testimonial.status.' + s | translate }}</option>
                    }
                  </select>
                </td>

                <td class="td-author">
                  <div class="author-name">{{ item.authorName }}</div>
                  @if (item.organization) {
                    <div class="author-org">{{ item.organization }}</div>
                  }
                  @if (item.managerNotes) {
                    <div class="notes-preview"
                         [title]="item.managerNotes">
                      📝 {{ isUa ? 'Примітка' : 'Notes' }}
                    </div>
                  }
                </td>

                <td class="td-text" [title]="item.text">
                  {{ truncate(item.text, 120) }}
                </td>

                <td class="td-rating">
                  @if (item.rating) {
                    <span class="rating-stars">
                      {{ '★'.repeat(item.rating) }}{{ '☆'.repeat(5 - item.rating) }}
                    </span>
                  } @else { — }
                </td>

                <td class="td-center">
                  <button
                    type="button"
                    class="verify-toggle"
                    [class.verify-toggle--on]="item.isVerified"
                    [disabled]="savingId() === item.id"
                    (click)="onVerifyToggle(item)"
                    [title]="isUa ? 'Перемкнути верифікацію' : 'Toggle verification'">
                    @if (item.isVerified) { ✓ } @else { — }
                  </button>
                </td>

                <td class="td-actions">
                  @if (item.status === 'rejected') {
                    <button
                      type="button"
                      class="action-btn action-delete"
                      [disabled]="savingId() === item.id"
                      (click)="onDelete(item)"
                      [title]="isUa ? 'Видалити відгук' : 'Delete testimonial'">✕</button>
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
          <button class="btn-sm" [disabled]="currentPage >= totalPages()" (click)="goPage(currentPage + 1)">
            {{ isUa ? 'Наступна' : 'Next' }}
          </button>
        </div>
      }
    }

    <!-- Reject reason modal -->
    @if (rejectModal()) {
      <div class="modal-overlay" (click)="closeRejectModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ isUa ? 'Причина відхилення' : 'Rejection reason' }}</h3>
          <p class="modal-hint">
            {{ isUa
              ? 'Коротко опишіть причину. Примітка видима лише менеджерам.'
              : 'Briefly describe the reason. Note is visible to managers only.' }}
          </p>
          <textarea
            [(ngModel)]="rejectModal()!.notes"
            [placeholder]="isUa ? 'Наприклад: невідповідний контент...' : 'E.g. inappropriate content...'"
            rows="4"
            class="modal-textarea"
            #rejectTextarea></textarea>
          <div class="modal-actions">
            <button type="button" class="btn-sm" (click)="closeRejectModal()">
              {{ isUa ? 'Скасувати' : 'Cancel' }}
            </button>
            <button
              type="button"
              class="btn-primary"
              [disabled]="!rejectModal()!.notes.trim()"
              (click)="confirmReject()">
              {{ isUa ? 'Відхилити' : 'Reject' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .list-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; gap:1rem; flex-wrap:wrap; }
    .list-header h2 { font-size:1.2rem; font-weight:600; color:#1a365d; margin:0; }
    .count { color:#64748b; font-weight:400; }

    .filters { display:flex; gap:.75rem; margin-bottom:1.25rem; flex-wrap:wrap; align-items:center; }
    .filter-input { padding:.5rem .75rem; border:1px solid #cbd5e0; border-radius:6px; font-size:.85rem; background:#fff; }
    .filter-search { flex:1; min-width:240px; }
    .filter-checkbox { display:inline-flex; align-items:center; gap:.4rem; font-size:.85rem; color:#475569; cursor:pointer; }

    .banner { padding:.6rem 1rem; border-radius:6px; font-size:.85rem; margin-bottom:1rem; border:1px solid; }
    .banner-success { background:#f0fff4; color:#276749; border-color:#c6f6d5; }
    .banner-error { background:#fff5f5; color:#c53030; border-color:#fed7d7; }

    .table-wrap { overflow-x:auto; }
    .data-table { width:100%; border-collapse:collapse; font-size:.85rem; }
    .data-table th { text-align:left; padding:.65rem .5rem; border-bottom:2px solid #e2e8f0; color:#64748b; font-weight:600; font-size:.72rem; text-transform:uppercase; white-space:nowrap; }
    .data-table td { padding:.65rem .5rem; border-bottom:1px solid #f1f5f9; vertical-align:top; }
    .th-actions, .th-center { text-align:center; }
    .td-num { text-align:center; color:#64748b; }
    .td-date { white-space:nowrap; color:#64748b; font-size:.8rem; }
    .td-center { text-align:center; }
    .td-author { min-width:140px; max-width:180px; }
    .td-text { max-width:380px; color:#475569; font-style:italic; line-height:1.4; }
    .author-name { font-weight:500; color:#1a365d; }
    .author-org { font-size:.75rem; color:#64748b; }
    .notes-preview { font-size:.7rem; color:#92400e; margin-top:.25rem; cursor:help; }
    .rating-stars { color:#f6ad55; font-size:.95rem; letter-spacing:1px; }

    /* Status palette — 3 unique colors */
    .status-select {
      padding:.25rem .5rem; border:1px solid transparent; border-radius:4px;
      font-size:.7rem; font-weight:600; text-transform:uppercase; letter-spacing:.02em;
      cursor:pointer; min-width:105px;
    }
    .status-select:disabled { opacity:.5; cursor:wait; }
    .status-select[data-status="pending"]  { background:#fef3c7; color:#92400e; } /* amber */
    .status-select[data-status="approved"] { background:#d1fae5; color:#065f46; } /* green */
    .status-select[data-status="rejected"] { background:#fee2e2; color:#991b1b; } /* red */

    /* Verify toggle — pill button */
    .verify-toggle {
      width:30px; height:24px; border-radius:12px; border:1px solid #cbd5e0;
      background:#f1f5f9; color:#94a3b8; cursor:pointer; font-size:.85rem;
      transition:all .15s;
    }
    .verify-toggle:hover:not(:disabled) { border-color:#94a3b8; }
    .verify-toggle--on { background:#d1fae5; color:#065f46; border-color:#86efac; }
    .verify-toggle:disabled { opacity:.5; cursor:wait; }

    .td-actions { text-align:center; white-space:nowrap; }
    .action-btn {
      display:inline-flex; align-items:center; justify-content:center;
      width:28px; height:28px; margin:0 2px;
      border-radius:4px; font-size:.85rem; cursor:pointer;
      border:1px solid transparent; background:transparent; transition:all .15s;
    }
    .action-delete { color:#c53030; }
    .action-delete:hover { background:#fff5f5; border-color:#fed7d7; }
    .action-delete:disabled { opacity:.4; cursor:not-allowed; }

    .pagination { display:flex; justify-content:center; align-items:center; gap:1rem; margin-top:1.25rem; }
    .page-info { font-size:.85rem; color:#64748b; }
    .btn-sm { padding:.4rem 1rem; border:1px solid #cbd5e0; background:#fff; border-radius:6px; font-size:.8rem; cursor:pointer; }
    .btn-sm:disabled { opacity:.4; cursor:not-allowed; }
    .btn-sm:not(:disabled):hover { background:#f8fafc; }

    .btn-primary { padding:.5rem 1rem; background:#2b6cb0; color:#fff; border:none; border-radius:6px; font-size:.85rem; font-weight:500; cursor:pointer; }
    .btn-primary:hover:not(:disabled) { background:#2c5282; }
    .btn-primary:disabled { opacity:.5; cursor:not-allowed; }

    .loading, .empty { text-align:center; padding:3rem; color:#64748b; font-size:.95rem; }

    /* Reject reason modal */
    .modal-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,.5);
      display:flex; align-items:center; justify-content:center;
      z-index:1000; padding:1rem;
    }
    .modal {
      background:#fff; border-radius:8px; padding:1.5rem;
      width:100%; max-width:480px;
      box-shadow:0 10px 25px rgba(0,0,0,.2);
    }
    .modal h3 { margin:0 0 .5rem; font-size:1.1rem; color:#1a365d; }
    .modal-hint { font-size:.8rem; color:#64748b; margin:0 0 1rem; }
    .modal-textarea {
      width:100%; padding:.65rem; border:1px solid #cbd5e0; border-radius:6px;
      font-family:inherit; font-size:.9rem; resize:vertical;
    }
    .modal-textarea:focus { outline:none; border-color:#2b6cb0; box-shadow:0 0 0 3px rgba(43,108,176,.1); }
    .modal-actions { display:flex; justify-content:flex-end; gap:.5rem; margin-top:1rem; }

    @media (max-width:768px) {
      .filters { flex-direction:column; align-items:stretch; }
      .filter-search { min-width:auto; }
    }
  `],
})
export class AdminTestimonialsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);

  readonly activeStatuses = ACTIVE_STATUSES;

  items = signal<TestimonialItem[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(true);
  savingId = signal<string | null>(null);
  successMessage = signal('');
  errorMessage = signal('');

  // Modal state — null when closed
  rejectModal = signal<RejectModalState | null>(null);

  currentPage = 1;
  pageSize = 20;
  searchQuery = '';
  statusFilter: TestimonialStatus | '' = '';
  verifiedOnly = false;

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
    if (this.searchQuery) params.push(`search=${encodeURIComponent(this.searchQuery)}`);
    if (this.verifiedOnly) params.push('verifiedOnly=true');

    this.api.get<PaginatedTestimonials>(`testimonials/admin/list?${params.join('&')}`).subscribe({
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

  // Truncate long text for table display; full text in title tooltip
  truncate(text: string, max: number): string {
    if (!text) return '';
    return text.length <= max ? text : text.slice(0, max) + '…';
  }

  onStatusChange(item: TestimonialItem, newStatus: TestimonialStatus): void {
    if (newStatus === item.status) return;

    // Rejecting requires notes — open modal instead of firing immediately
    if (newStatus === TestimonialStatus.REJECTED) {
      this.rejectModal.set({ item, notes: item.managerNotes || '' });
      // Revert dropdown to original value until modal confirms
      this.items.update((list) => [...list]);
      return;
    }

    // Approving / moving back to pending — no modal needed
    const newLabel = this.translate.instant('testimonial.status.' + newStatus);
    const confirmMsg = this.isUa
      ? `Змінити статус на "${newLabel}"?`
      : `Change status to "${newLabel}"?`;

    if (!confirm(confirmMsg)) {
      this.items.update((list) => [...list]);
      return;
    }

    this.patchStatus(item, newStatus);
  }

  closeRejectModal(): void {
    this.rejectModal.set(null);
  }

  confirmReject(): void {
    const state = this.rejectModal();
    if (!state || !state.notes.trim()) return;

    this.patchStatus(state.item, TestimonialStatus.REJECTED, state.notes.trim());
    this.closeRejectModal();
  }

  private patchStatus(
    item: TestimonialItem,
    status: TestimonialStatus,
    managerNotes?: string,
  ): void {
    this.savingId.set(item.id);
    this.clearMessages();

    const body: { status: TestimonialStatus; managerNotes?: string } = { status };
    if (managerNotes !== undefined) body.managerNotes = managerNotes;

    this.api.patch<TestimonialItem>(`testimonials/${item.id}/status`, body).subscribe({
      next: (updated) => {
        this.items.update((list) =>
          list.map((t) => (t.id === updated.id ? updated : t)),
        );
        this.savingId.set(null);
        const label = this.translate.instant('testimonial.status.' + status);
        this.flashSuccess(
          this.isUa ? `Статус оновлено: "${label}"` : `Status updated to "${label}"`,
        );
      },
      error: (err) => {
        this.savingId.set(null);
        this.flashError(err?.error?.message || 'Error');
        this.items.update((list) => [...list]);
      },
    });
  }

  onVerifyToggle(item: TestimonialItem): void {
    const newValue = !item.isVerified;
    this.savingId.set(item.id);
    this.clearMessages();

    this.api.patch<TestimonialItem>(`testimonials/${item.id}/verify`, { isVerified: newValue }).subscribe({
      next: (updated) => {
        this.items.update((list) =>
          list.map((t) => (t.id === updated.id ? { ...t, isVerified: updated.isVerified } : t)),
        );
        this.savingId.set(null);
        this.flashSuccess(
          newValue
            ? (this.isUa ? 'Верифіковано' : 'Verified')
            : (this.isUa ? 'Верифікацію знято' : 'Verification removed'),
        );
      },
      error: (err) => {
        this.savingId.set(null);
        this.flashError(err?.error?.message || 'Error');
      },
    });
  }

  onDelete(item: TestimonialItem): void {
    const confirmMsg = this.isUa
      ? `Видалити відгук від "${item.authorName}"? Цю дію не можна скасувати.`
      : `Delete testimonial from "${item.authorName}"? This cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    this.savingId.set(item.id);
    this.clearMessages();

    this.api.delete(`testimonials/${item.id}`).subscribe({
      next: () => {
        this.items.update((list) => list.filter((t) => t.id !== item.id));
        this.total.update((n) => n - 1);
        this.savingId.set(null);
        this.flashSuccess(this.isUa ? 'Відгук видалено' : 'Testimonial deleted');
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
