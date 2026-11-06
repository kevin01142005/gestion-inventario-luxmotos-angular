import { Component, effect, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MensajeAlerta } from '../../../../core/models/alerta.model';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { Modal } from '../../../../shared/components/modal/modal';
import { Categoria } from '../../../categorias/models/categoria.model';
import { Proveedor } from '../../../proveedores/models/proveedor.model';
import { DatosProducto, Producto } from '../../models/producto.model';

@Component({
  selector: 'app-producto-form-modal',
  imports: [ReactiveFormsModule, Modal, Alerta],
  templateUrl: './producto-form-modal.html',
  styleUrl: './producto-form-modal.css',
})
export class ProductoFormModal {
  readonly abierto = input(false);
  readonly producto = input<Producto | null>(null);
  readonly categorias = input<Categoria[]>([]);
  readonly proveedores = input<Proveedor[]>([]);
  readonly error = input<MensajeAlerta | null>(null);
  readonly guardando = input(false);

  readonly guardar = output<DatosProducto>();
  readonly cerrar = output<void>();
  readonly cerrarError = output<void>();

  readonly intento = signal(false);

  readonly form = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    codigo: new FormControl('', [Validators.required]),
    descripcion: new FormControl(''),
    categoriaId: new FormControl<number | null>(null, [Validators.required]),
    proveedorId: new FormControl<number | null>(null),
    precio: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    stock: new FormControl<number | null>(0),
    stockMinimo: new FormControl<number | null>(0, [Validators.required, Validators.min(0)]),
  });

  constructor() {
    effect(() => {
      if (this.abierto()) untracked(() => this.preparar());
    });
  }

  get esEdicion(): boolean {
    return this.producto() !== null;
  }

  private preparar(): void {
    this.intento.set(false);
    const p = this.producto();
    if (p) {
      this.form.reset({
        nombre: p.nombre, codigo: p.codigo, descripcion: p.descripcion ?? '', categoriaId: p.categoriaId,
        proveedorId: p.proveedorId, precio: p.precio, stock: p.stockActual, stockMinimo: p.stockMinimo,
      });
      this.form.controls.stock.disable();
    } else {
      this.form.reset({
        nombre: '', codigo: '', descripcion: '', categoriaId: null, proveedorId: null,
        precio: null, stock: 0, stockMinimo: 0,
      });
      this.form.controls.stock.enable();
    }
  }

  enviar(): void {
    this.intento.set(true);
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.guardar.emit({
      nombre: v.nombre!.trim(),
      codigo: v.codigo!.trim(),
      descripcion: v.descripcion?.trim() || null,
      categoriaId: v.categoriaId!,
      proveedorId: v.proveedorId,
      precio: Number(v.precio),
      stockInicial: Number(v.stock) || 0,
      stockMinimo: Number(v.stockMinimo) || 0,
    });
  }
}