import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RegistroAuditoria } from '../../../../core/models/auditoria.model';
import { AuditoriaService } from '../../../../core/services/auditoria';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { formatearFechaHora } from '../../../../core/utils/format';
import { esc } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { htmlEstado } from '../../../../shared/components/status-badge/status-badge';
import { ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';

const ETIQUETAS_ENTIDAD: Record<string, string> = {
  Producto: 'Producto',
  Categoria: 'Categoría',
  Proveedor: 'Proveedor',
  Cliente: 'Cliente',
  Venta: 'Venta',
  MovimientoInventario: 'Movimiento de inventario',
  Usuario: 'Usuario',
  Rol: 'Rol',
  Modulo: 'Módulo',
  ModuloXRol: 'Permiso de módulo',
  ProductoCompatibilidad: 'Compatibilidad de producto',
};

function etiquetaEntidad(entidad: string): string {
  return ETIQUETAS_ENTIDAD[entidad] ?? entidad;
}

@Component({
  selector: 'app-auditoria-page',
  imports: [Alerta, DataTable],
  templateUrl: './auditoria-page.html',
  styleUrl: './auditoria-page.css',
})
export class AuditoriaPage implements OnInit {
  private readonly auditoria = inject(AuditoriaService);

  readonly alerta = new ControladorAlerta();

  readonly entidades = Object.entries(ETIQUETAS_ENTIDAD).map(([valor, etiqueta]) => ({ valor, etiqueta }));

  readonly filtroEntidad = signal('');

  readonly columnas: ColumnaTabla<RegistroAuditoria>[] = [
    { titulo: 'Fecha', orden: r => r.creado, render: r => esc(formatearFechaHora(r.creado)) },
    { titulo: 'Acción', clase: 'text-center', orden: r => r.accion, render: r => htmlEstado(r.accion, true) },
    {
      titulo: 'Entidad',
      orden: r => etiquetaEntidad(r.entidadAfectada),
      render: r => `<span class="fw-semibold">${esc(etiquetaEntidad(r.entidadAfectada))}</span>`,
    },
    { titulo: 'Usuario', render: r => `<i class="bi bi-person"></i> ${esc(r.correoUsuario)}` },
  ];

  readonly registros = computed(() => {
    const entidad = this.filtroEntidad();
    return this.auditoria.registros()
      .filter(r => !entidad || r.entidadAfectada === entidad)
      .sort((a, b) => b.creado.localeCompare(a.creado) || b.id - a.id);
  });

  readonly mensajeVacio = computed(() =>
    this.auditoria.cargando() ? 'Cargando registros...' : 'No hay registros de auditoría para este filtro.',
  );

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      await this.auditoria.cargar();
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo cargar el registro de auditoría'));
    }
  }
}