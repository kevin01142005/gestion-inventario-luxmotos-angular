import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { Cliente, CompraCliente, DatosCliente } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly url = `${this.config.urlBase}/clientes`;
  private readonly _clientes = signal<Cliente[]>([]);

  readonly clientes = this._clientes.asReadonly();
  readonly cargando = signal(false);

  obtenerPorId(id: number): Cliente | undefined {
    return this._clientes().find(c => c.id === id);
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const lista = await firstValueFrom(
        this.http.get<Cliente[]>(this.url).pipe(timeout(this.config.tiempoMaximoMs)),
      );
      this._clientes.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(datos: DatosCliente): Promise<void> {
    await firstValueFrom(this.http.post<Cliente>(this.url, datos).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  async actualizar(id: number, datos: DatosCliente): Promise<void> {
    await firstValueFrom(this.http.put<Cliente>(`${this.url}/${id}`, datos).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  async eliminar(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.url}/${id}`).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  compras(id: number): Promise<CompraCliente[]> {
    return firstValueFrom(
      this.http.get<CompraCliente[]>(`${this.url}/${id}/compras`).pipe(timeout(this.config.tiempoMaximoMs)),
    );
  }
}