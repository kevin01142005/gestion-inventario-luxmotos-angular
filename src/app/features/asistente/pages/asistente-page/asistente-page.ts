import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { ChatBurbuja } from '../../../../shared/components/chat-burbuja/chat-burbuja';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { SectionHeader } from '../../../../shared/components/section-header/section-header';
import { AsistenteService } from '../../services/asistente';

@Component({
  selector: 'app-asistente-page',
  imports: [SectionHeader, ChatBurbuja, EmptyState],
  templateUrl: './asistente-page.html',
  styleUrl: './asistente-page.css',
})
export class AsistentePage {
  private readonly asistente = inject(AsistenteService);

  readonly mensajes = this.asistente.mensajes;
  readonly pensando = this.asistente.pensando;
  readonly conectado = this.asistente.conectado;
  readonly texto = signal('');
  readonly clave = signal('');
  readonly verClave = signal(false);
  readonly lista = viewChild<ElementRef<HTMLElement>>('lista');

  readonly sugerencias = [
    '¿Cuánto es el IVA y cómo se calcula el total de una venta?',
    '¿Qué puede hacer un empleado y qué no puede hacer?',
    '¿Cuándo se descuenta el stock de una venta?',
    '¿Qué modelos de Yamaha hay en el catálogo?',
  ];

  constructor() {
    effect(() => {
      this.mensajes();
      this.pensando();
      const contenedor = this.lista()?.nativeElement;
      if (contenedor) setTimeout(() => (contenedor.scrollTop = contenedor.scrollHeight));
    });
  }

  actualizar(evento: Event): void {
    this.texto.set((evento.target as HTMLTextAreaElement).value);
  }

  actualizarClave(evento: Event): void {
    this.clave.set((evento.target as HTMLInputElement).value);
  }

  guardarClave(evento?: Event): void {
    evento?.preventDefault();
    if (!this.clave().trim()) return;
    this.asistente.guardarClave(this.clave());
    this.clave.set('');
    this.verClave.set(false);
  }

  cambiarClave(): void {
    this.asistente.olvidarClave();
  }

  enviar(evento?: Event): void {
    evento?.preventDefault();
    const pregunta = this.texto().trim();
    if (!pregunta || this.pensando()) return;
    this.texto.set('');
    void this.asistente.enviar(pregunta);
  }

  teclaEnter(evento: Event): void {
    if ((evento as KeyboardEvent).shiftKey) return;
    this.enviar(evento);
  }

  usarSugerencia(pregunta: string): void {
    if (this.pensando()) return;
    void this.asistente.enviar(pregunta);
  }

  nuevaConversacion(): void {
    this.asistente.limpiar();
  }
}