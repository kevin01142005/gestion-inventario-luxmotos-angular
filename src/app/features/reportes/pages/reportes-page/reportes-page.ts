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
import { ItemInventario, ProductoMasVendido, ResumenVentas } from '../../models/reporte.model';
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

  readonly alerta = new ControladorAlerta();
  readonly estadisticas = this.reportes.estadisticas;
  readonly moneda = formatearMoneda;
  readonly meses = MESES;

  readonly pestanas: Pestana[] = [
    { id: 'diarias', etiqueta: 'Ventas diarias', icono: 'bi-calendar-day' },
    { id: 'mensuales', etiqueta: 'Ventas mensuales', icono: 'bi-calendar-month' },
    { id: 'mas-vendidos', etiqueta: 'Más vendidos', icono: 'bi-trophy' },
    { id: 'inventario', etiqueta: 'Inventario', icono: 'bi-box-seam' },
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

  ngOnInit(): void {
    this.reportes.cargarEstadisticas().catch(() => undefined);
    void this.consultarDiarias();
    void this.consultarMensuales();
    void this.consultarMasVendidos();
    void this.consultarInventario();
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
}