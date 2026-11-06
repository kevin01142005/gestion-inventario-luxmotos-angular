import { Component, computed, effect, input, output, viewChild } from '@angular/core';
import { MensajeAlerta } from '../../../../core/models/alerta.model';
import { botonFila, esc } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { Modal } from '../../../../shared/components/modal/modal';
import { SelectorMoto } from '../../../../shared/components/selector-moto/selector-moto';
import { AccionTabla, ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { Compatibilidad } from '../../models/compatibilidad.model';
import { Producto } from '../../models/producto.model';

@Component({
  selector: 'app-compatibilidad-modal',
  imports: [Modal, DataTable, Alerta, SelectorMoto],
  templateUrl: './compatibilidad-modal.html',
  styleUrl: './compatibilidad-modal.css',
})
export class CompatibilidadModal {
  readonly abierto = input(false);
  readonly producto = input<Producto | null>(null);
  readonly compatibilidades = input<Compatibilidad[]>([]);
  readonly cargando = input(false);
  readonly guardando = input(false);
  readonly error = input<MensajeAlerta | null>(null);
  readonly puedeAgregar = input(false);
  readonly puedeQuitar = input(false);

  readonly agregar = output<number>();
  readonly quitar = output<Compatibilidad>();
  readonly cerrar = output<void>();
  readonly cerrarError = output<void>();

  private readonly selector = viewChild(SelectorMoto);
  private versionElegida: number | null = null;

  readonly columnas = computed<ColumnaTabla<Compatibilidad>[]>(() => {
    const puedeQuitar = this.puedeQuitar();
    return [
      { titulo: 'Moto compatible', orden: c => c.descripcionMoto, render: c => esc(c.descripcionMoto) },
      {
        titulo: 'Acciones',
        exportable: false,
        clase: 'text-end',
        ordenable: false,
        buscable: false,
        render: () => (puedeQuitar ? botonFila('quitar', 'bi-trash', 'Quitar', 'Quitar compatibilidad', 'danger') : ''),
      },
    ];
  });

  constructor() {
    effect(() => {
      this.compatibilidades();
      this.abierto();
      this.selector()?.reiniciar();
      this.versionElegida = null;
    });
  }

  alVersion(version: number | null): void {
    this.versionElegida = version;
  }

  alAccion(evento: AccionTabla<Compatibilidad>): void {
    if (evento.accion === 'quitar') this.quitar.emit(evento.fila);
  }

  enviar(): void {
    if (this.versionElegida !== null) this.agregar.emit(this.versionElegida);
  }
}