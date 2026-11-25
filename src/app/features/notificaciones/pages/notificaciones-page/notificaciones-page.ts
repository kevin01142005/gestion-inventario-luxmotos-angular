import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { formatearFechaHora } from '../../../../core/utils/format';
import { esc } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { KpiCard } from '../../../../shared/components/kpi-card/kpi-card';
import { ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { EstadoEnvio, Notificacion, TipoNotificacion } from '../../models/notificacion.model';
import { NotificacionesService } from '../../services/notificaciones';

const ETIQUETAS_TIPO: Record<TipoNotificacion, string> = {
  REGISTRO_USUARIO: 'Registro de usuario',
  VENTA_COMPLETADA: 'Venta completada',
  STOCK_BAJO: 'Stock bajo',
  ALERTA_AMBIENTE: 'Alerta de ambiente',
  REPORTE_ENVIADO: 'Reporte enviado',
};

const ESTILOS_ENVIO: Record<EstadoEnvio, { clase: string; texto: string }> = {
  ENVIADA: { clase: 'badge-completada', texto: 'Enviada' },
  FALLIDA: { clase: 'badge-anulada', texto: 'Fallida' },
  PENDIENTE: { clase: 'badge-pendiente', texto: 'Pendiente' },
};

function badgeEnvio(estado: EstadoEnvio): string {
  const e = ESTILOS_ENVIO[estado] ?? ESTILOS_ENVIO.PENDIENTE;
  return `<span class="badge-estado ${e.clase}">${esc(e.texto)}</span>`;
}

@Component({
  selector: 'app-notificaciones-page',
  imports: [Alerta, DataTable, KpiCard],
  templateUrl: './notificaciones-page.html',
  styleUrl: './notificaciones-page.css',
})
export class NotificacionesPage implements OnInit {
  private readonly notificaciones = inject(NotificacionesService);

  readonly alerta = new ControladorAlerta();
  readonly resumen = this.notificaciones.resumen;
  readonly filtroEstado = signal<EstadoEnvio | ''>('');

  readonly estados: { valor: EstadoEnvio; etiqueta: string }[] = [
    { valor: 'ENVIADA', etiqueta: 'Enviadas' },
    { valor: 'FALLIDA', etiqueta: 'Fallidas' },
    { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  ];

  readonly columnas: ColumnaTabla<Notificacion>[] = [
    { titulo: 'Fecha', orden: n => n.creado, render: n => esc(formatearFechaHora(n.creado)) },
    {
      titulo: 'Evento',
      orden: n => ETIQUETAS_TIPO[n.tipo] ?? n.tipo,
      render: n => `<span class="fw-semibold">${esc(ETIQUETAS_TIPO[n.tipo] ?? n.tipo)}</span>`,
    },
    { titulo: 'Destinatario', orden: n => n.destinatario, render: n => `<i class="bi bi-envelope"></i> ${esc(n.destinatario)}` },
    {
      titulo: 'Asunto',
      orden: n => n.asunto,
      render: n => esc(n.asunto) + (n.adjunto ? ` <i class="bi bi-paperclip" title="${esc(n.adjunto)}"></i>` : ''),
    },
    { titulo: 'Estado', clase: 'text-center', orden: n => n.estadoEnvio, render: n => badgeEnvio(n.estadoEnvio) },
    {
      titulo: 'Detalle',
      orden: n => n.error ?? '',
      render: n => (n.error ? `<span class="text-danger small">${esc(n.error)}</span>` : '<span class="text-muted">-</span>'),
    },
  ];

  readonly registros = this.notificaciones.lista;

  readonly mensajeVacio = computed(() =>
    this.notificaciones.cargando() ? 'Cargando notificaciones...' : 'Aún no se ha enviado ninguna notificación.',
  );

  ngOnInit(): void {
    void this.cargar();
  }

  cambiarFiltro(valor: string): void {
    this.filtroEstado.set(valor as EstadoEnvio | '');
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      await this.notificaciones.cargar(this.filtroEstado());
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudieron cargar las notificaciones'));
    }
  }
}