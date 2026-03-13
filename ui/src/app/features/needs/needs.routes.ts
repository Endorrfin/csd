import { Routes } from '@angular/router';

export const needsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'wash-form',
    pathMatch: 'full',
  },
  {
    path: 'wash-form',
    loadComponent: () =>
      import('./wash-form/wash-form').then((m) => m.WashFormComponent),
  },
  // Stage 2 — placeholder routes
  // {
  //   path: 'recovery-form',
  //   loadComponent: () =>
  //     import('./recovery-form/recovery-form').then((m) => m.RecoveryFormComponent),
  // },
  // {
  //   path: 'shelters-form',
  //   loadComponent: () =>
  //     import('./shelters-form/shelters-form').then((m) => m.SheltersFormComponent),
  // },
];
