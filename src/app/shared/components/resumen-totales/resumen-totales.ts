import { Component, input } from '@angular/core';
import { CopPipe } from '../../pipes/cop.pipe';

@Component({
  selector: 'app-resumen-totales',
  imports: [CopPipe],
  templateUrl: './resumen-totales.html',
  styleUrl: './resumen-totales.css',
})
export class ResumenTotales {
  readonly subtotal = input.required<number>();
  readonly iva = input.required<number>();
  readonly total = input.required<number>();
  readonly etiquetaIva = input('IVA');
}
