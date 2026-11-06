import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { RegistroAuditoria } from '../models/auditoria.model';
import { API_CONFIG } from '../utils/api.config';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly url = `${this.config.urlBase}/auditoria`;
  private readonly _registros = signal<RegistroAuditoria[]>([]);

  readonly registros = this._registros.asReadonly();
  readonly cargando = signal(false);

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const lista = await firstValueFrom(
        this.http.get<RegistroAuditoria[]>(this.url).pipe(timeout(this.config.tiempoMaximoMs)),
      );
      this._registros.set(lista);
    } finally {
      this.cargando.set(false);
    }
  }
}