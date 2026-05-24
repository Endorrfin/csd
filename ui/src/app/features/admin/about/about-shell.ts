// ui/src/app/features/admin/about/about-shell.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-about-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, TranslateModule],
  template: `
    <div class="shell">
      <header class="shell-header">
        <h1>{{ isUa ? 'Про нас' : 'About us' }}</h1>
        <p class="shell-subtitle">
          {{
            isUa
              ? 'Керування контентом сторінки «Про нас» та реєстром документів'
              : 'Manage About page content and document registry'
          }}
        </p>
      </header>

      <nav class="tab-nav">
        <a routerLink="sections" routerLinkActive="tab-active" class="tab">
          {{ 'about.admin.nav.sections' | translate }}
        </a>
        <a routerLink="documents" routerLinkActive="tab-active" class="tab">
          {{ 'about.admin.nav.documents' | translate }}
        </a>
      </nav>

      <div class="tab-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [
    `
      .shell {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .shell-header h1 {
        font-size: 1.4rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 0.25rem;
      }
      .shell-subtitle {
        font-size: 0.9rem;
        color: #64748b;
        margin: 0;
      }
      .tab-nav {
        display: flex;
        gap: 0.25rem;
        border-bottom: 2px solid #e2e8f0;
        margin-top: 0.5rem;
      }
      .tab {
        padding: 0.6rem 1rem;
        font-size: 0.9rem;
        font-weight: 500;
        color: #64748b;
        text-decoration: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        transition: all 0.15s;
      }
      .tab:hover {
        color: #2b6cb0;
      }
      .tab-active {
        color: #2b6cb0;
        border-bottom-color: #2b6cb0;
      }
      .tab-content {
        padding-top: 0.5rem;
      }
    `,
  ],
})
export class AboutShellComponent {
  private readonly translate = inject(TranslateService);

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }
}
