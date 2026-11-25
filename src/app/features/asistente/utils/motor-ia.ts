import type { ConfigAsistente, MotorIa } from '../models/asistente.model';

export const CLAVE_CONFIG_ASISTENTE = 'luxmotos.asistente.config';

export const CONFIG_POR_DEFECTO: ConfigAsistente = {
  motor: 'groq',
  usarIa: true,
  ollamaUrl: 'http://localhost:11434',
  ollamaModelo: 'qwen2.5:3b-instruct',
};

/**
 * Deja la dirección de Ollama lista para usar: agrega http:// si falta y quita barras y rutas sobrantes.
 * Devuelve null si no es una dirección válida.
 */
export function normalizarUrlOllama(texto: string): string | null {
  const limpio = (texto ?? '').trim();
  if (!limpio) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(limpio) && !/^https?:\/\//i.test(limpio)) return null; // ftp://, file://, etc.
  const conProtocolo = /^https?:\/\//i.test(limpio) ? limpio : `http://${limpio}`;
  try {
    const url = new URL(conProtocolo);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** Lee lo guardado en el navegador; si falta algo o está dañado usa los valores por defecto. */
export function leerConfig(texto: string | null): ConfigAsistente {
  if (!texto) return { ...CONFIG_POR_DEFECTO };
  try {
    const datos = JSON.parse(texto) as Partial<ConfigAsistente> | null;
    if (!datos || typeof datos !== 'object') return { ...CONFIG_POR_DEFECTO };
    const motor: MotorIa = datos.motor === 'ollama' ? 'ollama' : 'groq';
    const url = typeof datos.ollamaUrl === 'string' ? normalizarUrlOllama(datos.ollamaUrl) : null;
    const modelo = typeof datos.ollamaModelo === 'string' ? datos.ollamaModelo.trim() : '';
    return {
      motor,
      usarIa: typeof datos.usarIa === 'boolean' ? datos.usarIa : CONFIG_POR_DEFECTO.usarIa,
      ollamaUrl: url ?? CONFIG_POR_DEFECTO.ollamaUrl,
      ollamaModelo: modelo || CONFIG_POR_DEFECTO.ollamaModelo,
    };
  } catch {
    return { ...CONFIG_POR_DEFECTO };
  }
}

/** Texto para "Motor actual". */
export function etiquetaMotor(config: ConfigAsistente): string {
  if (!config.usarIa) return 'Asistente básico (sin IA, por reglas)';
  return config.motor === 'ollama' ? `IA local (Ollama, modelo ${config.ollamaModelo})` : 'IA en la nube (Groq)';
}

/** Etiqueta corta para la burbuja de la respuesta. */
export function insigniaMotor(config: ConfigAsistente): string {
  if (!config.usarIa) return 'Modo básico';
  return config.motor === 'ollama' ? 'IA: Ollama' : 'IA: Groq';
}