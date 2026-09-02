import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
// no-op in the browser - it needs SERVER_STATIC_ASSETS, which only
// app.config.server.ts provides.
import { serverAssetsInterceptor } from './core/interceptors/server-assets.interceptor';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // serverAssetsInterceptor added - see server-assets.interceptor.ts.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, serverAssetsInterceptor])),
    provideClientHydration(withEventReplay()),
    provideTranslateService({
      fallbackLang: 'ua',
    }),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),
  ],
};
