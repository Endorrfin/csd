import { Routes } from '@angular/router';
import { managerGuard } from '../../../core/guards/auth.guard';

export const PROCUREMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./procurement-list').then((m) => m.ProcurementListComponent),
  },
  {
    path: 'new',
    loadComponent: () => import('./procurement-form').then((m) => m.ProcurementFormComponent),
    canActivate: [managerGuard],
  },
  // CHANGED: added public detail route
  {
    path: ':id',
    loadComponent: () => import('./procurement-detail').then((m) => m.ProcurementDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./procurement-form').then((m) => m.ProcurementFormComponent),
    canActivate: [managerGuard],
  },
];
