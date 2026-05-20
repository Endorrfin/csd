// path: ui/src/app/core/services/language.service.ts
import { Injectable, Signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

export type AppLang = 'ua' | 'en';

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

  /** Active language, kept in sync with ngx-translate's onLangChange. */
  readonly lang: Signal<AppLang> = toSignal(
    this.translate.onLangChange.pipe(map((e) => (e.lang as AppLang) || 'ua')),
    { initialValue: (this.translate.currentLang as AppLang) || 'ua' },
  );

  /** Convenience flag for the common UA/EN branch in templates. */
  readonly isUa = computed(() => this.lang() === 'ua');
}
