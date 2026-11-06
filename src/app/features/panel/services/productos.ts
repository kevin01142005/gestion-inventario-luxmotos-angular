import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { DatosProducto, Producto } from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly url = `${this.config.urlBase}/productos`;
  private readonly _productos = signal<Producto[]>([]);

  readonly productos = this._productos.asReadonly();
  readonly cargando = signal(false);

  obtenerPorId(id: number): Producto | undefined {
    return this._productos().find(p => p.id === id);
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const lista = await firstValueFrom(
        this.http.get<Producto[]>(this.url).pipe(timeout(this.config.tiempoMaximoMs)),
      );
      this._productos.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(datos: DatosProducto): Promise<void> {
    await firstValueFrom(this.http.post<Producto>(this.url, datos).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  async actualizar(id: number, datos: DatosProducto): Promise<void> {
    await firstValueFrom(this.http.put<Producto>(`${this.url}/${id}`, datos).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  async eliminar(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.url}/${id}`).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  fijarStock(id: number, stockActual: number): void {
    this._productos.update(lista => lista.map(p => (p.id === id ? { ...p, stockActual } : p)));
  }
}