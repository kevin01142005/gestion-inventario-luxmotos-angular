export type TipoAlerta = 'success' | 'danger' | 'warning' | 'info';

export interface MensajeAlerta {
  tipo: TipoAlerta;
  mensaje: string;
}
