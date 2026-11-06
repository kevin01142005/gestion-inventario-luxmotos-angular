import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';
import { API_CONFIG } from '../utils/api.config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(API_CONFIG);
  if (!req.url.startsWith(config.urlBase)) return next(req);

  const auth = inject(AuthService);
  const esLogin = req.url.endsWith('/autenticacion/login');
  if (esLogin) return next(req);

  const token = auth.tokenVigente();
  if (!token) {
    auth.cerrarPorExpiracion();
    return throwError(
      () => new HttpErrorResponse({
        status: 401,
        statusText: 'Sesión expirada',
        url: req.url,
        error: { message: 'Tu sesión expiró. Inicia sesión nuevamente.' },
      }),
    );
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) auth.cerrarPorExpiracion();
      return throwError(() => error);
    }),
  );
};
