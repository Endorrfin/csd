import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
    provideTranslateService({
      defaultLanguage: 'ua',
    }),
    provideTranslateHttpLoader({
      prefix: './assets/i18n/',
      suffix: '.json',
    }),
  ],
};



// CUSTOMISE VERSION => NOT WORKING III
// import {
//   ApplicationConfig,
//   provideBrowserGlobalErrorListeners,
//   importProvidersFrom,
// } from '@angular/core';
// import { provideRouter } from '@angular/router';
// import { provideHttpClient, withFetch } from '@angular/common/http';
// import {
//   provideClientHydration,
//   withEventReplay,
// } from '@angular/platform-browser';
// import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
// import { TranslateHttpLoader } from '@ngx-translate/http-loader';
// import { routes } from './app.routes';
//
// export const appConfig: ApplicationConfig = {
//   providers: [
//     provideBrowserGlobalErrorListeners(),
//     provideRouter(routes),
//     provideHttpClient(withFetch()),
//     provideClientHydration(withEventReplay()),
//     importProvidersFrom(
//         TranslateModule.forRoot({
//           defaultLanguage: 'ua',
//           loader: {
//             provide: TranslateLoader,
//             useClass: TranslateHttpLoader,
//           },
//         }),
//     ),
//   ],
// };




// CUSTOMISE VERSION => NOT WORKING II
// import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
// import { provideRouter } from '@angular/router';
// import { provideHttpClient, withFetch } from '@angular/common/http';
// import { provideClientHydration } from '@angular/platform-browser';
// import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
// import { TranslateHttpLoader } from '@ngx-translate/http-loader';
// import { routes } from './app.routes';
//
// export const appConfig: ApplicationConfig = {
//   providers: [
//     provideZoneChangeDetection({ eventCoalescing: true }),
//     provideRouter(routes),
//     provideHttpClient(withFetch()),
//     provideClientHydration(),
//     provideTranslateService({
//       defaultLanguage: 'ua',
//       loader: {
//         provide: TranslateLoader,
//         useClass: TranslateHttpLoader,
//       },
//     }),
//   ],
// };


// CUSTOMISE VERSION => NOT WORKING I
// import {
//   ApplicationConfig,
//   provideBrowserGlobalErrorListeners,
//   importProvidersFrom,
// } from '@angular/core';
// import { provideRouter } from '@angular/router';
// import { provideHttpClient, withFetch } from '@angular/common/http';
// import {
//   provideClientHydration,
//   withEventReplay,
// } from '@angular/platform-browser';
// import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
// import { TranslateHttpLoader } from '@ngx-translate/http-loader';
// import { HttpClient } from '@angular/common/http';
// import { routes } from './app.routes';
//
// export function HttpLoaderFactory() {
//   // return new TranslateHttpLoader(http, './assets/i18n/', '.json');
//   // return new TranslateHttpLoader(http, { prefix: './assets/i18n/', suffix: '.json' });
//   // return new TranslateHttpLoader(http);
//
//   return new TranslateHttpLoader();
// }
//
// export const appConfig: ApplicationConfig = {
//   providers: [
//     provideBrowserGlobalErrorListeners(),
//     provideRouter(routes),
//     provideHttpClient(withFetch()),
//     provideClientHydration(withEventReplay()),
//     importProvidersFrom(
//         TranslateModule.forRoot({
//           // defaultLanguage: 'ua',
//           loader: {
//             provide: TranslateLoader,
//             useFactory: HttpLoaderFactory,
//             // deps: [HttpClient],
//           },
//           fallbackLang: 'ua'
//         })
//     ),
//   ],
// };



// INITIAL VERSION
// import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
// import { provideRouter } from '@angular/router';
//
// import { routes } from './app.routes';
// import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
//
// export const appConfig: ApplicationConfig = {
//   providers: [
//     provideBrowserGlobalErrorListeners(),
//     provideRouter(routes), provideClientHydration(withEventReplay())
//   ]
// };
