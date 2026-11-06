import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { formatearFechaHora, formatearMoneda } from '../../../../core/utils/format';
import { botonFila, esc } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { ConfirmModal } from '../../../../shared/components/confirm-modal/confirm-modal';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ResumenTotales } from '../../../../shared/components/resumen-totales/resumen-totales';
import { SectionHeader } from '../../../../shared/components/section-header/section-header';
import { htmlEstado } from '../../../../shared/components/status-badge/status-badge';
import { AccionTabla, ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { ClientesService } from '../../../clientes/services/clientes';
import { ProductosService } from '../../../panel/services/productos';
import { FacturaModal } from '../../components/factura-modal/factura-modal';
import { VentaDetalle } from '../../components/venta-detalle/venta-detalle';
import { Factura, ItemCarrito, TASA_IVA, Venta } from '../../models/venta.model';
import { VentasService } from '../../services/ventas';

type AccionVenta = 'completar' | 'anular';

@Component({
  selector: 'app-ventas-page',
  imports: [
    ReactiveFormsModule, Alerta, SectionHeader, EmptyState, ResumenTotales, ConfirmModal,
    VentaDetalle, FacturaModal, DataTable,
  ],
  templateUrl: './ventas-page.html',
  styleUrl: './ventas-page.css',
})
export class VentasPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly clientesSvc = inject(ClientesService);
  private readonly productosSvc = inject(ProductosService);
  private readonly ventasSvc = inject(VentasService);

  readonly alerta = new ControladorAlerta();
  readonly clientes = this.clientesSvc.clientes;
  readonly productos = this.productosSvc.productos;
  readonly ventas = this.ventasSvc.ventas;
  readonly permisos = computed(() => this.auth.permisosDe('/ventas'));
  readonly procesando = signal(false);

  readonly clienteControl = new FormControl<number | null>(null);
  readonly productoControl = new FormControl<number | null>(null);
  readonly cantidadControl = new FormControl<number | null>(1);

  readonly carrito = signal<ItemCarrito[]>([]);

  readonly columnasCarrito: ColumnaTabla<ItemCarrito>[] = [
    {
      titulo: 'Producto',
      render: i =>
        `<div class="fw-semibold">${esc(i.nombre)}</div><div class="text-muted small codigo-producto">${esc(i.codigo)}</div>`,
    },
    { titulo: 'Cant.', clase: 'text-center', render: i => String(i.cantidad) },
    { titulo: 'Precio', clase: 'text-end', render: i => esc(formatearMoneda(i.precio)) },
    { titulo: 'Subtotal', clase: 'text-end', render: i => esc(formatearMoneda(i.precio * i.cantidad)) },
    { titulo: '', clase: 'text-end', render: () => botonFila('quitar', 'bi-x-lg', 'Quitar', 'Quitar del carrito', 'danger') },
  ];
  readonly subtotal = computed(() => this.carrito().reduce((s, i) => s + i.precio * i.cantidad, 0));
  readonly iva = computed(() => Math.round(this.subtotal() * TASA_IVA));
  readonly total = computed(() => this.subtotal() + this.iva());

  readonly columnasVentas: ColumnaTabla<Venta>[] = [
    { titulo: 'Fecha', orden: v => v.creado, render: v => esc(formatearFechaHora(v.creado)) },
    { titulo: 'Cliente', orden: v => v.nombreCliente, render: v => `<span class="fw-semibold">${esc(v.nombreCliente)}</span>` },
    { titulo: 'Vendedor', render: v => esc(v.correoVendedor) },
    { titulo: 'Estado', clase: 'text-center', orden: v => v.estadoVenta, render: v => htmlEstado(v.estadoVenta) },
    { titulo: 'Total', clase: 'text-end', numerica: true, orden: v => v.total, render: v => esc(formatearMoneda(v.total)) },
    {
      titulo: 'Acciones',
      exportable: false,
      clase: 'text-end',
      ordenable: false,
      buscable: false,
      render: () => botonFila('ver', 'bi-eye', 'Ver detalle', 'Ver detalle de la venta'),
    },
  ];

  readonly mensajeVentas = computed(() =>
    this.ventasSvc.cargando() ? 'Cargando ventas...' : 'Aún no hay ventas registradas.',
  );

  readonly ventaActualId = signal<number | null>(null);
  readonly ventaActual = computed<Venta | undefined>(() => {
    const id = this.ventaActualId();
    return id === null ? undefined : this.ventas().find(v => v.id === id);
  });

  readonly facturaActual = signal<Factura | null>(null);
  readonly accionPendiente = signal<AccionVenta | null>(null);

  ngOnInit(): void {
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      await Promise.all([this.clientesSvc.cargar(), this.productosSvc.cargar(), this.ventasSvc.cargar()]);
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudieron cargar los datos de ventas'));
    }
  }

  agregarItem(): void {
    const productoId = this.productoControl.value;
    const cantidad = Number(this.cantidadControl.value);

    if (productoId === null) {
      this.alerta.aviso('Selecciona un producto para agregarlo a la venta.');
      return;
    }
    if (!cantidad || cantidad <= 0) {
      this.alerta.aviso('La cantidad debe ser mayor a 0.');
      return;
    }
    const producto = this.productosSvc.obtenerPorId(productoId);
    if (!producto) return;

    const existente = this.carrito().find(i => i.productoId === productoId);
    const enCarrito = existente?.cantidad ?? 0;
    if (enCarrito + cantidad > producto.stockActual) {
      this.alerta.aviso(`Stock insuficiente: ${producto.nombre} solo tiene ${producto.stockActual} unidad(es).`);
      return;
    }

    this.alerta.limpiar();
    if (existente) {
      this.carrito.update(lista => lista.map(i => (i.productoId === productoId ? { ...i, cantidad: i.cantidad + cantidad } : i)));
    } else {
      this.carrito.update(lista => [
        ...lista,
        { productoId: producto.id, nombre: producto.nombre, codigo: producto.codigo, precio: producto.precio, cantidad },
      ]);
    }
    this.cantidadControl.setValue(1);
    this.productoControl.setValue(null);
  }

  alAccionCarrito(evento: AccionTabla<ItemCarrito>): void {
    if (evento.accion === 'quitar') this.quitarItem(evento.fila.productoId);
  }

  quitarItem(productoId: number): void {
    this.carrito.update(lista => lista.filter(i => i.productoId !== productoId));
  }

  alAccionVentas(evento: AccionTabla<Venta>): void {
    if (evento.accion === 'ver') this.ventaActualId.set(evento.fila.id);
  }

  async crearVenta(): Promise<void> {
    const clienteId = this.clienteControl.value;
    const cliente = clienteId === null ? undefined : this.clientesSvc.obtenerPorId(clienteId);
    if (!cliente) {
      this.alerta.aviso('Selecciona un cliente antes de crear la venta.');
      return;
    }
    if (this.carrito().length === 0 || this.procesando()) return;

    this.procesando.set(true);
    try {
      const venta = await this.ventasSvc.crear(cliente.id, this.carrito());
      this.alerta.exito(`Venta para ${cliente.nombre} creada como pendiente. Complétala para descontar el stock y generar la factura.`);
      this.carrito.set([]);
      this.clienteControl.setValue(null);
      this.ventaActualId.set(venta.id);
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo crear la venta'));
    } finally {
      this.procesando.set(false);
    }
  }

  async confirmarAccion(): Promise<void> {
    const venta = this.ventaActual();
    const accion = this.accionPendiente();
    if (!venta || !accion || this.procesando()) return;

    this.accionPendiente.set(null);
    this.procesando.set(true);
    try {
      if (accion === 'completar') {
        await this.ventasSvc.completar(venta.id);
        this.alerta.exito(`Venta de ${venta.nombreCliente} completada. Stock actualizado y factura generada.`);
      } else {
        await this.ventasSvc.anular(venta.id);
        this.alerta.exito(`Venta de ${venta.nombreCliente} anulada.`);
      }
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo actualizar la venta'));
    } finally {
      this.procesando.set(false);
    }
  }

  async verFactura(venta: Venta): Promise<void> {
    try {
      this.facturaActual.set(await this.ventasSvc.factura(venta.id));
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo cargar la factura'));
    }
  }
}