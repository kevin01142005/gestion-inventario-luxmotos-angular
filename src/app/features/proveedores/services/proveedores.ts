import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { DatosProveedor, Proveedor } from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly url = `${this.config.urlBase}/proveedores`;
  private readonly _proveedores = signal<Proveedor[]>([]);

  readonly proveedores = this._proveedores.asReadonly();
  readonly cargando = signal(false);

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const lista = await firstValueFrom(
        this.http.get<Proveedor[]>(this.url).pipe(timeout(this.config.tiempoMaximoMs)),
      );
      this._proveedores.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(datos: DatosProveedor): Promise<void> {
    await firstValueFrom(this.http.post<Proveedor>(this.url, datos).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  async actualizar(id: number, datos: DatosProveedor): Promise<void> {
    await firstValueFrom(this.http.put<Proveedor>(`${this.url}/${id}`, datos).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  async eliminar(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.url}/${id}`).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }
}