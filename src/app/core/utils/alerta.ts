import { signal } from '@angular/core';
import { MensajeAlerta, TipoAlerta } from '../models/alerta.model';

export class ControladorAlerta {
  private readonly _actual = signal<MensajeAlerta | null>(null);
  readonly actual = this._actual.asReadonly();

  exito(mensaje: string) { this.mostrar('success', mensaje); }
  error(mensaje: string) { this.mostrar('danger', mensaje); }
  aviso(mensaje: string) { this.mostrar('warning', mensaje); }
  info(mensaje: string) { this.mostrar('info', mensaje); }
  limpiar() { this._actual.set(null); }

  private mostrar(tipo: TipoAlerta, mensaje: string) {
    this._actual.set({ tipo, mensaje });
  }
}

export function mensajeDe(error: unknown, porDefecto: string): string {
  return error instanceof Error && error.message ? error.message : porDefecto;
}
