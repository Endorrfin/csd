import { Routes } from '@angular/router';

export const needsRoutes: Routes = [
  {
    path: '',
    redirectTo: 'wash-form',
    pathMatch: 'full',
  },
  {
    path: 'wash-form',
    loadComponent: () => import('./wash-form/wash-form').then((m) => m.WashFormComponent),
  },
  // === ADDED: PR-3 — Recovery form (steps 1–4; submit + files land in PR-4) ===
  {
    path: 'recovery-form',
    loadComponent: () =>
      import('./recovery-form/recovery-form').then((m) => m.RecoveryFormComponent),
  },
  // Stage 2 — placeholder routes
  // {
  //   path: 'shelters-form',
  //   loadComponent: () =>
  //     import('./shelters-form/shelters-form').then((m) => m.SheltersFormComponent),
  // },
];
