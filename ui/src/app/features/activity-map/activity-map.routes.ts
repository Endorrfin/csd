import { Routes } from '@angular/router';

export const ACTIVITY_MAP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./activity-map').then((m) => m.ActivityMapComponent),
  },
];
