import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AuthService } from './core/services/auth';
import { Footer } from './shared/components/footer/footer';
import { Nav } from './shared/components/nav/nav';

@Component({
  imports: [RouterOutlet, Nav, Footer],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.url)),
    { initialValue: this.router.url },
  );

  constructor() {
    if (this.auth.isLoggedIn()) void this.auth.refrescarModulos();
  }

  readonly conNavbar = computed(() => {
    const url = this.url();
    return this.auth.isLoggedIn() && !url.startsWith('/login') && !url.startsWith('/registro');
  });
}
