import { Routes } from '@angular/router';

export const TESTIMONIAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./testimonial-list').then((m) => m.TestimonialListComponent),
  },
  // Form is rendered inline on the list page (modal-like flow),
  // but can also be a separate route for direct linking
  {
    path: 'new',
    loadComponent: () => import('./testimonial-form').then((m) => m.TestimonialFormComponent),
    // canActivate: [authGuard], // login required
  },
];
