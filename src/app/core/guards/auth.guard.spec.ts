import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { ModuloAsignado } from '../models/api.model';
import { RolUsuario } from '../models/role.model';
import { AuthService } from '../services/auth';
import { guardarSesionPrueba } from '../utils/sesion-prueba';

function iniciar(rol: RolUsuario | null, modulos?: ModuloAsignado[]) {
  localStorage.clear();
  TestBed.resetTestingModule();
  if (rol) guardarSesionPrueba(rol, modulos);
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
  });
  return TestBed.inject(Router);
}

async function destino(router: Router, url: string) {
  await router.navigateByUrl(url);
  return router.url;
}

describe('Guards de rutas', () => {
  it('sin sesión redirige al login', async () => {
    const r = iniciar(null);
    expect(await destino(r, '/ventas')).toBe('/login?mensaje=sesion_requerida');
    expect(await destino(r, '/reportes')).toBe('/login?mensaje=sesion_requerida');
    expect(await destino(r, '/registro')).toBe('/login?mensaje=sesion_requerida');
  });

  it('EMPLEADO entra a los 6 módulos que tiene asignados', async () => {
    const r = iniciar('EMPLEADO');
    for (const ruta of ['/productos', '/ventas', '/clientes', '/inventario', '/categorias', '/proveedores']) {
      expect(await destino(r, ruta)).toBe(ruta);
    }
  });

  it('EMPLEADO no entra a panel, reportes, auditoría ni registro: vuelve a su módulo inicial con aviso', async () => {
    const r = iniciar('EMPLEADO');
    for (const ruta of ['/panel', '/reportes', '/auditoria', '/registro']) {
      expect(await destino(r, ruta)).toBe('/productos?mensaje=sin_permiso');
    }
  });

  it('ADMINISTRADOR y SUPER_USUARIO entran a todos los módulos con pantalla', async () => {
    for (const rol of ['ADMINISTRADOR', 'SUPER_USUARIO'] as const) {
      const r = iniciar(rol);
      for (const ruta of ['/panel', '/productos', '/ventas', '/clientes', '/inventario', '/categorias', '/proveedores', '/reportes', '/auditoria', '/registro']) {
        expect(await destino(r, ruta)).toBe(ruta);
      }
    }
  });

  it('el acceso depende de los módulos que la base de datos asigna al rol', async () => {
    const soloClientes: ModuloAsignado[] = [
      { moduloId: 5, nombre: 'Clientes', descripcion: null, ruta: '/clientes', icono: 'bi-people', puedeCrear: true, puedeEditar: false, puedeEliminar: false },
    ];
    const r = iniciar('EMPLEADO', soloClientes);
    expect(await destino(r, '/clientes')).toBe('/clientes');
    expect(await destino(r, '/ventas')).toBe('/clientes?mensaje=sin_permiso');
  });

  it('con sesión, /login lleva al módulo inicial del rol', async () => {
    expect(await destino(iniciar('EMPLEADO'), '/login')).toBe('/productos');
    expect(await destino(iniciar('ADMINISTRADOR'), '/login')).toBe('/panel');
  });

  it('la raíz y las rutas desconocidas llevan al módulo inicial (o al login sin sesión)', async () => {
    expect(await destino(iniciar('EMPLEADO'), '/')).toBe('/productos');
    expect(await destino(iniciar('EMPLEADO'), '/no-existe')).toBe('/productos');
    expect(await destino(iniciar('ADMINISTRADOR'), '/')).toBe('/panel');
    expect(await destino(iniciar(null), '/')).toBe('/login?mensaje=sesion_requerida');
  });

  it('una sesión vencida lleva al login con el aviso de expiración', async () => {
    const r = iniciar('EMPLEADO');
    TestBed.inject(AuthService);
    vi.spyOn(Date, 'now').mockReturnValue(4102444800000 + 60000);
    expect(await destino(r, '/ventas')).toBe('/login?mensaje=sesion_expirada');
  });
});
