// ui/src/app/core/guards/auth.guard.ts
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const managerGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);

  // SSR: allow access, client will re-check after hydration
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isManager) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};


export const superAdminGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isSuperAdmin) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

// added authGuard for any authenticated user (used by testimonial)
export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
