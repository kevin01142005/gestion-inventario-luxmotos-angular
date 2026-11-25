import type { RegistroAuditoria } from '../../../core/models/auditoria.model';
import type { MarcaMoto, ModeloMoto, VersionMoto } from '../../../core/models/catalogo-motos.model';
import { formatearMoneda } from '../../../core/utils/format';
import { codigoCliente, codigoVendedor, normalizar, Pseudonimizador } from '../../../core/utils/pseudonimizador';
import type { Categoria } from '../../categorias/models/categoria.model';
import type { Cliente } from '../../clientes/models/cliente.model';
import type { Movimiento } from '../../inventario/models/movimiento.model';
import type { Compatibilidad } from '../../panel/models/compatibilidad.model';
import type { Producto } from '../../panel/models/producto.model';
import type { Proveedor } from '../../proveedores/models/proveedor.model';
import type { EstadisticasGenerales } from '../../reportes/models/reporte.model';
import type { Venta } from '../../ventas/models/venta.model';

/** Máximo de caracteres del resumen que se envía a la IA (el backend acepta hasta 12000). */
export const MAX_CARACTERES_CONTEXTO = 9000;

/** Lo que la API devolvió para este usuario. Un `null` significa que su rol no tiene acceso o que falló: se trata como lista vacía. */
export interface DatosAsistente {
  productos: Producto[] | null;
  categorias: Categoria[] | null;
  proveedores: Proveedor[] | null;
  clientes: Cliente[] | null;
  ventas: Venta[] | null;
  estadisticas: EstadisticasGenerales | null;
  auditoria: RegistroAuditoria[] | null;
}

/** Catálogo de motos (viene de otra API): marcas, y solo los modelos/versiones de lo que la pregunta nombró. */
export interface CatalogoExtra {
  marcas: MarcaMoto[];
  modelos: Map<number, ModeloMoto[]>; // marcaId -> modelos
  versiones: Map<number, VersionMoto[]>; // modeloId -> versiones
}

export interface DatosExtra {
  movimientos: Map<number, Movimiento[]>;
  compatibilidad: Map<number, Compatibilidad[]>;
  catalogo: CatalogoExtra;
}

export const CATALOGO_VACIO: CatalogoExtra = { marcas: [], modelos: new Map(), versiones: new Map() };

export interface Temas {
  productos: boolean;
  ventas: boolean;
  clientes: boolean;
  proveedores: boolean;
  categorias: boolean;
  auditoria: boolean;
  movimientos: boolean;
  compatibilidad: boolean;
  catalogo: boolean;
  masVendidos: boolean;
}

export interface ContextoArmado {
  texto: string;
  fuentes: string[];
}

const PALABRAS_VACIAS = new Set([
  'para', 'como', 'cual', 'cuales', 'cuanto', 'cuantos', 'cuanta', 'cuantas', 'tiene', 'tienen', 'tengo', 'hay', 'esta', 'estan',
  'que', 'quien', 'quienes', 'donde', 'cuando', 'sobre', 'entre', 'desde', 'hasta', 'todos', 'todas', 'algun', 'alguna',
  'producto', 'productos', 'stock', 'precio', 'precios', 'venta', 'ventas', 'cliente', 'clientes', 'proveedor', 'proveedores',
  'categoria', 'categorias', 'inventario', 'sistema', 'dime', 'dame', 'muestra', 'lista', 'listar', 'tengo', 'puedo', 'puede',
  'hoy', 'mes', 'semana', 'total', 'ultimas', 'ultimos', 'mas', 'menos', 'moto', 'motos', 'compra', 'compras', 'vende', 'vendido',
  'vendidos', 'hizo', 'hace', 'ayer', 'este', 'esta', 'estos', 'estas', 'cada', 'tipo', 'tipos', 'codigo', 'nombre', 'valor',
]);

const patrones: Record<keyof Temas, RegExp> = {
  productos: /producto|stock|inventario|existencia|precio|cuesta|cuanto vale|agotad|reposic|reponer|minimo|disponible|tienen|accesorio|codigo|caro|barato/,
  ventas: /venta|vendi|factur|ingres|pedido|recaud|pendiente|anulad|completad|hoy|este mes|semana|vendedor|compr/,
  clientes: /cliente|comprador|quien compr|compras de/,
  proveedores: /proveedor|suministr|distribuidor|contacto/,
  categorias: /categoria|linea de|tipos de producto/,
  auditoria: /auditor|bitacora|quien (hizo|creo|modifico|elimino|registro|cambio)|historial de cambios|ultimos cambios|acciones/,
  movimientos: /movimiento|entrada|salida|kardex|ajuste de stock|historial de stock/,
  compatibilidad: /compatib|sirve|sirven|funciona con|accesorios para|repuestos para/,
  catalogo: /catalogo|modelo|marca|version|cilindraje|\bmotos?\b|motocicleta|yamaha|honda|suzuki|bajaj|akt|kawasaki|ktm|tvs|hero|auteco|victory|royal|benelli|ducati|bmw|kymco/,
  masVendidos: /mas vendid|menos vendid|popular|ranking|top \d|rotacion|mas se vende|mas compran/,
};

const PALABRAS_CORTAS = new Set(['de', 'la', 'el', 'en', 'un', 'mi', 'me', 'es', 'se', 'lo', 'al', 'por', 'con', 'del', 'los', 'las', 'una', 'tu', 'su', 'hay']);

/** Palabras de la pregunta que pueden ser el nombre de un modelo (incluye cortas como "fz" o "r15"). */
function palabrasDeModelo(pregunta: string): string[] {
  return tokens(pregunta).filter(t => t.length >= 2 && !/^\d+$/.test(t) && !PALABRAS_VACIAS.has(t) && !PALABRAS_CORTAS.has(t)).map(sinPlural);
}

export function marcasMencionadas(pregunta: string, marcas: MarcaMoto[]): MarcaMoto[] {
  const palabras = new Set(tokens(pregunta));
  return marcas.filter(m => tokens(m.nombre).some(t => palabras.has(t)));
}

export function modelosMencionados(pregunta: string, modelos: ModeloMoto[]): ModeloMoto[] {
  const palabras = palabrasDeModelo(pregunta);
  return coincide(modelos, palabras, m => [m.nombre]);
}

const pesos = (n: number) => formatearMoneda(n);
const recorte = (texto: string | null | undefined, max = 60) => (texto ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const fechaCorta = (iso: string) => {
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? '-' : f.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function sinPlural(palabra: string): string {
  return palabra.length > 4 && palabra.endsWith('s') ? palabra.slice(0, -1) : palabra;
}

function tokens(texto: string): string[] {
  return normalizar(texto).match(/[a-z0-9][a-z0-9-]*/g) ?? [];
}

function tokensDePregunta(pregunta: string): string[] {
  return tokens(pregunta).filter(t => t.length >= 4 && !PALABRAS_VACIAS.has(t)).map(sinPlural);
}

function coincide<T>(items: T[], palabras: string[], textos: (item: T) => string[]): T[] {
  if (!palabras.length) return [];
  return items.filter(item => {
    const propios = new Set(textos(item).flatMap(tokens).map(sinPlural));
    return palabras.some(p => propios.has(p));
  });
}

export function detectarTemas(pregunta: string): Temas {
  const q = normalizar(pregunta);
  const t = Object.fromEntries(
    (Object.keys(patrones) as (keyof Temas)[]).map(k => [k, patrones[k].test(q)]),
  ) as unknown as Temas;
  return t;
}

export function productosMencionados(pregunta: string, productos: Producto[]): Producto[] {
  const q = tokens(pregunta);
  const palabras = tokensDePregunta(pregunta);
  const porCodigo = productos.filter(p => q.includes(normalizar(p.codigo)));
  const porNombre = coincide(productos, palabras, p => [p.nombre]);
  return [...new Set([...porCodigo, ...porNombre])];
}

/** Clientes que el usuario nombró en la pregunta: por nombre completo o por un nombre/apellido poco común. */
export function clientesMencionados(pregunta: string, clientes: Cliente[]): { clientes: Cliente[]; alias: Map<number, string[]> } {
  const q = normalizar(pregunta);
  const palabras = tokens(pregunta).filter(t => t.length >= 4 && !PALABRAS_VACIAS.has(t));
  const alias = new Map<number, string[]>();
  const encontrados = new Set<Cliente>();

  for (const c of clientes) {
    if (q.includes(normalizar(c.nombre).trim())) encontrados.add(c);
  }
  for (const palabra of palabras) {
    const candidatos = clientes.filter(c => tokens(c.nombre).includes(palabra));
    if (candidatos.length > 0 && candidatos.length <= 3) {
      for (const c of candidatos) {
        encontrados.add(c);
        alias.set(c.id, [...(alias.get(c.id) ?? []), palabra]);
      }
    }
  }
  return { clientes: [...encontrados], alias };
}

/** Registra en el pseudonimizador a todas las personas que aparecen en los datos. */
export function registrarPersonas(datos: DatosAsistente, pseudo: Pseudonimizador): void {
  for (const c of datos.clientes ?? []) pseudo.registrar(c.nombre, codigoCliente(c.id));
  for (const v of datos.ventas ?? []) {
    pseudo.registrar(v.nombreCliente, codigoCliente(v.clienteId));
    pseudo.registrar(v.correoVendedor, codigoVendedor(v.vendedorId));
  }
  for (const a of datos.auditoria ?? []) pseudo.registrar(a.correoUsuario, codigoVendedor(a.usuarioId));
}

export function construirContexto(
  pregunta: string,
  datos: DatosAsistente,
  extra: DatosExtra,
  ahora: Date = new Date(),
): ContextoArmado {
  const productos = (datos.productos ?? []).filter(p => p.estado);
  const categorias = (datos.categorias ?? []).filter(c => c.estado);
  const proveedores = (datos.proveedores ?? []).filter(p => p.estado);
  const clientes = (datos.clientes ?? []).filter(c => c.estado);
  const ventas = (datos.ventas ?? []).filter(v => v.estado);
  const auditoria = datos.auditoria ?? [];

  const temas = detectarTemas(pregunta);
  const palabras = tokensDePregunta(pregunta);
  const mencionados = productosMencionados(pregunta, productos);
  const categoriasMencionadas = coincide(categorias, palabras, c => [c.nombre]);
  const proveedoresMencionados = coincide(proveedores, palabras, p => [p.nombre]);
  const { clientes: clientesNombrados } = clientesMencionados(pregunta, clientes);
  const q = normalizar(pregunta);
  const idsVenta = [...q.matchAll(/(?:venta|factura|pedido)\s*#?\s*(\d+)/g)].map(m => Number(m[1]));

  const hayProductoNombrado = mencionados.length > 0 || categoriasMencionadas.length > 0 || proveedoresMencionados.length > 0;
  const verProductos = temas.productos || hayProductoNombrado || temas.categorias || temas.proveedores || temas.compatibilidad;
  const verVentas = temas.ventas || temas.masVendidos || clientesNombrados.length > 0 || idsVenta.length > 0;
  const verClientes = temas.clientes || clientesNombrados.length > 0;

  const secciones: { titulo: string; fuente: string; lineas: string[] }[] = [];
  const agregar = (titulo: string, fuente: string, lineas: string[]) => {
    if (lineas.length) secciones.push({ titulo, fuente, lineas });
  };

  // ---------------------------------------------------------------- resumen general (siempre)
  const resumen: string[] = [`Fecha de hoy: ${ahora.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}.`];
  if (datos.productos) {
    const agotados = productos.filter(p => p.stockActual === 0).length;
    const bajos = productos.filter(p => p.stockActual <= p.stockMinimo).length;
    const valor = productos.reduce((s, p) => s + p.precio * p.stockActual, 0);
    resumen.push(`Productos activos: ${productos.length}; agotados: ${agotados}; con stock bajo o agotados (stock actual menor o igual al mínimo): ${bajos}.`);
    resumen.push(`Valor del inventario (precio x stock): ${pesos(valor)}.`);
  }
  if (datos.categorias) resumen.push(`Categorías activas: ${categorias.length}.`);
  if (datos.proveedores) resumen.push(`Proveedores activos: ${proveedores.length}.`);
  if (datos.clientes) resumen.push(`Clientes registrados: ${clientes.length}.`);
  if (datos.estadisticas) resumen.push(`Ventas completadas del mes (panel): ${pesos(datos.estadisticas.totalVentasDelMes)}.`);
  agregar('RESUMEN GENERAL', 'Resumen', resumen);

  // ---------------------------------------------------------------- productos
  if (verProductos && datos.productos) {
    let lista = productos;
    let titulo = 'PRODUCTOS (código | nombre | categoría | proveedor | precio | stock actual/mínimo)';
    if (mencionados.length) {
      lista = mencionados;
    } else if (categoriasMencionadas.length) {
      const ids = new Set(categoriasMencionadas.map(c => c.id));
      lista = productos.filter(p => ids.has(p.categoriaId));
    } else if (proveedoresMencionados.length) {
      const ids = new Set(proveedoresMencionados.map(p => p.id));
      lista = productos.filter(p => p.proveedorId !== null && ids.has(p.proveedorId));
    } else if (/agotad|bajo|reposic|reponer|minimo|falta|necesit|acab/.test(q)) {
      lista = productos.filter(p => p.stockActual <= p.stockMinimo).sort((a, b) => a.stockActual - b.stockActual);
      titulo = 'PRODUCTOS CON STOCK BAJO O AGOTADOS (código | nombre | categoría | proveedor | precio | stock actual/mínimo)';
    } else if (/caro|costos|mayor precio/.test(q)) {
      lista = [...productos].sort((a, b) => b.precio - a.precio);
    } else if (/barato|economic|menor precio/.test(q)) {
      lista = [...productos].sort((a, b) => a.precio - b.precio);
    }
    const tope = 45;
    const filas = lista.slice(0, tope).map(
      p => `${p.codigo} | ${recorte(p.nombre, 45)} | ${recorte(p.nombreCategoria, 25)} | ${recorte(p.nombreProveedor ?? 'sin proveedor', 25)} | ${pesos(p.precio)} | ${p.stockActual}/${p.stockMinimo}`,
    );
    if (lista.length > tope) filas.push(`... y ${lista.length - tope} productos más (pide una categoría o un producto concreto).`);
    if (!lista.length) filas.push('No hay productos que coincidan.');
    agregar(titulo, 'Productos', filas);
  }

  // ---------------------------------------------------------------- categorías
  if ((temas.categorias || categoriasMencionadas.length) && datos.categorias) {
    agregar(
      'CATEGORÍAS (nombre | cantidad de productos activos)',
      'Categorías',
      categorias.map(c => `${recorte(c.nombre, 40)} | ${productos.filter(p => p.categoriaId === c.id).length}`),
    );
  }

  // ---------------------------------------------------------------- proveedores
  if ((temas.proveedores || proveedoresMencionados.length) && datos.proveedores) {
    const lista = proveedoresMencionados.length ? proveedoresMencionados : proveedores;
    agregar(
      'PROVEEDORES (nombre | teléfono | cantidad de productos)',
      'Proveedores',
      lista.slice(0, 30).map(p => `${recorte(p.nombre, 40)} | ${p.telefono ?? 'sin teléfono'} | ${productos.filter(x => x.proveedorId === p.id).length}`),
    );
  }

  // ---------------------------------------------------------------- compatibilidad
  if (temas.compatibilidad && extra.compatibilidad.size) {
    const filas: string[] = [];
    const palabrasMoto = palabras.filter(p => !mencionados.some(m => tokens(m.nombre).map(sinPlural).includes(p)));
    for (const p of productos) {
      const compat = (extra.compatibilidad.get(p.id) ?? []).filter(c => c.estado);
      if (!compat.length) continue;
      const aptas = palabrasMoto.length
        ? compat.filter(c => palabrasMoto.some(w => normalizar(c.descripcionMoto).includes(w)))
        : compat;
      const mostrar = mencionados.length && !mencionados.includes(p) ? [] : aptas;
      if (mostrar.length) filas.push(`${recorte(p.nombre, 40)} (${p.codigo}) sirve para: ${mostrar.slice(0, 6).map(c => recorte(c.descripcionMoto, 40)).join('; ')}`);
    }
    if (!filas.length) filas.push('No se encontraron productos compatibles con lo que se preguntó.');
    agregar('COMPATIBILIDAD CON MOTOS', 'Compatibilidad', filas.slice(0, 30));
  }

  // ---------------------------------------------------------------- catálogo de motos
  if (temas.catalogo && extra.catalogo.marcas.length) {
    const { marcas, modelos, versiones } = extra.catalogo;
    const filas: string[] = [];
    if (!modelos.size) {
      filas.push(`Marcas del catálogo: ${marcas.map(m => `${recorte(m.nombre, 30)} (${recorte(m.paisOrigen, 20)})`).join('; ')}.`);
    }
    for (const [marcaId, lista] of modelos) {
      const marca = marcas.find(m => m.id === marcaId)?.nombre ?? `marca ${marcaId}`;
      filas.push(`Modelos de ${recorte(marca, 30)} (modelo | tipo):`);
      for (const m of lista.slice(0, 40)) filas.push(`${recorte(m.nombre, 40)} | ${recorte(m.tipo, 25)}`);
    }
    for (const lista of versiones.values()) {
      for (const v of lista.slice(0, 15)) {
        filas.push(`${recorte(v.nombreMarca, 20)} ${recorte(v.nombreModelo, 30)} ${v.anio} | ${v.cilindraje} cc | ${recorte(v.descripcion, 60)}`);
      }
    }
    agregar('CATÁLOGO DE MOTOS', 'Catálogo de motos', filas);
  }

  // ---------------------------------------------------------------- movimientos
  if (temas.movimientos && extra.movimientos.size) {
    const filas: string[] = [];
    for (const [id, lista] of extra.movimientos) {
      const nombre = productos.find(p => p.id === id)?.nombre ?? `producto ${id}`;
      for (const m of lista.slice(0, 12)) {
        filas.push(`${fechaCorta(m.creado)} | ${recorte(nombre, 35)} | ${m.tipo} ${m.cantidad} | stock quedó en ${m.stockResultante} | ${recorte(m.motivo ?? 'sin motivo', 40)}`);
      }
    }
    agregar('MOVIMIENTOS DE INVENTARIO (fecha | producto | tipo y cantidad | resultado | motivo)', 'Movimientos', filas);
  }

  // ---------------------------------------------------------------- clientes
  if (verClientes && datos.clientes) {
    const filas: string[] = [`Total de clientes registrados: ${clientes.length}.`];
    if (!clientesNombrados.length && datos.ventas) {
      const gasto = new Map<number, { compras: number; total: number }>();
      for (const v of ventas.filter(x => x.estadoVenta === 'COMPLETADA')) {
        const g = gasto.get(v.clienteId) ?? { compras: 0, total: 0 };
        g.compras += 1;
        g.total += v.total;
        gasto.set(v.clienteId, g);
      }
      const top = [...gasto.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8);
      if (top.length) filas.push('Clientes con más compras completadas (código | compras | total):');
      for (const [id, g] of top) filas.push(`${codigoCliente(id)} | ${g.compras} | ${pesos(g.total)}`);
      const sinCompras = clientes.filter(c => !gasto.has(c.id)).length;
      filas.push(`Clientes sin ninguna compra completada: ${sinCompras}.`);
    }
    for (const c of clientesNombrados) {
      const suyas = ventas.filter(v => v.clienteId === c.id);
      const completadas = suyas.filter(v => v.estadoVenta === 'COMPLETADA');
      filas.push(
        `${codigoCliente(c.id)}: ${suyas.length} ventas registradas (${completadas.length} completadas por ${pesos(completadas.reduce((s, v) => s + v.total, 0))}).`,
      );
    }
    agregar('CLIENTES (los nombres se muestran como códigos)', 'Clientes', filas);
  }

  // ---------------------------------------------------------------- ventas
  if (verVentas && datos.ventas) {
    const completadas = ventas.filter(v => v.estadoVenta === 'COMPLETADA');
    const mismoDia = (iso: string) => new Date(iso).toDateString() === ahora.toDateString();
    const mismoMes = (iso: string) => {
      const f = new Date(iso);
      return f.getFullYear() === ahora.getFullYear() && f.getMonth() === ahora.getMonth();
    };
    const suma = (l: Venta[]) => l.reduce((s, v) => s + v.total, 0);
    const resumenVentas: string[] = [
      `Ventas registradas: ${ventas.length} (pendientes: ${ventas.filter(v => v.estadoVenta === 'PENDIENTE').length}, completadas: ${completadas.length}, anuladas: ${ventas.filter(v => v.estadoVenta === 'ANULADA').length}).`,
      `Completadas hoy: ${completadas.filter(v => mismoDia(v.creado)).length} por ${pesos(suma(completadas.filter(v => mismoDia(v.creado))))}.`,
      `Completadas este mes: ${completadas.filter(v => mismoMes(v.creado)).length} por ${pesos(suma(completadas.filter(v => mismoMes(v.creado))))}.`,
      `Completadas en total: ${pesos(suma(completadas))}.`,
    ];
    agregar('VENTAS - RESUMEN (el total incluye IVA 19 %)', 'Ventas', resumenVentas);

    if (temas.masVendidos || /vendid|top|popular/.test(q)) {
      const cantidades = new Map<string, number>();
      for (const v of completadas) for (const d of v.detalles) cantidades.set(d.nombreProducto, (cantidades.get(d.nombreProducto) ?? 0) + d.cantidad);
      const orden = [...cantidades.entries()].sort((a, b) => b[1] - a[1]);
      agregar(
        'PRODUCTOS MÁS VENDIDOS (ventas completadas; unidades)',
        'Más vendidos',
        orden.slice(0, 10).map(([n, c]) => `${recorte(n, 45)} | ${c}`),
      );
    }

    let detalle: Venta[];
    let tituloDetalle = 'VENTAS RECIENTES (n.º | fecha | cliente | vendedor | estado | total | productos)';
    if (idsVenta.length) {
      detalle = ventas.filter(v => idsVenta.includes(v.id));
    } else if (clientesNombrados.length) {
      const ids = new Set(clientesNombrados.map(c => c.id));
      detalle = ventas.filter(v => ids.has(v.clienteId));
    } else if (/pendiente/.test(q)) {
      detalle = ventas.filter(v => v.estadoVenta === 'PENDIENTE');
      tituloDetalle = 'VENTAS PENDIENTES (n.º | fecha | cliente | vendedor | estado | total | productos)';
    } else if (/anulad/.test(q)) {
      detalle = ventas.filter(v => v.estadoVenta === 'ANULADA');
    } else if (/hoy/.test(q)) {
      detalle = ventas.filter(v => mismoDia(v.creado));
    } else {
      detalle = ventas;
    }
    detalle = [...detalle].sort((a, b) => new Date(b.creado).getTime() - new Date(a.creado).getTime()).slice(0, 15);
    agregar(
      tituloDetalle,
      'Ventas',
      detalle.map(
        v =>
          `#${v.id} | ${fechaCorta(v.creado)} | ${codigoCliente(v.clienteId)} | ${codigoVendedor(v.vendedorId)} | ${v.estadoVenta} | ${pesos(v.total)} | ` +
          v.detalles.slice(0, 5).map(d => `${recorte(d.nombreProducto, 30)} x${d.cantidad}`).join(', '),
      ),
    );
  }

  // ---------------------------------------------------------------- auditoría
  if (temas.auditoria && datos.auditoria) {
    agregar(
      'AUDITORÍA - ÚLTIMAS ACCIONES (fecha | usuario | acción | entidad)',
      'Auditoría',
      [...auditoria]
        .sort((a, b) => new Date(b.creado).getTime() - new Date(a.creado).getTime())
        .slice(0, 20)
        .map(a => `${fechaCorta(a.creado)} | ${codigoVendedor(a.usuarioId)} | ${a.accion} | ${a.entidadAfectada} #${a.idEntidadAfectada}`),
    );
  }

  // ---------------------------------------------------------------- armado con tope de tamaño
  let texto = '';
  const fuentes: string[] = [];
  for (const s of secciones) {
    const bloque = `## ${s.titulo}\n${s.lineas.join('\n')}\n\n`;
    if (texto.length + bloque.length > MAX_CARACTERES_CONTEXTO) {
      const resto = MAX_CARACTERES_CONTEXTO - texto.length - 30;
      if (resto > 300) {
        const parcial = bloque.slice(0, resto);
        texto += parcial.slice(0, parcial.lastIndexOf('\n')) + '\n... (recortado)\n\n';
        if (!fuentes.includes(s.fuente)) fuentes.push(s.fuente);
      }
      break;
    }
    texto += bloque;
    if (!fuentes.includes(s.fuente)) fuentes.push(s.fuente);
  }
  return { texto: texto.trim(), fuentes: fuentes.filter(f => f !== 'Resumen') };
}