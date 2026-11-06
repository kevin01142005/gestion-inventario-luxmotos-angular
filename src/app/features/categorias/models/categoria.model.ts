export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
  creado: string;
  actualizado: string;
}

export interface DatosCategoria {
  nombre: string;
  descripcion: string | null;
}
