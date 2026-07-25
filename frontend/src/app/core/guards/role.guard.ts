import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/auth.model';

/** Usage: data: { roles: ['ADMIN', 'DOCTOR'] } on a route */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const allowed = route.data['roles'] as Role[] | undefined;

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  if (!allowed || allowed.includes(auth.role() as Role)) {
    return true;
  }
  router.navigate(['/dashboard']);
  return false;
};
