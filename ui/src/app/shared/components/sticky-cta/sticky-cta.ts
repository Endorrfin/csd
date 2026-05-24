import { Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Floating CTA, only on home. Appears after the user scrolls past 1 viewport
 * (so it doesn't compete with the hero) and respects iOS safe-area.
 */
@Component({
  selector: 'app-sticky-cta',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <a routerLink="/cooperation" class="sticky-cta" [class.sticky-cta--visible]="visible()">
      <span class="sticky-cta__label">{{ 'HOME.CTA.LABEL' | translate }}</span>
      <span class="sticky-cta__arrow" aria-hidden="true">&rarr;</span>
    </a>
  `,
  styles: [
    `
      .sticky-cta {
        position: fixed;
        right: 1.25rem;
        /* iOS safe-area aware bottom positioning */
        bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
        z-index: 100;

        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.875rem 1.5rem;
        border-radius: 999px;
        background: #1a365d;
        color: #fff;
        font-weight: 600;
        font-size: 0.95rem;
        text-decoration: none;
        box-shadow: 0 8px 24px rgba(26, 54, 93, 0.35);

        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
        transition:
          opacity 0.25s ease-out,
          transform 0.25s ease-out,
          background 0.2s;
      }

      .sticky-cta--visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .sticky-cta:hover {
        background: #2a4a7f;
      }

      .sticky-cta__arrow {
        transition: transform 0.2s;
      }

      .sticky-cta:hover .sticky-cta__arrow {
        transform: translateX(4px);
      }

      @media (prefers-reduced-motion: reduce) {
        .sticky-cta {
          transition: none;
        }
        .sticky-cta__arrow {
          transition: none;
        }
        .sticky-cta:hover .sticky-cta__arrow {
          transform: none;
        }
      }

      @media (max-width: 480px) {
        .sticky-cta {
          right: 1rem;
          padding: 0.75rem 1.25rem;
          font-size: 0.875rem;
        }
      }
    `,
  ],
})
export class StickyCtaComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  visible = signal(false);

  private scrollHandler: (() => void) | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const threshold = () => window.innerHeight * 0.9;

    let ticking = false;
    this.scrollHandler = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        this.visible.set(window.scrollY > threshold());
        ticking = false;
      });
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    this.scrollHandler();
  }

  ngOnDestroy(): void {
    if (this.scrollHandler && isPlatformBrowser(this.platformId)) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
    this.scrollHandler = null;
  }
}
