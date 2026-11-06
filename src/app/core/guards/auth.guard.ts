import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth';

function haciaLogin(router: Router, auth: AuthService): UrlTree {
  const habiaSesion = auth.isLoggedIn();
  if (habiaSesion) auth.descartarSesion();
  return router.createUrlTree(['/login'], {
    queryParams: { mensaje: habiaSesion ? 'sesion_expirada' : 'sesion_requerida' },
  });
}

function sesionActiva(auth: AuthService): boolean {
  return auth.isLoggedIn() && auth.tokenVigente() !== null;
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return sesionActiva(auth) ? true : haciaLogin(inject(Router), auth);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return sesionActiva(auth) ? inject(Router).createUrlTree([auth.rutaInicial()]) : true;
};

export const inicioGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return sesionActiva(auth) ? router.createUrlTree([auth.rutaInicial()]) : haciaLogin(router, auth);
};

export const moduloGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!sesionActiva(auth)) return haciaLogin(router, auth);
  const ruta = route.data['modulo'] as string;
  return auth.tieneModulo(ruta)
    ? true
    : router.createUrlTree([auth.rutaInicial()], { queryParams: { mensaje: 'sin_permiso' } });
};

export const registroGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!sesionActiva(auth)) return haciaLogin(router, auth);
  return auth.puedeRegistrar()
    ? true
    : router.createUrlTree([auth.rutaInicial()], { queryParams: { mensaje: 'sin_permiso' } });
};
