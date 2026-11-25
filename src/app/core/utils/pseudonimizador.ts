/**
 * Cambia los datos personales (nombres de clientes, correos de vendedores) por códigos como CLI-12 o VEN-3
 * antes de enviar texto a la IA, y los vuelve a poner en la respuesta. Los códigos salen del id, así que
 * son siempre los mismos para la misma persona.
 */

const CLASES_ACENTO: Record<string, string> = {
  a: '[aáàäâ]', e: '[eéèëê]', i: '[iíìïî]', o: '[oóòöô]', u: '[uúùüû]', n: '[nñ]',
};

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Expresión que encuentra el texto sin importar mayúsculas ni tildes, y solo como palabra completa. */
function patronFlexible(texto: string): RegExp {
  const cuerpo = [...texto.trim()]
    .map(letra => {
      const base = normalizar(letra);
      return CLASES_ACENTO[base] ?? escaparRegex(letra);
    })
    .join('')
    .replace(/\s+/g, '\\s+');
  return new RegExp(`(?<![\\p{L}\\p{N}])${cuerpo}(?![\\p{L}\\p{N}])`, 'giu');
}

const PATRON_CODIGO = /\b(?:CLI|VEN)-\d+\b/g;

export class Pseudonimizador {
  private readonly aReal = new Map<string, string>(); // código -> nombre o correo real
  private readonly ocultables: { patron: RegExp; codigo: string; largo: number }[] = [];
  private readonly claves = new Set<string>();

  /** Registra a una persona: su nombre completo se oculta con el código y el código se restaura al nombre. */
  registrar(real: string, codigo: string): void {
    const limpio = real.trim();
    if (!limpio) return;
    this.aReal.set(codigo, limpio);
    this.agregarOcultable(limpio, codigo);
  }

  /** Solo para ocultar (por ejemplo, el nombre de pila que el usuario escribió en la pregunta). */
  registrarAlias(alias: string, codigo: string): void {
    if (alias.trim().length >= 3) this.agregarOcultable(alias.trim(), codigo);
  }

  ocultar(texto: string): string {
    let resultado = texto;
    // Primero los más largos, para que "Juan Pérez" se cambie completo antes que "Juan".
    for (const o of [...this.ocultables].sort((a, b) => b.largo - a.largo)) {
      o.patron.lastIndex = 0;
      resultado = resultado.replace(o.patron, o.codigo);
    }
    return resultado;
  }

  restaurar(texto: string): string {
    return texto.replace(PATRON_CODIGO, codigo => this.aReal.get(codigo) ?? codigo);
  }

  private agregarOcultable(texto: string, codigo: string): void {
    const clave = `${codigo}|${normalizar(texto)}`;
    if (this.claves.has(clave)) return;
    this.claves.add(clave);
    this.ocultables.push({ patron: patronFlexible(texto), codigo, largo: texto.length });
  }
}

export const codigoCliente = (id: number): string => `CLI-${id}`;
export const codigoVendedor = (id: number): string => `VEN-${id}`;