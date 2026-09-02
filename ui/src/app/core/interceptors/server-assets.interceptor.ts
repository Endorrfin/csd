// path: ui/src/app/core/interceptors/server-assets.interceptor.ts
//
// (P1-5): stop SSR from fetching its own static assets over HTTP.
//
// Services such as ActivityDataService and LocationService read build-time JSON
// with HttpClient using a root-relative path ('/assets/data/activities.json').
// During SSR that path is resolved against the CURRENT REQUEST HOST, so the
// Lambda issues a real network request to itself. That works in prod only
// because CloudFront routes /assets/* to S3. On staging it cannot work at all:
// ui/serverless.yml excludes dist/ui/browser/** from the SSR package, and
// PUBLIC_HOST is a Host header so it cannot carry API Gateway's /staging stage
// prefix - the URL loses the stage and API Gateway answers 403 regardless.
//
// The failure is not merely a missing dataset. ImpactStatsService calls
// `this.data.load().subscribe()` with no error callback, so the HttpErrorResponse
// becomes an unhandled rejection, Node 22 terminates the process and API Gateway
// returns 502 for every page. That is the staging 502 in one sentence.
//
// This interceptor is registered in app.config.ts for BOTH platforms but is a
// no-op in the browser, because SERVER_STATIC_ASSETS is provided only in
// app.config.server.ts. Translations do not pass through here - they bypass
// HttpClient entirely via ServerTranslateLoader.
import { HttpEvent, HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, of } from 'rxjs';

import { SERVER_STATIC_ASSETS } from '../tokens/server-static-assets.token';

const ASSET_PREFIX = '/assets/';

/** Both '/assets/x.json' and 'https://host/assets/x.json' must map to the same key. */
const pathOf = (url: string): string => {
  try {
    return new URL(url, 'http://ssr.invalid').pathname;
  } catch {
    return url;
  }
};

export const serverAssetsInterceptor = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const assets = inject(SERVER_STATIC_ASSETS, { optional: true });
  if (assets === null || req.method !== 'GET') {
    return next(req);
  }

  const path = pathOf(req.url);
  if (!path.startsWith(ASSET_PREFIX)) {
    return next(req);
  }

  const body = assets[path];
  if (body === undefined) {
    // Loud, but never fatal: a static asset we forgot to register must not be
    // able to take the whole SSR process down again.
    console.error(`[ssr] ${path} is not registered in SERVER_STATIC_ASSETS; returning null`);
    return of(new HttpResponse<unknown>({ body: null, status: 200, url: req.url }));
  }

  return of(new HttpResponse<unknown>({ body, status: 200, url: req.url }));
};
