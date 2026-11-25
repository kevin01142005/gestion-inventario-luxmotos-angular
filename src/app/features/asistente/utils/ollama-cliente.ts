import type { MensajeOllama, ResultadoPrueba, TurnoConversacion } from '../models/asistente.model';
import { ErrorAsistente } from '../models/asistente.model';

/** Un modelo pequeño en un PC sin tarjeta gráfica puede tardar bastante, sobre todo la primera vez (carga el modelo). */
export const TIEMPO_MAXIMO_OLLAMA_MS = 180_000;

/** Ollama usa por defecto una ventana de contexto pequeña y recorta el inicio (las instrucciones) sin avisar. */
const VENTANA_CONTEXTO = 8192;
const TIEMPO_PRUEBA_MS = 8_000;

export type Peticion = (url: string, opciones?: RequestInit) => Promise<Response>;

/** Instrucciones mínimas si el backend no las pudo entregar (por ejemplo, si estaba dormido). */
export const INSTRUCCION_LOCAL =
  'Eres el asistente de LuxMotos, una tienda de accesorios para moto. Responde siempre en español, de forma breve y clara. ' +
  'Responde usando SOLO los datos que recibes en "DATOS ACTUALES DEL SISTEMA"; nunca inventes cifras, nombres ni productos. ' +
  'Si lo que se pregunta no está en los datos, dilo. Los nombres de clientes aparecen como códigos (por ejemplo CLI-12); úsalos tal cual. ' +
  'Muestra el dinero en pesos colombianos (COP). El IVA es del 19 %. Escribe texto sencillo, sin tablas.';

/** Misma forma de armar el mensaje que usa el backend con Groq. */
export function armarMensajes(instruccion: string, contexto: string, pregunta: string, historial: TurnoConversacion[]): MensajeOllama[] {
  const datos = contexto.trim();
  const usuario = datos
    ? `DATOS ACTUALES DEL SISTEMA:\n${datos}\n\nPREGUNTA: ${pregunta}`
    : `(No se enviaron datos del sistema para esta pregunta.)\n\nPREGUNTA: ${pregunta}`;
  return [{ role: 'system', content: instruccion }, ...historial.map(t => ({ role: t.role, content: t.content })), { role: 'user', content: usuario }];
}

/** Los modelos que "piensan" (qwen3, deepseek-r1) tardan mucho si no se les apaga el razonamiento. */
function piensaPorDefecto(modelo: string): boolean {
  return /qwen3|deepseek-r1/i.test(modelo);
}

function quitarPensamiento(texto: string): string {
  return texto.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*<\/think>/i, '').trim();
}

async function pedir(peticion: Peticion, url: string, opciones: RequestInit, limiteMs: number): Promise<Response> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), limiteMs);
  try {
    return await peticion(url, { ...opciones, signal: control.signal });
  } finally {
    clearTimeout(reloj);
  }
}

function esAbortado(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function mensajeSinConexion(url: string): string {
  return (
    `No se pudo conectar con Ollama en ${url}. Revisa que Ollama esté abierto en ese equipo (comando "ollama serve") ` +
    'y que la dirección sea correcta. Si esta página no corre en el mismo PC, Ollama debe permitir este sitio con la variable OLLAMA_ORIGINS.'
  );
}

async function textoDeError(respuesta: Response): Promise<string> {
  try {
    const datos = (await respuesta.json()) as { error?: unknown };
    return typeof datos.error === 'string' ? datos.error : '';
  } catch {
    return '';
  }
}

/** Una pregunta a Ollama (API nativa /api/chat, sin streaming). */
export async function chatOllama(
  peticion: Peticion,
  url: string,
  modelo: string,
  mensajes: MensajeOllama[],
  limiteMs: number = TIEMPO_MAXIMO_OLLAMA_MS,
): Promise<string> {
  const cuerpo: Record<string, unknown> = {
    model: modelo,
    messages: mensajes,
    stream: false,
    options: { temperature: 0.1, num_ctx: VENTANA_CONTEXTO },
  };
  if (piensaPorDefecto(modelo)) cuerpo['think'] = false;

  let respuesta: Response;
  try {
    respuesta = await pedir(
      peticion,
      `${url}/api/chat`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) },
      limiteMs,
    );
  } catch (error) {
    if (esAbortado(error)) {
      throw new ErrorAsistente('Ollama tardó demasiado en responder. Un modelo local puede demorar, sobre todo la primera vez; inténtalo de nuevo o usa un modelo más pequeño.');
    }
    throw new ErrorAsistente(mensajeSinConexion(url));
  }

  if (!respuesta.ok) {
    const detalle = await textoDeError(respuesta);
    if (respuesta.status === 404 || /not found/i.test(detalle)) {
      throw new ErrorAsistente(`El modelo "${modelo}" no está instalado en Ollama. Instálalo con: ollama pull ${modelo}`);
    }
    throw new ErrorAsistente(`Ollama no pudo responder (error ${respuesta.status}${detalle ? `: ${detalle}` : ''}).`);
  }

  let datos: { message?: { content?: unknown } };
  try {
    datos = (await respuesta.json()) as { message?: { content?: unknown } };
  } catch {
    throw new ErrorAsistente('Ollama devolvió una respuesta no válida.');
  }
  const contenido = typeof datos.message?.content === 'string' ? quitarPensamiento(datos.message.content) : '';
  if (!contenido) throw new ErrorAsistente('Ollama no devolvió una respuesta.');
  return contenido;
}

/** Comprueba que Ollama responde y que el modelo está instalado (no gasta tiempo de IA: solo lista los modelos). */
export async function probarOllama(peticion: Peticion, url: string, modelo: string): Promise<ResultadoPrueba> {
  let respuesta: Response;
  try {
    respuesta = await pedir(peticion, `${url}/api/tags`, { method: 'GET' }, TIEMPO_PRUEBA_MS);
  } catch (error) {
    if (esAbortado(error)) return { ok: false, mensaje: `Ollama en ${url} no respondió a tiempo.` };
    return { ok: false, mensaje: mensajeSinConexion(url) };
  }
  if (!respuesta.ok) return { ok: false, mensaje: `Ollama respondió con error ${respuesta.status}. Revisa la dirección.` };

  let nombres: string[] = [];
  try {
    const datos = (await respuesta.json()) as { models?: { name?: string; model?: string }[] };
    nombres = (datos.models ?? []).map(m => m.name ?? m.model ?? '').filter(Boolean);
  } catch {
    return { ok: false, mensaje: 'La dirección responde, pero no parece ser Ollama.' };
  }

  const buscado = modelo.includes(':') ? modelo : `${modelo}:latest`;
  if (nombres.includes(buscado) || nombres.includes(modelo)) {
    return { ok: true, mensaje: `Ollama responde y el modelo "${modelo}" está instalado.` };
  }
  const instalados = nombres.length ? `Modelos instalados: ${nombres.join(', ')}.` : 'No hay modelos instalados.';
  return { ok: false, mensaje: `Ollama responde, pero el modelo "${modelo}" no está instalado. ${instalados} Instálalo con: ollama pull ${modelo}` };
}