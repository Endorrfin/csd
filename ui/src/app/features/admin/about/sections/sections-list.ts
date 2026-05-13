// ui/src/app/features/admin/about/sections/sections-list.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../../core/services/api.service';
import { AboutSection, ALL_SECTION_KEYS } from '../about.interfaces';

@Component({
  selector: 'app-admin-about-sections-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="list-header">
      <h2>
        {{ 'about.admin.sections.listTitle' | translate }}
        @if (items().length > 0) {
          <span class="count">({{ items().length }})</span>
        }
      </h2>
      @if (canCreateMore()) {
        <a routerLink="new" class="btn-primary">
          + {{ 'about.admin.sections.createNew' | translate }}
        </a>
      } @else {
        <span class="hint-allused">{{ 'about.admin.sections.allKeysUsed' | translate }}</span>
      }
    </div>

    @if (successMessage()) {
      <div class="banner banner-success">{{ successMessage() }}</div>
    }
    @if (errorMessage()) {
      <div class="banner banner-error">{{ errorMessage() }}</div>
    }

    @if (loading()) {
      <div class="loading">{{ 'common.loading' | translate }}</div>
    } @else if (items().length === 0) {
      <div class="empty">{{ 'about.admin.sections.emptyState' | translate }}</div>
    } @else {
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{{ 'about.admin.sections.key' | translate }}</th>
              <th>{{ 'about.admin.sections.title' | translate }}</th>
              <th>{{ 'about.admin.sections.sortOrder' | translate }}</th>
              <th>{{ 'about.admin.sections.isPublished' | translate }}</th>
              <th class="th-actions">{{ 'about.admin.sections.actions' | translate }}</th>
            </tr>
          </thead>
          <tbody>
            @for (item of items(); track item.id; let i = $index) {
              <tr>
                <td class="td-num">{{ i + 1 }}</td>
                <td class="td-key">
                  <code>{{ item.key }}</code>
                  <small>{{ 'about.admin.sectionKey.' + item.key | translate }}</small>
                </td>
                <td class="td-title">
                  <a [routerLink]="[item.id]" class="title-link">
                    {{ isUa ? item.titleUa : item.titleEn }}
                  </a>
                </td>
                <td class="td-meta">{{ item.sortOrder }}</td>
                <td>
                  <button
                    type="button"
                    class="badge"
                    [class.badge-published]="item.isPublished"
                    [class.badge-draft]="!item.isPublished"
                    [disabled]="savingId() === item.id"
                    (click)="onTogglePublish(item)"
                    [title]="
                      item.isPublished
                        ? ('about.admin.common.unpublish' | translate)
                        : ('about.admin.common.publish' | translate)
                    "
                  >
                    {{
                      item.isPublished
                        ? ('about.admin.sections.statusPublished' | translate)
                        : ('about.admin.sections.statusDraft' | translate)
                    }}
                  </button>
                </td>
                <td class="td-actions">
                  <a
                    [routerLink]="[item.id]"
                    class="action-btn action-edit"
                    [title]="isUa ? 'Редагувати' : 'Edit'"
                    >✎</a
                  >
                  <button
                    type="button"
                    class="action-btn action-delete"
                    [disabled]="savingId() === item.id"
                    (click)="onDelete(item)"
                    [title]="isUa ? 'Видалити секцію' : 'Delete section'"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
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
        gap: 1rem;
        flex-wrap: wrap;
      }
      .list-header h2 {
        font-size: 1.1rem;
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
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
        text-decoration: none;
      }
      .btn-primary:hover {
        background: #2c5282;
      }
      .hint-allused {
        font-size: 0.85rem;
        color: #64748b;
        font-style: italic;
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
      .td-key {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .td-key code {
        font-size: 0.7rem;
        background: #edf2f7;
        color: #2d3748;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        width: fit-content;
      }
      .td-key small {
        font-size: 0.75rem;
        color: #64748b;
      }
      .td-title {
        max-width: 320px;
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
      .td-meta {
        color: #475569;
      }
      .badge {
        padding: 0.25rem 0.55rem;
        border: 1px solid transparent;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        cursor: pointer;
      }
      .badge-published {
        background: #d1fae5;
        color: #065f46;
      }
      .badge-draft {
        background: #fef3c7;
        color: #92400e;
      }
      .badge:disabled {
        opacity: 0.5;
        cursor: wait;
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
        text-decoration: none;
        border: 1px solid transparent;
        background: transparent;
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
      .loading,
      .empty {
        text-align: center;
        padding: 3rem;
        color: #64748b;
        font-size: 0.95rem;
      }
    `,
  ],
})
export class AdminAboutSectionsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);

  items = signal<AboutSection[]>([]);
  loading = signal(true);
  savingId = signal<string | null>(null);
  successMessage = signal('');
  errorMessage = signal('');

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  ngOnInit(): void {
    this.loadItems();
  }

  // CHANGED: if all 10 enum keys are used, hide create button (key is unique constraint)
  canCreateMore(): boolean {
    return this.items().length < ALL_SECTION_KEYS.length;
  }

  loadItems(): void {
    this.loading.set(true);
    this.api.get<AboutSection[]>('about/admin/sections').subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Error');
        this.loading.set(false);
      },
    });
  }

  onTogglePublish(item: AboutSection): void {
    this.savingId.set(item.id);
    this.clearMessages();

    this.api
      .patch<AboutSection>(`about/admin/sections/${item.id}`, {
        isPublished: !item.isPublished,
      })
      .subscribe({
        next: (updated) => {
          this.items.update((list) =>
            list.map((s) => (s.id === updated.id ? { ...s, isPublished: updated.isPublished } : s)),
          );
          this.savingId.set(null);
          this.flashSuccess(
            updated.isPublished
              ? this.isUa
                ? 'Опубліковано'
                : 'Published'
              : this.isUa
                ? 'Приховано'
                : 'Unpublished',
          );
        },
        error: (err) => {
          this.savingId.set(null);
          this.flashError(err?.error?.message || 'Error');
        },
      });
  }

  onDelete(item: AboutSection): void {
    const title = this.isUa ? item.titleUa : item.titleEn;
    const confirmMsg = this.isUa
      ? `Видалити секцію "${title}"? Цю дію не можна скасувати.`
      : `Delete section "${title}"? This cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    this.savingId.set(item.id);
    this.clearMessages();

    this.api.delete(`about/admin/sections/${item.id}`).subscribe({
      next: () => {
        this.items.update((list) => list.filter((s) => s.id !== item.id));
        this.savingId.set(null);
        this.flashSuccess(this.isUa ? 'Секцію видалено' : 'Section deleted');
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
