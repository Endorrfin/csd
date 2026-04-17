import { Routes } from '@angular/router';
import { managerGuard } from '../../../core/guards/auth.guard';

export const VACANCY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./vacancy-list').then((m) => m.VacancyListComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./vacancy-form').then((m) => m.VacancyFormComponent),
    canActivate: [managerGuard],
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./vacancy-detail').then((m) => m.VacancyDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./vacancy-form').then((m) => m.VacancyFormComponent),
    canActivate: [managerGuard],
  },
];
