// ui/src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';
import { adminGuard, superAdminGuard } from '../../core/guards/auth.guard';

export const adminRoutes: Routes = [
  { path: '', redirectTo: 'wash-forms', pathMatch: 'full' },

  // WASH forms
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

  // Procurements admin (placeholder — replaced in Step 4)
  {
    path: 'procurements',
    loadComponent: () =>
      import('./procurements/procurements-list').then((m) => m.AdminProcurementsListComponent),
  },

  // Vacancies admin (placeholder — replaced in Step 5)
  {
    path: 'vacancies',
    loadComponent: () =>
      import('./vacancies/vacancies-list').then((m) => m.AdminVacanciesListComponent),
  },

  // Testimonials admin (placeholder — replaced in Step 6)
  {
    path: 'testimonials',
    loadComponent: () =>
      import('./testimonials/testimonials-list').then((m) => m.AdminTestimonialsListComponent),
  },
  // full-field edit screen for a single testimonial
  {
    path: 'testimonials/:id/edit',
    loadComponent: () =>
      import('./testimonials/testimonial-edit').then((m) => m.AdminTestimonialEditComponent),
  },

  // Complaints admin (placeholder — replaced in Step 7; admin+ only)
  {
    path: 'complaints',
    loadComponent: () =>
      import('./complaints/complaints-list').then((m) => m.AdminComplaintsListComponent),
    canActivate: [adminGuard],
  },

  {
    path: 'about',
    loadChildren: () => import('./about/about.routes').then((m) => m.aboutRoutes),
  },

  // Users management (super_admin only)
  {
    path: 'users',
    loadComponent: () =>
      import('./users-management/users-management').then((m) => m.UsersManagementComponent),
    canActivate: [superAdminGuard],
  },
];
