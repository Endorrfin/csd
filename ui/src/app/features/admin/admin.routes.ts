// ui/src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';
import { superAdminGuard } from '../../core/guards/auth.guard';

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

  {
    path: 'users',
    loadComponent: () =>
      import('./users-management/users-management').then((m) => m.UsersManagementComponent),
    canActivate: [superAdminGuard],
  },
];
