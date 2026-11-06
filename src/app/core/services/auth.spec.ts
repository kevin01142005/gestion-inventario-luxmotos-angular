import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { RolUsuario } from '../models/role.model';
import { CONFIG_API_POR_DEFECTO } from '../utils/api.config';
import { crearJwtPrueba, modulosApiDe } from '../utils/sesion-prueba';
import { AuthService } from './auth';

describe('AuthService', () => {
  const url = CONFIG_API_POR_DEFECTO.urlBase;
  let service: AuthService;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  function preparar() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  }

  const esperar = () => new Promise<void>(r => setTimeout(r, 0));

  async function entrar(rol: RolUsuario, correo = 'persona@correo.co') {
    const promesa = service.login(correo, 'Clave123');
    http.expectOne(`${url}/autenticacion/login`).flush({
      tokenAcceso: crearJwtPrueba(correo, rol),
      tipoToken: 'Bearer',
      expiraEnSegundos: 1800,
    });
    await esperar();
    http.expectOne(`${url}/autenticacion/mis-modulos`).flush(modulosApiDe(rol));
    await promesa;
  }

  async function fallo(promesa: Promise<unknown>): Promise<Error | null> {
    try {
      await promesa;
      return null;
    } catch (error) {
      return error as Error;
    }
  }

  beforeEach(() => {
    localStorage.clear();
    preparar();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sin sesión: rol nulo, menú vacío, no es admin y sin permisos', () => {
    expect(service.currentRole()).toBeNull();
    expect(service.menu()).toHaveLength(0);
    expect(service.esAdmin()).toBe(false);
    expect(service.permisosDe('/clientes').puedeCrear).toBe(false);
    expect(service.tokenVigente()).toBeNull();
  });

  it('el login envía el correo y la contraseña a la API', async () => {
    const promesa = service.login('  ana@correo.co ', 'Clave123');
    const peticion = http.expectOne(`${url}/autenticacion/login`);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({ correo: 'ana@correo.co', contrasena: 'Clave123' });
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({ tokenAcceso: crearJwtPrueba('ana@correo.co', 'EMPLEADO'), tipoToken: 'Bearer', expiraEnSegundos: 1800 });
    await esperar();
    http.expectOne(`${url}/autenticacion/mis-modulos`).flush(modulosApiDe('EMPLEADO'));
    await promesa;
  });

  it('EMPLEADO: sesión con el correo y rol del token, 6 módulos y entra al primero', async () => {
    await entrar('EMPLEADO', 'ventas@correo.co');
    expect(service.usuario()?.correo).toBe('ventas@correo.co');
    expect(service.currentRole()).toBe('EMPLEADO');
    expect(service.menu().map(m => m.path)).toEqual(['/productos', '/categorias', '/proveedores', '/clientes', '/inventario', '/ventas']);
    expect(service.esAdmin()).toBe(false);
    expect(service.puedeRegistrar()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/productos']);
  });

  it('la lista de módulos se pide con el token en la cabecera', async () => {
    const promesa = service.login('a@correo.co', 'Clave123');
    http.expectOne(`${url}/autenticacion/login`).flush({
      tokenAcceso: crearJwtPrueba('a@correo.co', 'EMPLEADO'), tipoToken: 'Bearer', expiraEnSegundos: 1800,
    });
    await esperar();
    const modulos = http.expectOne(`${url}/autenticacion/mis-modulos`);
    expect(modulos.request.headers.get('Authorization')).toBe(`Bearer ${service.usuario()?.token}`);
    modulos.flush(modulosApiDe('EMPLEADO'));
    await promesa;
  });

  it('ADMINISTRADOR ve 10 módulos, empieza por el panel y puede registrar usuarios', async () => {
    await entrar('ADMINISTRADOR');
    expect(service.menu()).toHaveLength(10);
    expect(service.esAdmin()).toBe(true);
    expect(service.puedeRegistrar()).toBe(true);
    expect(service.rutaInicial()).toBe('/panel');
    expect(navegar).toHaveBeenCalledWith(['/panel']);
  });

  it('los permisos de cada módulo salen de la base de datos', async () => {
    await entrar('EMPLEADO');
    expect(service.permisosDe('/categorias')).toEqual({ puedeCrear: false, puedeEditar: false, puedeEliminar: false });
    expect(service.permisosDe('/clientes')).toEqual({ puedeCrear: true, puedeEditar: true, puedeEliminar: false });
    expect(service.tieneModulo('/ventas')).toBe(true);
    expect(service.tieneModulo('/reportes')).toBe(false);
  });

  it('credenciales inválidas: muestra el mensaje de la API y no abre sesión', async () => {
    const promesa = fallo(service.login('x@correo.co', 'mala'));
    http.expectOne(`${url}/autenticacion/login`).flush(
      { status: 401, message: 'Credenciales inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );
    const error = await promesa;
    expect(error?.message).toBe('Credenciales inválidas');
    expect(service.isLoggedIn()).toBe(false);
    expect(navegar.mock.calls).toHaveLength(0);
  });

  it('servidor inaccesible: avisa que puede estar dormido', async () => {
    const promesa = fallo(service.login('x@correo.co', 'Clave123'));
    http.expectOne(`${url}/autenticacion/login`).error(new Event('error') as ProgressEvent);
    const error = await promesa;
    expect(error?.message).toContain('No se pudo conectar');
    expect(service.isLoggedIn()).toBe(false);
  });

  it('un rol sin módulos asignados no puede entrar', async () => {
    const promesa = fallo(service.login('x@correo.co', 'Clave123'));
    http.expectOne(`${url}/autenticacion/login`).flush({
      tokenAcceso: crearJwtPrueba('x@correo.co', 'EMPLEADO'), tipoToken: 'Bearer', expiraEnSegundos: 1800,
    });
    await esperar();
    http.expectOne(`${url}/autenticacion/mis-modulos`).flush([]);
    const error = await promesa;
    expect(error?.message).toContain('no tiene módulos asignados');
    expect(service.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('motolux:sesion')).toBeNull();
  });

  it('un token con un rol desconocido se rechaza', async () => {
    const promesa = fallo(service.login('x@correo.co', 'Clave123'));
    http.expectOne(`${url}/autenticacion/login`).flush({
      tokenAcceso: crearJwtPrueba('x@correo.co', 'INVITADO'), tipoToken: 'Bearer', expiraEnSegundos: 1800,
    });
    const error = await promesa;
    expect(error?.message).toContain('no es válida');
    expect(service.isLoggedIn()).toBe(false);
  });

  it('la sesión y el menú sobreviven a una recarga (localStorage)', async () => {
    await entrar('ADMINISTRADOR');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const nuevo = TestBed.inject(AuthService);
    expect(nuevo.currentRole()).toBe('ADMINISTRADOR');
    expect(nuevo.menu()).toHaveLength(10);
  });

  it('una sesión vencida guardada en el navegador se descarta', () => {
    localStorage.setItem('motolux:sesion', JSON.stringify({
      correo: 'a@correo.co', nombre: 'a', rol: 'EMPLEADO', token: 't', expiraEn: Date.now() - 1000,
    }));
    preparar();
    expect(service.isLoggedIn()).toBe(false);
  });

  it('refrescarModulos actualiza el menú con lo que haya en la base de datos', async () => {
    await entrar('EMPLEADO');
    const promesa = service.refrescarModulos();
    http.expectOne(`${url}/autenticacion/mis-modulos`).flush(modulosApiDe('EMPLEADO').filter(m => m.ruta === '/clientes'));
    await promesa;
    expect(service.menu().map(m => m.ruta)).toEqual(['/clientes']);
  });

  it('refrescarModulos no falla si el servidor no responde', async () => {
    await entrar('EMPLEADO');
    const promesa = service.refrescarModulos();
    http.expectOne(`${url}/autenticacion/mis-modulos`).error(new Event('error') as ProgressEvent);
    await promesa;
    expect(service.menu()).toHaveLength(6);
  });

  it('logout limpia la sesión y vuelve al login con el aviso', async () => {
    await entrar('EMPLEADO');
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.menu()).toHaveLength(0);
    expect(localStorage.getItem('motolux:sesion')).toBeNull();
    expect(navegar).toHaveBeenLastCalledWith(['/login'], { queryParams: { mensaje: 'sesion_cerrada' } });
  });

  it('cerrarPorExpiracion avisa que la sesión expiró y solo actúa si había sesión', async () => {
    service.cerrarPorExpiracion();
    expect(navegar.mock.calls).toHaveLength(0);
    await entrar('EMPLEADO');
    service.cerrarPorExpiracion();
    expect(navegar).toHaveBeenLastCalledWith(['/login'], { queryParams: { mensaje: 'sesion_expirada' } });
  });
});
