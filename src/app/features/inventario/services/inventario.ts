import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { ProductosService } from '../../panel/services/productos';
import { Movimiento, TipoMovimiento } from '../models/movimiento.model';

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly productos = inject(ProductosService);
  private readonly url = `${this.config.urlBase}/inventario/movimientos`;
  private readonly _movimientos = signal<Movimiento[]>([]);

  readonly movimientos = this._movimientos.asReadonly();
  readonly cargando = signal(false);

  async cargarHistorial(productoId: number): Promise<void> {
    this.cargando.set(true);
    try {
      const lista = await firstValueFrom(
        this.http.get<Movimiento[]>(`${this.url}/producto/${productoId}`).pipe(timeout(this.config.tiempoMaximoMs)),
      );
      this._movimientos.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }

  limpiarHistorial(): void {
    this._movimientos.set([]);
  }

  async registrar(productoId: number, tipo: TipoMovimiento, cantidad: number, motivo: string | null): Promise<void> {
    await firstValueFrom(
      this.http
        .post<Movimiento>(this.url, { productoId, tipo, cantidad, motivo })
        .pipe(timeout(this.config.tiempoMaximoMs)),
    );
    await this.productos.cargar();
  }
}