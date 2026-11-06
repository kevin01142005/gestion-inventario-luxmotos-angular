import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth';
import { CONFIG_API_POR_DEFECTO } from '../utils/api.config';
import { guardarSesionPrueba } from '../utils/sesion-prueba';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const url = CONFIG_API_POR_DEFECTO.urlBase;
  let cliente: HttpClient;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  function preparar(conSesion: boolean) {
    localStorage.clear();
    TestBed.resetTestingModule();
    if (conSesion) guardarSesionPrueba('EMPLEADO');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.inject(AuthService);
    cliente = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  }

  async function fallo(promesa: Promise<unknown>): Promise<{ status: number } | null> {
    try {
      await promesa;
      return null;
    } catch (error) {
      return error as { status: number };
    }
  }

  it('agrega el token a las peticiones de la API', () => {
    preparar(true);
    cliente.get(`${url}/categorias`).subscribe();
    const peticion = http.expectOne(`${url}/categorias`);
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token-prueba');
    peticion.flush([]);
  });

  it('no agrega el token a otras direcciones', () => {
    preparar(true);
    cliente.get('https://otro-sitio.com/datos').subscribe();
    const peticion = http.expectOne('https://otro-sitio.com/datos');
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });

  it('la petición de login va sin token', () => {
    preparar(true);
    cliente.post(`${url}/autenticacion/login`, {}).subscribe();
    const peticion = http.expectOne(`${url}/autenticacion/login`);
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });

  it('sin sesión vigente la petición se cancela con 401', async () => {
    preparar(false);
    const error = await fallo(firstValueFrom(cliente.get(`${url}/categorias`)));
    expect(error?.status).toBe(401);
    http.expectNone(`${url}/categorias`);
  });

  it('si el token vence durante el uso, cierra la sesión y avisa', async () => {
    preparar(true);
    vi.spyOn(Date, 'now').mockReturnValue(4102444800000 + 60000);
    const error = await fallo(firstValueFrom(cliente.get(`${url}/categorias`)));
    expect(error?.status).toBe(401);
    expect(navegar).toHaveBeenLastCalledWith(['/login'], { queryParams: { mensaje: 'sesion_expirada' } });
  });

  it('un 401 del servidor cierra la sesión', async () => {
    preparar(true);
    const promesa = fallo(firstValueFrom(cliente.get(`${url}/categorias`)));
    http.expectOne(`${url}/categorias`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect((await promesa)?.status).toBe(401);
    expect(navegar).toHaveBeenLastCalledWith(['/login'], { queryParams: { mensaje: 'sesion_expirada' } });
  });

  it('un 403 (sin permiso) no cierra la sesión', async () => {
    preparar(true);
    const promesa = fallo(firstValueFrom(cliente.get(`${url}/categorias`)));
    http.expectOne(`${url}/categorias`).flush(null, { status: 403, statusText: 'Forbidden' });
    expect((await promesa)?.status).toBe(403);
    expect(navegar.mock.calls).toHaveLength(0);
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(true);
  });
});
