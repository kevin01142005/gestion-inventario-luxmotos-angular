export type EstadoVenta = 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';

export interface DetalleVenta {
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  totalLinea: number;
}

export interface Venta {
  id: number;
  clienteId: number;
  nombreCliente: string;
  vendedorId: number;
  correoVendedor: string;
  subtotal: number;
  iva: number;
  total: number;
  estadoVenta: EstadoVenta;
  detalles: DetalleVenta[];
  estado: boolean;
  creado: string;
  actualizado: string;
}

export interface Factura {
  id: number;
  numeroFactura: string;
  venta: Venta;
  estado: boolean;
  creado: string;
  actualizado: string;
}

export interface ItemCarrito {
  productoId: number;
  nombre: string;
  codigo: string;
  precio: number;
  cantidad: number;
}

export const TASA_IVA = 0.19;