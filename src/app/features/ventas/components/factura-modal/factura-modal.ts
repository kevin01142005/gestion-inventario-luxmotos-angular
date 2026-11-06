import { Component, input, output } from '@angular/core';
import { formatearMoneda } from '../../../../core/utils/format';
import { esc } from '../../../../core/utils/tabla';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { Modal } from '../../../../shared/components/modal/modal';
import { ResumenTotales } from '../../../../shared/components/resumen-totales/resumen-totales';
import { FechaHoraPipe } from '../../../../shared/pipes/fecha-hora.pipe';
import { DetalleVenta, Factura } from '../../models/venta.model';

@Component({
  selector: 'app-factura-modal',
  imports: [Modal, ResumenTotales, DataTable, FechaHoraPipe],
  templateUrl: './factura-modal.html',
  styleUrl: './factura-modal.css',
})
export class FacturaModal {
  readonly factura = input<Factura | null>(null);

  readonly columnas: ColumnaTabla<DetalleVenta>[] = [
    { titulo: 'Producto', render: d => esc(d.nombreProducto) },
    { titulo: 'Cant.', clase: 'text-center', render: d => String(d.cantidad) },
    { titulo: 'Precio', clase: 'text-end', render: d => esc(formatearMoneda(d.precioUnitario)) },
    { titulo: 'Subtotal', clase: 'text-end', render: d => esc(formatearMoneda(d.totalLinea)) },
  ];
  readonly cerrar = output<void>();
}