// PR-D3 — "About us" shell with sub-tabs.
// Same pattern as features/cooperation/cooperation.ts, with one deliberate
// difference: NO `redirectTo` on the empty path. `/about` is an indexed public URL
// linked from the header and from the winterization form, so it must stay the real
// address of the overview page rather than a hop to /about/<something>.
// New sub-tabs are added as a child route here + one <a> below. ===
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PageTitleService } from '../../core/services/page-title.service';

@Component({
  selector: 'app-about-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslateModule],
  template: `
    <div class="about-shell">
      <h1>{{ 'about.page.title' | translate }}</h1>

      <nav class="about-tabs" [attr.aria-label]="'about.tabs.ariaLabel' | translate">
        <!-- exact:true — without it the overview tab stays active on /about/documents,
             because /about is a prefix of every child route. -->
        <a
          routerLink="/about"
          routerLinkActive="about-tabs__item--active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="about-tabs__item"
        >
          {{ 'about.tabs.overview' | translate }}
        </a>
        <a
          routerLink="/about/documents"
          routerLinkActive="about-tabs__item--active"
          class="about-tabs__item"
        >
          {{ 'about.tabs.documents' | translate }}
        </a>
      </nav>

      <div class="about-shell__content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [
    `
      .about-shell {
        max-width: 1024px;
        margin: 0 auto;
        padding: 2rem 1rem;

        > h1 {
          font-size: 2rem;
          font-weight: 700;
          color: #1a365d;
          margin: 0 0 1.5rem;
        }

        &__content {
          padding-top: 2rem;
        }
      }

      .about-tabs {
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
          transition:
            color 0.15s,
            border-color 0.15s;

          &:hover {
            color: #2b6cb0;
          }

          &--active {
            color: #2b6cb0;
            border-bottom-color: #2b6cb0;
            font-weight: 500;
          }
        }
      }

      @media (max-width: 640px) {
        .about-shell > h1 {
          font-size: 1.6rem;
        }
        .about-tabs__item {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      }
    `,
  ],
})
export class AboutShellComponent implements OnInit {
  private readonly pageTitle = inject(PageTitleService);

  ngOnInit(): void {
    // Children override this with a more specific title; child ngOnInit runs after
    // the parent's, so the last write wins and the deep-link title stays correct.
    this.pageTitle.setTitle('about.page.title');
  }
}
