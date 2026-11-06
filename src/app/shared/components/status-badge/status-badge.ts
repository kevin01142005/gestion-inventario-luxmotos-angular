import { Component, computed, input } from '@angular/core';
import { esc } from '../../../core/utils/tabla';

interface Estilo { clase: string; texto: string; icono?: string; }

const ESTILOS: Record<string, Estilo> = {
  DISPONIBLE: { clase: 'badge-disponible', texto: 'Disponible' },
  STOCK_BAJO: { clase: 'badge-stock-bajo', texto: 'Stock bajo' },
  AGOTADO: { clase: 'badge-agotado', texto: 'Agotado' },
  NORMAL: { clase: 'badge-disponible', texto: 'Normal' },
  PENDIENTE: { clase: 'badge-pendiente', texto: 'Pendiente' },
  COMPLETADA: { clase: 'badge-completada', texto: 'Completada' },
  ANULADA: { clase: 'badge-anulada', texto: 'Anulada' },
  ACTIVA: { clase: 'badge-activa', texto: 'Activa' },
  ELIMINADA: { clase: 'badge-eliminada', texto: 'Eliminada' },
  ENTRADA: { clase: 'badge-entrada', texto: 'Entrada' },
  SALIDA: { clase: 'badge-salida', texto: 'Salida' },
  CREACION: { clase: 'badge-creacion', texto: 'Creación', icono: 'bi-plus-circle' },
  ACTUALIZACION: { clase: 'badge-actualizacion', texto: 'Actualización', icono: 'bi-pencil-square' },
  ELIMINACION: { clase: 'badge-eliminacion', texto: 'Eliminación', icono: 'bi-trash' },
};

export function htmlEstado(estado: string, conIcono = false): string {
  const e = ESTILOS[estado] ?? { clase: 'badge-pendiente', texto: estado };
  const icono = conIcono && e.icono ? `<i class="bi ${e.icono}"></i> ` : '';
  return `<span class="badge-estado ${e.clase}">${icono}${esc(e.texto)}</span>`;
}

@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
})
export class StatusBadge {
  readonly estado = input.required<string>();
  readonly conIcono = input(false);

  readonly estilo = computed<Estilo>(() => ESTILOS[this.estado()] ?? { clase: 'badge-pendiente', texto: this.estado() });
}
