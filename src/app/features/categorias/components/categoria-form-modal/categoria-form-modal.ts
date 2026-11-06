import { Component, effect, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MensajeAlerta } from '../../../../core/models/alerta.model';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { Modal } from '../../../../shared/components/modal/modal';
import { Categoria, DatosCategoria } from '../../models/categoria.model';

@Component({
  selector: 'app-categoria-form-modal',
  imports: [ReactiveFormsModule, Modal, Alerta],
  templateUrl: './categoria-form-modal.html',
  styleUrl: './categoria-form-modal.css',
})
export class CategoriaFormModal {
  readonly abierto = input(false);
  readonly categoria = input<Categoria | null>(null);
  readonly error = input<MensajeAlerta | null>(null);
  readonly guardando = input(false);

  readonly guardar = output<DatosCategoria>();
  readonly cerrar = output<void>();
  readonly cerrarError = output<void>();

  readonly intento = signal(false);

  readonly form = new FormGroup({
    nombre: new FormControl('', [Validators.required]),
    descripcion: new FormControl(''),
  });

  constructor() {
    effect(() => {
      if (this.abierto()) untracked(() => this.preparar());
    });
  }

  get esEdicion(): boolean {
    return this.categoria() !== null;
  }

  private preparar(): void {
    this.intento.set(false);
    const c = this.categoria();
    this.form.reset({ nombre: c?.nombre ?? '', descripcion: c?.descripcion ?? '' });
  }

  enviar(): void {
    this.intento.set(true);
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.guardar.emit({ nombre: v.nombre!.trim(), descripcion: v.descripcion?.trim() || null });
  }
}