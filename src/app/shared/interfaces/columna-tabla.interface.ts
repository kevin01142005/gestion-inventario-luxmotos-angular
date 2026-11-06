export interface ColumnaTabla<T> {
  titulo: string;
  render: (fila: T, indice: number) => string;
  texto?: (fila: T) => string;
  orden?: (fila: T) => string | number;
  clase?: string;
  ordenable?: boolean;
  buscable?: boolean;
  numerica?: boolean;
  exportable?: boolean;
}

export interface AccionTabla<T> {
  accion: string;
  fila: T;
}

export interface OrdenTabla {
  columna: number;
  direccion: 'asc' | 'desc';
}
