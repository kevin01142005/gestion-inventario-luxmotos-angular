import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { fechaISO, formatearFecha } from '../../../core/utils/format';
import {
  EnvioReporte, EstadisticasGenerales, FiltrosReporte, FormatoReporte, ItemInventario, ProductoMasVendido,
  ResumenVentas, TipoReporte,
} from '../models/reporte.model';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const ESTADISTICAS_VACIAS: EstadisticasGenerales = {
  totalVentasDelMes: 0,
  totalVendido: 0,
  cantidadProductosActivos: 0,
  cantidadProductosAgotados: 0,
  cantidadClientesRegistrados: 0,
};

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly url = `${this.config.urlBase}/reportes`;
  private readonly _estadisticas = signal<EstadisticasGenerales>(ESTADISTICAS_VACIAS);

  readonly estadisticas = this._estadisticas.asReadonly();

  async cargarEstadisticas(): Promise<void> {
    const datos = await firstValueFrom(
      this.http.get<EstadisticasGenerales>(`${this.config.urlBase}/panel/estadisticas`).pipe(timeout(this.config.tiempoMaximoMs)),
    );
    this._estadisticas.set(datos);
  }

  async ventasDiarias(fecha: string): Promise<ResumenVentas> {
    const params = new HttpParams().set('fecha', fecha);
    const resumen = await firstValueFrom(
      this.http.get<ResumenVentas>(`${this.url}/ventas-diarias`, { params }).pipe(timeout(this.config.tiempoMaximoMs)),
    );
    return { ...resumen, etiquetaPeriodo: formatearFecha(`${fecha}T00:00:00`) };
  }

  async ventasMensuales(anio: number, mes: number): Promise<ResumenVentas> {
    const params = new HttpParams().set('anio', anio).set('mes', mes);
    const resumen = await firstValueFrom(
      this.http.get<ResumenVentas>(`${this.url}/ventas-mensuales`, { params }).pipe(timeout(this.config.tiempoMaximoMs)),
    );
    return { ...resumen, etiquetaPeriodo: `${MESES[mes - 1]} de ${anio}` };
  }

  productosMasVendidos(desde: string, hasta: string): Promise<ProductoMasVendido[]> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return firstValueFrom(
      this.http.get<ProductoMasVendido[]>(`${this.url}/productos-mas-vendidos`, { params }).pipe(timeout(this.config.tiempoMaximoMs)),
    );
  }

  inventario(): Promise<ItemInventario[]> {
    return firstValueFrom(
      this.http.get<ItemInventario[]>(`${this.url}/inventario`).pipe(timeout(this.config.tiempoMaximoMs)),
    );
  }

  rangoPorDefecto(): { desde: string; hasta: string } {
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setDate(hoy.getDate() - 30);
    return { desde: fechaISO(haceUnMes), hasta: fechaISO(hoy) };
  }

  /** Descarga el reporte (Excel o PDF) con los filtros indicados. */
  async descargar(tipo: TipoReporte, formato: FormatoReporte, filtros: FiltrosReporte): Promise<void> {
    const params = this.parametros(formato, filtros);
    try {
      const archivo = await firstValueFrom(
        this.http.get(`${this.url}/exportar/${tipo}`, { params, responseType: 'blob' }).pipe(timeout(this.config.tiempoMaximoMs)),
      );
      guardarArchivo(archivo, `reporte_${tipo.replace(/-/g, '_')}_${fechaISO()}.${formato}`);
    } catch (error) {
      throw await this.errorLegible(error);
    }
  }

  /** Envía el reporte, como adjunto, al correo del usuario que inició sesión. */
  enviarPorCorreo(tipo: TipoReporte, formato: FormatoReporte, filtros: FiltrosReporte): Promise<EnvioReporte> {
    const params = this.parametros(formato, filtros);
    return firstValueFrom(
      this.http.post<EnvioReporte>(`${this.url}/enviar/${tipo}`, null, { params }).pipe(timeout(this.config.tiempoMaximoMs)),
    );
  }

  private parametros(formato: FormatoReporte, filtros: FiltrosReporte): HttpParams {
    let params = new HttpParams().set('formato', formato);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.estadoVenta) params = params.set('estado_venta', filtros.estadoVenta);
    if (filtros.soloStockBajo) params = params.set('solo_stock_bajo', true);
    if (filtros.categoriaId != null) params = params.set('categoria_id', filtros.categoriaId);
    return params;
  }

  /** Cuando se pide un archivo, el error llega como Blob: se lee para mostrar el mensaje de la API. */
  private async errorLegible(error: unknown): Promise<unknown> {
    if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
      try {
        const cuerpo = JSON.parse(await error.error.text()) as { message?: unknown };
        if (typeof cuerpo.message === 'string' && cuerpo.message.trim()) return new Error(cuerpo.message);
      } catch {
        // el cuerpo no era JSON (por ejemplo, un 403 vacío): se deja el error original
      }
    }
    return error;
  }
}

function guardarArchivo(archivo: Blob, nombre: string): void {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}