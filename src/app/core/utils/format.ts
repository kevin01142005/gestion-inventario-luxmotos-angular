export function formatearMoneda(valor: number | null | undefined): string {
  const numero = Number(valor) || 0;
  return numero.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export function formatearFecha(valorIso: string | null | undefined): string {
  if (!valorIso) return '-';
  const fecha = new Date(valorIso);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: '2-digit' });
}

export function formatearFechaHora(valorIso: string | null | undefined): string {
  if (!valorIso) return '-';
  const fecha = new Date(valorIso);
  if (Number.isNaN(fecha.getTime())) return '-';
  return fecha.toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

const dos = (n: number) => String(n).padStart(2, '0');

export function fechaISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

export function ahoraISO(d: Date = new Date()): string {
  return `${fechaISO(d)}T${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

export function haceDias(dias: number, hora = '09:00'): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${fechaISO(d)}T${hora}:00`;
}
