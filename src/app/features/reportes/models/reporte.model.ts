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
  cantidadProductosActivos: number;
  cantidadProductosAgotados: number;
  cantidadClientesRegistrados: number;
}