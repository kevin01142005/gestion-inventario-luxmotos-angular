import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { traducirRol } from '../../../core/utils/modulos';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-nav',
  styleUrl: './nav.css',
  templateUrl: './nav.html',
})
export class Nav {
  protected readonly auth = inject(AuthService);

  readonly menuAbierto = signal(false);
  readonly usuarioAbierto = signal(false);

  readonly rolLabel = computed(() => traducirRol(this.auth.currentRole()));

  alternarMenu() { this.menuAbierto.update(v => !v); }
  cerrarMenu() { this.menuAbierto.set(false); }

  alternarUsuario(evento: Event) {
    evento.stopPropagation();
    this.usuarioAbierto.update(v => !v);
  }

  cerrarSesion() {
    this.usuarioAbierto.set(false);
    this.auth.logout();
  }

  @HostListener('document:click')
  cerrarUsuario() {
    if (this.usuarioAbierto()) this.usuarioAbierto.set(false);
  }
}
