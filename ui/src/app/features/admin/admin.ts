import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-layout">
      <!-- Mobile top bar with hamburger -->
      <div class="admin-topbar">
        <button
          class="admin-burger"
          [class.admin-burger--open]="isSidebarOpen()"
          (click)="toggleSidebar()"
          aria-label="Toggle admin menu"
        >
          <span></span><span></span><span></span>
        </button>
        <h1 class="admin-topbar-title">{{ isUa ? 'Адмін-панель' : 'Admin Panel' }}</h1>
      </div>

      <!-- Off-canvas sidebar -->
      <aside class="admin-sidebar" [class.admin-sidebar--open]="isSidebarOpen()">
        <div class="admin-sidebar-header">
          <h2>{{ isUa ? 'Адмін-панель' : 'Admin Panel' }}</h2>
          <div class="admin-user">
            <span class="admin-user-email">{{ auth.userEmail() }}</span>
            <span class="admin-role" [attr.data-role]="auth.userRole()">{{ auth.userRole() }}</span>
          </div>
        </div>

        <!-- Cooperation & WASH section: manager+ -->
        <p class="admin-group-label">{{ isUa ? 'Розділи' : 'Sections' }}</p>
        <nav class="admin-nav">
          <a
            routerLink="wash-forms"
            routerLinkActive="active"
            class="admin-nav-item"
            (click)="closeSidebar()"
          >
            {{ isUa ? 'WASH Заявки' : 'WASH Forms' }}
          </a>
          <a
            routerLink="procurements"
            routerLinkActive="active"
            class="admin-nav-item"
            (click)="closeSidebar()"
          >
            {{ isUa ? 'Закупки' : 'Procurements' }}
          </a>
          <a
            routerLink="vacancies"
            routerLinkActive="active"
            class="admin-nav-item"
            (click)="closeSidebar()"
          >
            {{ isUa ? 'Вакансії' : 'Vacancies' }}
          </a>
          <a
            routerLink="testimonials"
            routerLinkActive="active"
            class="admin-nav-item"
            (click)="closeSidebar()"
          >
            {{ isUa ? 'Відгуки' : 'Testimonials' }}
          </a>

          <!-- Complaints: admin+ (handles sensitive reports) -->
          @if (auth.isAdmin) {
            <a
              routerLink="complaints"
              routerLinkActive="active"
              class="admin-nav-item"
              (click)="closeSidebar()"
            >
              {{ isUa ? 'Скарги' : 'Complaints' }}
            </a>
          }
        </nav>

        <!-- admin & super admin only section -->
        @if (auth.isSuperAdmin || auth.isAdmin) {
          <p class="admin-group-label">{{ isUa ? 'Адміністрування' : 'Administration' }}</p>
          <nav class="admin-nav">
            <a
              routerLink="about"
              routerLinkActive="active"
              class="admin-nav-item"
              (click)="closeSidebar()"
            >
              {{ isUa ? 'Про нас' : 'About' }}
            </a>
            <!-- Inquiries: admin+ (general contact-form submissions) -->
            <a
              routerLink="inquiries"
              routerLinkActive="active"
              class="admin-nav-item"
              (click)="closeSidebar()"
            >
              {{ isUa ? 'Звернення' : 'Inquiries' }}
            </a>
          </nav>
        }

        <!-- Super admin only section -->
        @if (auth.isSuperAdmin) {
          <nav class="admin-nav">
            <a
              routerLink="users"
              routerLinkActive="active"
              class="admin-nav-item"
              (click)="closeSidebar()"
            >
              {{ isUa ? 'Користувачі' : 'Users' }}
            </a>
          </nav>
        }
      </aside>

      <!-- Overlay for mobile -->
      @if (isSidebarOpen()) {
        <!-- keyboard a11y — close on Enter/Space, focusable role=button -->
        <div
          class="admin-overlay"
          role="button"
          tabindex="0"
          [attr.aria-label]="isUa ? 'Закрити меню' : 'Close menu'"
          (click)="closeSidebar()"
          (keydown.enter)="closeSidebar()"
          (keydown.space)="closeSidebar(); $event.preventDefault()"
        ></div>
      }

      <!-- Main content area with outlet -->
      <main class="admin-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .admin-layout {
        display: grid;
        grid-template-columns: 240px 1fr;
        max-width: 1400px;
        margin: 0 auto;
        position: relative;
      }

      /* ── Topbar (mobile only) ── */
      .admin-topbar {
        display: none;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
        grid-column: 1 / -1;
      }
      .admin-topbar-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0;
      }

      /* ── Hamburger ── */
      .admin-burger {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 24px;
        height: 18px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
      }
      .admin-burger span {
        display: block;
        width: 100%;
        height: 2px;
        background: #1a365d;
        border-radius: 2px;
        transition:
          transform 0.25s,
          opacity 0.25s;
      }
      .admin-burger--open span:nth-child(1) {
        transform: translateY(8px) rotate(45deg);
      }
      .admin-burger--open span:nth-child(2) {
        opacity: 0;
      }
      .admin-burger--open span:nth-child(3) {
        transform: translateY(-8px) rotate(-45deg);
      }

      /* ── Sidebar ── */
      .admin-sidebar {
        background: #f7fafc;
        border-right: 1px solid #e2e8f0;
        padding: 1.5rem 1rem;
        display: flex;
        flex-direction: column;
      }
      .admin-sidebar-header {
        padding: 0 0.5rem 1.25rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 1rem;
      }
      .admin-sidebar-header h2 {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 0.5rem;
      }
      .admin-user {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .admin-user-email {
        font-size: 0.75rem;
        color: #64748b;
        word-break: break-all;
      }
      .admin-role {
        align-self: flex-start;
        font-size: 0.6rem;
        font-weight: 600;
        text-transform: uppercase;
        padding: 0.15rem 0.45rem;
        border-radius: 3px;
        letter-spacing: 0.03em;
      }
      [data-role='super_admin'] {
        background: #fae8ff;
        color: #86198f;
      }
      [data-role='admin'] {
        background: #dbeafe;
        color: #1e40af;
      }
      [data-role='manager'] {
        background: #fef3c7;
        color: #92400e;
      }

      .admin-group-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin: 1rem 0.75rem 0.5rem;
      }
      .admin-nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .admin-nav-item {
        padding: 0.55rem 0.75rem;
        border-radius: 6px;
        font-size: 0.875rem;
        color: #475569;
        text-decoration: none;
        transition:
          background 0.15s,
          color 0.15s;
      }
      .admin-nav-item:hover {
        background: #edf2f7;
        color: #1a365d;
      }
      .admin-nav-item.active {
        background: #ebf4ff;
        color: #1a365d;
        font-weight: 500;
      }

      /* ── Main content ── */
      .admin-content {
        padding: 2rem 1.5rem;
        min-width: 0;
      }

      /* ── Overlay (mobile only) ── */
      .admin-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 90;
      }

      /* ── Mobile breakpoint ── */
      @media (max-width: 900px) {
        .admin-layout {
          grid-template-columns: 1fr;
        }
        .admin-topbar {
          display: flex;
        }

        .admin-sidebar {
          position: fixed;
          top: 0;
          left: -100%;
          width: min(280px, 80vw);
          height: 100dvh;
          z-index: 100;
          transition: left 0.3s ease;
          overflow-y: auto;
        }
        .admin-sidebar--open {
          left: 0;
        }

        .admin-overlay {
          display: block;
        }

        .admin-content {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class AdminComponent {
  readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  // Sidebar open state (mobile off-canvas)
  readonly isSidebarOpen = signal(false);

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  // Auto-close sidebar when viewport grows past breakpoint
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    if ((event.target as Window).innerWidth > 900) {
      this.closeSidebar();
    }
  }
}
