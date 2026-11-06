export type AccionAuditoria = 'CREACION' | 'ACTUALIZACION' | 'ELIMINACION';

export interface RegistroAuditoria {
  id: number;
  usuarioId: number;
  correoUsuario: string;
  accion: AccionAuditoria;
  entidadAfectada: string;
  idEntidadAfectada: number;
  estado: boolean;
  creado: string;
  actualizado: string;
}