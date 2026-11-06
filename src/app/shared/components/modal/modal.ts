import { Component, DestroyRef, HostListener, effect, inject, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly abierto = input(false);
  readonly grande = input(false);
  readonly conScroll = input(false);
  readonly cerrar = output<void>();

  constructor() {
    effect(() => document.body.classList.toggle('modal-open', this.abierto()));
    inject(DestroyRef).onDestroy(() => document.body.classList.remove('modal-open'));
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.abierto()) this.cerrar.emit();
  }

  onFondo(evento: MouseEvent) {
    if (evento.target === evento.currentTarget) this.cerrar.emit();
  }
}
