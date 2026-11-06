import { Component, input } from '@angular/core';

@Component({
  selector: 'app-resumen-card',
  templateUrl: './resumen-card.html',
  styleUrl: './resumen-card.css',
})
export class ResumenCard {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string | number>();
  readonly icono = input('bi-box-seam');
  readonly color = input<'rojo' | 'negro' | 'alerta'>('rojo');
}
