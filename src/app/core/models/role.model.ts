export type RolUsuario = 'SUPER_USUARIO' | 'ADMINISTRADOR' | 'EMPLEADO';

export type Role = RolUsuario | null;

export interface SesionUsuario {
  correo: string;
  nombre: string;
  rol: RolUsuario;
  token: string;
  expiraEn: number;
}
