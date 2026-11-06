export interface RespuestaAsistente {
  respuesta: string;
  fuentes: string[];
}

export interface TurnoConversacion {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ErrorAsistente extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorAsistente';
  }
}