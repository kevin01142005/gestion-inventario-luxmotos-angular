import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { formatearMoneda } from '../../../../core/utils/format';
import { botonFila, esc, textoOGuion } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { ConfirmModal } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { ResumenCard } from '../../../../shared/components/resumen-card/resumen-card';
import { SearchBox } from '../../../../shared/components/search-box/search-box';
import { SectionHeader } from '../../../../shared/components/section-header/section-header';
import { htmlEstado } from '../../../../shared/components/status-badge/status-badge';
import { SoloAdminDirective } from '../../../../shared/directives/solo-admin.directive';
import { AccionTabla, ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { CategoriasService } from '../../../categorias/services/categorias';
import { ProveedoresService } from '../../../proveedores/services/proveedores';
import { ReportesService } from '../../../reportes/services/reportes';
import { CompatibilidadModal } from '../../components/compatibilidad-modal/compatibilidad-modal';
import { ProductoFormModal } from '../../components/producto-form-modal/producto-form-modal';
import { Compatibilidad } from '../../models/compatibilidad.model';
import { DatosProducto, EstadoStock, Producto, ProductoVista, esStockBajo, estadoStock } from '../../models/producto.model';
import { CompatibilidadService } from '../../services/compatibilidad';
import { ProductosService } from '../../services/productos';

@Component({
  selector: 'app-panel-page',
  imports: [
    Alerta, ResumenCard, SectionHeader, SearchBox, DataTable, ConfirmModal,
    ProductoFormModal, CompatibilidadModal, SoloAdminDirective,
  ],
  templateUrl: './panel-page.html',
  styleUrl: './panel-page.css',
})
export class PanelPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  private readonly productosSvc = inject(ProductosService);
  private readonly categoriasSvc = inject(CategoriasService);
  private readonly proveedoresSvc = inject(ProveedoresService);
  private readonly reportes = inject(ReportesService);
  private readonly compatibilidadSvc = inject(CompatibilidadService);

  readonly alerta = new ControladorAlerta();
  readonly errorModal = new ControladorAlerta();

  readonly categorias = this.categoriasSvc.categorias;
  readonly proveedores = this.proveedoresSvc.proveedores;
  readonly estadisticas = this.reportes.estadisticas;
  readonly ventasMes = computed(() => formatearMoneda(this.estadisticas().totalVentasDelMes));

  readonly permisos = computed(() => this.auth.permisosDe('/productos'));
  readonly guardando = signal(false);
  readonly mensajeVacio = computed(() =>
    this.productosSvc.cargando() ? 'Cargando productos...' : 'No se encontraron productos con los filtros actuales.',
  );

  readonly totalProductos = computed(() => this.productosSvc.productos().length);
  readonly categoriasActivas = computed(() => this.categoriasSvc.activas().length);
  readonly stockBajo = computed(() => this.productosSvc.productos().filter(p => esStockBajo(p) && p.stockActual > 0).length);
  readonly agotados = computed(() => this.productosSvc.productos().filter(p => p.stockActual === 0).length);

  readonly busqueda = signal('');
  readonly filtroCategoria = signal('');
  readonly filtroEstado = signal<EstadoStock | ''>('');

  readonly productosVista = computed<ProductoVista[]>(() =>
    this.productosSvc.productos().map(p => ({ ...p, situacion: estadoStock(p) })),
  );

  readonly filtrados = computed(() => {
    const categoria = this.filtroCategoria();
    const estado = this.filtroEstado();
    return this.productosVista().filter(p => {
      const coincideCategoria = !categoria || String(p.categoriaId) === categoria;
      const coincideEstado = !estado || p.situacion === estado;
      return coincideCategoria && coincideEstado;
    });
  });

  readonly columnas: ColumnaTabla<ProductoVista>[] = [
    { titulo: 'Código', orden: p => p.codigo, render: p => `<span class="codigo-producto">${esc(p.codigo)}</span>` },
    {
      titulo: 'Producto',
      orden: p => p.nombre,
      render: p =>
        `<div class="celda-producto"><div class="nombre-producto">${esc(p.nombre)}</div>` +
        (p.descripcion ? `<div class="descripcion-producto" title="${esc(p.descripcion)}">${esc(p.descripcion)}</div>` : '') +
        '</div>',
    },
    { titulo: 'Categoría', orden: p => p.nombreCategoria, render: p => esc(p.nombreCategoria) },
    { titulo: 'Proveedor', render: p => textoOGuion(p.nombreProveedor) },
    { titulo: 'Precio', clase: 'text-end', numerica: true, orden: p => p.precio, render: p => esc(formatearMoneda(p.precio)) },
    {
      titulo: 'Stock',
      clase: 'text-center',
      numerica: true,
      orden: p => p.stockActual,
      render: p => `${p.stockActual} <span class="text-muted small">/ mín. ${p.stockMinimo}</span>`,
    },
    { titulo: 'Estado', clase: 'text-center', orden: p => p.situacion, render: p => htmlEstado(p.situacion) },
    {
      titulo: 'Acciones',
      exportable: false,
      clase: 'text-end',
      ordenable: false,
      buscable: false,
      render: () => {
        const permisos = this.permisos();
        const botones =
          botonFila('motos', 'bi-bicycle', 'Motos compatibles', 'Motos compatibles con el producto') +
          (permisos.puedeEditar ? botonFila('editar', 'bi-pencil', 'Editar', 'Editar producto') : '') +
          (permisos.puedeEliminar ? botonFila('eliminar', 'bi-trash', 'Eliminar', 'Eliminar producto', 'danger') : '');
        return botones || '<span class="text-muted small">Solo lectura</span>';
      },
    },
  ];

  readonly modalAbierto = signal(false);
  readonly productoEditando = signal<Producto | null>(null);
  readonly productoAEliminar = signal<Producto | null>(null);

  readonly productoMotos = signal<Producto | null>(null);
  readonly compatibilidades = signal<Compatibilidad[]>([]);
  readonly cargandoMotos = signal(false);
  readonly guardandoMoto = signal(false);
  readonly errorMotos = new ControladorAlerta();

  readonly categoriasFormulario = computed(() => {
    const activas = this.categoriasSvc.activas();
    const actual = this.productoEditando();
    if (actual && !activas.some(c => c.id === actual.categoriaId)) {
      const categoria = this.categorias().find(c => c.id === actual.categoriaId);
      if (categoria) return [...activas, categoria];
    }
    return activas;
  });

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('mensaje') === 'sin_permiso') {
      this.alerta.aviso('Tu rol no tiene permiso para acceder a esa sección.');
    }
    if (this.auth.esAdmin()) this.reportes.cargarEstadisticas().catch(() => undefined);
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      await Promise.all([this.productosSvc.cargar(), this.categoriasSvc.cargar(), this.proveedoresSvc.cargar()]);
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudieron cargar los productos'));
    }
  }

  alAccion(evento: AccionTabla<ProductoVista>): void {
    if (evento.accion === 'editar') this.abrirEdicion(evento.fila);
    else if (evento.accion === 'eliminar') this.productoAEliminar.set(evento.fila);
    else if (evento.accion === 'motos') void this.abrirMotos(evento.fila);
  }

  async abrirMotos(producto: Producto): Promise<void> {
    this.compatibilidades.set([]);
    this.errorMotos.limpiar();
    this.productoMotos.set(producto);
    this.cargandoMotos.set(true);
    try {
      this.compatibilidades.set(await this.compatibilidadSvc.listar(producto.id));
    } catch (error) {
      this.errorMotos.error(mensajeDeApi(error, 'No se pudieron cargar las motos compatibles'));
    } finally {
      this.cargandoMotos.set(false);
    }
  }

  cerrarMotos(): void {
    this.productoMotos.set(null);
    this.errorMotos.limpiar();
  }

  async agregarMoto(versionId: number): Promise<void> {
    const producto = this.productoMotos();
    if (!producto || this.guardandoMoto()) return;
    this.guardandoMoto.set(true);
    this.errorMotos.limpiar();
    try {
      await this.compatibilidadSvc.agregar(producto.id, versionId);
      this.compatibilidades.set(await this.compatibilidadSvc.listar(producto.id));
    } catch (error) {
      this.errorMotos.error(mensajeDeApi(error, 'No se pudo agregar la moto compatible'));
    } finally {
      this.guardandoMoto.set(false);
    }
  }

  async quitarMoto(compatibilidad: Compatibilidad): Promise<void> {
    const producto = this.productoMotos();
    if (!producto || this.guardandoMoto()) return;
    this.guardandoMoto.set(true);
    this.errorMotos.limpiar();
    try {
      await this.compatibilidadSvc.quitar(producto.id, compatibilidad.id);
      this.compatibilidades.set(await this.compatibilidadSvc.listar(producto.id));
    } catch (error) {
      this.errorMotos.error(mensajeDeApi(error, 'No se pudo quitar la moto compatible'));
    } finally {
      this.guardandoMoto.set(false);
    }
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.filtroCategoria.set('');
    this.filtroEstado.set('');
  }

  abrirNuevo(): void {
    this.productoEditando.set(null);
    this.errorModal.limpiar();
    this.modalAbierto.set(true);
  }

  abrirEdicion(producto: Producto): void {
    this.productoEditando.set(producto);
    this.errorModal.limpiar();
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.errorModal.limpiar();
  }

  async guardar(datos: DatosProducto): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    try {
      const actual = this.productoEditando();
      if (actual) await this.productosSvc.actualizar(actual.id, datos);
      else await this.productosSvc.crear(datos);
      this.cerrarModal();
      this.alerta.exito(`Producto ${datos.nombre} guardado correctamente.`);
    } catch (error) {
      this.errorModal.error(mensajeDeApi(error, 'No se pudo guardar el producto'));
    } finally {
      this.guardando.set(false);
    }
  }

  async confirmarEliminar(): Promise<void> {
    const producto = this.productoAEliminar();
    if (!producto) return;
    this.productoAEliminar.set(null);
    try {
      await this.productosSvc.eliminar(producto.id);
      this.alerta.exito('Producto eliminado correctamente.');
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo eliminar el producto'));
    }
  }
}