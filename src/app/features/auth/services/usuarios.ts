import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { RolUsuario } from '../../../core/models/role.model';
import { AuthService } from '../../../core/services/auth';
import { API_CONFIG } from '../../../core/utils/api.config';
import { puedeRegistrar } from '../../../core/utils/modulos';
import { DatosRegistro, Usuario } from '../models/usuario.model';

const ROL_ID: Record<RolUsuario, number> = {
  SUPER_USUARIO: 1,
  ADMINISTRADOR: 2,
  EMPLEADO: 3,
};

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);
  private readonly auth = inject(AuthService);

  async registrar(datos: DatosRegistro): Promise<Usuario> {
    if (!puedeRegistrar(this.auth.currentRole(), datos.rol)) {
      throw new Error('Tu rol no tiene permiso para registrar usuarios con el rol seleccionado.');
    }
    const cuerpo = {
      correo: datos.correo,
      nombreCompleto: datos.nombreCompleto,
      contrasena: datos.contrasena,
      rolId: ROL_ID[datos.rol],
    };
    return firstValueFrom(
      this.http.post<Usuario>(`${this.config.urlBase}/autenticacion/registro`, cuerpo).pipe(timeout(this.config.tiempoMaximoMs)),
    );
  }
}