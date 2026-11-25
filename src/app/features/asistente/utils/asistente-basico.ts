import { normalizar } from '../../../core/utils/pseudonimizador';
import type { ContextoArmado } from './contexto-asistente';

/**
 * Asistente básico: responde por reglas, sin IA. Se usa cuando el usuario apaga "Generar las respuestas con IA"
 * o cuando el motor de IA falla. Contesta las preguntas sobre cómo funciona el sistema con textos fijos y las
 * preguntas sobre datos mostrando las secciones del resumen que ya se armó con los permisos del usuario.
 */

const MAX_LINEAS_POR_SECCION = 25;

const AYUDA =
  'Soy el asistente básico de LuxMotos (respondo por reglas, sin IA). Puedo ayudarte con:\n' +
  '- Productos: stock bajo o agotado, precios, un producto por su nombre o código.\n' +
  '- Ventas: cuánto se vendió hoy o este mes, ventas pendientes, productos más vendidos.\n' +
  '- Clientes, proveedores, categorías y compatibilidad de accesorios con motos.\n' +
  '- Reglas del sistema: IVA, cuándo se descuenta el stock, roles, reportes, notificaciones y el circuito de sensores.\n' +
  'Por ejemplo: "¿Qué productos tienen el stock bajo?" o "¿Cuánto hemos vendido hoy?". Solo veo lo que tu rol tiene permitido consultar.';

const SIN_DATOS =
  'En modo básico no encontré datos para esa pregunta. Prueba con algo más concreto, por ejemplo: "stock bajo", ' +
  '"ventas de hoy", "productos más vendidos", "clientes" o "proveedores". Si activas la IA puedo responder preguntas más libres.';

interface PreguntaFrecuente {
  patron: RegExp;
  respuesta: string;
}

// Los patrones se prueban sobre la pregunta sin tildes y en minúsculas.
const PREGUNTAS_FRECUENTES: PreguntaFrecuente[] = [
  {
    patron: /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hey)\b|\bayuda\b|que (puedes|sabes|haces)|que preguntas|como funcionas/,
    respuesta: AYUDA,
  },
  {
    patron: /\biva\b|impuesto/,
    respuesta:
      'El IVA es del 19 %. El subtotal es la suma de precio x cantidad de cada producto; el IVA es el subtotal x 0,19 (redondeado a 2 decimales) ' +
      'y el total es subtotal + IVA. Ejemplo: subtotal 100.000, IVA 19.000, total 119.000.',
  },
  {
    patron: /(descuent|se resta|restan|disminuy|se mueve).*(stock|inventario)|(stock|inventario).*(descuent|se resta|disminuy)/,
    respuesta:
      'Una venta nueva queda en estado Pendiente y todavía no mueve el inventario. El stock se descuenta cuando la venta se completa: ' +
      'en ese momento se registra una salida de inventario con el motivo "Venta #número" y se genera la factura.',
  },
  {
    patron: /estados? de (una |la |las )?venta|pendiente.*completa|completar (una |la )?venta|anular (una |la )?venta|como se (completa|anula)/,
    respuesta:
      'Una venta nueva queda Pendiente. Solo una venta Pendiente puede completarse o anularse. Al completarla se descuenta el stock y se genera la ' +
      'factura; anularla no cambia el stock porque todavía no se había descontado.',
  },
  {
    patron: /\broles?\b|permisos|que (puede|pueden) (hacer )?(un |el |los )?(empleado|administrador|super)|diferencia entre (empleado|administrador)/,
    respuesta:
      'Roles del sistema:\n' +
      '- Empleado: opera el día a día; ve y registra productos y puede editarlos (no eliminarlos), consulta categorías y proveedores, gestiona clientes, ' +
      'consulta el inventario, registra ventas y usa el asistente y el chat. No ve reportes, notificaciones, auditoría, usuarios ni seguridad.\n' +
      '- Administrador: además elimina productos, categorías y proveedores y ve el Panel, los reportes, las notificaciones, la auditoría y los usuarios.\n' +
      '- Super usuario: todo lo anterior más el módulo de Seguridad (roles, módulos y permisos).',
  },
  {
    patron: /reporte|exportar|descargar|\bexcel\b|\bpdf\b|\bxlsx\b/,
    respuesta:
      'Los reportes son de ventas, de inventario y de productos más vendidos, con filtros. Se pueden descargar en Excel (XLSX) o PDF, o enviar al correo ' +
      'del usuario registrado. Los usan el Administrador y el Super usuario.',
  },
  {
    patron: /notificacion|alertas? (de|por) (stock|correo)|correos? automatic|envio de correo|cuando se envia.*correo/,
    respuesta:
      'El sistema envía correos automáticos por registro de usuario, venta, stock bajo, alerta de condiciones de la bodega y envío de reportes. ' +
      'La página Notificaciones muestra el estado de cada envío (pendiente, enviada o fallida). La alerta de stock bajo sale cuando, al completar una venta, ' +
      'un producto queda con stock actual menor o igual a su stock mínimo.',
  },
  {
    patron: /circuito|sensor|temperatura|presion|buzzer|esp32|bodega/,
    respuesta:
      'El circuito mide la temperatura y la presión de la bodega cada 30 segundos y las envía al sistema. Si una lectura sale de los límites configurados ' +
      'se genera una alerta, suena el buzzer y se envía un correo a los administradores (con una pausa entre alertas). La gráfica de temperatura se ve en el Panel.',
  },
  {
    patron: /\bchat\b|conversar con (otros|los) usuarios/,
    respuesta: 'El chat permite que los usuarios conectados conversen en tiempo real dentro del sistema.',
  },
];

interface Seccion {
  titulo: string;
  lineas: string[];
}

/** El resumen que se arma para la IA viene en bloques "## TÍTULO" seguidos de sus líneas. */
function seccionesDe(texto: string): Seccion[] {
  return texto
    .split(/^## /m)
    .map(bloque => bloque.trim())
    .filter(Boolean)
    .map(bloque => {
      const [titulo, ...lineas] = bloque.split('\n');
      return { titulo: titulo.trim(), lineas: lineas.map(l => l.trim()).filter(Boolean) };
    });
}

function formatear(seccion: Seccion): string {
  const visibles = seccion.lineas.slice(0, MAX_LINEAS_POR_SECCION);
  const restantes = seccion.lineas.length - visibles.length;
  const cuerpo = visibles.map(l => (l.startsWith('...') || l.startsWith('-') ? l : `- ${l}`));
  if (restantes > 0) cuerpo.push(`... y ${restantes} líneas más (haz una pregunta más concreta).`);
  return `${seccion.titulo}\n${cuerpo.join('\n')}`;
}

/** Respuesta fija a las preguntas sobre cómo funciona el sistema; no necesita datos. Devuelve null si no es una de ellas. */
export function respuestaFrecuente(pregunta: string): string | null {
  const q = normalizar(pregunta);
  return PREGUNTAS_FRECUENTES.find(f => f.patron.test(q))?.respuesta ?? null;
}

export function responderBasico(pregunta: string, contexto: ContextoArmado): string {
  const frecuente = respuestaFrecuente(pregunta);
  if (frecuente) return frecuente;
  const q = normalizar(pregunta);

  const secciones = seccionesDe(contexto.texto);
  const conDatos = secciones.filter(s => !s.titulo.startsWith('RESUMEN GENERAL'));
  const pideResumen = /resumen|general|como (va|vamos|esta)|panorama/.test(q);
  const elegidas = conDatos.length ? conDatos : pideResumen ? secciones : [];
  if (!elegidas.length) return SIN_DATOS;

  return 'Esto es lo que encontré en el sistema (respuesta del asistente básico, sin IA):\n\n' + elegidas.map(formatear).join('\n\n');
}