import { Injectable, computed, signal } from '@angular/core';
import { ConfigAsistente } from '../models/asistente.model';
import { CLAVE_CONFIG_ASISTENTE, CONFIG_POR_DEFECTO, etiquetaMotor, leerConfig } from '../utils/motor-ia';

/**
 * Ajustes del asistente (motor, uso de IA, dirección y modelo de Ollama). Se guardan en este navegador:
 * Ollama vive en el PC de quien lo usa, así que la configuración no se comparte entre equipos.
 */
@Injectable({ providedIn: 'root' })
export class AsistenteConfigService {
  private readonly _config = signal<ConfigAsistente>(this.leer());

  readonly config = this._config.asReadonly();
  readonly motorActual = computed(() => etiquetaMotor(this._config()));

  guardar(nueva: ConfigAsistente): void {
    this._config.set({ ...nueva });
    try {
      localStorage.setItem(CLAVE_CONFIG_ASISTENTE, JSON.stringify(nueva));
    } catch {
      // Sin almacenamiento (modo privado o bloqueado): el cambio vale mientras la página siga abierta.
    }
  }

  private leer(): ConfigAsistente {
    try {
      return leerConfig(localStorage.getItem(CLAVE_CONFIG_ASISTENTE));
    } catch {
      return { ...CONFIG_POR_DEFECTO };
    }
  }
}