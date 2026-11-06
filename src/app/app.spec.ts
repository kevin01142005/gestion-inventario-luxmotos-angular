import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { RolUsuario } from './core/models/role.model';
import { guardarSesionPrueba } from './core/utils/sesion-prueba';

describe('App', () => {
  async function crear(rol: RolUsuario | null, url: string) {
    localStorage.clear();
    TestBed.resetTestingModule();
    if (rol) guardarSesionPrueba(rol);
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(App);
    await router.navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement, router };
  }

  it('should create the app', async () => {
    const { fixture } = await crear(null, '/login');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('en el login no hay barra de navegación', async () => {
    const { el } = await crear(null, '/login');
    expect(el.querySelector('app-nav')).toBeNull();
    expect(el.querySelector('.pagina-auth')).toBeTruthy();
  });

  it('con sesión muestra la barra de navegación y la pantalla del módulo', async () => {
    const { el } = await crear('EMPLEADO', '/productos');
    expect(el.querySelector('nav.navbar-marca.fixed-top')).toBeTruthy();
    expect(el.querySelector('app-panel-page')).toBeTruthy();
    expect(el.textContent).toContain('Inventario de productos');
  });

  it('cada módulo carga desde el menú (lazy loading)', async () => {
    const { el, fixture, router } = await crear('ADMINISTRADOR', '/panel');
    const destinos: [string, string][] = [
      ['/productos', 'app-panel-page'], ['/ventas', 'app-ventas-page'], ['/clientes', 'app-clientes-page'], ['/inventario', 'app-inventario-page'],
      ['/categorias', 'app-categorias-page'], ['/proveedores', 'app-proveedores-page'],
      ['/reportes', 'app-reportes-page'], ['/auditoria', 'app-auditoria-page'],
    ];
    for (const [ruta, selector] of destinos) {
      await router.navigateByUrl(ruta);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(el.querySelector(selector)).toBeTruthy();
    }
  });

  it('el registro de usuarios no muestra la barra de navegación', async () => {
    const { el } = await crear('ADMINISTRADOR', '/registro');
    expect(el.querySelector('app-nav')).toBeNull();
    expect(el.querySelector('app-register-page')).toBeTruthy();
  });

  it('el empleado que entra a reportes vuelve a su módulo inicial con el aviso', async () => {
    const { el, router } = await crear('EMPLEADO', '/reportes');
    expect(router.url).toBe('/productos?mensaje=sin_permiso');
    expect(el.querySelector('.alert-warning')?.textContent).toContain('Tu rol no tiene permiso');
  });
});
