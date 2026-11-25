export interface RespuestaAsistente {
  respuesta: string;
  fuentes: string[];
}

export interface TurnoConversacion {
  role: 'user' | 'assistant';
  content: string;
}

export interface CuerpoChat {
  pregunta: string;
  contexto: string;
  historial: TurnoConversacion[];
}

export interface RespuestaChat {
  respuesta: string;
}

/** Lo que responde GET /asistente/estado. */
export interface EstadoAsistente {
  configurado: boolean;
  modelo: string;
  instruccion: string;
}

/** Motor que genera las respuestas: Groq (nube, la clave vive en el backend) u Ollama (modelo local en el PC). */
export type MotorIa = 'groq' | 'ollama';

export interface ConfigAsistente {
  motor: MotorIa;
  /** Si está apagado no se usa ninguna IA: responde el asistente básico por reglas. */
  usarIa: boolean;
  ollamaUrl: string;
  ollamaModelo: string;
}

export interface MensajeOllama {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ResultadoPrueba {
  ok: boolean;
  mensaje: string;
}

export class ErrorAsistente extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorAsistente';
  }
}