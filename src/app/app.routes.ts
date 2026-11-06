import { Routes } from '@angular/router';
import { guestGuard, inicioGuard, moduloGuard, registroGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [inicioGuard], children: [] },

  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Iniciar sesión · Gestión de Inventario',
    loadComponent: () => import('./features/auth/pages/login-page/login-page').then(m => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [registroGuard],
    title: 'Registrar usuario · Gestión de Inventario',
    loadComponent: () => import('./features/auth/pages/register-page/register-page').then(m => m.RegisterPage),
  },

  {
    path: 'panel',
    canActivate: [moduloGuard],
    data: { modulo: '/panel' },
    title: 'Panel · Gestión de Inventario',
    loadComponent: () => import('./features/panel/pages/panel-page/panel-page').then(m => m.PanelPage),
  },
  {
    path: 'productos',
    canActivate: [moduloGuard],
    data: { modulo: '/productos' },
    title: 'Productos · Gestión de Inventario',
    loadComponent: () => import('./features/panel/pages/panel-page/panel-page').then(m => m.PanelPage),
  },
  {
    path: 'ventas',
    canActivate: [moduloGuard],
    data: { modulo: '/ventas' },
    title: 'Ventas · Gestión de Inventario',
    loadComponent: () => import('./features/ventas/pages/ventas-page/ventas-page').then(m => m.VentasPage),
  },
  {
    path: 'clientes',
    canActivate: [moduloGuard],
    data: { modulo: '/clientes' },
    title: 'Clientes · Gestión de Inventario',
    loadComponent: () => import('./features/clientes/pages/clientes-page/clientes-page').then(m => m.ClientesPage),
  },
  {
    path: 'inventario',
    canActivate: [moduloGuard],
    data: { modulo: '/inventario' },
    title: 'Inventario · Gestión de Inventario',
    loadComponent: () => import('./features/inventario/pages/inventario-page/inventario-page').then(m => m.InventarioPage),
  },
  {
    path: 'categorias',
    canActivate: [moduloGuard],
    data: { modulo: '/categorias' },
    title: 'Categorías · Gestión de Inventario',
    loadComponent: () => import('./features/categorias/pages/categorias-page/categorias-page').then(m => m.CategoriasPage),
  },
  {
    path: 'proveedores',
    canActivate: [moduloGuard],
    data: { modulo: '/proveedores' },
    title: 'Proveedores · Gestión de Inventario',
    loadComponent: () => import('./features/proveedores/pages/proveedores-page/proveedores-page').then(m => m.ProveedoresPage),
  },

  {
    path: 'reportes',
    canActivate: [moduloGuard],
    data: { modulo: '/reportes' },
    title: 'Reportes · Gestión de Inventario',
    loadComponent: () => import('./features/reportes/pages/reportes-page/reportes-page').then(m => m.ReportesPage),
  },
  {
    path: 'auditoria',
    canActivate: [moduloGuard],
    data: { modulo: '/auditoria' },
    title: 'Auditoría · Gestión de Inventario',
    loadComponent: () => import('./features/auditoria/pages/auditoria-page/auditoria-page').then(m => m.AuditoriaPage),
  },
  {
    path: 'asistente',
    canActivate: [moduloGuard],
    data: { modulo: '/asistente' },
    title: 'Asistente · Gestión de Inventario',
    loadComponent: () => import('./features/asistente/pages/asistente-page/asistente-page').then(m => m.AsistentePage),
  },

  { path: '**', canActivate: [inicioGuard], children: [] },
];