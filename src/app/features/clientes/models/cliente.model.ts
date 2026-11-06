export interface Cliente {
  id: number;
  documento: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  estado: boolean;
  creado: string;
  actualizado: string;
}

export interface DatosCliente {
  nombre: string;
  documento: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
}

export type EstadoCompra = 'PENDIENTE' | 'COMPLETADA' | 'ANULADA';

export interface CompraCliente {
  id: number;
  total: number;
  estadoVenta: EstadoCompra;
  creado: string;
}