// path: ui/src/app/core/services/language.service.ts
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, Signal, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

export type AppLang = 'ua' | 'en';

// CHANGED: localStorage key for the persisted language choice
export const LANG_STORAGE_KEY = 'csd.lang';

// CHANGED: app codes ('ua') differ from BCP-47 ('uk'); <html lang> needs the latter
const HTML_LANG: Record<AppLang, string> = { ua: 'uk', en: 'en' };

/**
 * Single reactive source of truth for the active UI language.
 *
 * The app runs zoneless (no zone.js in polyfills), so a plain
 * `get isUa() { return translate.currentLang === 'ua'; }` getter is NOT reactive:
 * reading `translate.currentLang` subscribes to nothing, and change detection
 * only re-evaluates it by accident when a sibling impure `| translate` pipe
 * happens to call markForCheck on the same view.
 *
 * Exposing the language as a signal makes any template that reads `lang()` /
 * `isUa()` re-render reliably on language change, independent of other bindings.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Active language, kept in sync with ngx-translate's onLangChange. */
  readonly lang: Signal<AppLang> = toSignal(
    this.translate.onLangChange.pipe(map((e) => (e.lang as AppLang) || 'ua')),
    { initialValue: (this.translate.currentLang as AppLang) || 'ua' },
  );

  /** Convenience flag for the common UA/EN branch in templates. */
  readonly isUa = computed(() => this.lang() === 'ua');

  constructor() {
    // CHANGED: keep <html lang> in step with the active language. SSR-safe: DOCUMENT is the
    // server DOM there, and <html> sits outside <app-root>, so hydration is unaffected.
    effect(() => {
      this.document.documentElement.setAttribute('lang', HTML_LANG[this.lang()]);
    });
  }

  /** User-initiated switch: change language and remember it for the next visit. */
  setLang(lang: AppLang): void {
    this.translate.use(lang);
    this.save(lang);
  }

  /** Saved language, or null (server, no value, invalid value, storage blocked). */
  readSaved(): AppLang | null {
    if (!this.isBrowser) return null;
    try {
      const v = localStorage.getItem(LANG_STORAGE_KEY);
      return v === 'ua' || v === 'en' ? v : null;
    } catch {
      return null;
    }
  }

  private save(lang: AppLang): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // storage unavailable (private mode / blocked) — the choice just won't persist
    }
  }
}
