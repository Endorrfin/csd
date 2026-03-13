import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/about').then((m) => m.AboutComponent),
  },
  {
    path: 'blog',
    loadComponent: () =>
      import('./features/blog/blog').then((m) => m.BlogComponent),
  },
  {
    path: 'partners',
    loadComponent: () =>
      import('./features/partners/partners').then(
        (m) => m.PartnersComponent,
      ),
  },
  {
    path: 'cooperation',
    loadComponent: () =>
      import('./features/cooperation/cooperation').then(
        (m) => m.CooperationComponent,
      ),
  },
  // ── Needs section with child routes ──
  {
    path: 'needs',
    loadComponent: () =>
      import('./features/needs/needs').then((m) => m.NeedsComponent),
    loadChildren: () =>
      import('./features/needs/needs.routes').then((m) => m.needsRoutes),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact').then(
        (m) => m.ContactComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login').then((m) => m.LoginComponent),
  },
  // Redirect old wash-form URL to new location
  {
    path: 'wash-form',
    redirectTo: 'needs/wash-form',
    pathMatch: 'full',
  },
];
