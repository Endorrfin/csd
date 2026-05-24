import {
  Component,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  computed,
  effect,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ImpactStatsService } from '../../services/impact-stats.service';

/**
 * Impact stats block — 4 animated counters above the news feed.
 *
 * Animation contract:
 *  - Server / pre-hydration: render final numbers (no animation, no CLS).
 *  - Browser: counters start at 0 and animate when block enters viewport.
 *  - Animation runs once per page load (observer disconnects after firing).
 */
@Component({
  selector: 'app-impact-stats',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <section #root class="stats" [attr.aria-label]="'HOME.STATS.ARIA' | translate">
      @for (item of items; track item.key) {
        <div class="stats__card">
          <div class="stats__icon">
            @switch (item.key) {
              @case ('works') {
                <!-- native SVG instead of [innerHTML] (avoids sanitizer warnings) -->
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              }
              @case ('locations') {
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
              @case ('regions') {
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
              }
              @case ('donors') {
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  />
                </svg>
              }
            }
          </div>
          <div class="stats__value">{{ displayValues()[item.key] }}</div>
          <div class="stats__label">
            {{ 'HOME.STATS.' + item.labelKey | translate }}
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        margin: 0 0 2rem;
        min-height: 200px; /* reserve space — prevents CLS */
      }

      .stats__card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 1.5rem 1rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        text-align: center;
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease;
      }
      .stats__card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(26, 54, 93, 0.08);
      }

      .stats__icon {
        color: #1a365d;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 100%;
          height: 100%;
        }
      }
      .stats__icon :global(svg) {
        width: 100%;
        height: 100%;
      }

      .stats__value {
        font-size: 2.25rem;
        font-weight: 700;
        color: #1a365d;
        line-height: 1;
        font-variant-numeric: tabular-nums; /* digits don't jiggle during anim */
      }

      .stats__label {
        font-size: 0.875rem;
        color: #4a5568;
        line-height: 1.3;
      }

      @media (max-width: 768px) {
        .stats {
          grid-template-columns: repeat(2, 1fr);
          min-height: 380px; /* 2x2 grid needs more vertical room */
          gap: 0.75rem;
        }
        .stats__value {
          font-size: 1.75rem;
        }
        .stats__icon {
          width: 32px;
          height: 32px;
        }
      }
    `,
  ],
})
export class ImpactStatsComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly stats = inject(ImpactStatsService);

  @ViewChild('root', { static: true }) rootRef!: ElementRef<HTMLElement>;

  // Inline SVGs — chosen as semantic stand-ins for each metric.
  // works = checkmark, locations = pin, regions = map, donors = handshake.
  readonly items = [
    { key: 'works' as const, labelKey: 'WORKS' },
    { key: 'locations' as const, labelKey: 'LOCATIONS' },
    { key: 'regions' as const, labelKey: 'REGIONS' },
    { key: 'donors' as const, labelKey: 'DONORS' },
  ];

  // Animated values shown in template. On SSR/initial render they equal the
  // target stats (no animation). Once the IntersectionObserver fires, they
  // reset to 0 and animate up to the targets.
  private readonly animated: WritableSignal<Record<MetricKey, number>> = signal({
    works: 0,
    locations: 0,
    regions: 0,
    donors: 0,
  });

  // signal-based gate so the template re-renders when animation begins
  private readonly animationStarted = signal(false);

  // Render rules:
  //  - Server / before animation / after animation: show real targets.
  //  - During animation: show interpolated values from `animated()`.
  // This means SSR HTML and first browser frame are identical (no hydration
  // flicker), and a late-loading dataset never collapses to 0.
  readonly displayValues = computed(() => {
    if (!this.isBrowser || !this.animationStarted()) {
      return this.stats.allStats();
    }
    return this.animated();
  });

  private observer?: IntersectionObserver;
  private rafId?: number;
  private hasAnimated = false;
  private readonly inViewport = signal(false);

  constructor() {
    // Race-free trigger: only animate once BOTH conditions are true —
    //   (1) block is in viewport, (2) source data is loaded.
    // In normal-mode SSR cache hits, data arrives slightly after hydration
    // and after the observer has already fired; without this guard, the
    // animation runs against zeros.
    effect(() => {
      if (
        this.isBrowser &&
        !this.hasAnimated &&
        this.inViewport() &&
        this.stats.allStats().works > 0 // works > 0 ⇔ data loaded
      ) {
        this.startAnimation();
      }
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // defer animation start to the effect — it gates on
            // both viewport visibility AND data readiness.
            this.inViewport.set(true);
            this.observer?.disconnect();
            break;
          }
        }
      },
      { threshold: 0.2 },
    );
    this.observer.observe(this.rootRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.rafId !== undefined) {
      cancelAnimationFrame(this.rafId);
    }
  }

  private startAnimation(): void {
    this.hasAnimated = true;
    this.animationStarted.set(true);
    const targets = this.stats.allStats();
    const duration = 1500;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);

      this.animated.set({
        works: Math.round(targets.works * eased),
        locations: Math.round(targets.locations * eased),
        regions: Math.round(targets.regions * eased),
        donors: Math.round(targets.donors * eased),
      });

      if (progress < 1) {
        this.rafId = requestAnimationFrame(tick);
      } else {
        // animation done — switch computed back to live targets
        // so future stats changes (rare, but possible) propagate correctly.
        this.animationStarted.set(false);
      }
    };

    this.rafId = requestAnimationFrame(tick);
  }
}

type MetricKey = 'works' | 'locations' | 'regions' | 'donors';
