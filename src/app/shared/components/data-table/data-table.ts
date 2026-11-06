import {
  Component, DestroyRef, ElementRef, HostListener, afterNextRender, computed, effect, inject, input, output,
  signal, viewChild,
} from '@angular/core';
import { esc, normalizar, textoPlano } from '../../../core/utils/tabla';
import { AccionTabla, ColumnaTabla, OrdenTabla } from '../../interfaces/columna-tabla.interface';
import { EmptyState } from '../empty-state/empty-state';
import { SearchBox } from '../search-box/search-box';

interface DtApi {
  clear(): DtApi;
  rows: { add(datos: unknown[]): DtApi };
  draw(reiniciar?: boolean): DtApi;
  search(valor: string): DtApi;
  row(fila: Element): { data(): unknown };
  destroy(): void;
}

type DtConstructor = new (elemento: HTMLElement, opciones: object) => DtApi;

const IDIOMA_ES = {
  decimal: ',',
  thousands: '.',
  emptyTable: 'No hay datos disponibles',
  info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
  infoEmpty: 'Mostrando 0 a 0 de 0 registros',
  infoFiltered: '(filtrado de _MAX_ registros)',
  lengthMenu: 'Mostrar _MENU_ registros',
  loadingRecords: 'Cargando...',
  processing: 'Procesando...',
  search: 'Buscar:',
  zeroRecords: 'No se encontraron resultados',
  paginate: { first: 'Primero', last: 'Último', next: 'Siguiente', previous: 'Anterior' },
  buttons: {
    copyTitle: 'Copiado al portapapeles',
    copySuccess: { _: '%d filas copiadas', 1: '1 fila copiada' },
  },
  aria: {
    orderable: 'Ordenar por esta columna',
    orderableReverse: 'Invertir el orden de esta columna',
    orderableRemove: 'Quitar el orden de esta columna',
  },
};

let avisoMostrado = false;

@Component({
  selector: 'app-data-table',
  imports: [SearchBox, EmptyState],
  templateUrl: './data-table.html',
  styleUrl: './data-table.css',
})
export class DataTable<T extends object> {
  readonly datos = input.required<T[]>();
  readonly columnas = input.required<ColumnaTabla<T>[]>();
  readonly mensajeVacio = input('No hay datos para mostrar.');
  readonly iconoVacio = input('bi-inbox');
  readonly etiqueta = input('Tabla de datos');
  readonly buscador = input(true);
  readonly busqueda = input('');
  readonly placeholderBusqueda = input('Buscar en la tabla...');
  readonly compacta = input(false);
  readonly porPagina = input(10);
  readonly ordenInicial = input<OrdenTabla | null>(null);
  readonly claseFila = input('');
  readonly accion = output<AccionTabla<T>>();

  protected readonly busquedaInterna = signal('');
  private readonly tablaRef = viewChild<ElementRef<HTMLTableElement>>('tabla');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private api: DtApi | null = null;
  private listo = false;
  private filasVisibles: T[] = [];

  protected readonly vacio = computed(() => this.datos().length === 0);
  protected readonly buscadorVisible = computed(() => this.buscador() && !this.compacta());
  private readonly terminoBusqueda = computed(() =>
    normalizar((this.buscador() && !this.compacta() ? this.busquedaInterna() : this.busqueda()).trim()));

  constructor() {
    afterNextRender(() => this.iniciar());
    effect(() => {
      const datos = this.datos();
      this.columnas();
      this.claseFila();
      if (!this.listo) return;
      if (this.api) {
        this.api.clear();
        this.api.rows.add(datos);
        this.api.draw(false);
      } else {
        this.pintarBasico();
      }
    });
    effect(() => {
      const termino = this.terminoBusqueda();
      if (!this.listo) return;
      if (this.api) this.api.search(termino).draw();
      else this.pintarBasico();
    });
    inject(DestroyRef).onDestroy(() => {
      this.api?.destroy();
      this.api = null;
    });
  }

  @HostListener('click', ['$event'])
  protected alHacerClic(evento: Event): void {
    const objetivo = evento.target as Element | null;
    const boton = objetivo?.closest('[data-accion]');
    if (!boton || !this.host.nativeElement.contains(boton)) return;
    const tr = boton.closest('tr');
    if (!tr) return;
    const fila = this.api ? (this.api.row(tr).data() as T | undefined) : this.filasVisibles[Number(tr.dataset['fila'])];
    const accion = boton.getAttribute('data-accion');
    if (fila && accion) this.accion.emit({ accion, fila });
  }

  private libreria(): DtConstructor | undefined {
    return (globalThis as { DataTable?: DtConstructor }).DataTable;
  }

  private iniciar(): void {
    const Libreria = this.libreria();
    const tabla = this.tablaRef()?.nativeElement;
    if (!tabla) return;
    this.listo = true;
    if (!Libreria) {
      if (!avisoMostrado) {
        avisoMostrado = true;
        console.warn('DataTables no está disponible; se muestra una tabla básica.');
      }
      this.pintarBasico();
      return;
    }
    tabla.replaceChildren();
    const compacta = this.compacta();
    const orden = this.ordenInicial();
    const columnas = this.columnas();
    this.api = new Libreria(tabla, {
      data: this.datos(),
      columns: columnas.map(c => ({
        title: c.titulo,
        data: null,
        className: [c.clase, c.exportable === false ? 'no-exportar' : ''].filter(Boolean).join(' '),
        orderable: !compacta && c.ordenable !== false,
        searchable: c.buscable !== false,
        type: c.numerica ? 'num' : 'string',
        render: (_dato: unknown, tipo: string, fila: T, meta: { row: number }) => this.valorCelda(c, fila, tipo, meta.row),
        createdCell: (td: HTMLElement) => td.setAttribute('data-label', c.titulo),
      })),
      createdRow: (tr: HTMLElement) => {
        const clase = this.claseFila();
        if (clase) tr.classList.add(...clase.split(' '));
      },
      paging: !compacta,
      pageLength: this.porPagina(),
      lengthMenu: [5, 10, 25, 50],
      ordering: !compacta,
      order: orden ? [[orden.columna, orden.direccion]] : [],
      info: !compacta,
      searching: true,
      search: { search: this.terminoBusqueda() },
      autoWidth: false,
      buttons: this.botonesExportar(),
      language: IDIOMA_ES,
      layout: {
        topStart: compacta ? null : 'pageLength',
        topEnd: compacta ? null : 'buttons',
        bottomStart: compacta ? null : 'info',
        bottomEnd: compacta ? null : 'paging',
      },
    });
  }

  private botonesExportar(): object[] {
    const titulo = this.etiqueta();
    const comun = {
      className: 'btn btn-outline-dark btn-sm',
      title: titulo,
      filename: normalizar(titulo).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      exportOptions: { columns: ':not(.no-exportar)' },
    };
    const anchas = this.columnas().filter(c => c.exportable !== false).length > 5;
    return [
      { ...comun, extend: 'copy', text: '<i class="bi bi-clipboard"></i> Copiar' },
      { ...comun, extend: 'csv', text: '<i class="bi bi-filetype-csv"></i> CSV' },
      { ...comun, extend: 'excel', text: '<i class="bi bi-file-earmark-excel"></i> Excel', autoFilter: true },
      {
        ...comun,
        extend: 'pdf',
        text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
        pageSize: 'A4',
        orientation: anchas ? 'landscape' : 'portrait',
      },
      { ...comun, extend: 'print', text: '<i class="bi bi-printer"></i> Imprimir' },
    ];
  }

  private valorCelda(c: ColumnaTabla<T>, fila: T, tipo: string, indice: number): string | number {
    if (tipo === 'display') return c.render(fila, indice);
    const texto = c.texto ? c.texto(fila) : textoPlano(c.render(fila, indice));
    if (tipo === 'filter') return normalizar(texto);
    if (tipo === 'sort' || tipo === 'type') return c.orden ? c.orden(fila) : texto;
    return texto;
  }

  private pintarBasico(): void {
    if (this.api) return;
    const tabla = this.tablaRef()?.nativeElement;
    if (!tabla) return;
    const columnas = this.columnas();
    const termino = this.terminoBusqueda();
    const filas = this.datos().filter(fila =>
      !termino || columnas.some(c =>
        c.buscable !== false && normalizar(c.texto ? c.texto(fila) : textoPlano(c.render(fila, 0))).includes(termino)));
    this.filasVisibles = filas;
    const claseFila = this.claseFila();
    const cabecera = columnas.map(c => `<th class="${esc(c.clase ?? '')}">${esc(c.titulo)}</th>`).join('');
    const sinResultados =
      `<tr><td colspan="${columnas.length}" class="text-center text-muted py-4">${esc(IDIOMA_ES.zeroRecords)}</td></tr>`;
    const cuerpo = filas.length === 0 ? sinResultados : filas.map((fila, i) =>
      `<tr data-fila="${i}"${claseFila ? ` class="${esc(claseFila)}"` : ''}>` +
      columnas.map(c => `<td class="${esc(c.clase ?? '')}" data-label="${esc(c.titulo)}">${c.render(fila, i)}</td>`).join('') +
      '</tr>').join('');
    tabla.innerHTML = `<thead><tr>${cabecera}</tr></thead><tbody>${cuerpo}</tbody>`;
  }
}
