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
  // CHANGED: PR-W2 — Winterization form (steps 1–5). Reachable by URL only for
  // now; activating the ❄️ tab in needs.ts belongs to PR-W3, which adds the
  // files/review/consent steps and the actual submit.
  {
    path: 'winterization-form',
    loadComponent: () =>
      import('./winterization-form/winterization-form').then((m) => m.WinterizationFormComponent),
  },
  // Stage 2 — placeholder routes
  // {
  //   path: 'shelters-form',
  //   loadComponent: () =>
  //     import('./shelters-form/shelters-form').then((m) => m.SheltersFormComponent),
  // },
];
