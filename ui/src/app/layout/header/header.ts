import { Component, inject } from '@angular/core';
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

        <nav class="header__nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            {{ 'NAV.HOME' | translate }}
          </a>
          <a routerLink="/about" routerLinkActive="active">{{ 'NAV.ABOUT' | translate }}</a>
          <a routerLink="/blog" routerLinkActive="active">{{ 'NAV.BLOG' | translate }}</a>
          <a routerLink="/partners" routerLinkActive="active">{{ 'NAV.PARTNERS' | translate }}</a>
          <a routerLink="/cooperation" routerLinkActive="active">{{ 'NAV.COOPERATION' | translate }}</a>
          <a routerLink="/wash-form" routerLinkActive="active">{{ 'NAV.WASH' | translate }}</a>
          <a routerLink="/contact" routerLinkActive="active">{{ 'NAV.CONTACT' | translate }}</a>
        </nav>
        
        <div class="header__actions">
          <button (click)="switchLang()" class="header__lang">
            {{ currentLang === 'ua' ? 'EN' : 'UA' }}
          </button>
          @if (auth.isLoggedIn()) {
            <span class="header__email">{{ auth.userEmail() }}</span>
            <button (click)="logout()" class="header__login">{{ currentLang === 'ua' ? 'Вийти' : 'Logout' }}</button>
          } @else {
            <a routerLink="/login" class="header__login">{{ 'NAV.LOGIN' | translate }}</a>
          }
        </div>
        
      </div>
    </header>
  `,
  styles: [`
    .header {
      background: #1a365d;
      color: white;
      padding: 0 1rem;
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
    }
    .header__logo-img {
      height: 38px;
      width: auto;
      display: block;
    }
    .header__nav {
      display: flex;
      gap: 1rem;
      flex: 1;
    }
    .header__nav a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      font-size: 0.875rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: color 0.2s;
    }
    .header__nav a:hover,
    .header__nav a.active {
      color: white;
      background: rgba(255, 255, 255, 0.1);
    }
    .header__actions {
      display: flex;
      align-items: center;
      gap: 1rem;
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
    }
  `],
})

export class HeaderComponent {
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  currentLang = 'ua';

  switchLang() {
    this.currentLang = this.currentLang === 'ua' ? 'en' : 'ua';
    this.translate.use(this.currentLang);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
