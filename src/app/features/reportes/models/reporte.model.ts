export interface ResumenVentas {
  etiquetaPeriodo: string;
  totalVentas: number;
  cantidadTransacciones: number;
}

export interface ProductoMasVendido {
  productoId: number;
  nombreProducto: string;
  cantidadTotalVendida: number;
}

export interface ItemInventario {
  productoId: number;
  codigo: string;
  nombreProducto: string;
  stockActual: number;
  stockMinimo: number;
  stockBajo: boolean;
}

export interface EstadisticasGenerales {
  totalVentasDelMes: number;
  totalVendido: number;
  cantidadProductosActivos: number;
  cantidadProductosAgotados: number;
  cantidadClientesRegistrados: number;
}

export type TipoReporte = 'ventas' | 'inventario' | 'productos-mas-vendidos';
export type FormatoReporte = 'xlsx' | 'pdf';

export interface FiltrosReporte {
  desde?: string;
  hasta?: string;
  estadoVenta?: string;
  soloStockBajo?: boolean;
  categoriaId?: number | null;
}

export interface EnvioReporte {
  mensaje: string;
  destinatario: string;
  notificacionId: number;
  estadoEnvio: string;
}