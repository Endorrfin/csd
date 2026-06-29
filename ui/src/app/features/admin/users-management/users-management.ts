// ui/src/app/features/admin/users-management/users-management.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageTitleService } from '../../../core/services/page-title.service';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

const ROLES = ['public', 'manager', 'admin', 'donor', 'super_admin'] as const;

const ROLE_LABELS: Record<string, [string, string]> = {
  public: ['Користувач', 'Public'],
  manager: ['Менеджер', 'Manager'],
  admin: ['Адмін', 'Admin'],
  donor: ['Донор', 'Donor'],
  super_admin: ['Супер Адмін', 'Super Admin'],
};

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="users-mgmt">
      <div class="section-header">
        <h2>{{ isUa ? 'Управління користувачами' : 'User Management' }}</h2>
        <span class="user-count">{{ users().length }} {{ isUa ? 'користувачів' : 'users' }}</span>
      </div>

      @if (loading()) {
        <div class="loading">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
      } @else {
        <!-- Search -->
        <div class="search-bar">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            [placeholder]="isUa ? 'Пошук за email або іменем...' : 'Search by email or name...'"
            class="search-input"
          />
        </div>

        @if (successMessage()) {
          <div class="success-banner">{{ successMessage() }}</div>
        }
        @if (errorMessage()) {
          <div class="error-banner">{{ errorMessage() }}</div>
        }

        <div class="table-wrap">
          <table class="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{{ isUa ? "Ім'я" : 'Name' }}</th>
                <th>Email</th>
                <th>{{ isUa ? 'Роль' : 'Role' }}</th>
                <th>{{ isUa ? 'Дата реєстрації' : 'Registered' }}</th>
                <th>{{ isUa ? 'Дія' : 'Action' }}</th>
              </tr>
            </thead>
            <tbody>
              @for (user of filteredUsers(); track user.id; let i = $index) {
                <tr [class.current-user]="user.email === auth.userEmail()">
                  <td>{{ i + 1 }}</td>
                  <td>
                    <span class="user-name">{{ user.firstName }} {{ user.lastName }}</span>
                    @if (user.email === auth.userEmail()) {
                      <span class="badge-you">{{ isUa ? 'ви' : 'you' }}</span>
                    }
                  </td>
                  <td class="email-cell">{{ user.email }}</td>
                  <td>
                    <span class="role-badge" [attr.data-role]="user.role">
                      {{ getRoleLabel(user.role) }}
                    </span>
                  </td>
                  <td class="date-cell">{{ user.createdAt | date: 'dd.MM.yyyy' }}</td>
                  <td>
                    @if (user.email === auth.userEmail()) {
                      <span class="no-action">—</span>
                    } @else {
                      <select
                        [ngModel]="user.role"
                        (ngModelChange)="onRoleChange(user, $event)"
                        class="role-select"
                        [disabled]="savingId() === user.id"
                      >
                        @for (role of roles; track role) {
                          <option [value]="role">{{ getRoleLabel(role) }}</option>
                        }
                      </select>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (filteredUsers().length === 0 && searchQuery) {
          <p class="no-results">{{ isUa ? 'Нічого не знайдено' : 'No results found' }}</p>
        }
      }
    </div>
  `,
  styles: [
    `
      .users-mgmt {
      }
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
      }
      .section-header h2 {
        font-size: 1.15rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0;
      }
      .user-count {
        font-size: 0.8rem;
        color: #64748b;
        background: #f1f5f9;
        padding: 0.25rem 0.65rem;
        border-radius: 4px;
      }
      .search-bar {
        margin-bottom: 1rem;
      }
      .search-input {
        width: 100%;
        padding: 0.6rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
        transition: border-color 0.15s;
      }
      .search-input:focus {
        outline: none;
        border-color: #2b6cb0;
        box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
      }
      .success-banner {
        background: #f0fff4;
        color: #276749;
        padding: 0.6rem 1rem;
        border-radius: 6px;
        font-size: 0.85rem;
        margin-bottom: 1rem;
        border: 1px solid #c6f6d5;
      }
      .error-banner {
        background: #fff5f5;
        color: #c53030;
        padding: 0.6rem 1rem;
        border-radius: 6px;
        font-size: 0.85rem;
        margin-bottom: 1rem;
        border: 1px solid #fed7d7;
      }
      .table-wrap {
        overflow-x: auto;
      }
      .users-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .users-table th {
        text-align: left;
        padding: 0.65rem 0.5rem;
        border-bottom: 2px solid #e2e8f0;
        color: #64748b;
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .users-table td {
        padding: 0.65rem 0.5rem;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
      }
      .users-table tr:hover {
        background: #f8fafc;
      }
      .current-user {
        background: #eff6ff !important;
      }
      .user-name {
        font-weight: 500;
        color: #1e293b;
      }
      .badge-you {
        display: inline-block;
        font-size: 0.6rem;
        background: #dbeafe;
        color: #1e40af;
        padding: 0.1rem 0.4rem;
        border-radius: 3px;
        margin-left: 0.4rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      .email-cell {
        color: #475569;
      }
      .date-cell {
        color: #64748b;
        white-space: nowrap;
      }
      .role-badge {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }
      [data-role='public'] {
        background: #f1f5f9;
        color: #475569;
      }
      [data-role='manager'] {
        background: #fef3c7;
        color: #92400e;
      }
      [data-role='admin'] {
        background: #dbeafe;
        color: #1e40af;
      }
      [data-role='donor'] {
        background: #d1fae5;
        color: #065f46;
      }
      [data-role='super_admin'] {
        background: #fae8ff;
        color: #86198f;
      }
      .role-select {
        padding: 0.35rem 0.5rem;
        border: 1px solid #cbd5e0;
        border-radius: 4px;
        font-size: 0.8rem;
        background: #fff;
        cursor: pointer;
        min-width: 120px;
      }
      .role-select:disabled {
        opacity: 0.5;
        cursor: wait;
      }
      .no-action {
        color: #cbd5e0;
      }
      .no-results {
        text-align: center;
        color: #64748b;
        padding: 2rem;
        font-size: 0.9rem;
      }
      .loading {
        text-align: center;
        padding: 3rem;
        color: #64748b;
      }
      @media (max-width: 640px) {
        .section-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }
      }
    `,
  ],
})
export class UsersManagementComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);
  // === ADDED: Page title service for SEO ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  readonly roles = ROLES;
  loading = signal(true);
  users = signal<UserRow[]>([]);
  savingId = signal<string | null>(null);
  successMessage = signal('');
  errorMessage = signal('');
  searchQuery = '';

  ngOnInit(): void {
    this.loadUsers();
    this.pageTitle.setTitle('admin_titles.users', true);
  }

  filteredUsers(): UserRow[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q),
    );
  }

  getRoleLabel(role: string): string {
    const labels = ROLE_LABELS[role];
    return labels ? (this.isUa ? labels[0] : labels[1]) : role;
  }

  onRoleChange(user: UserRow, newRole: string): void {
    const confirmMsg = this.isUa
      ? `Змінити роль ${user.email} на "${this.getRoleLabel(newRole)}"?`
      : `Change ${user.email} role to "${this.getRoleLabel(newRole)}"?`;

    if (!confirm(confirmMsg)) return;

    this.savingId.set(user.id);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.api.patch<UserRow>(`users/${user.id}/role`, { role: newRole }).subscribe({
      next: (updated) => {
        this.users.update((list) =>
          list.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u)),
        );
        this.savingId.set(null);
        this.successMessage.set(
          this.isUa
            ? `Роль ${user.email} змінено на "${this.getRoleLabel(updated.role)}"`
            : `${user.email} role changed to "${this.getRoleLabel(updated.role)}"`,
        );
        setTimeout(() => this.successMessage.set(''), 4000);
      },
      error: (err) => {
        this.savingId.set(null);
        const msg = err?.error?.message || 'Error';
        this.errorMessage.set(msg);
        setTimeout(() => this.errorMessage.set(''), 4000);
      },
    });
  }

  private loadUsers(): void {
    this.api.get<UserRow[]>('users').subscribe({
      next: (data) => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
