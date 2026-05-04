import { Component, input, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

/**
 * Hero block on the home page, driven by the "featured" post.
 *
 * Three render states:
 *  1. loading=true → skeleton (gradient + animated shimmer placeholders)
 *  2. post != null → cover image + title + CTA "Read more" → /blog/:slug
 *  3. post == null && !loading → fallback (gradient + static i18n title, no CTA)
 *
 * Image source priority: post.images[0] → post.coverImage → gradient only.
 * The gradient overlay sits above the image regardless, so text contrast is
 * guaranteed against any background photo.
 */
@Component({
  selector: 'app-hero-featured',
  standalone: true,
  imports: [TranslateModule, RouterLink],
  template: `
    <section class="hero" [class.hero--loading]="loading()">
      <!-- Background image rendered when present; gradient overlay sits on top -->
      @if (backgroundUrl(); as url) {
        <img
          [src]="url"
          [alt]="title()"
          class="hero__image"
          loading="eager"
          decoding="async"
        />
      }
      <div class="hero__overlay"></div>

      <div class="hero__content">
        @if (loading()) {
          <!-- Skeleton state — explicit aria-hidden, content arrives shortly -->
          <div class="hero__skeleton" aria-hidden="true">
            <div class="hero__skeleton-line hero__skeleton-line--short"></div>
            <div class="hero__skeleton-line"></div>
            <div class="hero__skeleton-line hero__skeleton-line--medium"></div>
          </div>
        } @else {
          <h1 class="hero__title">{{ title() }}</h1>

          @if (post(); as p) {
            <a [routerLink]="['/blog', p.slug]" class="hero__cta">
              <span>{{ 'HOME.HERO.READ_MORE' | translate }}</span>
              <span class="hero__cta-arrow" aria-hidden="true">&rarr;</span>
            </a>
          }
        }
      </div>
    </section>
  `,
  styles: [
    `
      .hero {
        position: relative;
        width: 100%;
        height: 60vh;
        min-height: 480px;
        overflow: hidden;
        border-radius: 12px;
        margin-bottom: 2rem;
        /* Default gradient background — visible when no image is present
           and serves as the fallback for the empty state. */
        background: linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #4299e1 100%);
      }

      .hero__image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 1;
      }

      /* Dark gradient overlay — guarantees text readability against any photo */
      .hero__overlay {
        position: absolute;
        inset: 0;
        z-index: 2;
        background: linear-gradient(
          135deg,
          rgba(26, 54, 93, 0.85) 0%,
          rgba(44, 82, 130, 0.65) 50%,
          rgba(26, 54, 93, 0.75) 100%
        );
      }

      .hero__content {
        position: relative;
        z-index: 3;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 2rem 3rem;
        max-width: 800px;
        color: white;
      }

      .hero__title {
        font-size: 2.5rem;
        font-weight: 700;
        line-height: 1.2;
        margin: 0 0 1.5rem;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        word-break: break-word;
      }

      .hero__cta {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        align-self: flex-start;
        padding: 0.875rem 1.75rem;
        background: white;
        color: #1a365d;
        text-decoration: none;
        border-radius: 6px;
        font-weight: 600;
        font-size: 1rem;
        transition:
          transform 0.2s ease,
          box-shadow 0.2s ease,
          background 0.2s ease;
      }
      .hero__cta:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
        background: #ebf8ff;
      }
      .hero__cta-arrow {
        transition: transform 0.2s ease;
      }
      .hero__cta:hover .hero__cta-arrow {
        transform: translateX(4px);
      }

      /* Skeleton state — uses globally defined .skeleton-line shimmer
         (already defined in styles.scss for the news skeleton).
         Wrap in white-ish tint so it reads against the dark hero overlay. */
      .hero__skeleton {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 600px;
      }
      .hero__skeleton-line {
        height: 1.5rem;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.15) 0%,
          rgba(255, 255, 255, 0.3) 50%,
          rgba(255, 255, 255, 0.15) 100%
        );
        background-size: 200% 100%;
        border-radius: 4px;
        animation: hero-shimmer 1.5s ease-in-out infinite;
      }
      .hero__skeleton-line--short {
        width: 30%;
        height: 1rem;
      }
      .hero__skeleton-line--medium {
        width: 60%;
      }

      @keyframes hero-shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      @media (max-width: 768px) {
        .hero {
          height: 70vh;
          min-height: 560px;
          border-radius: 8px;
        }
        .hero__content {
          padding: 1.5rem;
        }
        .hero__title {
          font-size: 1.75rem;
          margin-bottom: 1rem;
        }
        .hero__cta {
          padding: 0.75rem 1.25rem;
          font-size: 0.9375rem;
        }
      }
    `,
  ],
})
export class HeroFeaturedComponent implements OnInit, OnDestroy {
  private readonly translate = inject(TranslateService);

  readonly post = input<any | null>(null);
  readonly loading = input<boolean>(false);

  // track current language as a signal so computed title()
  // reacts to language switches. ngx-translate's TranslateService
  // exposes currentLang as a plain property + onLangChange event;
  // we mirror it into a signal here.
  private readonly currentLang = signal<string>(this.translate.currentLang || 'ua');
  private langSub?: Subscription;

  ngOnInit(): void {
    // Sync once in case currentLang was set after construction
    // (e.g. by a parent component or guard).
    this.currentLang.set(this.translate.currentLang || 'ua');
    this.langSub = this.translate.onLangChange.subscribe((e: LangChangeEvent) => {
      this.currentLang.set(e.lang);
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  /**
   * Title resolution — reacts to both post() and currentLang() signals,
   * so language switches re-render immediately.
   */
  readonly title = computed(() => {
    const p = this.post();
    const lang = this.currentLang();
    if (!p) {
      return this.translate.instant('HOME.HERO.FALLBACK_TITLE');
    }
    return lang === 'ua' ? p.titleUa : p.titleEn;
  });

  readonly backgroundUrl = computed<string | null>(() => {
    const p = this.post();
    if (!p) return null;
    return p.images?.[0] ?? p.coverImage ?? null;
  });
}
