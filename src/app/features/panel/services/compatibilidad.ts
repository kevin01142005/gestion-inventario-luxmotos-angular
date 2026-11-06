import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { Compatibilidad } from '../models/compatibilidad.model';

@Injectable({ providedIn: 'root' })
export class CompatibilidadService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  listar(productoId: number): Promise<Compatibilidad[]> {
    return firstValueFrom(
      this.http.get<Compatibilidad[]>(this.url(productoId)).pipe(timeout(this.config.tiempoMaximoMs)),
    );
  }

  agregar(productoId: number, versionMotoId: number): Promise<Compatibilidad> {
    return firstValueFrom(
      this.http.post<Compatibilidad>(this.url(productoId), { versionMotoId }).pipe(timeout(this.config.tiempoMaximoMs)),
    );
  }

  quitar(productoId: number, compatibilidadId: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.url(productoId)}/${compatibilidadId}`).pipe(timeout(this.config.tiempoMaximoMs)),
    );
  }

  private url(productoId: number): string {
    return `${this.config.urlBase}/productos/${productoId}/compatibilidad`;
  }
}