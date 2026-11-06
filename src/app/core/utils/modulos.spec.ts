import { ModuloAsignado } from '../models/api.model';
import {
  ROLES, RUTAS_ANGULAR, esRolAdmin, esRolUsuario, modulosDesdeApi, puedeRegistrar, puedeRegistrarUsuarios,
  rolesRegistrables, traducirRol,
} from './modulos';
import { modulosApiDe } from './sesion-prueba';

describe('Roles y módulos', () => {
  const rutas = (rol: 'SUPER_USUARIO' | 'ADMINISTRADOR' | 'EMPLEADO') => modulosDesdeApi(modulosApiDe(rol)).map(m => m.ruta);

  it('EMPLEADO: productos, categorías, proveedores, clientes, inventario y ventas', () => {
    expect(rutas('EMPLEADO')).toEqual(['/productos', '/categorias', '/proveedores', '/clientes', '/inventario', '/ventas']);
  });

  it('ADMINISTRADOR ve los módulos de gestión además de reportes, auditoría y usuarios', () => {
    expect(rutas('ADMINISTRADOR')).toHaveLength(10);
    expect(rutas('ADMINISTRADOR')).toContain('/usuarios');
    expect(rutas('EMPLEADO')).not.toContain('/reportes');
  });

  it('el módulo de seguridad aún no tiene pantalla y no aparece en el menú', () => {
    expect(rutas('SUPER_USUARIO')).not.toContain('/seguridad');
    expect(rutas('SUPER_USUARIO')).toHaveLength(10);
  });

  it('cada ruta de la API se traduce a una ruta de Angular', () => {
    const [usuarios] = modulosDesdeApi(modulosApiDe('ADMINISTRADOR').filter(m => m.ruta === '/usuarios'));
    expect(usuarios.path).toBe('/registro');
    expect(usuarios.ruta).toBe('/usuarios');
    expect(RUTAS_ANGULAR['/panel']).toBe('/panel');
  });

  it('conserva los permisos de crear, editar y eliminar que vienen de la base de datos', () => {
    const [clientes] = modulosDesdeApi(modulosApiDe('EMPLEADO').filter(m => m.ruta === '/clientes'));
    expect(clientes.puedeCrear).toBe(true);
    expect(clientes.puedeEditar).toBe(true);
    expect(clientes.puedeEliminar).toBe(false);
  });

  it('usa un icono por defecto cuando el módulo no trae uno y descarta rutas desconocidas', () => {
    const lista: ModuloAsignado[] = [
      { moduloId: 1, nombre: 'Clientes', descripcion: null, ruta: '/clientes', icono: null, puedeCrear: false, puedeEditar: false, puedeEliminar: false },
      { moduloId: 2, nombre: 'Otro', descripcion: null, ruta: '/desconocido', icono: 'bi-x', puedeCrear: true, puedeEditar: true, puedeEliminar: true },
    ];
    const modulos = modulosDesdeApi(lista);
    expect(modulos).toHaveLength(1);
    expect(modulos[0].icon).toBe('bi-grid');
  });

  it('cada rol tiene mínimo 3 features', () => {
    for (const r of ROLES) {
      expect(rutas(r.value).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('reconoce los roles válidos, los administradores y su traducción', () => {
    expect(esRolUsuario('EMPLEADO')).toBe(true);
    expect(esRolUsuario('INVITADO')).toBe(false);
    expect(esRolAdmin(null)).toBe(false);
    expect(esRolAdmin('EMPLEADO')).toBe(false);
    expect(esRolAdmin('SUPER_USUARIO')).toBe(true);
    expect(traducirRol('SUPER_USUARIO')).toBe('Super usuario');
    expect(traducirRol(undefined)).toBe('-');
  });

  it('el super usuario registra empleados y administradores', () => {
    expect(rolesRegistrables('SUPER_USUARIO').map(r => r.value)).toEqual(['EMPLEADO', 'ADMINISTRADOR']);
    expect(puedeRegistrar('SUPER_USUARIO', 'EMPLEADO')).toBe(true);
    expect(puedeRegistrar('SUPER_USUARIO', 'ADMINISTRADOR')).toBe(true);
    expect(puedeRegistrar('SUPER_USUARIO', 'SUPER_USUARIO')).toBe(false);
  });

  it('el administrador solo registra empleados', () => {
    expect(rolesRegistrables('ADMINISTRADOR').map(r => r.value)).toEqual(['EMPLEADO']);
    expect(puedeRegistrar('ADMINISTRADOR', 'EMPLEADO')).toBe(true);
    expect(puedeRegistrar('ADMINISTRADOR', 'ADMINISTRADOR')).toBe(false);
    expect(puedeRegistrar('ADMINISTRADOR', 'SUPER_USUARIO')).toBe(false);
  });

  it('el empleado y quien no ha iniciado sesión no registran a nadie', () => {
    expect(rolesRegistrables('EMPLEADO')).toHaveLength(0);
    expect(rolesRegistrables(null)).toHaveLength(0);
    expect(puedeRegistrarUsuarios('EMPLEADO')).toBe(false);
    expect(puedeRegistrarUsuarios(null)).toBe(false);
    expect(puedeRegistrar('EMPLEADO', 'EMPLEADO')).toBe(false);
    expect(puedeRegistrarUsuarios('ADMINISTRADOR')).toBe(true);
    expect(puedeRegistrarUsuarios('SUPER_USUARIO')).toBe(true);
  });
});
