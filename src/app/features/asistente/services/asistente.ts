import { Injectable, inject, signal } from '@angular/core';
import { ASISTENTE_CONFIG } from '../../../core/utils/asistente.config';
import { MensajeChat } from '../../../shared/interfaces/mensaje-chat.interface';
import { ErrorAsistente, RespuestaAsistente, TurnoConversacion } from '../models/asistente.model';

const TURNOS_DE_CONTEXTO = 6;

const INSTRUCCION =
  'Eres el asistente de LuxMotos. Responde en español, de forma breve y clara. ' +
  'Responde la pregunta usando la información de los documentos que recibes como contexto.';

interface CuerpoRespuesta {
  choices?: { message?: { content?: unknown } }[];
  sources?: unknown;
}

function nombreDeFuente(fuente: unknown): string {
  if (typeof fuente !== 'object' || fuente === null) return '';
  const obj = fuente as { source?: { name?: unknown }; metadata?: { name?: unknown; source?: unknown }[] };
  const candidatos = [obj.source?.name, obj.metadata?.[0]?.name, obj.metadata?.[0]?.source];
  const nombre = candidatos.find(c => typeof c === 'string' && c.trim() !== '');
  return typeof nombre === 'string' ? nombre.trim() : '';
}

export function extraerFuentes(fuentes: unknown): string[] {
  if (!Array.isArray(fuentes)) return [];
  return [...new Set(fuentes.map(nombreDeFuente).filter(n => n !== ''))];
}

function mensajeDeEstado(estado: number): string {
  if (estado === 401 || estado === 403) return 'La clave de Open WebUI no es válida. Cámbiala con el botón "Cambiar clave".';
  if (estado === 404) return 'Open WebUI no encontró el modelo o la base de conocimiento.';
  if (estado === 429) return 'Se alcanzó el límite de uso del modelo. Espera unos segundos e inténtalo de nuevo.';
  return `Open WebUI respondió con el error ${estado}.`;
}

function leerClave(llave: string): string {
  try {
    return localStorage.getItem(llave) ?? '';
  } catch {
    return '';
  }
}

@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private readonly config = inject(ASISTENTE_CONFIG);
  private siguienteId = 1;

  private readonly _mensajes = signal<MensajeChat[]>([]);
  private readonly _pensando = signal(false);
  private readonly _clave = signal(leerClave(this.config.claveAlmacenada));

  readonly mensajes = this._mensajes.asReadonly();
  readonly pensando = this._pensando.asReadonly();
  readonly conectado = () => this._clave() !== '';

  guardarClave(clave: string): void {
    const limpia = clave.trim();
    if (!limpia) return;
    try {
      localStorage.setItem(this.config.claveAlmacenada, limpia);
    } catch {
      return;
    } finally {
      this._clave.set(limpia);
    }
  }

  olvidarClave(): void {
    try {
      localStorage.removeItem(this.config.claveAlmacenada);
    } finally {
      this._clave.set('');
    }
  }

  async enviar(texto: string): Promise<void> {
    const pregunta = texto.trim();
    if (!pregunta || this._pensando()) return;

    const historial = this.historial();
    this.agregar('usuario', pregunta);
    this._pensando.set(true);
    try {
      const resultado = await this.consultar(pregunta, historial);
      this.agregar('asistente', resultado.respuesta, resultado.fuentes);
    } catch (error) {
      const mensaje = error instanceof ErrorAsistente ? error.message : 'Ocurrió un error inesperado al consultar al asistente.';
      this.agregar('error', mensaje);
    } finally {
      this._pensando.set(false);
    }
  }

  limpiar(): void {
    this._mensajes.set([]);
  }

  async consultar(pregunta: string, historial: TurnoConversacion[] = []): Promise<RespuestaAsistente> {
    const clave = this._clave();
    if (!clave) throw new ErrorAsistente('Falta la clave de Open WebUI. Pégala en el recuadro de conexión.');

    const { urlBase, modelo, conocimientoId, tiempoMaximoMs } = this.config;
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), tiempoMaximoMs);

    let respuesta: Response;
    try {
      respuesta = await fetch(`${urlBase.replace(/\/+$/, '')}/api/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelo,
          messages: [{ role: 'system', content: INSTRUCCION }, ...historial, { role: 'user', content: pregunta }],
          files: [{ type: 'collection', id: conocimientoId }],
          temperature: 0.1,
          stream: false,
        }),
        signal: controlador.signal,
      });
    } catch {
      if (controlador.signal.aborted) {
        throw new ErrorAsistente('El asistente tardó demasiado en responder. Inténtalo de nuevo con una pregunta más corta.');
      }
      throw new ErrorAsistente(`No se pudo conectar con Open WebUI en ${urlBase}. Verifica que Open WebUI y Ollama estén encendidos.`);
    } finally {
      clearTimeout(temporizador);
    }

    if (!respuesta.ok) throw new ErrorAsistente(mensajeDeEstado(respuesta.status));

    const datos = (await respuesta.json()) as CuerpoRespuesta;
    const contenido = datos.choices?.[0]?.message?.content;
    if (typeof contenido !== 'string' || contenido.trim() === '') {
      throw new ErrorAsistente('El asistente no devolvió una respuesta.');
    }
    return { respuesta: contenido.trim(), fuentes: extraerFuentes(datos.sources) };
  }

  private historial(): TurnoConversacion[] {
    return this._mensajes()
      .filter(m => m.rol !== 'error')
      .slice(-TURNOS_DE_CONTEXTO)
      .map(m => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto }));
  }

  private agregar(rol: MensajeChat['rol'], texto: string, fuentes: string[] = []): void {
    const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    this._mensajes.update(lista => [...lista, { id: this.siguienteId++, rol, texto, fuentes, hora }]);
  }
}