import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Header } from './header';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Header] }).compileComponents();
    fixture = TestBed.createComponent(Header);
    fixture.componentRef.setInput('titulo', 'Gestión de Inventario');
    fixture.componentRef.setInput('subtitulo', 'Ingresa con tu cuenta');
    fixture.componentRef.setInput('icono', 'bi-person-plus');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el logo, el título y el subtítulo', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.logo-marca i.bi-person-plus')).toBeTruthy();
    expect(el.querySelector('h1')?.textContent).toContain('Gestión de Inventario');
    expect(el.textContent).toContain('Ingresa con tu cuenta');
  });
});
