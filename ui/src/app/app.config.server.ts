import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
// server-only TranslateLoader - see server-translate.loader.ts for why
// the HTTP loader cannot work during SSR.
import { provideTranslateLoader } from '@ngx-translate/core';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { ServerTranslateLoader } from './core/i18n/server-translate.loader';
import { SERVER_STATIC_ASSETS } from './core/tokens/server-static-assets.token';

// bundled copies of the /assets/**.json that SSR reads through
// HttpClient. These imports live in the SERVER entry graph only, so nothing
// here is shipped to the browser.
import activities from '../assets/data/activities.json';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // overrides provideTranslateHttpLoader() from app.config.ts.
    // mergeApplicationConfig concatenates the two provider arrays and Angular's
    // injector keeps the LAST provider for a token, so this wins on the server
    // and only on the server.
    provideTranslateLoader(ServerTranslateLoader),
    // answer static-asset GETs from the bundle instead of the network.
    {
      provide: SERVER_STATIC_ASSETS,
      useValue: {
        // 107 KB - drives the home impact-stats block, which IS server-rendered.
        '/assets/data/activities.json': activities,
        // 4.7 MB. Deliberately NOT bundled: it would dominate the Lambda package
        // and, via the hydration transfer cache, get inlined into every rendered
        // page that shows a location selector. It is a client-only dataset -
        // LocationSelector already renders an empty list until it arrives.
        '/assets/data/locations.json': [],
      } satisfies Record<string, unknown>,
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
