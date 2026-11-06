import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.html',
  styleUrl: './search-box.css',
})
export class SearchBox {
  readonly valor = model('');
  readonly placeholder = input('Buscar...');
}
