import { InjectionToken } from '@angular/core';

export interface ConfigApi {
  urlBase: string;
  urlCatalogo: string;
  tiempoMaximoMs: number;
}

export const CONFIG_API_POR_DEFECTO: ConfigApi = {
  urlBase: 'https://gestion-inventario-api-yl9w.onrender.com',
  urlCatalogo: 'https://catalogo-motos-api.onrender.com',
  tiempoMaximoMs: 90000,
};

export const API_CONFIG = new InjectionToken<ConfigApi>('API_CONFIG', {
  providedIn: 'root',
  factory: () => CONFIG_API_POR_DEFECTO,
});