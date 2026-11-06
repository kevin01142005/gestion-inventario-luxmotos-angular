import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { ProductosService } from '../../panel/services/productos';
import { Factura, ItemCarrito, Venta } from '../models/venta.model';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly productos = inject(ProductosService);
  private readonly url = `${this.config.urlBase}/ventas`;
  private readonly _ventas = signal<Venta[]>([]);

  readonly ventas = this._ventas.asReadonly();
  readonly cargando = signal(false);

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const lista = await firstValueFrom(
        this.http.get<Venta[]>(this.url).pipe(timeout(this.config.tiempoMaximoMs)),
      );
      this._ventas.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(clienteId: number, items: ItemCarrito[]): Promise<Venta> {
    const cuerpo = { clienteId, items: items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })) };
    const venta = await firstValueFrom(this.http.post<Venta>(this.url, cuerpo).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
    return venta;
  }

  async completar(id: number): Promise<void> {
    await firstValueFrom(this.http.post<Venta>(`${this.url}/${id}/completar`, {}).pipe(timeout(this.config.tiempoMaximoMs)));
    await Promise.all([this.cargar(), this.productos.cargar()]);
  }

  async anular(id: number): Promise<void> {
    await firstValueFrom(this.http.post<Venta>(`${this.url}/${id}/anular`, {}).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  factura(id: number): Promise<Factura> {
    return firstValueFrom(this.http.get<Factura>(`${this.url}/${id}/factura`).pipe(timeout(this.config.tiempoMaximoMs)));
  }
}