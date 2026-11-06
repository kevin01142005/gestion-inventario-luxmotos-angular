import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { formatearFechaHora } from '../../../../core/utils/format';
import { esc, textoOGuion } from '../../../../core/utils/tabla';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { DataTable } from '../../../../shared/components/data-table/data-table';
import { htmlEstado } from '../../../../shared/components/status-badge/status-badge';
import { ColumnaTabla } from '../../../../shared/interfaces/columna-tabla.interface';
import { CopPipe } from '../../../../shared/pipes/cop.pipe';
import { ProductosService } from '../../../panel/services/productos';
import { Movimiento, TipoMovimiento } from '../../models/movimiento.model';
import { InventarioService } from '../../services/inventario';

@Component({
  selector: 'app-inventario-page',
  imports: [ReactiveFormsModule, Alerta, DataTable, CopPipe],
  templateUrl: './inventario-page.html',
  styleUrl: './inventario-page.css',
})
export class InventarioPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly productosSvc = inject(ProductosService);
  private readonly inventarioSvc = inject(InventarioService);

  readonly alerta = new ControladorAlerta();
  readonly alertaFormulario = new ControladorAlerta();

  readonly productos = this.productosSvc.productos;
  readonly permisos = computed(() => this.auth.permisosDe('/inventario'));
  readonly intento = signal(false);
  readonly guardando = signal(false);

  readonly form = new FormGroup({
    productoId: new FormControl<number | null>(null, [Validators.required]),
    tipo: new FormControl<TipoMovimiento>('ENTRADA', { nonNullable: true }),
    cantidad: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    motivo: new FormControl(''),
  });

  readonly productoHistorial = signal<number | null>(null);
  readonly historial = this.inventarioSvc.movimientos;

  readonly mensajeHistorial = computed(() => {
    if (this.productoHistorial() === null) return 'Selecciona un producto para ver su historial de movimientos.';
    if (this.inventarioSvc.cargando()) return 'Cargando historial...';
    return 'Este producto aún no tiene movimientos registrados.';
  });

  readonly columnas: ColumnaTabla<Movimiento>[] = [
    { titulo: 'Fecha', orden: m => m.creado, render: m => esc(formatearFechaHora(m.creado)) },
    { titulo: 'Tipo', clase: 'text-center', orden: m => m.tipo, render: m => htmlEstado(m.tipo) },
    {
      titulo: 'Cantidad',
      clase: 'text-end',
      numerica: true,
      orden: m => m.cantidad,
      render: m => `<span class="fw-semibold">${m.tipo === 'ENTRADA' ? '+' : '-'}${m.cantidad}</span>`,
    },
    { titulo: 'Stock resultante', clase: 'text-end', numerica: true, orden: m => m.stockResultante, render: m => String(m.stockResultante) },
    { titulo: 'Motivo', render: m => textoOGuion(m.motivo) },
    { titulo: 'Usuario', render: m => esc(m.correoUsuario) },
  ];

  ngOnInit(): void {
    this.inventarioSvc.limpiarHistorial();
    void this.cargarProductos();
  }

  async cargarProductos(): Promise<void> {
    try {
      await this.productosSvc.cargar();
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudieron cargar los productos'));
    }
  }

  productoSeleccionado() {
    const id = this.form.controls.productoId.value;
    return id === null ? undefined : this.productosSvc.obtenerPorId(id);
  }

  async registrar(): Promise<void> {
    this.intento.set(true);
    this.alertaFormulario.limpiar();
    if (this.form.invalid || this.guardando()) return;

    const v = this.form.getRawValue();
    this.guardando.set(true);
    try {
      await this.inventarioSvc.registrar(v.productoId!, v.tipo, Number(v.cantidad), v.motivo?.trim() || null);
      this.alerta.exito('Movimiento registrado correctamente. El stock del producto se actualizó.');
      if (this.productoHistorial() === v.productoId) await this.inventarioSvc.cargarHistorial(v.productoId!);
      this.form.reset({ productoId: null, tipo: 'ENTRADA', cantidad: null, motivo: '' });
      this.intento.set(false);
    } catch (error) {
      this.alertaFormulario.error(mensajeDeApi(error, 'No se pudo registrar el movimiento'));
    } finally {
      this.guardando.set(false);
    }
  }

  async elegirHistorial(valor: string): Promise<void> {
    this.inventarioSvc.limpiarHistorial();
    if (!valor) {
      this.productoHistorial.set(null);
      return;
    }
    const id = Number(valor);
    this.productoHistorial.set(id);
    try {
      await this.inventarioSvc.cargarHistorial(id);
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo cargar el historial de movimientos'));
    }
  }
}