import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { ModuloAsignado, TokenRespuesta } from '../models/api.model';
import { Modulo, PermisosModulo } from '../models/modulo.model';
import { Role, SesionUsuario } from '../models/role.model';
import { API_CONFIG } from '../utils/api.config';
import { mensajeDeApi } from '../utils/api-error';
import { decodificarJwt, tokenVigente } from '../utils/jwt';
import {
  SIN_PERMISOS, esRolAdmin, esRolUsuario, modulosDesdeApi, puedeRegistrarUsuarios, rolesRegistrables,
} from '../utils/modulos';

const CLAVE_SESION = 'motolux:sesion';
const CLAVE_MODULOS = 'motolux:modulos';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly config = inject(API_CONFIG);

  private readonly _usuario = signal<SesionUsuario | null>(this.restaurarSesion());
  private readonly _modulos = signal<Modulo[]>(this._usuario() ? this.restaurarModulos() : []);

  readonly usuario = this._usuario.asReadonly();
  readonly menu = this._modulos.asReadonly();

  readonly currentRole = computed<Role>(() => this._usuario()?.rol ?? null);
  readonly isLoggedIn = computed(() => this._usuario() !== null);
  readonly esAdmin = computed(() => esRolAdmin(this.currentRole()));
  readonly puedeRegistrar = computed(() => this.tieneModulo('/usuarios') && puedeRegistrarUsuarios(this.currentRole()));
  readonly rolesRegistrables = computed(() => rolesRegistrables(this.currentRole()));

  async login(correo: string, contrasena: string): Promise<void> {
    let respuesta: TokenRespuesta;
    try {
      respuesta = await firstValueFrom(
        this.http
          .post<TokenRespuesta>(`${this.config.urlBase}/autenticacion/login`, { correo: correo.trim(), contrasena })
          .pipe(timeout(this.config.tiempoMaximoMs)),
      );
    } catch (error) {
      throw new Error(mensajeDeApi(error, 'No se pudo iniciar sesión'));
    }

    const datos = decodificarJwt(respuesta.tokenAcceso);
    if (!datos || !esRolUsuario(datos.rol)) {
      throw new Error('La respuesta del servidor no es válida.');
    }

    this.guardarSesion({
      correo: datos.sub,
      nombre: datos.sub,
      rol: datos.rol,
      token: respuesta.tokenAcceso,
      expiraEn: datos.exp * 1000,
    });

    try {
      await this.cargarModulos();
    } catch (error) {
      this.limpiarSesion();
      throw new Error(mensajeDeApi(error, 'No se pudieron cargar tus módulos'));
    }

    if (this._modulos().length === 0) {
      this.limpiarSesion();
      throw new Error('Tu rol no tiene módulos asignados. Contacta al administrador.');
    }

    await this.router.navigate([this.rutaInicial()]);
  }

  logout(mensaje: string = 'sesion_cerrada') {
    this.limpiarSesion();
    this.router.navigate(['/login'], { queryParams: { mensaje } });
  }

  cerrarPorExpiracion() {
    if (this._usuario()) this.logout('sesion_expirada');
  }

  tokenVigente(): string | null {
    const sesion = this._usuario();
    return sesion && tokenVigente(sesion.expiraEn) ? sesion.token : null;
  }

  async cargarModulos(): Promise<void> {
    const lista = await firstValueFrom(
      this.http
        .get<ModuloAsignado[]>(`${this.config.urlBase}/autenticacion/mis-modulos`)
        .pipe(timeout(this.config.tiempoMaximoMs)),
    );
    const modulos = modulosDesdeApi(lista);
    this._modulos.set(modulos);
    try { localStorage.setItem(CLAVE_MODULOS, JSON.stringify(modulos)); } catch { }
  }

  async refrescarModulos(): Promise<void> {
    if (!this.isLoggedIn()) return;
    try {
      await this.cargarModulos();
    } catch { }
  }

  tieneModulo(ruta: string): boolean {
    return this._modulos().some(m => m.ruta === ruta);
  }

  permisosDe(ruta: string): PermisosModulo {
    const modulo = this._modulos().find(m => m.ruta === ruta);
    return modulo
      ? { puedeCrear: modulo.puedeCrear, puedeEditar: modulo.puedeEditar, puedeEliminar: modulo.puedeEliminar }
      : SIN_PERMISOS;
  }

  rutaInicial(): string {
    return this._modulos()[0]?.path ?? '/login';
  }

  private guardarSesion(sesion: SesionUsuario) {
    this._usuario.set(sesion);
    try { localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion)); } catch { }
  }

  descartarSesion() {
    this.limpiarSesion();
  }

  private limpiarSesion() {
    this._usuario.set(null);
    this._modulos.set([]);
    try {
      localStorage.removeItem(CLAVE_SESION);
      localStorage.removeItem(CLAVE_MODULOS);
    } catch { }
  }

  private restaurarSesion(): SesionUsuario | null {
    try {
      const raw = localStorage.getItem(CLAVE_SESION);
      if (!raw) return null;
      const s = JSON.parse(raw) as Partial<SesionUsuario>;
      const valida =
        typeof s.correo === 'string' &&
        typeof s.token === 'string' &&
        typeof s.expiraEn === 'number' &&
        typeof s.rol === 'string' &&
        esRolUsuario(s.rol) &&
        tokenVigente(s.expiraEn);
      return valida ? (s as SesionUsuario) : null;
    } catch {
      return null;
    }
  }

  private restaurarModulos(): Modulo[] {
    try {
      const raw = localStorage.getItem(CLAVE_MODULOS);
      const lista = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(lista) ? (lista as Modulo[]) : [];
    } catch {
      return [];
    }
  }
}
