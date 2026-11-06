import { Component, input, output } from '@angular/core';
import { formatearFechaHora, formatearMoneda } from '../../../../core/utils/format';
import { esc } from '../../../../core/utils/tabla';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { Modal } from '../../../../shared/components/modal/modal';
import { htmlEstado } from '../../../../shared/components/status-badge/status-badge';
import { ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { Cliente, CompraCliente } from '../../models/cliente.model';

@Component({
  selector: 'app-historial-compras-modal',
  imports: [Modal, DataTable],
  templateUrl: './historial-compras-modal.html',
  styleUrl: './historial-compras-modal.css',
})
export class HistorialComprasModal {
  readonly abierto = input(false);
  readonly cliente = input<Cliente | null>(null);
  readonly compras = input<CompraCliente[]>([]);
  readonly cargando = input(false);
  readonly cerrar = output<void>();

  readonly columnas: ColumnaTabla<CompraCliente>[] = [
    { titulo: 'Fecha', orden: v => v.creado, render: v => esc(formatearFechaHora(v.creado)) },
    { titulo: 'Estado', clase: 'text-center', orden: v => v.estadoVenta, render: v => htmlEstado(v.estadoVenta) },
    { titulo: 'Total', clase: 'text-end', numerica: true, orden: v => v.total, render: v => esc(formatearMoneda(v.total)) },
  ];
}