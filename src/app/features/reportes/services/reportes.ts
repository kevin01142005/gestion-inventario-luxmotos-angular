import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { fechaISO, formatearFecha } from '../../../core/utils/format';
import { EstadisticasGenerales, ItemInventario, ProductoMasVendido, ResumenVentas } from '../models/reporte.model';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const ESTADISTICAS_VACIAS: EstadisticasGenerales = {
  totalVentasDelMes: 0,
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
}