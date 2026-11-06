import { Component, input, model } from '@angular/core';
import { Pestana } from '../../interfaces/pestana.interface';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
})
export class Tabs {
  readonly pestanas = input.required<Pestana[]>();
  readonly activa = model.required<string>();
}
