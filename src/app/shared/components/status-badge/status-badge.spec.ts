import { TestBed } from '@angular/core/testing';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  async function pintar(estado: string, conIcono = false) {
    await TestBed.configureTestingModule({ imports: [StatusBadge] }).compileComponents();
    const fixture = TestBed.createComponent(StatusBadge);
    fixture.componentRef.setInput('estado', estado);
    fixture.componentRef.setInput('conIcono', conIcono);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('usa la clase y el texto de cada estado', async () => {
    const el = await pintar('STOCK_BAJO');
    expect(el.querySelector('.badge-estado.badge-stock-bajo')?.textContent).toContain('Stock bajo');
  });

  it('muestra el ícono de la acción de auditoría', async () => {
    const el = await pintar('ELIMINACION', true);
    expect(el.querySelector('.badge-eliminacion i.bi-trash')).toBeTruthy();
    expect(el.textContent).toContain('Eliminación');
  });

  it('un estado desconocido se muestra tal cual', async () => {
    const el = await pintar('OTRO');
    expect(el.textContent).toContain('OTRO');
  });
});
