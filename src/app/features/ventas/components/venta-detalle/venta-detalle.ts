import { Component, input, output } from '@angular/core';
import { formatearMoneda } from '../../../../core/utils/format';
import { esc } from '../../../../core/utils/tabla';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { ResumenTotales } from '../../../../shared/components/resumen-totales/resumen-totales';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { DetalleVenta, Venta } from '../../models/venta.model';

@Component({
  selector: 'app-venta-detalle',
  imports: [StatusBadge, ResumenTotales, DataTable, FechaHoraPipe, CopPipe],
  templateUrl: './venta-detalle.html',
  styleUrl: './venta-detalle.css',
})
export class VentaDetalle {
  readonly venta = input.required<Venta>();
  readonly puedeGestionar = input(false);

  readonly columnas: ColumnaTabla<DetalleVenta>[] = [
    { titulo: 'Producto', render: d => esc(d.nombreProducto) },
    { titulo: 'Cant.', clase: 'text-center', render: d => String(d.cantidad) },
    { titulo: 'Subtotal', clase: 'text-end', render: d => esc(formatearMoneda(d.totalLinea)) },
  ];

  readonly completar = output<void>();
  readonly anular = output<void>();
  readonly verFactura = output<void>();
}