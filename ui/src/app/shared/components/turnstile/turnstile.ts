// ui/src/app/shared/components/turnstile/turnstile.ts
// Cloudflare Turnstile wrapper (shared). SSR-safe: the CF
// script + widget render only in the browser (afterNextRender). Exposes a
// token provider: getToken() keeps ONE token pre-fetched and resets the widget
// after each use, because CF tokens are single-use and BOTH guarded endpoints
// (needs-presigned per file + recovery submit) each need a fresh one.
import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  afterNextRender,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  appearance?: 'always' | 'execute' | 'interaction-only';
  retry?: 'auto' | 'never';
}

interface TurnstileApi {
  render(el: HTMLElement, opts: TurnstileRenderOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TOKEN_TIMEOUT_MS = 20_000;

let scriptPromise: Promise<void> | null = null;

/** Load the CF script once per document (browser only). */
function loadTurnstileScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (document.querySelector('script[data-turnstile]')) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.setAttribute('data-turnstile', '');
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null; // allow a later retry
      reject(new Error('Failed to load Turnstile'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

@Component({
  selector: 'app-turnstile',
  standalone: true,
  template: `<div #host class="turnstile-host"></div>`,
  styles: [
    `
      .turnstile-host:empty {
        display: none;
      }
    `,
  ],
})
export class TurnstileComponent implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  /** Cloudflare Turnstile SITE key (public). */
  @Input({ required: true }) siteKey = '';

  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;

  private widgetId: string | null = null;
  private ready: string | null = null; // one token kept pre-fetched
  private readonly waiters: ((token: string) => void)[] = [];
  private rendered = false;

  constructor() {
    // Browser-only: afterNextRender never runs during SSR.
    afterNextRender(() => void this.renderWidget());
  }

  ngOnDestroy(): void {
    const api = this.turnstile();
    if (api && this.widgetId) {
      try {
        api.remove(this.widgetId);
      } catch {
        // widget already gone — nothing to clean up
      }
    }
  }

  /**
   * Resolve with a FRESH single-use token. Returns the pre-fetched token
   * immediately (and resets to fetch the next), or waits for the next solve.
   */
  getToken(): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(new Error('Turnstile is unavailable during SSR'));
    }
    if (this.ready) {
      const token = this.ready;
      this.ready = null;
      this.resetForNext();
      return Promise.resolve(token);
    }
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.indexOf(wrapped);
        if (idx >= 0) this.waiters.splice(idx, 1);
        reject(new Error('Turnstile verification timed out'));
      }, TOKEN_TIMEOUT_MS);
      const wrapped = (token: string): void => {
        clearTimeout(timer);
        resolve(token);
      };
      this.waiters.push(wrapped);
    });
  }

  private async renderWidget(): Promise<void> {
    if (this.rendered || !this.siteKey) return;
    try {
      await loadTurnstileScript();
      const api = this.turnstile();
      if (!api) return;
      this.widgetId = api.render(this.host.nativeElement, {
        sitekey: this.siteKey,
        callback: (token) => this.onToken(token),
        'error-callback': () => this.onErrorOrExpired(),
        'expired-callback': () => this.onErrorOrExpired(),
        appearance: 'interaction-only',
        retry: 'auto',
      });
      this.rendered = true;
    } catch {
      // Script blocked / offline — getToken() will time out and the caller
      // surfaces a user-facing error. Nothing to do here.
    }
  }

  private onToken(token: string): void {
    const waiter = this.waiters.shift();
    if (waiter) {
      waiter(token);
      this.resetForNext(); // keep the pipeline primed for the next request
    } else {
      this.ready = token;
    }
  }

  private onErrorOrExpired(): void {
    this.ready = null;
    this.resetForNext();
  }

  private resetForNext(): void {
    const api = this.turnstile();
    if (api && this.widgetId) {
      try {
        api.reset(this.widgetId);
      } catch {
        // reset can throw if the widget is mid-render — the retry:auto covers it
      }
    }
  }

  private turnstile(): TurnstileApi | undefined {
    return (globalThis as unknown as { turnstile?: TurnstileApi }).turnstile;
  }
}
