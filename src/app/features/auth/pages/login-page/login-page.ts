import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { ControladorAlerta, mensajeDe } from '../../../../core/utils/alerta';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { Header } from '../../../../shared/components/header/header';

const MENSAJES: Record<string, { texto: string; tipo: 'success' | 'info' | 'warning' }> = {
  sesion_cerrada: { texto: 'Sesión cerrada correctamente.', tipo: 'success' },
  sesion_requerida: { texto: 'Debes iniciar sesión para continuar.', tipo: 'info' },
  sesion_expirada: { texto: 'Tu sesión expiró. Inicia sesión nuevamente.', tipo: 'warning' },
};

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, Header, Alerta],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly alerta = new ControladorAlerta();
  readonly verContrasena = signal(false);
  readonly intento = signal(false);
  readonly cargando = signal(false);

  readonly form = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
    contrasena: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    const mensaje = MENSAJES[this.route.snapshot.queryParamMap.get('mensaje') ?? ''];
    if (!mensaje) return;
    if (mensaje.tipo === 'success') this.alerta.exito(mensaje.texto);
    else if (mensaje.tipo === 'warning') this.alerta.aviso(mensaje.texto);
    else this.alerta.info(mensaje.texto);
  }

  async onLogin(): Promise<void> {
    this.intento.set(true);
    this.alerta.limpiar();
    if (this.form.invalid || this.cargando()) return;
    const { correo, contrasena } = this.form.getRawValue();
    this.cargando.set(true);
    try {
      await this.auth.login(correo ?? '', contrasena ?? '');
    } catch (error) {
      this.alerta.error(mensajeDe(error, 'No se pudo iniciar sesión.'));
    } finally {
      this.cargando.set(false);
    }
  }
}
