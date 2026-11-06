import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { Categoria, DatosCategoria } from '../models/categoria.model';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly url = `${this.config.urlBase}/categorias`;
  private readonly _categorias = signal<Categoria[]>([]);

  readonly categorias = this._categorias.asReadonly();
  readonly activas = computed(() => this._categorias().filter(c => c.estado));
  readonly cargando = signal(false);

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const lista = await firstValueFrom(
        this.http.get<Categoria[]>(this.url).pipe(timeout(this.config.tiempoMaximoMs)),
      );
      this._categorias.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }

  async crear(datos: DatosCategoria): Promise<void> {
    await firstValueFrom(this.http.post<Categoria>(this.url, datos).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  async actualizar(id: number, datos: DatosCategoria): Promise<void> {
    await firstValueFrom(this.http.put<Categoria>(`${this.url}/${id}`, datos).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }

  async eliminar(id: number): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.url}/${id}`).pipe(timeout(this.config.tiempoMaximoMs)));
    await this.cargar();
  }
}