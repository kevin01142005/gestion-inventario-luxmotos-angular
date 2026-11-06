import { ModuloAsignado } from '../models/api.model';
import { Modulo, PermisosModulo } from '../models/modulo.model';
import { Role, RolUsuario } from '../models/role.model';

export const RUTAS_ANGULAR: Record<string, string> = {
  '/panel': '/panel',
  '/productos': '/productos',
  '/categorias': '/categorias',
  '/proveedores': '/proveedores',
  '/clientes': '/clientes',
  '/inventario': '/inventario',
  '/ventas': '/ventas',
  '/reportes': '/reportes',
  '/auditoria': '/auditoria',
  '/usuarios': '/registro',
  '/asistente': '/asistente',
};

export const ICONO_POR_DEFECTO = 'bi-grid';

export const SIN_PERMISOS: PermisosModulo = { puedeCrear: false, puedeEditar: false, puedeEliminar: false };

export function modulosDesdeApi(asignados: ModuloAsignado[]): Modulo[] {
  return asignados
    .filter(a => a.ruta in RUTAS_ANGULAR)
    .map(a => ({
      moduloId: a.moduloId,
      ruta: a.ruta,
      path: RUTAS_ANGULAR[a.ruta],
      name: a.nombre,
      icon: a.icono || ICONO_POR_DEFECTO,
      descripcion: a.descripcion,
      puedeCrear: a.puedeCrear,
      puedeEditar: a.puedeEditar,
      puedeEliminar: a.puedeEliminar,
    }));
}

export const ROLES_ADMIN: RolUsuario[] = ['ADMINISTRADOR', 'SUPER_USUARIO'];

export interface RolInfo {
  value: RolUsuario;
  label: string;
}

export const ROLES: RolInfo[] = [
  { value: 'EMPLEADO', label: 'Empleado' },
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'SUPER_USUARIO', label: 'Super usuario' },
];

export const ROLES_REGISTRABLES: Record<RolUsuario, RolUsuario[]> = {
  SUPER_USUARIO: ['EMPLEADO', 'ADMINISTRADOR'],
  ADMINISTRADOR: ['EMPLEADO'],
  EMPLEADO: [],
};

export function esRolUsuario(valor: string): valor is RolUsuario {
  return ROLES.some(r => r.value === valor);
}

export function esRolAdmin(rol: Role): boolean {
  return !!rol && ROLES_ADMIN.includes(rol);
}

export function traducirRol(rol: Role | string | undefined): string {
  return ROLES.find(r => r.value === rol)?.label ?? (rol || '-');
}

export function rolesRegistrables(rol: Role): RolInfo[] {
  if (!rol) return [];
  const permitidos = ROLES_REGISTRABLES[rol];
  return ROLES.filter(r => permitidos.includes(r.value));
}

export function puedeRegistrarUsuarios(rol: Role): boolean {
  return rolesRegistrables(rol).length > 0;
}

export function puedeRegistrar(actor: Role, nuevo: RolUsuario): boolean {
  return rolesRegistrables(actor).some(r => r.value === nuevo);
}