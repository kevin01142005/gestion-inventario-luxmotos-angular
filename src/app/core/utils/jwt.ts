export interface DatosJwt {
  sub: string;
  rol: string;
  exp: number;
  usuarioId: number | null;
}

export function decodificarJwt(token: string): DatosJwt | null {
  try {
    const partes = token.split('.');
    if (partes.length !== 3) return null;
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binario = atob(relleno);
    const bytes = Uint8Array.from(binario, c => c.charCodeAt(0));
    const datos = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    if (typeof datos['sub'] !== 'string' || typeof datos['rol'] !== 'string' || typeof datos['exp'] !== 'number') {
      return null;
    }
    return {
      sub: datos['sub'],
      rol: datos['rol'],
      exp: datos['exp'],
      usuarioId: typeof datos['usuarioId'] === 'number' ? datos['usuarioId'] : null,
    };
  } catch {
    return null;
  }
}

export function tokenVigente(expiraEnMs: number, ahoraMs: number = Date.now(), margenMs: number = 5000): boolean {
  return expiraEnMs - margenMs > ahoraMs;
}
