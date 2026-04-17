import { Routes } from '@angular/router';

export const COMPLAINT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./complaint-form').then((m) => m.ComplaintFormComponent),
  },
];
