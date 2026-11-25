export type EstadoEnvio = 'PENDIENTE' | 'ENVIADA' | 'FALLIDA';

export type TipoNotificacion =
  | 'REGISTRO_USUARIO'
  | 'VENTA_COMPLETADA'
  | 'STOCK_BAJO'
  | 'ALERTA_AMBIENTE'
  | 'REPORTE_ENVIADO';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  destinatario: string;
  asunto: string;
  referencia: string | null;
  adjunto: string | null;
  estadoEnvio: EstadoEnvio;
  intentos: number;
  error: string | null;
  enviado: string | null;
  creado: string;
}

export interface ResumenNotificaciones {
  total: number;
  pendientes: number;
  enviadas: number;
  fallidas: number;
}