import { InjectionToken } from '@angular/core';

export interface ConfigAsistente {
  urlBase: string;
  modelo: string;
  conocimientoId: string;
  claveAlmacenada: string;
  tiempoMaximoMs: number;
}

export const CONFIG_ASISTENTE_POR_DEFECTO: ConfigAsistente = {
  urlBase: 'http://localhost:8080',
  modelo: 'qwen2.5:3b-instruct',
  conocimientoId: 'fce0df70-438e-45d2-a86e-f2d20b7454c6',
  claveAlmacenada: 'luxmotos_asistente_clave',
  tiempoMaximoMs: 300000,
};

export const ASISTENTE_CONFIG = new InjectionToken<ConfigAsistente>('ASISTENTE_CONFIG', {
  providedIn: 'root',
  factory: () => CONFIG_ASISTENTE_POR_DEFECTO,
});