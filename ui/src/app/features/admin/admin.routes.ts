import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  { path: '', redirectTo: 'wash-forms', pathMatch: 'full' },
  {
    path: 'wash-forms',
    loadComponent: () =>
      import('./wash-forms-list/wash-forms-list').then((m) => m.WashFormsListComponent),
  },
  {
    path: 'wash-forms/:id',
    loadComponent: () =>
      import('./wash-form-detail/wash-form-detail').then((m) => m.WashFormDetailComponent),
  },
];
