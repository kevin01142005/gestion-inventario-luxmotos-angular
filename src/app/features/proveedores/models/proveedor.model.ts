export interface Proveedor {
  id: number;
  nombre: string;
  nombreContacto: string | null;
  telefono: string | null;
  correo: string | null;
  estado: boolean;
  creado: string;
  actualizado: string;
}

export interface DatosProveedor {
  nombre: string;
  nombreContacto: string | null;
  telefono: string | null;
  correo: string | null;
}