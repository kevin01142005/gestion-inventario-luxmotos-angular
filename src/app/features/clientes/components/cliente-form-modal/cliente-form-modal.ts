import { Component, effect, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MensajeAlerta } from '../../../../core/models/alerta.model';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { Modal } from '../../../../shared/components/modal/modal';
import { Cliente, DatosCliente } from '../../models/cliente.model';

@Component({
  selector: 'app-cliente-form-modal',
  imports: [ReactiveFormsModule, Modal, Alerta],
  templateUrl: './cliente-form-modal.html',
  styleUrl: './cliente-form-modal.css',
})
export class ClienteFormModal {
  readonly abierto = input(false);
  readonly cliente = input<Cliente | null>(null);
  readonly error = input<MensajeAlerta | null>(null);
  readonly guardando = input(false);

  readonly guardar = output<DatosCliente>();
  readonly cerrar = output<void>();
  readonly cerrarError = output<void>();

  readonly intento = signal(false);

  readonly form = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    documento: new FormControl('', [Validators.required]),
    telefono: new FormControl(''),
    correo: new FormControl('', [Validators.email]),
    direccion: new FormControl(''),
  });

  constructor() {
    effect(() => {
      if (this.abierto()) untracked(() => this.preparar());
    });
  }

  get esEdicion(): boolean {
    return this.cliente() !== null;
  }

  private preparar(): void {
    this.intento.set(false);
    const c = this.cliente();
    this.form.reset({
      nombre: c?.nombre ?? '', documento: c?.documento ?? '', telefono: c?.telefono ?? '',
      correo: c?.correo ?? '', direccion: c?.direccion ?? '',
    });
  }

  enviar(): void {
    this.intento.set(true);
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.guardar.emit({
      nombre: v.nombre!.trim(),
      documento: v.documento!.trim(),
      telefono: v.telefono?.trim() || null,
      correo: v.correo?.trim() || null,
      direccion: v.direccion?.trim() || null,
    });
  }
}