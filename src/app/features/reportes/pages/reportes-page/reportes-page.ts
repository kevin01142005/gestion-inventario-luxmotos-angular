import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { formatearMoneda, fechaISO } from '../../../../core/utils/format';
import { esc } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { KpiCard } from '../../../../shared/components/kpi-card/kpi-card';
import { htmlEstado } from '../../../../shared/components/status-badge/status-badge';
import { Tabs } from '../../../../shared/components/tabs/tabs';
import { ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { Pestana } from '../../../../shared/interfaces/pestana.interface';
import { CategoriasService } from '../../../categorias/services/categorias';
import {
  FiltrosReporte, FormatoReporte, ItemInventario, ProductoMasVendido, ResumenVentas, TipoReporte,
} from '../../models/reporte.model';
import { ReportesService } from '../../services/reportes';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

@Component({
  selector: 'app-reportes-page',
  imports: [ReactiveFormsModule, Alerta, KpiCard, Tabs, DataTable],
  templateUrl: './reportes-page.html',
  styleUrl: './reportes-page.css',
})
export class ReportesPage implements OnInit {
  private readonly reportes = inject(ReportesService);
  private readonly categorias = inject(CategoriasService);

  readonly alerta = new ControladorAlerta();
  readonly estadisticas = this.reportes.estadisticas;
  readonly moneda = formatearMoneda;
  readonly meses = MESES;

  readonly pestanas: Pestana[] = [
    { id: 'diarias', etiqueta: 'Ventas diarias', icono: 'bi-calendar-day' },
    { id: 'mensuales', etiqueta: 'Ventas mensuales', icono: 'bi-calendar-month' },
    { id: 'mas-vendidos', etiqueta: 'Más vendidos', icono: 'bi-trophy' },
    { id: 'inventario', etiqueta: 'Inventario', icono: 'bi-box-seam' },
    { id: 'exportar', etiqueta: 'Exportar y enviar', icono: 'bi-download' },
  ];
  readonly pestanaActiva = signal('diarias');

  readonly columnasMasVendidos: ColumnaTabla<ProductoMasVendido>[] = [
    { titulo: '#', clase: 'fw-bold', numerica: true, ordenable: false, buscable: false, render: (_p, i) => String(i + 1) },
    { titulo: 'Producto', orden: p => p.nombreProducto, render: p => esc(p.nombreProducto) },
    {
      titulo: 'Unidades vendidas',
      clase: 'text-end',
      numerica: true,
      orden: p => p.cantidadTotalVendida,
      render: p => String(p.cantidadTotalVendida),
    },
  ];

  readonly columnasInventario: ColumnaTabla<ItemInventario>[] = [
    { titulo: 'Código', clase: 'codigo-producto', orden: i => i.codigo, render: i => esc(i.codigo) },
    { titulo: 'Producto', clase: 'fw-semibold', orden: i => i.nombreProducto, render: i => esc(i.nombreProducto) },
    { titulo: 'Stock actual', clase: 'text-end', numerica: true, orden: i => i.stockActual, render: i => String(i.stockActual) },
    { titulo: 'Stock mínimo', clase: 'text-end', numerica: true, orden: i => i.stockMinimo, render: i => String(i.stockMinimo) },
    {
      titulo: 'Alerta',
      clase: 'text-center',
      orden: i => (i.stockBajo ? 1 : 0),
      render: i => htmlEstado(i.stockBajo ? 'STOCK_BAJO' : 'NORMAL'),
    },
  ];

  private readonly hoy = new Date();
  private readonly rango = this.reportes.rangoPorDefecto();

  readonly fechaDiaria = new FormControl(fechaISO(this.hoy), { nonNullable: true });
  readonly anio = new FormControl<number | null>(this.hoy.getFullYear());
  readonly mes = new FormControl(this.hoy.getMonth() + 1, { nonNullable: true });
  readonly desde = new FormControl(this.rango.desde, { nonNullable: true });
  readonly hasta = new FormControl(this.rango.hasta, { nonNullable: true });

  readonly ventasDiarias = signal<ResumenVentas | null>(null);
  readonly ventasMensuales = signal<ResumenVentas | null>(null);
  readonly masVendidos = signal<ProductoMasVendido[]>([]);
  readonly inventario = signal<ItemInventario[]>([]);

  // ---- Exportar y enviar por correo
  readonly tiposReporte: { valor: TipoReporte; etiqueta: string }[] = [
    { valor: 'ventas', etiqueta: 'Ventas' },
    { valor: 'inventario', etiqueta: 'Inventario' },
    { valor: 'productos-mas-vendidos', etiqueta: 'Productos más vendidos' },
  ];
  readonly estadosVenta = [
    { valor: 'PENDIENTE', etiqueta: 'Pendiente' },
    { valor: 'COMPLETADA', etiqueta: 'Completada' },
    { valor: 'ANULADA', etiqueta: 'Anulada' },
  ];
  readonly categoriasActivas = this.categorias.activas;

  readonly tipoExportar = signal<TipoReporte>('ventas');
  readonly accionEnCurso = signal<'xlsx' | 'pdf' | 'correo' | null>(null);

  readonly expDesde = new FormControl('', { nonNullable: true });
  readonly expHasta = new FormControl('', { nonNullable: true });
  readonly expEstado = new FormControl('', { nonNullable: true });
  readonly expSoloStockBajo = new FormControl(false, { nonNullable: true });
  readonly expCategoria = new FormControl<number | null>(null);
  readonly formatoCorreo = new FormControl<FormatoReporte>('pdf', { nonNullable: true });

  ngOnInit(): void {
    this.reportes.cargarEstadisticas().catch(() => undefined);
    void this.consultarDiarias();
    void this.consultarMensuales();
    void this.consultarMasVendidos();
    void this.consultarInventario();
    this.categorias.cargar().catch(() => undefined);
  }

  async consultarDiarias(): Promise<void> {
    const fecha = this.fechaDiaria.value;
    if (!fecha) return;
    try {
      this.ventasDiarias.set(await this.reportes.ventasDiarias(fecha));
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo consultar el reporte de ventas diarias'));
    }
  }

  async consultarMensuales(): Promise<void> {
    const anio = Number(this.anio.value);
    if (!anio) return;
    try {
      this.ventasMensuales.set(await this.reportes.ventasMensuales(anio, Number(this.mes.value)));
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo consultar el reporte de ventas mensuales'));
    }
  }

  async consultarMasVendidos(): Promise<void> {
    if (!this.desde.value || !this.hasta.value) return;
    try {
      this.masVendidos.set(await this.reportes.productosMasVendidos(this.desde.value, this.hasta.value));
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo consultar los productos más vendidos'));
    }
  }

  async consultarInventario(): Promise<void> {
    try {
      this.inventario.set(await this.reportes.inventario());
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo consultar el inventario'));
    }
  }

  cambiarTipoExportar(valor: string): void {
    this.tipoExportar.set(valor as TipoReporte);
  }

  async descargar(formato: FormatoReporte): Promise<void> {
    const filtros = this.filtrosExportar();
    if (!filtros) return;

    this.accionEnCurso.set(formato);
    try {
      await this.reportes.descargar(this.tipoExportar(), formato, filtros);
      this.alerta.exito(`El reporte se descargó en formato ${formato === 'xlsx' ? 'Excel' : 'PDF'}.`);
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo generar el reporte'));
    } finally {
      this.accionEnCurso.set(null);
    }
  }

  async enviarPorCorreo(): Promise<void> {
    const filtros = this.filtrosExportar();
    if (!filtros) return;

    this.accionEnCurso.set('correo');
    try {
      const envio = await this.reportes.enviarPorCorreo(this.tipoExportar(), this.formatoCorreo.value, filtros);
      this.alerta.exito(`${envio.mensaje}. Si no lo ves en tu bandeja de entrada, revisa la carpeta de spam.`);
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo enviar el reporte por correo'));
    } finally {
      this.accionEnCurso.set(null);
    }
  }

  private filtrosExportar(): FiltrosReporte | null {
    const tipo = this.tipoExportar();
    const desde = this.expDesde.value;
    const hasta = this.expHasta.value;

    if (tipo !== 'inventario' && desde && hasta && desde > hasta) {
      this.alerta.aviso('La fecha "desde" no puede ser posterior a la fecha "hasta".');
      return null;
    }

    return {
      desde: tipo !== 'inventario' && desde ? desde : undefined,
      hasta: tipo !== 'inventario' && hasta ? hasta : undefined,
      estadoVenta: tipo === 'ventas' && this.expEstado.value ? this.expEstado.value : undefined,
      soloStockBajo: tipo === 'inventario' && this.expSoloStockBajo.value,
      categoriaId: tipo === 'inventario' ? this.expCategoria.value : null,
    };
  }
}