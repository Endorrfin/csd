import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-needs',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="needs-layout">
      <div class="needs-header">
        <h1>{{ isUa ? 'Потреби' : 'Needs' }}</h1>
        <p class="needs-subtitle">
          {{ isUa
            ? 'Форми для збору та оцінки потреб громад'
            : 'Community needs assessment forms'
          }}
        </p>
      </div>

      <nav class="needs-tabs">
        <a
          routerLink="wash-form"
          routerLinkActive="active"
          class="needs-tab"
        >
          <span class="tab-icon">💧</span>
          {{ isUa ? 'WASH (ВСГ)' : 'WASH' }}
        </a>

        <a class="needs-tab disabled" title="{{ isUa ? 'Скоро' : 'Coming soon' }}">
          <span class="tab-icon">🏗️</span>
          {{ isUa ? 'Відновлення' : 'Recovery' }}
          <span class="badge">{{ isUa ? 'скоро' : 'soon' }}</span>
        </a>

        <a class="needs-tab disabled" title="{{ isUa ? 'Скоро' : 'Coming soon' }}">
          <span class="tab-icon">🏠</span>
          {{ isUa ? 'Укриття' : 'Shelters' }}
          <span class="badge">{{ isUa ? 'скоро' : 'soon' }}</span>
        </a>
      </nav>

      <div class="needs-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .needs-layout {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    .needs-header {
      margin-bottom: 1.5rem;
    }

    .needs-header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #1a365d;
      margin: 0 0 0.25rem;
    }

    .needs-subtitle {
      color: #64748b;
      font-size: 0.95rem;
      margin: 0;
    }

    .needs-tabs {
      display: flex;
      gap: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 2rem;
      overflow-x: auto;
    }

    .needs-tab {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.75rem 1.25rem;
      font-size: 0.9rem;
      font-weight: 500;
      color: #64748b;
      text-decoration: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      white-space: nowrap;
      transition: color 0.2s, border-color 0.2s;
      cursor: pointer;
    }

    .needs-tab:hover:not(.disabled) {
      color: #1a365d;
    }

    .needs-tab.active {
      color: #1a365d;
      border-bottom-color: #2b6cb0;
    }

    .needs-tab.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .tab-icon {
      font-size: 1.1rem;
    }

    .badge {
      font-size: 0.65rem;
      background: #e2e8f0;
      color: #64748b;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    @media (max-width: 640px) {
      .needs-layout {
        padding: 1rem;
      }

      .needs-header h1 {
        font-size: 1.35rem;
      }

      .needs-tab {
        padding: 0.6rem 0.75rem;
        font-size: 0.85rem;
      }
    }
  `],
})
export class NeedsComponent {
  private readonly translate = inject(TranslateService);
  get isUa(): boolean { return (this.translate.currentLang || 'ua') === 'ua'; }
}
