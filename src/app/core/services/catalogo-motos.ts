import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { MarcaMoto, ModeloMoto, RespuestaCatalogo, VersionMoto } from '../models/catalogo-motos.model';
import { API_CONFIG } from '../utils/api.config';

@Injectable({ providedIn: 'root' })
export class CatalogoMotosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly url = `${this.config.urlCatalogo}/api`;

  async marcas(): Promise<MarcaMoto[]> {
    return this.consultar<MarcaMoto>(`${this.url}/marcas/getMarcas`);
  }

  async modelosDeMarca(marcaId: number): Promise<ModeloMoto[]> {
    return this.consultar<ModeloMoto>(`${this.url}/modelos/getModelosByMarca/${marcaId}`);
  }

  async versionesDeModelo(modeloId: number): Promise<VersionMoto[]> {
    return this.consultar<VersionMoto>(`${this.url}/versiones/getVersionesByModelo/${modeloId}`);
  }

  private async consultar<T>(url: string): Promise<T[]> {
    const respuesta = await firstValueFrom(
      this.http.get<RespuestaCatalogo<T>>(url).pipe(timeout(this.config.tiempoMaximoMs)),
    );
    return respuesta.data ?? [];
  }
}