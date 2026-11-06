import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { botonFila, esc } from '../../../core/utils/tabla';
import { AccionTabla, ColumnaTabla } from '../../interfaces/columna-tabla.interface';
import { DataTable } from './data-table';

interface Fila {
  id: number;
  nombre: string;
  precio: number;
}

const FILAS: Fila[] = [
  { id: 1, nombre: 'Casco Integral', precio: 450000 },
  { id: 2, nombre: 'Llanta Pirelli', precio: 280000 },
  { id: 3, nombre: 'Cadena de transmisión', precio: 120000 },
];

const COLUMNAS: ColumnaTabla<Fila>[] = [
  { titulo: 'Nombre', orden: f => f.nombre, render: f => `<span class="fw-semibold">${esc(f.nombre)}</span>` },
  { titulo: 'Precio', clase: 'text-end', numerica: true, orden: f => f.precio, render: f => String(f.precio) },
  { titulo: 'Acciones', clase: 'text-end', ordenable: false, buscable: false, exportable: false, render: () => botonFila('editar', 'bi-pencil', 'Editar', 'Editar fila') },
];

@Component({
  imports: [DataTable],
  template: `
    <app-data-table [datos]="datos()" [columnas]="columnas" [busqueda]="busqueda()" [buscador]="buscador()"
      [compacta]="compacta()" claseFila="fila-prueba" mensajeVacio="Sin filas." (accion)="acciones.push($event)" />
  `,
})
class Anfitrion {
  readonly datos = signal<Fila[]>(FILAS);
  readonly busqueda = signal('');
  readonly buscador = signal(true);
  readonly compacta = signal(false);
  readonly columnas = COLUMNAS;
  readonly acciones: AccionTabla<Fila>[] = [];
}

interface OpcionesDt {
  data: Fila[];
  columns: {
    title: string;
    className: string;
    orderable: boolean;
    searchable: boolean;
    type: string;
    render: (dato: unknown, tipo: string, fila: Fila, meta: { row: number }) => string | number;
    createdCell: (td: HTMLElement) => void;
  }[];
  createdRow: (tr: HTMLElement) => void;
  paging: boolean;
  ordering: boolean;
  info: boolean;
  order: unknown[];
  search: { search: string };
  language: { paginate: { next: string }; zeroRecords: string };
  layout: { topStart: unknown; topEnd: unknown; bottomStart: unknown; bottomEnd: unknown };
  buttons: { extend: string; title: string; filename: string; text: string; exportOptions: { columns: string } }[];
}

class DtFalso {
  static instancias: DtFalso[] = [];
  readonly llamadas: string[] = [];
  readonly filasPorNodo = new Map<Element, Fila>();
  datos: Fila[];
  termino = '';
  destruida = false;
  rows = { add: (d: unknown[]) => { this.llamadas.push('rows.add'); this.datos = d as Fila[]; return this; } };

  constructor(readonly elemento: HTMLElement, readonly opciones: OpcionesDt) {
    this.datos = opciones.data;
    this.termino = opciones.search.search;
    DtFalso.instancias.push(this);
    this.pintar();
  }

  clear() { this.llamadas.push('clear'); return this; }
  draw(reiniciar?: boolean) { this.llamadas.push(`draw:${reiniciar}`); this.pintar(); return this; }
  search(valor: string) { this.llamadas.push(`search:${valor}`); this.termino = valor; return this; }
  row(nodo: Element) { return { data: () => this.filasPorNodo.get(nodo) }; }
  destroy() { this.destruida = true; }

  private pintar() {
    const o = this.opciones;
    this.elemento.innerHTML = `<thead><tr>${o.columns.map(c => `<th>${c.title}</th>`).join('')}</tr></thead><tbody></tbody>`;
    const cuerpo = this.elemento.querySelector('tbody') as HTMLElement;
    this.datos.forEach((fila, i) => {
      const tr = document.createElement('tr');
      o.columns.forEach(c => {
        const td = document.createElement('td');
        td.innerHTML = String(c.render(null, 'display', fila, { row: i }));
        c.createdCell(td);
        tr.appendChild(td);
      });
      o.createdRow(tr);
      this.filasPorNodo.set(tr, fila);
      cuerpo.appendChild(tr);
    });
  }
}

describe('DataTable (componente reutilizable)', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let el: HTMLElement;
  let anfitrion: Anfitrion;

  async function crear() {
    await TestBed.configureTestingModule({ imports: [Anfitrion] }).compileComponents();
    fixture = TestBed.createComponent(Anfitrion);
    anfitrion = fixture.componentInstance;
    await refrescar();
    el = fixture.nativeElement;
  }

  async function refrescar() {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const filas = () => el.querySelectorAll('tbody tr[data-fila], tbody tr.fila-prueba').length;
  const escribirBusqueda = async (valor: string) => {
    const campo = el.querySelector('app-search-box input') as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    await refrescar();
  };

  describe('sin la librería (tabla básica de respaldo)', () => {
    beforeEach(async () => {
      delete (globalThis as { DataTable?: unknown }).DataTable;
      await crear();
    });

    it('pinta encabezados, filas y una etiqueta por celda para el modo celular', () => {
      expect(Array.from(el.querySelectorAll('thead th')).map(th => th.textContent)).toEqual(['Nombre', 'Precio', 'Acciones']);
      expect(filas()).toBe(3);
      const celdas = Array.from(el.querySelectorAll('tbody tr:first-child td')).map(td => td.getAttribute('data-label'));
      expect(celdas).toEqual(['Nombre', 'Precio', 'Acciones']);
      expect(el.querySelector('table.tabla-apilada')).toBeTruthy();
    });

    it('escapa el texto de los usuarios para evitar inyección de HTML', async () => {
      anfitrion.datos.set([{ id: 9, nombre: '<img src=x onerror=alert(1)>', precio: 1 }]);
      await refrescar();
      expect(el.querySelector('tbody img')).toBeNull();
      expect(el.querySelector('tbody td')?.textContent).toContain('<img src=x onerror=alert(1)>');
    });

    it('busca sin distinguir mayúsculas ni tildes y avisa cuando no hay resultados', async () => {
      await escribirBusqueda('TRANSMISION');
      expect(filas()).toBe(1);
      expect(el.querySelector('tbody')?.textContent).toContain('Cadena de transmisión');
      await escribirBusqueda('zzz');
      expect(el.querySelector('tbody')?.textContent).toContain('No se encontraron resultados');
      await escribirBusqueda('');
      expect(filas()).toBe(3);
    });

    it('no busca dentro de las columnas marcadas como no buscables', async () => {
      await escribirBusqueda('Editar');
      expect(el.querySelector('tbody')?.textContent).toContain('No se encontraron resultados');
    });

    it('emite la acción y la fila al pulsar un botón de la tabla', async () => {
      await escribirBusqueda('llanta');
      (el.querySelector('tbody [data-accion="editar"]') as HTMLButtonElement).click();
      expect(anfitrion.acciones).toHaveLength(1);
      expect(anfitrion.acciones[0].accion).toBe('editar');
      expect(anfitrion.acciones[0].fila.id).toBe(2);
    });

    it('sin datos oculta la tabla y muestra el mensaje de vacío', async () => {
      anfitrion.datos.set([]);
      await refrescar();
      expect(el.querySelector('app-empty-state')?.textContent).toContain('Sin filas.');
      expect(el.querySelector('.table-responsive')?.classList.contains('d-none')).toBe(true);
    });

    it('se actualiza cuando cambian los datos y aplica la clase de fila', async () => {
      anfitrion.datos.update(d => [...d, { id: 4, nombre: 'Aceite', precio: 50000 }]);
      await refrescar();
      expect(filas()).toBe(4);
      expect(el.querySelectorAll('tbody tr.fila-prueba')).toHaveLength(4);
    });

    it('usa la búsqueda externa cuando el buscador interno está oculto', async () => {
      anfitrion.buscador.set(false);
      await refrescar();
      expect(el.querySelector('app-search-box')).toBeNull();
      anfitrion.busqueda.set('casco');
      await refrescar();
      expect(filas()).toBe(1);
    });

    it('el modo compacto no muestra buscador ni apila la tabla', async () => {
      anfitrion.compacta.set(true);
      await refrescar();
      expect(el.querySelector('app-search-box')).toBeNull();
      expect(el.querySelector('table.tabla-apilada')).toBeNull();
      expect(el.querySelector('table.table-sm')).toBeTruthy();
    });
  });

  describe('con la librería DataTables cargada', () => {
    beforeEach(async () => {
      DtFalso.instancias = [];
      (globalThis as { DataTable?: unknown }).DataTable = DtFalso;
      await crear();
    });

    afterEach(() => {
      delete (globalThis as { DataTable?: unknown }).DataTable;
    });

    const dt = () => DtFalso.instancias.at(-1)!;

    it('crea la tabla con los datos, las columnas y el idioma en español', () => {
      expect(DtFalso.instancias).toHaveLength(1);
      const o = dt().opciones;
      expect(o.data).toEqual(FILAS);
      expect(o.columns.map(c => c.title)).toEqual(['Nombre', 'Precio', 'Acciones']);
      expect(o.language.paginate.next).toBe('Siguiente');
      expect(o.language.zeroRecords).toBe('No se encontraron resultados');
      expect(o.paging).toBe(true);
      expect(o.ordering).toBe(true);
      expect(o.info).toBe(true);
      expect(o.order).toEqual([]);
    });

    it('oculta el buscador nativo para usar el componente de búsqueda de la aplicación', () => {
      const l = dt().opciones.layout;
      expect(l.topEnd).toBe('buttons');
      expect(l.topStart).toBe('pageLength');
      expect(l.bottomStart).toBe('info');
      expect(l.bottomEnd).toBe('paging');
    });

    it('ofrece exportar a copiar, CSV, Excel, PDF e imprimir sin la columna de acciones', () => {
      const botones = dt().opciones.buttons;
      expect(botones.map(b => b.extend)).toEqual(['copy', 'csv', 'excel', 'pdf', 'print']);
      expect(botones.map(b => b.text.replace(/<[^>]+>/g, '').trim())).toEqual(['Copiar', 'CSV', 'Excel', 'PDF', 'Imprimir']);
      expect(botones.every(b => b.exportOptions.columns === ':not(.no-exportar)')).toBe(true);
      expect(botones.every(b => b.title === 'Tabla de datos' && b.filename === 'tabla-de-datos')).toBe(true);
      const acciones = dt().opciones.columns[2];
      expect(acciones.className).toContain('no-exportar');
      expect(dt().opciones.columns[0].className).not.toContain('no-exportar');
    });

    it('configura ordenamiento, búsqueda y tipo de cada columna', () => {
      const [nombre, precio, acciones] = dt().opciones.columns;
      expect(nombre.orderable).toBe(true);
      expect(precio.type).toBe('num');
      expect(precio.className).toBe('text-end');
      expect(acciones.orderable).toBe(false);
      expect(acciones.searchable).toBe(false);
    });

    it('entrega el HTML para mostrar, texto sin tildes para buscar y valores para ordenar', () => {
      const [nombre, precio] = dt().opciones.columns;
      const fila = FILAS[2];
      expect(nombre.render(null, 'display', fila, { row: 2 })).toContain('<span class="fw-semibold">Cadena de transmisión</span>');
      expect(nombre.render(null, 'filter', fila, { row: 2 })).toBe('cadena de transmision');
      expect(nombre.render(null, 'sort', fila, { row: 2 })).toBe('Cadena de transmisión');
      expect(precio.render(null, 'sort', fila, { row: 2 })).toBe(120000);
      expect(precio.render(null, 'type', fila, { row: 2 })).toBe(120000);
    });

    it('marca cada celda con su etiqueta para el modo celular y cada fila con su clase', () => {
      const celdas = Array.from(el.querySelectorAll('tbody tr:first-child td')).map(td => td.getAttribute('data-label'));
      expect(celdas).toEqual(['Nombre', 'Precio', 'Acciones']);
      expect(el.querySelectorAll('tbody tr.fila-prueba')).toHaveLength(3);
    });

    it('actualiza la tabla de la librería cuando cambian los datos', async () => {
      anfitrion.datos.set([FILAS[0]]);
      await refrescar();
      expect(dt().llamadas).toEqual(['clear', 'rows.add', 'draw:false']);
      expect(dt().datos).toEqual([FILAS[0]]);
    });

    it('envía la búsqueda normalizada a la librería', async () => {
      await escribirBusqueda('TRANSMISIÓN');
      expect(dt().termino).toBe('transmision');
      expect(dt().llamadas.at(-2)).toBe('search:transmision');
      expect(dt().llamadas.at(-1)).toBe('draw:undefined');
    });

    it('emite la acción con la fila original que devuelve la librería', () => {
      const boton = el.querySelectorAll('tbody tr')[1].querySelector('[data-accion="editar"]') as HTMLButtonElement;
      boton.click();
      expect(anfitrion.acciones).toHaveLength(1);
      expect(anfitrion.acciones[0].fila).toEqual(FILAS[1]);
    });

    it('en modo compacto desactiva paginación, orden e información', async () => {
      TestBed.resetTestingModule();
      DtFalso.instancias = [];
      await TestBed.configureTestingModule({ imports: [Anfitrion] }).compileComponents();
      fixture = TestBed.createComponent(Anfitrion);
      fixture.componentInstance.compacta.set(true);
      await refrescar();
      const o = DtFalso.instancias.at(-1)!.opciones;
      expect(o.paging).toBe(false);
      expect(o.ordering).toBe(false);
      expect(o.info).toBe(false);
      expect(o.columns.every(c => c.orderable === false)).toBe(true);
      expect(o.layout.topEnd).toBeNull();
    });

    it('destruye la tabla de la librería al cerrar el componente', () => {
      const instancia = dt();
      fixture.destroy();
      expect(instancia.destruida).toBe(true);
    });
  });
});
