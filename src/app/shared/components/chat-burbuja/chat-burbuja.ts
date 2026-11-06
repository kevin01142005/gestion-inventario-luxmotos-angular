import { Component, computed, input } from '@angular/core';
import { MensajeChat } from '../../interfaces/mensaje-chat.interface';

@Component({
  selector: 'app-chat-burbuja',
  templateUrl: './chat-burbuja.html',
  styleUrl: './chat-burbuja.css',
})
export class ChatBurbuja {
  readonly mensaje = input.required<MensajeChat>();

  readonly texto = computed(() => this.mensaje().texto.replace(/\s*\[\d+\]/g, '').trim());

  readonly autor = computed(() => {
    const rol = this.mensaje().rol;
    if (rol === 'usuario') return 'Tú';
    return rol === 'error' ? 'Aviso' : 'Asistente LuxMotos';
  });

  readonly icono = computed(() => {
    const rol = this.mensaje().rol;
    if (rol === 'usuario') return 'bi-person-circle';
    return rol === 'error' ? 'bi-exclamation-triangle' : 'bi-robot';
  });
}