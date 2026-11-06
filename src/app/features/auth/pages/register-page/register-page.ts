import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RolUsuario } from '../../../../core/models/role.model';
import { AuthService } from '../../../../core/services/auth';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { Header } from '../../../../shared/components/header/header';
import { PasswordStrength } from '../../../../shared/components/password-strength/password-strength';
import { UsuariosService } from '../../services/usuarios';

function confirmacionIgual(grupo: AbstractControl): ValidationErrors | null {
  const contrasena = grupo.get('contrasena')?.value;
  const confirmar = grupo.get('confirmar')?.value;
  return contrasena === confirmar ? null : { noCoincide: true };
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, Header, Alerta, PasswordStrength],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css',
})
export class RegisterPage {
  private readonly usuarios = inject(UsuariosService);
  protected readonly auth = inject(AuthService);

  readonly alerta = new ControladorAlerta();
  readonly roles = this.auth.rolesRegistrables;
  readonly subtitulo = computed(() =>
    this.roles().length > 1
      ? 'Puedes crear cuentas de administrador y de empleado'
      : 'Puedes crear cuentas de empleado');
  readonly verContrasena = signal(false);
  readonly intento = signal(false);
  readonly guardando = signal(false);

  readonly form = new FormGroup(
    {
      nombreCompleto: new FormControl('', [Validators.required]),
      correo: new FormControl('', [Validators.required, Validators.email]),
      rol: new FormControl<RolUsuario | ''>(this.rolPorDefecto(), [Validators.required]),
      contrasena: new FormControl('', [Validators.required, Validators.minLength(8)]),
      confirmar: new FormControl('', [Validators.required]),
    },
    { validators: confirmacionIgual },
  );

  private rolPorDefecto(): RolUsuario | '' {
    const roles = this.roles();
    return roles.length === 1 ? roles[0].value : '';
  }

  async registrar(): Promise<void> {
    this.intento.set(true);
    this.alerta.limpiar();
    if (this.form.invalid || this.guardando()) return;

    const v = this.form.getRawValue();
    this.guardando.set(true);
    try {
      await this.usuarios.registrar({
        nombreCompleto: v.nombreCompleto!.trim(),
        correo: v.correo!.trim(),
        rol: v.rol as RolUsuario,
        contrasena: v.contrasena!,
      });
      this.alerta.exito(`Usuario ${v.correo!.trim()} registrado correctamente.`);
      this.form.reset({ rol: this.rolPorDefecto() });
      this.intento.set(false);
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudo registrar el usuario'));
    } finally {
      this.guardando.set(false);
    }
  }
}