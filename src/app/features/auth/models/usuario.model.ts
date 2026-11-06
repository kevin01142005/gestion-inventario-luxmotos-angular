import { RolUsuario } from '../../../core/models/role.model';

export interface Usuario {
  id: number;
  correo: string;
  nombreCompleto: string;
  rolId: number;
  rol: RolUsuario;
  estado: boolean;
  creado: string;
  actualizado: string;
}

export interface DatosRegistro {
  nombreCompleto: string;
  correo: string;
  rol: RolUsuario;
  contrasena: string;
}