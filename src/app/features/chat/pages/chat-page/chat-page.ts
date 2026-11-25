import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, effect, inject, signal, viewChild } from '@angular/core';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { SectionHeader } from '../../../../shared/components/section-header/section-header';
import { ChatService } from '../../services/chat';

@Component({
  selector: 'app-chat-page',
  imports: [DatePipe, SectionHeader, EmptyState],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
})
export class ChatPage implements OnInit, OnDestroy {
  private readonly chat = inject(ChatService);

  readonly entradas = this.chat.entradas;
  readonly conectados = this.chat.conectados;
  readonly conectado = this.chat.conectado;
  readonly error = this.chat.error;
  readonly miId = this.chat.miId;
  readonly texto = signal('');
  readonly lista = viewChild<ElementRef<HTMLElement>>('lista');

  constructor() {
    effect(() => {
      this.entradas();
      const contenedor = this.lista()?.nativeElement;
      if (contenedor) setTimeout(() => (contenedor.scrollTop = contenedor.scrollHeight));
    });
  }

  ngOnInit(): void {
    this.chat.conectar();
  }

  ngOnDestroy(): void {
    this.chat.desconectar();
  }

  actualizar(evento: Event): void {
    this.texto.set((evento.target as HTMLInputElement).value);
  }

  enviar(evento?: Event): void {
    evento?.preventDefault();
    if (this.chat.enviar(this.texto())) {
      this.texto.set('');
    }
  }

  iniciales(nombre: string): string {
    return nombre
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }
}