// path: ui/src/app/core/i18n/server-translate.loader.ts
//
// === ADDED (P1-5): the SSR half of the i18n loader.
//
// On the server, TranslateHttpLoader resolves the relative prefix
// './assets/i18n/' from app.config.ts against the CURRENT REQUEST HOST and
// issues a real network request during render:
// https://${PUBLIC_HOST}/assets/i18n/<lang>.json. Two things make that
// unserviceable on staging:
//
//   1. ui/serverless.yml excludes dist/ui/browser/** from the SSR Lambda, so the
//      Lambda cannot answer that request itself. Prod gets away with it because
//      CloudFront routes /assets/* to S3 - staging has no distribution yet.
//   2. PUBLIC_HOST is a Host header, so it cannot carry API Gateway's /staging
//      stage prefix. The URL loses the stage and API Gateway answers 403
//      whatever the Lambda contains.
//
// The resulting HttpErrorResponse is raised OUTSIDE the
// angularApp.handle(req).catch(next) chain in src/server.ts, so it surfaces as
// an uncaught exception, Node 22 kills the process, and API Gateway turns every
// page into 502 {"message":"Internal server error"}.
//
// Reading the translations straight out of the server bundle deletes the network
// hop: deterministic, identical on staging and prod, and one CloudFront round
// trip less per prod SSR render. The BROWSER is untouched - app.config.ts still
// provides TranslateHttpLoader there, so the JSON is still fetched and cached as
// a static asset client-side, and this file never enters the browser bundle. ===
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import en from '../../../assets/i18n/en.json';
import ua from '../../../assets/i18n/ua.json';
import type { AppLang } from '../services/language.service';

/** Keys must stay in lockstep with AppLang and src/assets/i18n/*.json. */
const TRANSLATIONS: Readonly<Record<AppLang, TranslationObject>> = { ua, en };

/** Mirrors provideTranslateService({ fallbackLang: 'ua' }) in app.config.ts. */
const FALLBACK_LANG: AppLang = 'ua';

const isAppLang = (lang: string): lang is AppLang =>
  Object.prototype.hasOwnProperty.call(TRANSLATIONS, lang);

export class ServerTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    return of(TRANSLATIONS[isAppLang(lang) ? lang : FALLBACK_LANG]);
  }
}
