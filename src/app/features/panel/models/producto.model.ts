export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: number;
  nombreCategoria: string;
  proveedorId: number | null;
  nombreProveedor: string | null;
  precio: number;
  stockActual: number;
  stockMinimo: number;
  stockBajo: boolean;
  mensajeAlerta: string | null;
  estado: boolean;
  creado: string;
  actualizado: string;
}

export interface DatosProducto {
  nombre: string;
  descripcion: string | null;
  codigo: string;
  categoriaId: number;
  proveedorId: number | null;
  precio: number;
  stockInicial: number;
  stockMinimo: number;
}

export type EstadoStock = 'DISPONIBLE' | 'STOCK_BAJO' | 'AGOTADO';

export function esStockBajo(p: Pick<Producto, 'stockActual' | 'stockMinimo'>): boolean {
  return p.stockActual <= p.stockMinimo;
}

export function estadoStock(p: Pick<Producto, 'stockActual' | 'stockMinimo'>): EstadoStock {
  if (p.stockActual === 0) return 'AGOTADO';
  if (esStockBajo(p)) return 'STOCK_BAJO';
  return 'DISPONIBLE';
}

export interface ProductoVista extends Producto {
  situacion: EstadoStock;
}