const ENTIDADES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function esc(valor: unknown): string {
  return String(valor ?? '').replace(/[&<>"']/g, c => ENTIDADES[c]);
}

export function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function textoPlano(html: string): string {
  const contenedor = document.createElement('div');
  contenedor.innerHTML = html;
  return (contenedor.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function textoOGuion(valor: string | null | undefined): string {
  return valor ? esc(valor) : '<span class="text-muted">-</span>';
}

export type VarianteBoton = 'dark' | 'danger' | 'success' | 'primary';

export function botonFila(accion: string, icono: string, titulo: string, etiqueta: string, variante: VarianteBoton = 'dark'): string {
  return (
    `<button type="button" class="btn btn-outline-${variante} boton-accion-fila me-1" ` +
    `title="${esc(titulo)}" aria-label="${esc(etiqueta)}" data-accion="${esc(accion)}">` +
    `<i class="bi ${esc(icono)}"></i></button>`
  );
}
