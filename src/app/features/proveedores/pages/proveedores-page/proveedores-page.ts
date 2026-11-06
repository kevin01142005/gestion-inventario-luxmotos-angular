import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { botonFila, esc, textoOGuion } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { ConfirmModal } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { SectionHeader } from '../../../../shared/components/section-header/section-header';
import { AccionTabla, ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { ProveedorFormModal } from '../../components/proveedor-form-modal/proveedor-form-modal';
import { DatosProveedor, Proveedor } from '../../models/proveedor.model';
import { ProveedoresService } from '../../services/proveedores';

@Component({
  selector: 'app-proveedores-page',
  imports: [Alerta, SectionHeader, DataTable, ConfirmModal, ProveedorFormModal],
  templateUrl: './proveedores-page.html',
  styleUrl: './proveedores-page.css',
})
export class ProveedoresPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly svc = inject(ProveedoresService);

  readonly alerta = new ControladorAlerta();
  readonly errorModal = new ControladorAlerta();
  readonly proveedores = this.svc.proveedores;
  readonly permisos = computed(() => this.auth.permisosDe('/proveedores'));
  readonly mensajeVacio = computed(() =>
    this.svc.cargando() ? 'Cargando proveedores...' : 'No hay proveedores registrados.',
  );

  readonly columnas: ColumnaTabla<Proveedor>[] = [
    { titulo: 'Nombre', orden: p => p.nombre, render: p => `<span class="fw-semibold">${esc(p.nombre)}</span>` },
    { titulo: 'Contacto', render: p => textoOGuion(p.nombreContacto) },
    { titulo: 'Teléfono', render: p => textoOGuion(p.telefono) },
    { titulo: 'Correo', render: p => textoOGuion(p.correo) },
    {
      titulo: 'Acciones',
      exportable: false,
      clase: 'text-end',
      ordenable: false,
      buscable: false,
      render: () => {
        const permisos = this.permisos();
        const botones =
          (permisos.puedeEditar ? botonFila('editar', 'bi-pencil', 'Editar', 'Editar proveedor') : '') +
          (permisos.puedeEliminar ? botonFila('eliminar', 'bi-trash', 'Eliminar', 'Eliminar proveedor', 'danger') : '');
        return botones || '<span class="text-muted small">Solo lectura</span>';
      },
    },
  ];

  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly proveedorEditando = signal<Proveedor | null>(null);
  readonly proveedorAEliminar = signal<Proveedor | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      await this.svc.cargar();
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudieron cargar los proveedores'));
    }
  }

  alAccion(evento: AccionTabla<Proveedor>): void {
    if (evento.accion === 'editar') this.abrirEdicion(evento.fila);
    else if (evento.accion === 'eliminar') this.proveedorAEliminar.set(evento.fila);
  }

  abrirNuevo(): void {
    this.proveedorEditando.set(null);
    this.errorModal.limpiar();
    this.modalAbierto.set(true);
  }

  abrirEdicion(proveedor: Proveedor): void {
    this.proveedorEditando.set(proveedor);
    this.errorModal.limpiar();
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.errorModal.limpiar();
  }

  async guardar(datos: DatosProveedor): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    try {
      const actual = this.proveedorEditando();
      if (actual) await this.svc.actualizar(actual.id, datos);
      else await this.svc.crear(datos);
      this.cerrarModal();
      this.alerta.exito(`Proveedor ${datos.nombre} guardado correctamente.`);
    } catch (error) {
      this.errorModal.error(mensajeDeApi(error, 'No se pudo guardar el proveedor'));
    } finally {
      this.guardando.set(false);
    }
  }

  async confirmarEliminar(): Promise<void> {
    const proveedor = this.proveedorAEliminar();
    if (!proveedor) return;
    this.proveedorAEliminar.set(null);
    try {
      await this.svc.eliminar(proveedor.id);
      this.alerta.exito('Proveedor eliminado correctamente.');
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo eliminar el proveedor'));
    }
  }
}