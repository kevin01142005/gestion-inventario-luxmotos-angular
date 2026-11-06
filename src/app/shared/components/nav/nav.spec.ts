import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RolUsuario } from '../../../core/models/role.model';
import { guardarSesionPrueba } from '../../../core/utils/sesion-prueba';
import { Nav } from './nav';

describe('Nav', () => {
  let fixture: ComponentFixture<Nav>;
  let el: HTMLElement;

  async function crear(rol: RolUsuario | null) {
    localStorage.clear();
    TestBed.resetTestingModule();
    if (rol) guardarSesionPrueba(rol);
    await TestBed.configureTestingModule({ imports: [Nav], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }).compileComponents();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(Nav);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  it('should create', async () => {
    await crear(null);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('EMPLEADO ve solo los 6 módulos que la base de datos le asigna', async () => {
    await crear('EMPLEADO');
    const textos = Array.from(el.querySelectorAll('a.nav-link')).map(a => a.textContent?.trim());
    expect(textos).toHaveLength(6);
    expect(textos.join('|')).toContain('Productos');
    expect(textos.join('|')).not.toContain('Panel');
    expect(textos.join('|')).not.toContain('Reportes');
    expect(textos.join('|')).not.toContain('Auditoría');
    expect(textos.join('|')).not.toContain('Usuarios');
  });

  it('ADMINISTRADOR ve los 10 módulos, incluidos Reportes, Auditoría y Usuarios', async () => {
    await crear('ADMINISTRADOR');
    const texto = el.textContent ?? '';
    expect(el.querySelectorAll('a.nav-link').length).toBe(10);
    expect(texto).toContain('Reportes');
    expect(texto).toContain('Auditoría');
    expect(texto).toContain('Usuarios');
  });

  it('cada enlace del menú apunta a la ruta de su módulo', async () => {
    await crear('ADMINISTRADOR');
    const enlaces = Array.from(el.querySelectorAll('a.nav-link')).map(a => a.getAttribute('href'));
    expect(enlaces).toContain('/panel');
    expect(enlaces).toContain('/registro');
  });

  it('muestra el correo y el rol de la sesión', async () => {
    await crear('SUPER_USUARIO');
    expect(el.textContent).toContain('superusuario@motolux.co');
    expect(el.textContent).toContain('Super usuario');
  });

  it('el botón hamburguesa abre y cierra el menú en pantallas pequeñas', async () => {
    await crear('EMPLEADO');
    const boton = el.querySelector('.navbar-toggler') as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    expect(el.querySelector('#menuNavbar.show')).toBeTruthy();
    boton.click();
    fixture.detectChanges();
    expect(el.querySelector('#menuNavbar.show')).toBeNull();
  });

  it('el menú de usuario se abre y permite cerrar sesión', async () => {
    await crear('EMPLEADO');
    (el.querySelector('.dropdown-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.dropdown-menu.show')).toBeTruthy();
    expect(el.querySelectorAll('.dropdown-item').length).toBe(1);
    expect(el.querySelector('.dropdown-menu')?.textContent).not.toContain('Restablecer');
    (el.querySelector('.dropdown-item.text-danger') as HTMLButtonElement).click();
    expect(localStorage.getItem('motolux:sesion')).toBeNull();
  });
});
