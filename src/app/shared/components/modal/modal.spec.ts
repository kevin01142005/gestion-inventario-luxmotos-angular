import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Modal } from './modal';

@Component({
  imports: [Modal],
  template: `
    <app-modal [abierto]="abierto()" [grande]="true" (cerrar)="cierres = cierres + 1">
      <div class="modal-body">Contenido</div>
    </app-modal>
  `,
})
class Anfitrion {
  abierto = signal(false);
  cierres = 0;
}

describe('Modal', () => {
  async function crear() {
    await TestBed.configureTestingModule({ imports: [Anfitrion] }).compileComponents();
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it('cerrado no pinta nada; abierto muestra la ventana, el fondo y bloquea el scroll', async () => {
    const f = await crear();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('.modal')).toBeNull();
    f.componentInstance.abierto.set(true);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(el.querySelector('.modal.show')).toBeTruthy();
    expect(el.querySelector('.modal-backdrop')).toBeTruthy();
    expect(el.querySelector('.modal-lg')).toBeTruthy();
    expect(el.textContent).toContain('Contenido');
    expect(document.body.classList.contains('modal-open')).toBe(true);
  });

  it('se cierra con Escape y al hacer clic fuera de la ventana, pero no al hacer clic dentro', async () => {
    const f = await crear();
    f.componentInstance.abierto.set(true);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;

    (el.querySelector('.modal-body') as HTMLElement).click();
    expect(f.componentInstance.cierres).toBe(0);

    (el.querySelector('.modal') as HTMLElement).click();
    expect(f.componentInstance.cierres).toBe(1);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(f.componentInstance.cierres).toBe(2);
  });
});
