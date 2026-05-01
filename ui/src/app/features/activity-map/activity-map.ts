import { CommonModule } from '@angular/common';
import { Component, OnInit, effect, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CategorySidebarComponent } from './components/category-sidebar/category-sidebar';
import { MapViewComponent } from './components/map-view/map-view';
import { ActivityDataService } from './services/activity-data.service';
import { ActivityFilterService } from './services/activity-filter.service';

@Component({
  selector: 'app-activity-map',
  standalone: true,
  imports: [CommonModule, TranslateModule, CategorySidebarComponent, MapViewComponent],
  template: `
    <div class="page">
      <app-category-sidebar />

      <main class="main">
        <header class="main__bar">
          <button
            type="button"
            class="main__filter-btn"
            (click)="filter.toggleMobileDrawer()"
          >
            ☰ {{ 'ACTIVITY_MAP.SIDEBAR.TITLE' | translate }}
          </button>
          <h1 class="main__title">{{ 'ACTIVITY_MAP.TITLE' | translate }}</h1>
          <span class="main__counter">
            {{
              'ACTIVITY_MAP.VISIBLE'
                | translate
                  : { count: filter.visibleActivities().length, total: data.totalCount() }
            }}
          </span>
        </header>

        @if (data.loading()) {
          <p class="main__status">{{ 'common.loading' | translate }}</p>
        } @else if (data.error(); as err) {
          <p class="main__status main__status--error">
            {{ 'ACTIVITY_MAP.LOAD_ERROR' | translate }}: {{ err }}
          </p>
        } @else {
          <div class="main__map">
            <app-map-view />
          </div>
        }
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: calc(100dvh - 64px);
      }
      .page {
        display: flex;
        height: 100%;
      }
      .main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        background: #f7fafc;
      }
      .main__bar {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 1rem;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
        flex-shrink: 0;
      }
      .main__filter-btn {
        display: none;
        background: #1a365d;
        color: #fff;
        border: none;
        padding: 0.5rem 0.875rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
      }
      .main__title {
        margin: 0;
        font-size: 1.125rem;
        color: #1a365d;
      }
      .main__counter {
        margin-left: auto;
        font-size: 0.875rem;
        color: #4a5568;
      }
      .main__status {
        margin: 1rem;
        padding: 0.75rem 1rem;
        background: #fff;
        border-radius: 6px;
        color: #2d3748;
        font-size: 0.9rem;
      }
      .main__status--error {
        background: #fff5f5;
        color: #c53030;
      }
      .main__map {
        flex: 1;
        min-height: 0;
      }

      @media (max-width: 1023px) {
        .main__filter-btn {
          display: block;
        }
        .main__counter {
          display: none;
        }
      }
    `,
  ],
})
export class ActivityMapComponent implements OnInit {
  readonly data = inject(ActivityDataService);
  readonly filter = inject(ActivityFilterService);

  constructor() {
    effect(() => {
      const ds = this.data.data();
      if (ds && this.filter.enabledTypes().size === 0) {
        this.filter.enableAllTypes();
      }
    });
  }

  ngOnInit(): void {
    this.data.load().subscribe();
  }
}
