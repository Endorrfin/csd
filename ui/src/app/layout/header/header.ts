import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <header class="header">
      <div class="header__container">
        <a routerLink="/" class="header__logo">
          <img src="/assets/images/logo/csd_logo_text-white_right.png" alt="CSD Fund" class="header__logo-img" />
        </a>

        <!-- hamburger button (mobile only) -->
        <button
          class="header__burger"
          [class.header__burger--open]="isMenuOpen()"
          (click)="toggleMenu()"
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <!-- nav with mobile open/close state -->
        <nav class="header__nav" [class.header__nav--open]="isMenuOpen()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" (click)="closeMenu()">
            {{ 'NAV.HOME' | translate }}
          </a>
          <a routerLink="/about" routerLinkActive="active" (click)="closeMenu()">{{ 'NAV.ABOUT' | translate }}</a>
          <a routerLink="/partners" routerLinkActive="active" (click)="closeMenu()">{{ 'NAV.PARTNERS' | translate }}</a>
          <a routerLink="/cooperation" routerLinkActive="active" (click)="closeMenu()">{{ 'NAV.COOPERATION' | translate }}</a>
          <a routerLink="/needs" routerLinkActive="active" (click)="closeMenu()">{{ 'NAV.NEEDS' | translate }}</a>
          <a routerLink="/contact" routerLinkActive="active" (click)="closeMenu()">{{ 'NAV.CONTACT' | translate }}</a>
          @if (auth.isManager) {
            <a routerLink="/admin" routerLinkActive="active" class="nav-admin" (click)="closeMenu()">
              {{ currentLang === 'ua' ? 'Адмін' : 'Admin' }}
            </a>
          }

          <!-- auth actions inside nav on mobile -->
          <div class="header__nav-actions">
            <button (click)="switchLang()" class="header__lang">
              {{ currentLang === 'ua' ? 'EN' : 'UA' }}
            </button>
            @if (auth.isLoggedIn()) {
              <span class="header__email">{{ auth.userEmail() }}</span>
              <button (click)="logout()" class="header__login">
                {{ currentLang === 'ua' ? 'Вийти' : 'Logout' }}
              </button>
            } @else {
              <a routerLink="/login" class="header__login" (click)="closeMenu()">
                {{ 'NAV.LOGIN' | translate }}
              </a>
            }
          </div>
        </nav>

        <!-- desktop-only actions -->
        <div class="header__actions header__actions--desktop">
          <button (click)="switchLang()" class="header__lang">
            {{ currentLang === 'ua' ? 'EN' : 'UA' }}
          </button>
          @if (auth.isLoggedIn()) {
            <span class="header__email">{{ auth.userEmail() }}</span>
            <button (click)="logout()" class="header__login">
              {{ currentLang === 'ua' ? 'Вийти' : 'Logout' }}
            </button>
          } @else {
            <a routerLink="/login" class="header__login">{{ 'NAV.LOGIN' | translate }}</a>
          }
        </div>
      </div>
    </header>

    <!-- overlay to close menu on outside click -->
    @if (isMenuOpen()) {
      <div class="header__overlay" (click)="closeMenu()"></div>
    }
  `,
  styles: [`
    .header {
      background: #1a365d;
      color: white;
      padding: 0 1rem;
      flex-shrink: 0;
      position: relative;
      z-index: 100; // above overlay
    }
    .header__container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      height: 64px;
      gap: 2rem;
    }
    .header__email {
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.75rem;
    }
    .header__logo {
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      text-decoration: none;
      flex-shrink: 0;
    }
    .header__logo-img {
      height: 38px;
      width: auto;
      display: block;
    }

    /* ── Desktop nav ── */
    .header__nav {
      display: flex;
      gap: 1rem;
      flex: 1;
      align-items: center;
    }
    .header__nav a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: color 0.2s;
      white-space: nowrap;
    }
    .header__nav a:hover,
    .header__nav a.active {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }
    .nav-admin {
      border: 1px solid rgba(255, 255, 255, 0.3);
      font-weight: 500;
    }
    .nav-admin:hover,
    .nav-admin.active {
      border-color: rgba(255, 255, 255, 0.6);
    }

    /* ── Desktop actions ── */
    .header__actions {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-shrink: 0;
    }
    .header__lang {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .header__login {
      color: white;
      border: none;
      background: none;
      text-decoration: none;
      font-size: 0.875rem;
      cursor: pointer;
    }

    /* ── Hamburger (hidden on desktop) ── */
    .header__burger {
      display: none;
      flex-direction: column;
      justify-content: space-between;
      width: 24px;
      height: 18px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      margin-left: auto;
    }
    .header__burger span {
      display: block;
      width: 100%;
      height: 2px;
      background: white;
      border-radius: 2px;
      transition: transform 0.25s, opacity 0.25s;
    }
    // X-анімація при відкритті
    .header__burger--open span:nth-child(1) {
      transform: translateY(8px) rotate(45deg);
    }
    .header__burger--open span:nth-child(2) {
      opacity: 0;
    }
    .header__burger--open span:nth-child(3) {
      transform: translateY(-8px) rotate(-45deg);
    }

    /* ── Mobile nav actions (shown inside nav on mobile) ── */
    .header__nav-actions {
      display: none;
    }

    /* ── Overlay ── */
    .header__overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 99;
    }

    /* ── Mobile breakpoint ── */
    @media (max-width: 768px) {
      .header__container {
        gap: 1rem;
      }

      // hamburger видимий
      .header__burger {
        display: flex;
      }

      // десктопні actions приховані
      .header__actions--desktop {
        display: none;
      }

      // nav стає вертикальним drawer зліва
      .header__nav {
        position: fixed;
        top: 0;
        right: -100%;
        width: min(280px, 80vw);
        height: 100dvh; // dvh враховує mobile browser chrome
        background: #1a365d;
        flex-direction: column;
        align-items: flex-start;
        padding: 80px 1.5rem 2rem;
        gap: 0.25rem;
        z-index: 100;
        transition: right 0.3s ease;
        overflow-y: auto;
      }
      .header__nav--open {
        right: 0; // slide-in
      }
      .header__nav a {
        width: 100%;
        padding: 0.75rem 1rem;
        font-size: 1rem;
        border-radius: 6px;
      }

      // actions всередині nav на мобільному
      .header__nav-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        width: 100%;
      }
    }
  `],
})
export class HeaderComponent {
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  currentLang = 'ua';

  // signal for menu state
  readonly isMenuOpen = signal(false);

  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    if ((event.target as Window).innerWidth > 768) {
      this.closeMenu();
    }
  }

  switchLang(): void {
    this.currentLang = this.currentLang === 'ua' ? 'en' : 'ua';
    this.translate.use(this.currentLang);
  }

  logout(): void {
    this.auth.logout();
    this.closeMenu();
    this.router.navigate(['/']);
  }
}
