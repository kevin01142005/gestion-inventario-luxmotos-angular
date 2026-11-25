import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { EstadoEnvio, Notificacion, ResumenNotificaciones } from '../models/notificacion.model';

const RESUMEN_VACIO: ResumenNotificaciones = { total: 0, pendientes: 0, enviadas: 0, fallidas: 0 };

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly url = `${this.config.urlBase}/notificaciones`;
  private readonly _lista = signal<Notificacion[]>([]);
  private readonly _resumen = signal<ResumenNotificaciones>(RESUMEN_VACIO);

  readonly lista = this._lista.asReadonly();
  readonly resumen = this._resumen.asReadonly();
  readonly cargando = signal(false);

  async cargar(estado: EstadoEnvio | ''): Promise<void> {
    this.cargando.set(true);
    try {
      let params = new HttpParams().set('limite', 500);
      if (estado) params = params.set('estado', estado);

      const [lista, resumen] = await Promise.all([
        firstValueFrom(this.http.get<Notificacion[]>(this.url, { params }).pipe(timeout(this.config.tiempoMaximoMs))),
        firstValueFrom(this.http.get<ResumenNotificaciones>(`${this.url}/resumen`).pipe(timeout(this.config.tiempoMaximoMs))),
      ]);
      this._lista.set(lista);
      this._resumen.set(resumen);
    } finally {
      this.cargando.set(false);
    }
  }
}