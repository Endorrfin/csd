import { inject, Injectable, OnDestroy } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

/**
 * Single owner of <title> and <meta name="description">.
 *
 * The service is a root singleton, so BOTH the description tag and the language
 * subscription are shared by every route. Anything that leaves them pointing at
 * the previous route surfaces as the wrong description on the next page, or as
 * the previous page's title after a language switch — which is why there is a
 * default-key fallback (never a bare removeTag) and exactly one `langSub` that
 * every entry point replaces.
 *
 * The fuller fix is to drive this from `Router.events` + `route.data` instead of
 * ~20 hand-written ngOnInit calls; that is a separate change.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleService implements OnDestroy {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly translate = inject(TranslateService);

  // site-wide fallback replaces removeTag('name="description"').
  // index.html ships no description at all, so removing the tag left whatever
  // the previously visited route had written still standing on every page that
  // only sets a title (auth, admin, /about/documents).
  private static readonly DEFAULT_DESCRIPTION_KEY = 'HOME.DESCRIPTION';

  private langSub?: Subscription;

  /** Title + description from i18n keys, re-applied on every language switch. */
  updateSeo(titleKey: string, descriptionKey?: string, isAdmin = false): void {
    this.langSub?.unsubscribe();

    // no descriptionKey now means "site default", not "no description".
    const descKey = descriptionKey ?? PageTitleService.DEFAULT_DESCRIPTION_KEY;

    const applyTags = () => {
      this.translate.get(titleKey).subscribe((title: string) => {
        const fullTitle = isAdmin ? `${title} | Admin | CSD Fund` : `${title} | CSD Fund`;
        this.titleService.setTitle(fullTitle);
      });

      this.translate.get(descKey).subscribe((desc: string) => {
        this.metaService.updateTag({ name: 'description', content: desc });
      });
    };

    applyTags();

    this.langSub = this.translate.onLangChange.subscribe(() => applyTags());
  }

  setTitle(key: string, isAdmin = false): void {
    this.updateSeo(key, undefined, isAdmin);
  }

  // entry point for routes whose metadata comes from resolved data
  // rather than i18n keys (blog/:slug). Dropping langSub is the point — without
  // it the previous route's watcher stays armed and rewrites THIS page's title
  // the moment the user switches language.
  setStaticSeo(title: string, description: string): void {
    this.langSub?.unsubscribe();
    this.langSub = undefined;

    this.titleService.setTitle(title);
    this.metaService.updateTag({ name: 'description', content: description });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}
