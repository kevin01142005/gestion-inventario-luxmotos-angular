import { ModuloAsignado } from '../models/api.model';
import { RolUsuario, SesionUsuario } from '../models/role.model';
import { modulosDesdeApi } from './modulos';

type Permiso = [boolean, boolean, boolean];

const CATALOGO: { ruta: string; nombre: string; icono: string; descripcion: string }[] = [
  { ruta: '/panel', nombre: 'Panel', icono: 'bi-speedometer2', descripcion: 'Estadísticas generales del negocio' },
  { ruta: '/productos', nombre: 'Productos', icono: 'bi-box-seam', descripcion: 'Catálogo de productos y alertas de stock' },
  { ruta: '/categorias', nombre: 'Categorías', icono: 'bi-tags', descripcion: 'Categorías de productos' },
  { ruta: '/proveedores', nombre: 'Proveedores', icono: 'bi-truck', descripcion: 'Proveedores de mercancía' },
  { ruta: '/clientes', nombre: 'Clientes', icono: 'bi-people', descripcion: 'Clientes e historial de compras' },
  { ruta: '/inventario', nombre: 'Inventario', icono: 'bi-arrow-left-right', descripcion: 'Entradas y salidas de inventario' },
  { ruta: '/ventas', nombre: 'Ventas', icono: 'bi-cart-check', descripcion: 'Ventas y facturación' },
  { ruta: '/reportes', nombre: 'Reportes', icono: 'bi-bar-chart', descripcion: 'Reportes de ventas e inventario' },
  { ruta: '/auditoria', nombre: 'Auditoría', icono: 'bi-shield-lock', descripcion: 'Registro de acciones de los usuarios' },
  { ruta: '/usuarios', nombre: 'Usuarios', icono: 'bi-person-gear', descripcion: 'Gestión de usuarios del sistema' },
  { ruta: '/seguridad', nombre: 'Seguridad', icono: 'bi-key', descripcion: 'Roles, módulos y permisos' },
];

const LECTURA: Permiso = [false, false, false];
const ESCRITURA: Permiso = [true, true, false];
const TOTAL: Permiso = [true, true, true];

const PERMISOS: Record<RolUsuario, Record<string, Permiso>> = {
  EMPLEADO: {
    '/productos': ESCRITURA,
    '/categorias': LECTURA,
    '/proveedores': LECTURA,
    '/clientes': ESCRITURA,
    '/inventario': [true, false, false],
    '/ventas': [true, false, false],
  },
  ADMINISTRADOR: {
    '/panel': LECTURA,
    '/productos': TOTAL,
    '/categorias': TOTAL,
    '/proveedores': TOTAL,
    '/clientes': TOTAL,
    '/inventario': [true, false, false],
    '/ventas': [true, false, false],
    '/reportes': LECTURA,
    '/auditoria': LECTURA,
    '/usuarios': TOTAL,
  },
  SUPER_USUARIO: {
    '/panel': LECTURA,
    '/productos': TOTAL,
    '/categorias': TOTAL,
    '/proveedores': TOTAL,
    '/clientes': TOTAL,
    '/inventario': [true, false, false],
    '/ventas': [true, false, false],
    '/reportes': LECTURA,
    '/auditoria': LECTURA,
    '/usuarios': TOTAL,
    '/seguridad': TOTAL,
  },
};

const CORREOS: Record<RolUsuario, string> = {
  SUPER_USUARIO: 'superusuario@motolux.co',
  ADMINISTRADOR: 'admin@motolux.co',
  EMPLEADO: 'ventas@motolux.co',
};

const EXPIRA_EN = 4102444800000;

export const USUARIOS_DEMO: Record<RolUsuario, SesionUsuario> = {
  SUPER_USUARIO: { correo: CORREOS.SUPER_USUARIO, nombre: CORREOS.SUPER_USUARIO, rol: 'SUPER_USUARIO', token: 'token-prueba', expiraEn: EXPIRA_EN },
  ADMINISTRADOR: { correo: CORREOS.ADMINISTRADOR, nombre: CORREOS.ADMINISTRADOR, rol: 'ADMINISTRADOR', token: 'token-prueba', expiraEn: EXPIRA_EN },
  EMPLEADO: { correo: CORREOS.EMPLEADO, nombre: CORREOS.EMPLEADO, rol: 'EMPLEADO', token: 'token-prueba', expiraEn: EXPIRA_EN },
};

export function modulosApiDe(rol: RolUsuario): ModuloAsignado[] {
  const permisos = PERMISOS[rol];
  return CATALOGO.filter(m => m.ruta in permisos).map((m, i) => ({
    moduloId: i + 1,
    nombre: m.nombre,
    descripcion: m.descripcion,
    ruta: m.ruta,
    icono: m.icono,
    puedeCrear: permisos[m.ruta][0],
    puedeEditar: permisos[m.ruta][1],
    puedeEliminar: permisos[m.ruta][2],
  }));
}

export function guardarSesionPrueba(rol: RolUsuario, modulos: ModuloAsignado[] = modulosApiDe(rol)): void {
  localStorage.setItem('motolux:sesion', JSON.stringify(USUARIOS_DEMO[rol]));
  localStorage.setItem('motolux:modulos', JSON.stringify(modulosDesdeApi(modulos)));
}

function aBase64Url(texto: string): string {
  return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function crearJwtPrueba(correo: string, rol: string, expiraEnSegundos: number = 4102444800): string {
  const cabecera = aBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const cuerpo = aBase64Url(JSON.stringify({ sub: correo, rol, usuarioId: 1, iat: 1, exp: expiraEnSegundos }));
  return `${cabecera}.${cuerpo}.firma`;
}
