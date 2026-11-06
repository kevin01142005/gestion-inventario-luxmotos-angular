export interface TokenRespuesta {
  tokenAcceso: string;
  tipoToken: string;
  expiraEnSegundos: number;
}

export interface ModuloAsignado {
  moduloId: number;
  nombre: string;
  descripcion: string | null;
  ruta: string;
  icono: string | null;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}
