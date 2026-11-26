import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth';
import { API_CONFIG } from '../../../core/utils/api.config';
import { EntradaSala, UsuarioConectado } from '../models/sala.model';

const CODIGO_NO_AUTORIZADO = 4401;
const CODIGO_SIN_PERMISO = 4403;
const ESPERA_REINTENTO_MS = 3000;
const INTERVALO_PING_MS = 25000;

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly auth = inject(AuthService);
  private readonly config = inject(API_CONFIG);

  readonly entradas = signal<EntradaSala[]>([]);
  readonly conectados = signal<UsuarioConectado[]>([]);
  readonly conectado = signal(false);
  readonly error = signal('');
  readonly miId = signal<number | null>(null);

  private ws?: WebSocket;
  private latido?: ReturnType<typeof setInterval>;
  private reintento?: ReturnType<typeof setTimeout>;
  private activo = false;

  conectar(): void {
    if (this.activo) return;
    this.activo = true;
    this.error.set('');
    this.abrir();
  }

  desconectar(): void {
    this.activo = false;
    clearTimeout(this.reintento);
    clearInterval(this.latido);
    this.ws?.close();
    this.conectado.set(false);
    this.entradas.set([]);
    this.conectados.set([]);
    this.miId.set(null);
  }

  enviar(texto: string): boolean {
    const limpio = texto.trim();
    if (!limpio || this.ws?.readyState !== WebSocket.OPEN) return false;
    this.ws.send(JSON.stringify({ tipo: 'mensaje', texto: limpio }));
    return true;
  }

  private abrir(): void {
    const token = this.auth.tokenVigente();
    if (!token) {
      this.activo = false;
      this.auth.cerrarPorExpiracion();
      return;
    }

    // La dirección del chat sale de la misma configuración que las llamadas HTTP (api.config.ts):
    // http://... pasa a ws://... y https://... pasa a wss://...
    const base = this.config.urlBase.replace(/\/+$/, '').replace(/^http/, 'ws');
    const ws = new WebSocket(`${base}/ws/chat?token=${encodeURIComponent(token)}`);
    this.ws = ws;

    ws.onopen = () => {
      this.error.set('');
      this.conectado.set(true);
      clearInterval(this.latido);
      this.latido = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ tipo: 'ping' }));
      }, INTERVALO_PING_MS);
    };

    ws.onmessage = (evento) => {
      const datos = JSON.parse(evento.data);
      switch (datos.tipo) {
        case 'bienvenida':
          this.miId.set(datos.usuarioId);
          break;
        case 'historial':
          this.entradas.set(datos.mensajes);
          break;
        case 'usuarios':
          this.conectados.set(datos.usuarios);
          break;
        case 'mensaje':
        case 'sistema':
          this.entradas.update((lista) => [...lista, datos]);
          break;
        case 'error':
          this.error.set(datos.texto);
          break;
      }
    };

    ws.onclose = (evento) => {
      this.conectado.set(false);
      clearInterval(this.latido);
      if (evento.code === CODIGO_NO_AUTORIZADO) {
        this.activo = false;
        this.auth.cerrarPorExpiracion();
        return;
      }
      if (evento.code === CODIGO_SIN_PERMISO) {
        this.activo = false;
        this.error.set('Tu rol no tiene acceso al chat.');
        return;
      }
      if (this.activo) {
        this.reintento = setTimeout(() => this.abrir(), ESPERA_REINTENTO_MS);
      }
    };
  }
}