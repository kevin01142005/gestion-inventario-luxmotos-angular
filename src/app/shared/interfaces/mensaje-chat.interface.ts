export type RolMensaje = 'usuario' | 'asistente' | 'error';

export interface MensajeChat {
  id: number;
  rol: RolMensaje;
  texto: string;
  fuentes: string[];
  hora: string;
}