import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const token = auth.getToken();
  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((err) => {
      if (err.status === 401) {
        auth.logout();
        toast.show('Your session has ended. Sign in again to continue.', 'error');
        router.navigate(['/login']);
      } else if (err.status === 403) {
        toast.show("You don't have access to do that.", 'error');
      } else if (err.status === 409) {
        toast.show(err.error?.message ?? 'That slot was just taken. Pick another time.', 'error');
      } else if (err.status >= 500) {
        toast.show('Something went wrong on our end. Try again shortly.', 'error');
      }
      return throwError(() => err);
    })
  );
};
