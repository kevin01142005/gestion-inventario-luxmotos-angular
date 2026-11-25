import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_CONFIG } from '../../../core/utils/api.config';
import { mensajeDeApi } from '../../../core/utils/api-error';
import { ConfigAsistente, CuerpoChat, ErrorAsistente, EstadoAsistente, MotorIa, RespuestaChat, ResultadoPrueba } from '../models/asistente.model';
import { normalizarUrlOllama } from '../utils/motor-ia';
import { INSTRUCCION_LOCAL, Peticion, armarMensajes, chatOllama, probarOllama } from '../utils/ollama-cliente';

const peticion: Peticion = (url, opciones) => fetch(url, opciones);

/** Los dos motores que generan la respuesta: Groq (a través del backend) y Ollama (directo desde el navegador). */
@Injectable({ providedIn: 'root' })
export class AsistenteIaService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private instruccion: string | null = null;

  /** Groq: el backend guarda la clave y reenvía el resumen al modelo. */
  async groq(cuerpo: CuerpoChat): Promise<string> {
    const respuesta = await firstValueFrom(
      this.http.post<RespuestaChat>(`${this.config.urlBase}/asistente/chat`, cuerpo).pipe(timeout(this.config.tiempoMaximoMs)),
    );
    const texto = (respuesta.respuesta ?? '').trim();
    if (!texto) throw new ErrorAsistente('El asistente no devolvió una respuesta.');
    return texto;
  }

  /** Ollama: el navegador habla directamente con el modelo local (el resumen no pasa por internet). */
  async ollama(ajustes: ConfigAsistente, cuerpo: CuerpoChat): Promise<string> {
    const url = normalizarUrlOllama(ajustes.ollamaUrl);
    if (!url) throw new ErrorAsistente('La dirección de Ollama no es válida. Corrígela en "Configurar IA".');
    const instruccion = await this.obtenerInstruccion();
    return chatOllama(peticion, url, ajustes.ollamaModelo, armarMensajes(instruccion, cuerpo.contexto, cuerpo.pregunta, cuerpo.historial));
  }

  /** Botón "Probar conexión": comprueba el motor elegido con los valores que hay en pantalla (aunque no estén guardados). */
  async probar(motor: MotorIa, urlOllama: string, modeloOllama: string): Promise<ResultadoPrueba> {
    if (motor === 'ollama') {
      const url = normalizarUrlOllama(urlOllama);
      if (!url) return { ok: false, mensaje: 'La dirección de Ollama no es válida. Ejemplo: http://localhost:11434' };
      if (!modeloOllama.trim()) return { ok: false, mensaje: 'Escribe el nombre del modelo de Ollama.' };
      return probarOllama(peticion, url, modeloOllama.trim());
    }
    return this.probarGroq();
  }

  private async probarGroq(): Promise<ResultadoPrueba> {
    try {
      const estado = await this.estado();
      if (!estado.configurado) {
        return { ok: false, mensaje: 'El servidor no tiene configurada la clave de Groq (variable GROQ_API_KEY).' };
      }
      // Una pregunta mínima de verdad, para confirmar que la clave sirve y que el modelo responde.
      await this.groq({ pregunta: 'Responde únicamente con la palabra OK.', contexto: '', historial: [] });
      return { ok: true, mensaje: `Groq responde correctamente (modelo ${estado.modelo}).` };
    } catch (error) {
      const mensaje = error instanceof ErrorAsistente ? error.message : mensajeDeApi(error, 'No se pudo probar la conexión con Groq');
      return { ok: false, mensaje };
    }
  }

  private estado(): Promise<EstadoAsistente> {
    return firstValueFrom(this.http.get<EstadoAsistente>(`${this.config.urlBase}/asistente/estado`).pipe(timeout(this.config.tiempoMaximoMs)));
  }

  /** Las mismas instrucciones que usa Groq (incluyen IVA, roles, etc.); si el backend no responde, se usan unas mínimas. */
  private async obtenerInstruccion(): Promise<string> {
    if (this.instruccion) return this.instruccion;
    try {
      const estado = await this.estado();
      if (estado.instruccion?.trim()) {
        this.instruccion = estado.instruccion;
        return this.instruccion;
      }
    } catch {
      // Se sigue con las instrucciones mínimas; no se guardan para volver a intentar la próxima vez.
    }
    return INSTRUCCION_LOCAL;
  }
}