// path: ui/src/app/core/tokens/server-static-assets.token.ts
//
// === ADDED (P1-5): the map of /assets/**.json bodies the SSR runtime answers
// from its own bundle instead of over the network. Provided ONLY in
// app.config.server.ts, so the browser injector never sees it and the JSON
// payloads never reach the browser bundle. ===
import { InjectionToken } from '@angular/core';

export const SERVER_STATIC_ASSETS = new InjectionToken<Readonly<Record<string, unknown>>>(
  'SERVER_STATIC_ASSETS',
);
