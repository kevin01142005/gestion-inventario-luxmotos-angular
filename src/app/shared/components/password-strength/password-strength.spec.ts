import { TestBed } from '@angular/core/testing';
import { PasswordStrength } from './password-strength';

describe('PasswordStrength', () => {
  async function medir(contrasena: string) {
    await TestBed.configureTestingModule({ imports: [PasswordStrength] }).compileComponents();
    const fixture = TestBed.createComponent(PasswordStrength);
    fixture.componentRef.setInput('contrasena', contrasena);
    fixture.detectChanges();
    await fixture.whenStable();
    return (fixture.nativeElement as HTMLElement).textContent?.trim();
  }

  it('sin contraseña muestra el texto inicial', async () => {
    expect(await medir('')).toContain('Fortaleza de la contraseña');
  });

  it('clasifica la contraseña: Débil, Aceptable, Buena y Fuerte', async () => {
    expect(await medir('abc')).toContain('Débil');
    TestBed.resetTestingModule();
    expect(await medir('abcdefgh')).toContain('Débil');
    TestBed.resetTestingModule();
    expect(await medir('Abcdefgh')).toContain('Aceptable');
    TestBed.resetTestingModule();
    expect(await medir('Abcdefg1')).toContain('Buena');
    TestBed.resetTestingModule();
    expect(await medir('Abcdefg1!')).toContain('Fuerte');
  });
});
