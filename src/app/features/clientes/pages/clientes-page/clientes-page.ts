import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { formatearFecha } from '../../../../core/utils/format';
import { botonFila, esc, textoOGuion } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { ConfirmModal } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { SearchBox } from '../../../../shared/components/search-box/search-box';
import { SectionHeader } from '../../../../shared/components/section-header/section-header';
import { AccionTabla, ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { ClienteFormModal } from '../../components/cliente-form-modal/cliente-form-modal';
import { HistorialComprasModal } from '../../components/historial-compras-modal/historial-compras-modal';
import { Cliente, CompraCliente, DatosCliente } from '../../models/cliente.model';
import { ClientesService } from '../../services/clientes';

@Component({
  selector: 'app-clientes-page',
  imports: [
    Alerta, SectionHeader, SearchBox, DataTable, ConfirmModal, ClienteFormModal,
    HistorialComprasModal,
  ],
  templateUrl: './clientes-page.html',
  styleUrl: './clientes-page.css',
})
export class ClientesPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly svc = inject(ClientesService);

  readonly alerta = new ControladorAlerta();
  readonly errorModal = new ControladorAlerta();

  readonly busqueda = signal('');
  readonly clientes = this.svc.clientes;
  readonly permisos = computed(() => this.auth.permisosDe('/clientes'));
  readonly mensajeVacio = computed(() =>
    this.svc.cargando() ? 'Cargando clientes...' : 'No se encontraron clientes.',
  );

  readonly columnas: ColumnaTabla<Cliente>[] = [
    { titulo: 'Documento', orden: c => c.documento, render: c => `<span class="codigo-producto">${esc(c.documento)}</span>` },
    { titulo: 'Nombre', orden: c => c.nombre, render: c => `<span class="fw-semibold">${esc(c.nombre)}</span>` },
    { titulo: 'Teléfono', render: c => textoOGuion(c.telefono) },
    { titulo: 'Correo', render: c => textoOGuion(c.correo) },
    { titulo: 'Registrado', orden: c => c.creado, render: c => esc(formatearFecha(c.creado)) },
    {
      titulo: 'Acciones',
      exportable: false,
      clase: 'text-end',
      ordenable: false,
      buscable: false,
      render: () => {
        const permisos = this.permisos();
        return (
          botonFila('historial', 'bi-receipt', 'Historial de compras', 'Historial de compras') +
          (permisos.puedeEditar ? botonFila('editar', 'bi-pencil', 'Editar', 'Editar cliente') : '') +
          (permisos.puedeEliminar ? botonFila('eliminar', 'bi-trash', 'Eliminar', 'Eliminar cliente', 'danger') : '')
        );
      },
    },
  ];

  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly clienteEditando = signal<Cliente | null>(null);
  readonly clienteAEliminar = signal<Cliente | null>(null);
  readonly clienteHistorial = signal<Cliente | null>(null);
  readonly comprasHistorial = signal<CompraCliente[]>([]);
  readonly cargandoCompras = signal(false);

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      await this.svc.cargar();
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudieron cargar los clientes'));
    }
  }

  alAccion(evento: AccionTabla<Cliente>): void {
    if (evento.accion === 'historial') void this.abrirHistorial(evento.fila);
    else if (evento.accion === 'editar') this.abrirEdicion(evento.fila);
    else if (evento.accion === 'eliminar') this.clienteAEliminar.set(evento.fila);
  }

  async abrirHistorial(cliente: Cliente): Promise<void> {
    this.comprasHistorial.set([]);
    this.clienteHistorial.set(cliente);
    this.cargandoCompras.set(true);
    try {
      this.comprasHistorial.set(await this.svc.compras(cliente.id));
    } catch (error) {
      this.clienteHistorial.set(null);
      this.alerta.error(mensajeDeApi(error, 'No se pudo cargar el historial de compras'));
    } finally {
      this.cargandoCompras.set(false);
    }
  }

  abrirNuevo(): void {
    this.clienteEditando.set(null);
    this.errorModal.limpiar();
    this.modalAbierto.set(true);
  }

  abrirEdicion(cliente: Cliente): void {
    this.clienteEditando.set(cliente);
    this.errorModal.limpiar();
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.errorModal.limpiar();
  }

  async guardar(datos: DatosCliente): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    try {
      const actual = this.clienteEditando();
      if (actual) await this.svc.actualizar(actual.id, datos);
      else await this.svc.crear(datos);
      this.cerrarModal();
      this.alerta.exito(`Cliente ${datos.nombre} guardado correctamente.`);
    } catch (error) {
      this.errorModal.error(mensajeDeApi(error, 'No se pudo guardar el cliente'));
    } finally {
      this.guardando.set(false);
    }
  }

  async confirmarEliminar(): Promise<void> {
    const cliente = this.clienteAEliminar();
    if (!cliente) return;
    this.clienteAEliminar.set(null);
    try {
      await this.svc.eliminar(cliente.id);
      this.alerta.exito('Cliente eliminado correctamente.');
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo eliminar el cliente'));
    }
  }
}