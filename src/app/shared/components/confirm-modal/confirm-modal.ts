import { Component, input, output } from '@angular/core';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-confirm-modal',
  imports: [Modal],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
})
export class ConfirmModal {
  readonly abierto = input(false);
  readonly titulo = input.required<string>();
  readonly icono = input('bi-exclamation-triangle');
  readonly pregunta = input('');
  readonly nombre = input('');
  readonly aviso = input('Esta acción no se puede deshacer.');
  readonly textoConfirmar = input('Sí, eliminar');
  readonly tipo = input('danger');

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}
