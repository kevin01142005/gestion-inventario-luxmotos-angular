import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth';
import { ModeloMoto, VersionMoto } from '../../../core/models/catalogo-motos.model';
import { mensajeDeApi } from '../../../core/utils/api-error';
import { Pseudonimizador, codigoCliente } from '../../../core/utils/pseudonimizador';
import { MensajeChat } from '../../../shared/interfaces/mensaje-chat.interface';
import { CuerpoChat, ErrorAsistente, RespuestaAsistente, TurnoConversacion } from '../models/asistente.model';
import { respuestaFrecuente, responderBasico } from '../utils/asistente-basico';
import { insigniaMotor } from '../utils/motor-ia';
import {
  CATALOGO_VACIO, CatalogoExtra, ContextoArmado, DatosExtra, clientesMencionados, construirContexto, detectarTemas, marcasMencionadas,
  modelosMencionados, productosMencionados, registrarPersonas,
} from '../utils/contexto-asistente';
import { AsistenteConfigService } from './asistente-config';
import { AsistenteDatosService } from './asistente-datos';
import { AsistenteIaService } from './asistente-ia';

const TURNOS_DE_CONTEXTO = 6;

/** Todo lo de una conversación; se guarda por usuario para que al cambiar de sesión no se vea la charla del anterior. */
interface Conversacion {
  mensajes: MensajeChat[];
  turnosIA: TurnoConversacion[]; // lo que la IA ve (con códigos en lugar de nombres)
  pseudonimizador: Pseudonimizador;
}

/** El chat muestra texto plano: se quitan los asteriscos, almohadillas y comillas invertidas del formato Markdown. */
function quitarMarkdown(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/__(.+?)__/gs, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*\*\s+/gm, '- ');
}

function conversacionNueva(): Conversacion {
  return { mensajes: [], turnosIA: [], pseudonimizador: new Pseudonimizador() };
}

/**
 * Flujo: el usuario pregunta -> se piden los datos a la API (con sus permisos) -> se arma un resumen corto
 * -> los nombres se cambian por códigos -> el motor elegido genera la respuesta (Groq a través del backend, u Ollama
 * en el PC local) -> la respuesta vuelve y se ponen otra vez los nombres reales. La IA nunca toca la base de datos.
 * Si la IA está apagada o falla, responde el asistente básico por reglas con esos mismos datos.
 */
@Injectable({ providedIn: 'root' })
export class AsistenteService {
  private readonly auth = inject(AuthService);
  private readonly datos = inject(AsistenteDatosService);
  private readonly ia = inject(AsistenteIaService);
  private readonly ajustes = inject(AsistenteConfigService);
  private siguienteId = 1;

  private readonly conversaciones = signal<Record<string, Conversacion>>({});
  private readonly _pensando = signal(false);

  readonly mensajes = computed(() => this.conversaciones()[this.claveUsuario()]?.mensajes ?? []);
  readonly pensando = this._pensando.asReadonly();

  async enviar(texto: string): Promise<void> {
    const pregunta = texto.trim();
    if (!pregunta || this._pensando()) return;

    const clave = this.claveUsuario();
    this.agregar(clave, 'usuario', pregunta);
    this._pensando.set(true);
    try {
      const resultado = await this.consultar(clave, pregunta);
      this.agregar(clave, 'asistente', resultado.respuesta, resultado.fuentes);
    } catch (error) {
      const mensaje = error instanceof ErrorAsistente ? error.message : mensajeDeApi(error, 'Ocurrió un error inesperado al consultar al asistente');
      this.agregar(clave, 'error', mensaje);
    } finally {
      this._pensando.set(false);
    }
  }

  limpiar(): void {
    const clave = this.claveUsuario();
    this.actualizar(clave, c => ({ ...c, mensajes: [], turnosIA: [] }));
    this.datos.invalidar();
  }

  private async consultar(clave: string, pregunta: string): Promise<RespuestaAsistente> {
    const conversacion = this.conversaciones()[clave] ?? conversacionNueva();
    const seudo = conversacion.pseudonimizador;

    // Con la IA apagada, las preguntas sobre cómo funciona el sistema se contestan al instante, sin pedir datos.
    if (!this.ajustes.config().usarIa) {
      const fija = respuestaFrecuente(pregunta);
      if (fija) return { respuesta: fija, fuentes: ['Modo básico'] };
    }

    // 1) Datos desde la API, con el token y los permisos del usuario (un 403 llega como "sin datos").
    const datos = await this.datos.cargar();
    if (Object.values(datos).every(v => v === null)) {
      throw new ErrorAsistente('No se pudieron cargar los datos del sistema. Si el servidor estaba dormido, espera un minuto e inténtalo de nuevo.');
    }

    // 2) Códigos para los nombres de clientes y los correos de vendedores.
    registrarPersonas(datos, seudo);
    const { alias } = clientesMencionados(pregunta, datos.clientes ?? []);
    const codigosPorPalabra = new Map<string, Set<string>>();
    for (const [id, palabras] of alias) {
      for (const palabra of palabras) {
        const codigos = codigosPorPalabra.get(palabra) ?? new Set<string>();
        codigos.add(codigoCliente(id));
        codigosPorPalabra.set(palabra, codigos);
      }
    }
    for (const [palabra, codigos] of codigosPorPalabra) seudo.registrarAlias(palabra, [...codigos].join(' o '));

    // 3) Datos que se piden solo si la pregunta los necesita (compatibilidad con motos, movimientos de un producto).
    const activos = (datos.productos ?? []).filter(p => p.estado);
    const mencionados = productosMencionados(pregunta, activos);
    const temas = detectarTemas(pregunta);
    const extra: DatosExtra = {
      compatibilidad: temas.compatibilidad ? await this.datos.compatibilidadDe(mencionados.length ? mencionados : activos) : new Map(),
      movimientos: temas.movimientos && mencionados.length ? await this.datos.movimientosDe(mencionados) : new Map(),
      catalogo: temas.catalogo ? await this.cargarCatalogo(pregunta) : CATALOGO_VACIO,
    };

    // 4) Resumen corto, con los nombres ya cambiados por códigos.
    const contexto = construirContexto(pregunta, datos, extra);
    const ajustes = this.ajustes.config();

    // 5a) IA apagada: responde el asistente básico, sin enviar nada a ningún modelo.
    if (!ajustes.usarIa) {
      return this.respuestaBasica(seudo, pregunta, contexto, '');
    }

    // 5b) El motor elegido genera la respuesta.
    const preguntaIA = seudo.ocultar(pregunta);
    const cuerpo: CuerpoChat = {
      pregunta: preguntaIA,
      contexto: seudo.ocultar(contexto.texto),
      historial: conversacion.turnosIA.slice(-TURNOS_DE_CONTEXTO),
    };
    let bruta: string;
    try {
      bruta = ajustes.motor === 'ollama' ? await this.ia.ollama(ajustes, cuerpo) : await this.ia.groq(cuerpo);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) throw error; // sesión vencida: lo maneja el interceptor
      const motivo = error instanceof ErrorAsistente ? error.message : mensajeDeApi(error, 'La IA no respondió');
      const motor = ajustes.motor === 'ollama' ? 'La IA local (Ollama)' : 'La IA en la nube (Groq)';
      return this.respuestaBasica(seudo, pregunta, contexto, `${motor} no pudo responder: ${motivo}\n\nTe respondo con el asistente básico:\n\n`);
    }

    this.actualizar(clave, c => ({
      ...c,
      turnosIA: [...c.turnosIA, { role: 'user' as const, content: preguntaIA }, { role: 'assistant' as const, content: bruta }].slice(-TURNOS_DE_CONTEXTO * 2),
    }));

    // 6) Se vuelven a poner los nombres reales.
    return { respuesta: seudo.restaurar(quitarMarkdown(bruta)), fuentes: [...contexto.fuentes, insigniaMotor(ajustes)] };
  }

  /** Respuesta por reglas con los mismos datos; la conversación de la IA no la ve (no se guarda en turnosIA). */
  private respuestaBasica(seudo: Pseudonimizador, pregunta: string, contexto: ContextoArmado, aviso: string): RespuestaAsistente {
    const texto = responderBasico(pregunta, contexto);
    return { respuesta: aviso + seudo.restaurar(texto), fuentes: [...contexto.fuentes, 'Modo básico'] };
  }

  /** Marcas del catálogo y, solo de lo que la pregunta nombró, sus modelos y versiones (otra API, datos públicos). */
  private async cargarCatalogo(pregunta: string): Promise<CatalogoExtra> {
    const marcas = (await this.datos.marcas()) ?? [];
    const modelos = new Map<number, ModeloMoto[]>();
    for (const marca of marcasMencionadas(pregunta, marcas).slice(0, 3)) {
      const lista = await this.datos.modelosDe(marca.id);
      if (lista) modelos.set(marca.id, lista);
    }
    const versiones = new Map<number, VersionMoto[]>();
    for (const modelo of modelosMencionados(pregunta, [...modelos.values()].flat()).slice(0, 3)) {
      const lista = await this.datos.versionesDe(modelo.id);
      if (lista) versiones.set(modelo.id, lista);
    }
    return { marcas, modelos, versiones };
  }

  private claveUsuario(): string {
    return this.auth.usuario()?.correo ?? '';
  }

  private actualizar(clave: string, cambio: (c: Conversacion) => Conversacion): void {
    this.conversaciones.update(todas => ({ ...todas, [clave]: cambio(todas[clave] ?? conversacionNueva()) }));
  }

  private agregar(clave: string, rol: MensajeChat['rol'], texto: string, fuentes: string[] = []): void {
    const hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const mensaje: MensajeChat = { id: this.siguienteId++, rol, texto, fuentes, hora };
    this.actualizar(clave, c => ({ ...c, mensajes: [...c.mensajes, mensaje] }));
  }
}