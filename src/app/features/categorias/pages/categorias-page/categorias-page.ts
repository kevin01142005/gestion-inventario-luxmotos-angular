import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { botonFila, esc, textoOGuion } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { ConfirmModal } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { SectionHeader } from '../../../../shared/components/section-header/section-header';
import { htmlEstado } from '../../../../shared/components/status-badge/status-badge';
import { AccionTabla, ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { CategoriaFormModal } from '../../components/categoria-form-modal/categoria-form-modal';
import { Categoria, DatosCategoria } from '../../models/categoria.model';
import { CategoriasService } from '../../services/categorias';

@Component({
  selector: 'app-categorias-page',
  imports: [Alerta, SectionHeader, DataTable, ConfirmModal, CategoriaFormModal],
  templateUrl: './categorias-page.html',
  styleUrl: './categorias-page.css',
})
export class CategoriasPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly svc = inject(CategoriasService);

  readonly alerta = new ControladorAlerta();
  readonly errorModal = new ControladorAlerta();
  readonly categorias = this.svc.categorias;
  readonly permisos = computed(() => this.auth.permisosDe('/categorias'));
  readonly mensajeVacio = computed(() =>
    this.svc.cargando() ? 'Cargando categorías...' : 'No hay categorías registradas.',
  );

  readonly columnas: ColumnaTabla<Categoria>[] = [
    { titulo: 'Nombre', orden: c => c.nombre, render: c => `<span class="fw-semibold">${esc(c.nombre)}</span>` },
    { titulo: 'Descripción', render: c => textoOGuion(c.descripcion) },
    {
      titulo: 'Estado',
      clase: 'text-center',
      orden: c => (c.estado ? 'ACTIVA' : 'ELIMINADA'),
      render: c => htmlEstado(c.estado ? 'ACTIVA' : 'ELIMINADA'),
    },
    {
      titulo: 'Acciones',
      exportable: false,
      clase: 'text-end',
      ordenable: false,
      buscable: false,
      render: () => {
        const p = this.permisos();
        const botones =
          (p.puedeEditar ? botonFila('editar', 'bi-pencil', 'Editar', 'Editar categoría') : '') +
          (p.puedeEliminar ? botonFila('eliminar', 'bi-trash', 'Eliminar', 'Eliminar categoría', 'danger') : '');
        return botones || '<span class="text-muted small">Solo lectura</span>';
      },
    },
  ];

  readonly modalAbierto = signal(false);
  readonly guardando = signal(false);
  readonly categoriaEditando = signal<Categoria | null>(null);
  readonly categoriaAEliminar = signal<Categoria | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      await this.svc.cargar();
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudieron cargar las categorías'));
    }
  }

  alAccion(evento: AccionTabla<Categoria>): void {
    if (evento.accion === 'editar') this.abrirEdicion(evento.fila);
    else if (evento.accion === 'eliminar') this.categoriaAEliminar.set(evento.fila);
  }

  abrirNueva(): void {
    this.categoriaEditando.set(null);
    this.errorModal.limpiar();
    this.modalAbierto.set(true);
  }

  abrirEdicion(categoria: Categoria): void {
    this.categoriaEditando.set(categoria);
    this.errorModal.limpiar();
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.errorModal.limpiar();
  }

  async guardar(datos: DatosCategoria): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    try {
      const actual = this.categoriaEditando();
      if (actual) await this.svc.actualizar(actual.id, datos);
      else await this.svc.crear(datos);
      this.cerrarModal();
      this.alerta.exito(`Categoría ${datos.nombre} guardada correctamente.`);
    } catch (error) {
      this.errorModal.error(mensajeDeApi(error, 'No se pudo guardar la categoría'));
    } finally {
      this.guardando.set(false);
    }
  }

  async confirmarEliminar(): Promise<void> {
    const categoria = this.categoriaAEliminar();
    if (!categoria) return;
    this.categoriaAEliminar.set(null);
    try {
      await this.svc.eliminar(categoria.id);
      this.alerta.exito('Categoría eliminada correctamente.');
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo eliminar la categoría'));
    }
  }
}