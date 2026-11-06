export interface MarcaMoto {
  id: number;
  nombre: string;
  paisOrigen: string;
}

export interface ModeloMoto {
  id: number;
  marcaId: number;
  nombreMarca: string;
  nombre: string;
  tipo: string;
}

export interface VersionMoto {
  id: number;
  modeloId: number;
  nombreModelo: string;
  marcaId: number;
  nombreMarca: string;
  anio: number;
  cilindraje: number;
  descripcion: string;
}

export interface RespuestaCatalogo<T> {
  data: T[];
}