export interface PermisosModulo {
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export interface Modulo extends PermisosModulo {
  moduloId: number;
  ruta: string;
  path: string;
  name: string;
  icon: string;
  descripcion: string | null;
}
