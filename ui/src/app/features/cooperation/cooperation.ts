import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-cooperation',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslateModule],
  template: `
    <div class="cooperation">
      <div class="cooperation__header">
        <h1>{{ 'NAV.COOPERATION' | translate }}</h1>
      </div>

      <!-- Tab navigation for cooperation sub-sections -->
      <nav class="coop-tabs">
        <a routerLink="procurement"
           routerLinkActive="coop-tabs__item--active"
           class="coop-tabs__item">
          🛒 {{ 'cooperation.tabs.procurement' | translate }}
        </a>
        <span class="coop-tabs__item coop-tabs__item--soon">
          👷 {{ 'cooperation.tabs.vacancy' | translate }}
          <span class="soon-badge">{{ 'common.soon' | translate }}</span>
        </span>
        <span class="coop-tabs__item coop-tabs__item--soon">
          ✍️ {{ 'cooperation.tabs.testimonial' | translate }}
          <span class="soon-badge">{{ 'common.soon' | translate }}</span>
        </span>
        <span class="coop-tabs__item coop-tabs__item--soon">
          📝 {{ 'cooperation.tabs.complaint' | translate }}
          <span class="soon-badge">{{ 'common.soon' | translate }}</span>
        </span>
      </nav>

      <!-- Child route renders here -->
      <div class="cooperation__content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .cooperation {
      max-width: 960px;
      margin: 2rem auto;
      padding: 0 1rem;

      &__header h1 {
        font-size: 1.75rem;
        color: #1a365d;
        margin-bottom: 1.5rem;
      }

      &__content { padding-top: 1.5rem; }
    }

    .coop-tabs {
      display: flex;
      gap: 0.25rem;
      border-bottom: 2px solid #e2e8f0;
      flex-wrap: wrap;

      &__item {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.625rem 1.125rem;
        font-size: 0.9375rem;
        color: #4a5568;
        text-decoration: none;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;

        &:hover:not(&--soon) { color: #2b6cb0; }

        &--active {
          color: #2b6cb0;
          border-bottom-color: #2b6cb0;
          font-weight: 500;
        }

        &--soon {
          color: #a0aec0;
          cursor: default;
        }
      }
    }

    .soon-badge {
      background: #edf2f7;
      color: #718096;
      font-size: 0.6875rem;
      padding: 0.125rem 0.375rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }
  `],
})
export class CooperationComponent {}
