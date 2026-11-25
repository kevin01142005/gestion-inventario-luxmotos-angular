import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { RegistroAuditoria } from '../../../core/models/auditoria.model';
import { MarcaMoto, ModeloMoto, VersionMoto } from '../../../core/models/catalogo-motos.model';
import { CatalogoMotosService } from '../../../core/services/catalogo-motos';
import { AuthService } from '../../../core/services/auth';
import { API_CONFIG } from '../../../core/utils/api.config';
import { Categoria } from '../../categorias/models/categoria.model';
import { Cliente } from '../../clientes/models/cliente.model';
import { Movimiento } from '../../inventario/models/movimiento.model';
import { Compatibilidad } from '../../panel/models/compatibilidad.model';
import { Producto } from '../../panel/models/producto.model';
import { Proveedor } from '../../proveedores/models/proveedor.model';
import { EstadisticasGenerales } from '../../reportes/models/reporte.model';
import { Venta } from '../../ventas/models/venta.model';
import { DatosAsistente } from '../utils/contexto-asistente';

/** Los datos se guardan en memoria este tiempo para no repetir todas las consultas en cada pregunta. */
const VIGENCIA_MS = 2 * 60 * 1000;
const MAX_PRODUCTOS_COMPATIBILIDAD = 80;

interface Guardado<T> {
  momento: number;
  correo: string;
  valor: T;
}

/**
 * Pide los datos a la API principal con el token del usuario (solo GET), igual que cualquier otra pantalla.
 * Si el rol no tiene permiso para algo, la API responde 403 y ese dato llega como `null` (el asistente no lo ve).
 */
@Injectable({ providedIn: 'root' })
export class AsistenteDatosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly auth = inject(AuthService);
  private readonly catalogo = inject(CatalogoMotosService);

  private principal: Guardado<DatosAsistente> | null = null;
  private readonly compatibilidad = new Map<number, Guardado<Compatibilidad[]>>();
  private readonly movimientos = new Map<number, Guardado<Movimiento[]>>();
  private readonly cacheCatalogo = new Map<string, Guardado<unknown>>(); // datos públicos: iguales para todos los usuarios

  invalidar(): void {
    this.principal = null;
    this.compatibilidad.clear();
    this.movimientos.clear();
    this.cacheCatalogo.clear();
  }

  async cargar(): Promise<DatosAsistente> {
    const correo = this.auth.usuario()?.correo ?? '';
    if (this.principal && this.principal.correo === correo && this.vigente(this.principal)) return this.principal.valor;

    const [productos, categorias, proveedores, clientes, ventas, estadisticas, auditoria] = await Promise.all([
      this.pedir<Producto[]>('/productos'),
      this.pedir<Categoria[]>('/categorias'),
      this.pedir<Proveedor[]>('/proveedores'),
      this.pedir<Cliente[]>('/clientes'),
      this.pedir<Venta[]>('/ventas'),
      this.pedir<EstadisticasGenerales>('/panel/estadisticas'),
      this.pedir<RegistroAuditoria[]>('/auditoria'),
    ]);
    const valor: DatosAsistente = { productos, categorias, proveedores, clientes, ventas, estadisticas, auditoria };
    this.principal = { momento: Date.now(), correo, valor };
    return valor;
  }

  async compatibilidadDe(productos: Producto[]): Promise<Map<number, Compatibilidad[]>> {
    const lista = productos.slice(0, MAX_PRODUCTOS_COMPATIBILIDAD);
    return this.porProducto(lista, this.compatibilidad, id => `/productos/${id}/compatibilidad`);
  }

  async movimientosDe(productos: Producto[]): Promise<Map<number, Movimiento[]>> {
    return this.porProducto(productos.slice(0, 3), this.movimientos, id => `/inventario/movimientos/producto/${id}`);
  }

  marcas(): Promise<MarcaMoto[] | null> {
    return this.deCatalogo('marcas', () => this.catalogo.marcas());
  }

  modelosDe(marcaId: number): Promise<ModeloMoto[] | null> {
    return this.deCatalogo(`modelos-${marcaId}`, () => this.catalogo.modelosDeMarca(marcaId));
  }

  versionesDe(modeloId: number): Promise<VersionMoto[] | null> {
    return this.deCatalogo(`versiones-${modeloId}`, () => this.catalogo.versionesDeModelo(modeloId));
  }

  private async deCatalogo<T>(clave: string, cargar: () => Promise<T>): Promise<T | null> {
    const guardado = this.cacheCatalogo.get(clave) as Guardado<T> | undefined;
    if (guardado && this.vigente(guardado)) return guardado.valor;
    try {
      const valor = await cargar();
      this.cacheCatalogo.set(clave, { momento: Date.now(), correo: '', valor });
      return valor;
    } catch {
      return null;
    }
  }

  private async porProducto<T>(
    productos: Producto[],
    cache: Map<number, Guardado<T[]>>,
    ruta: (id: number) => string,
  ): Promise<Map<number, T[]>> {
    const correo = this.auth.usuario()?.correo ?? '';
    const resultado = new Map<number, T[]>();
    await Promise.all(
      productos.map(async p => {
        const guardado = cache.get(p.id);
        if (guardado && guardado.correo === correo && this.vigente(guardado)) {
          resultado.set(p.id, guardado.valor);
          return;
        }
        const lista = await this.pedir<T[]>(ruta(p.id));
        if (lista) {
          cache.set(p.id, { momento: Date.now(), correo, valor: lista });
          resultado.set(p.id, lista);
        }
      }),
    );
    return resultado;
  }

  private vigente(g: Guardado<unknown>): boolean {
    return Date.now() - g.momento < VIGENCIA_MS;
  }

  private async pedir<T>(ruta: string): Promise<T | null> {
    try {
      return await firstValueFrom(this.http.get<T>(`${this.config.urlBase}${ruta}`).pipe(timeout(this.config.tiempoMaximoMs)));
    } catch {
      return null;
    }
  }
}