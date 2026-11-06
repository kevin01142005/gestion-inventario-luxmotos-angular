import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  readonly icono = input('bi-boxes');
  readonly titulo = input.required<string>();
  readonly subtitulo = input('');
}
