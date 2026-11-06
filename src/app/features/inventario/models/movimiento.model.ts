export type TipoMovimiento = 'ENTRADA' | 'SALIDA';

export interface Movimiento {
  id: number;
  productoId: number;
  nombreProducto: string;
  tipo: TipoMovimiento;
  cantidad: number;
  stockResultante: number;
  motivo: string | null;
  correoUsuario: string;
  estado: boolean;
  creado: string;
  actualizado: string;
}