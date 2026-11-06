import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { CONFIG_API_POR_DEFECTO } from '../../../../core/utils/api.config';
import { crearJwtPrueba, modulosApiDe } from '../../../../core/utils/sesion-prueba';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  const url = CONFIG_API_POR_DEFECTO.urlBase;
  let fixture: ComponentFixture<LoginPage>;
  let el: HTMLElement;
  let http: HttpTestingController;
  let navegar: ReturnType<typeof vi.spyOn>;

  async function crear(mensaje?: string) {
    localStorage.clear();
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(mensaje ? { mensaje } : {}) } } },
      ],
    }).compileComponents();
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const escribir = (id: string, valor: string) => {
    const campo = el.querySelector(`#${id}`) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  };
  const enviar = () => {
    (el.querySelector('button[type=submit]') as HTMLButtonElement).click();
    fixture.detectChanges();
  };
  const esperar = async () => {
    await new Promise<void>(r => setTimeout(r, 0));
    fixture.detectChanges();
  };

  it('should create y pide solo correo y contraseña', async () => {
    await crear();
    expect(fixture.componentInstance).toBeTruthy();
    expect(el.querySelector('#rol')).toBeNull();
    expect(el.querySelector('#correo')).toBeTruthy();
    expect(el.querySelector('#contrasena')).toBeTruthy();
  });

  it('usa el aspecto de la pantalla de acceso (tarjeta con logo)', async () => {
    await crear();
    expect(el.querySelector('.pagina-auth .tarjeta-auth .logo-marca')).toBeTruthy();
  });

  it('con el formulario vacío no llama a la API y avisa los campos', async () => {
    await crear();
    enviar();
    http.expectNone(`${url}/autenticacion/login`);
    expect(el.textContent).toContain('Ingresa un correo válido.');
    expect(el.textContent).toContain('Ingresa tu contraseña.');
  });

  it('un correo con formato inválido no se envía', async () => {
    await crear();
    escribir('correo', 'no-es-correo');
    escribir('contrasena', 'Clave123');
    enviar();
    http.expectNone(`${url}/autenticacion/login`);
    expect(el.textContent).toContain('Ingresa un correo válido.');
  });

  it('con credenciales correctas inicia sesión con el rol del token y entra a su módulo', async () => {
    await crear();
    escribir('correo', 'admin@correo.co');
    escribir('contrasena', 'Clave123');
    enviar();
    http.expectOne(`${url}/autenticacion/login`).flush({
      tokenAcceso: crearJwtPrueba('admin@correo.co', 'ADMINISTRADOR'), tipoToken: 'Bearer', expiraEnSegundos: 1800,
    });
    await esperar();
    http.expectOne(`${url}/autenticacion/mis-modulos`).flush(modulosApiDe('ADMINISTRADOR'));
    await esperar();
    expect(TestBed.inject(AuthService).currentRole()).toBe('ADMINISTRADOR');
    expect(navegar).toHaveBeenCalledWith(['/panel']);
  });

  it('mientras espera a la API deshabilita el botón y muestra el aviso de espera', async () => {
    await crear();
    escribir('correo', 'a@correo.co');
    escribir('contrasena', 'Clave123');
    enviar();
    expect((el.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(true);
    expect(el.querySelector('.aviso-espera')?.textContent).toContain('hasta un minuto');
    http.expectOne(`${url}/autenticacion/login`).flush({}, { status: 401, statusText: 'Unauthorized' });
    await esperar();
  });

  it('credenciales incorrectas: muestra el mensaje de la API y vuelve a habilitar el botón', async () => {
    await crear();
    escribir('correo', 'a@correo.co');
    escribir('contrasena', 'mala');
    enviar();
    http.expectOne(`${url}/autenticacion/login`).flush(
      { status: 401, message: 'Credenciales inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await esperar();
    expect(el.querySelector('.alert-danger')?.textContent).toContain('Credenciales inválidas');
    expect((el.querySelector('button[type=submit]') as HTMLButtonElement).disabled).toBe(false);
    expect(TestBed.inject(AuthService).isLoggedIn()).toBe(false);
  });

  it('si el servidor no responde, lo explica', async () => {
    await crear();
    escribir('correo', 'a@correo.co');
    escribir('contrasena', 'Clave123');
    enviar();
    http.expectOne(`${url}/autenticacion/login`).error(new Event('error') as ProgressEvent);
    await esperar();
    expect(el.querySelector('.alert-danger')?.textContent).toContain('No se pudo conectar');
  });

  it('el botón del ojo muestra y oculta la contraseña', async () => {
    await crear();
    const campo = el.querySelector('#contrasena') as HTMLInputElement;
    expect(campo.type).toBe('password');
    (el.querySelector('.input-group .btn-outline-secondary') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(campo.type).toBe('text');
  });

  it('muestra el aviso de sesión cerrada', async () => {
    await crear('sesion_cerrada');
    expect(el.querySelector('.alert-success')?.textContent).toContain('Sesión cerrada correctamente.');
  });

  it('muestra el aviso de sesión expirada', async () => {
    await crear('sesion_expirada');
    expect(el.querySelector('.alert-warning')?.textContent).toContain('Tu sesión expiró');
  });
});
