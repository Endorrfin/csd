// ui/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { managerGuard } from './core/guards/auth.guard';
import { blogPostResolver } from './features/blog/blog-post.resolver';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then((m) => m.AboutComponent),
  },
  {
    path: 'blog',
    loadComponent: () => import('./features/blog/blog').then((m) => m.BlogComponent),
  },
  {
    path: 'blog/:slug',
    loadComponent: () => import('./features/blog/blog-post').then((m) => m.BlogPostComponent),
    resolve: { post: blogPostResolver }, // resolve before render
  },
  {
    path: 'partners',
    loadComponent: () => import('./features/partners/partners').then((m) => m.PartnersComponent),
  },
  // added procurement vacancy, testimonial, complaint children route of cooperation + default redirect
  {
    path: 'cooperation',
    loadComponent: () =>
      import('./features/cooperation/cooperation').then((m) => m.CooperationComponent),
    children: [
      { path: '', redirectTo: 'procurement', pathMatch: 'full' },
      {
        path: 'procurement',
        loadChildren: () =>
          import('./features/cooperation/procurement/procurement.routes').then(
            (m) => m.PROCUREMENT_ROUTES,
          ),
      },
      {
        path: 'vacancy',
        loadChildren: () =>
          import('./features/cooperation/vacancy/vacancy.routes').then((m) => m.VACANCY_ROUTES),
      },
      {
        path: 'testimonial',
        loadChildren: () =>
          import('./features/cooperation/testimonial/testimonial.routes').then(
            (m) => m.TESTIMONIAL_ROUTES,
          ),
      },
      {
        path: 'complaint',
        loadChildren: () =>
          import('./features/cooperation/complaint/complaint.routes').then(
            (m) => m.COMPLAINT_ROUTES,
          ),
      },
    ],
  },
  // ── Needs section with child routes ──
  {
    path: 'needs',
    loadComponent: () => import('./features/needs/needs').then((m) => m.NeedsComponent),
    loadChildren: () => import('./features/needs/needs.routes').then((m) => m.needsRoutes),
  },
  // ── Admin panel (manager/admin only) ──
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin').then((m) => m.AdminComponent),
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
    canActivate: [managerGuard],
  },
  {
    path: 'contact',
    loadComponent: () => import('./features/contact/contact').then((m) => m.ContactComponent),
  },

  // ── Auth routes ──
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/forgot-password/forgot-password').then((m) => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/reset-password/reset-password').then((m) => m.ResetPasswordComponent),
  },

  // Redirect old wash-form URL
  {
    path: 'wash-form',
    redirectTo: 'needs/wash-form',
    pathMatch: 'full',
  },
];
