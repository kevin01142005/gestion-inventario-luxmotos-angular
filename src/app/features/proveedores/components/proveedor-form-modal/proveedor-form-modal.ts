import { Component, effect, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MensajeAlerta } from '../../../../core/models/alerta.model';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { Modal } from '../../../../shared/components/modal/modal';
import { DatosProveedor, Proveedor } from '../../models/proveedor.model';

@Component({
  selector: 'app-proveedor-form-modal',
  imports: [ReactiveFormsModule, Modal, Alerta],
  templateUrl: './proveedor-form-modal.html',
  styleUrl: './proveedor-form-modal.css',
})
export class ProveedorFormModal {
  readonly abierto = input(false);
  readonly proveedor = input<Proveedor | null>(null);
  readonly error = input<MensajeAlerta | null>(null);
  readonly guardando = input(false);

  readonly guardar = output<DatosProveedor>();
  readonly cerrar = output<void>();
  readonly cerrarError = output<void>();

  readonly intento = signal(false);

  readonly form = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    nombreContacto: new FormControl(''),
    telefono: new FormControl(''),
    correo: new FormControl('', [Validators.email]),
  });

  constructor() {
    effect(() => {
      if (this.abierto()) untracked(() => this.preparar());
    });
  }

  get esEdicion(): boolean {
    return this.proveedor() !== null;
  }

  private preparar(): void {
    this.intento.set(false);
    const p = this.proveedor();
    this.form.reset({
      nombre: p?.nombre ?? '', nombreContacto: p?.nombreContacto ?? '', telefono: p?.telefono ?? '', correo: p?.correo ?? '',
    });
  }

  enviar(): void {
    this.intento.set(true);
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.guardar.emit({
      nombre: v.nombre!.trim(),
      nombreContacto: v.nombreContacto?.trim() || null,
      telefono: v.telefono?.trim() || null,
      correo: v.correo?.trim() || null,
    });
  }
}