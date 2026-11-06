import { Component, input, output } from '@angular/core';
import { MensajeAlerta } from '../../../core/models/alerta.model';

@Component({
  selector: 'app-alerta',
  templateUrl: './alerta.html',
  styleUrl: './alerta.css',
})
export class Alerta {
  readonly alerta = input<MensajeAlerta | null>(null);
  readonly icono = input('');
  readonly cerrar = output<void>();
}
