import { Component, input } from '@angular/core';

@Component({
  selector: 'app-kpi-card',
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
})
export class KpiCard {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<string | number>();
  readonly compacto = input(false);
}
