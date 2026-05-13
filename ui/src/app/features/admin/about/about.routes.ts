// ui/src/app/features/admin/about/about.routes.ts
import { Routes } from '@angular/router';

export const aboutRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./about-shell').then((m) => m.AboutShellComponent),
    children: [
      { path: '', redirectTo: 'sections', pathMatch: 'full' },
      {
        path: 'sections',
        loadComponent: () =>
          import('./sections/sections-list').then((m) => m.AdminAboutSectionsListComponent),
      },
      {
        path: 'sections/new',
        loadComponent: () =>
          import('./sections/section-edit').then((m) => m.AdminAboutSectionEditComponent),
      },
      {
        path: 'sections/:id',
        loadComponent: () =>
          import('./sections/section-edit').then((m) => m.AdminAboutSectionEditComponent),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/documents-list').then((m) => m.AdminAboutDocumentsListComponent),
      },
      {
        path: 'documents/new',
        loadComponent: () =>
          import('./documents/document-edit').then((m) => m.AdminAboutDocumentEditComponent),
      },
      {
        path: 'documents/:id',
        loadComponent: () =>
          import('./documents/document-edit').then((m) => m.AdminAboutDocumentEditComponent),
      },
    ],
  },
];
