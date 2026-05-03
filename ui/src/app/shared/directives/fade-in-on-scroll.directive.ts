import {
  Directive,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Input,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Fades + slides element into view on scroll.
 * Pure CSS transition — no animation engine, no scroll listener.
 * SSR-safe: skips IntersectionObserver entirely on server.
 *
 * Usage:
 *   <article appFadeInOnScroll>...</article>
 *   <div appFadeInOnScroll [fadeDelay]="100">...</div>
 */
@Directive({
  selector: '[appFadeInOnScroll]',
  standalone: true,
})
export class FadeInOnScrollDirective implements OnInit, OnDestroy {
  /** Optional stagger delay in ms — useful when fading a list. */
  @Input() fadeDelay = 0;

  /** Visible portion threshold to trigger animation (0–1). */
  @Input() fadeThreshold = 0.15;

  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    // SSR: render visible immediately, skip observer
    if (!isPlatformBrowser(this.platformId)) {
      this.el.nativeElement.classList.add('fade-in-visible');
      return;
    }

    // initial state — hidden
    const node = this.el.nativeElement;
    node.classList.add('fade-in-init');
    if (this.fadeDelay > 0) {
      node.style.transitionDelay = `${this.fadeDelay}ms`;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add('fade-in-visible');
            // one-shot: stop observing after first reveal
            this.observer?.unobserve(node);
          }
        }
      },
      { threshold: this.fadeThreshold },
    );

    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
