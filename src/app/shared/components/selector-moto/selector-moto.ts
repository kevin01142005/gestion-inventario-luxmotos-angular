import { Component, effect, inject, input, output, signal } from '@angular/core';
import { MarcaMoto, ModeloMoto, VersionMoto } from '../../../core/models/catalogo-motos.model';
import { CatalogoMotosService } from '../../../core/services/catalogo-motos';
import { mensajeDeApi } from '../../../core/utils/api-error';

@Component({
  selector: 'app-selector-moto',
  templateUrl: './selector-moto.html',
  styleUrl: './selector-moto.css',
})
export class SelectorMoto {
  private readonly catalogo = inject(CatalogoMotosService);

  readonly activo = input(false);
  readonly deshabilitado = input(false);
  readonly versionElegida = output<number | null>();

  readonly marcas = signal<MarcaMoto[]>([]);
  readonly modelos = signal<ModeloMoto[]>([]);
  readonly versiones = signal<VersionMoto[]>([]);

  readonly marcaId = signal('');
  readonly modeloId = signal('');
  readonly versionId = signal('');

  readonly cargando = signal(false);
  readonly error = signal('');
  private cargadas = false;

  constructor() {
    effect(() => {
      if (this.activo()) void this.prepararse();
    });
  }

  async prepararse(): Promise<void> {
    if (this.cargadas) return;
    await this.ejecutar(async () => {
      this.marcas.set(await this.catalogo.marcas());
      this.cargadas = true;
    });
  }

  async elegirMarca(valor: string): Promise<void> {
    this.marcaId.set(valor);
    this.modeloId.set('');
    this.versionId.set('');
    this.modelos.set([]);
    this.versiones.set([]);
    this.versionElegida.emit(null);
    if (!valor) return;
    await this.ejecutar(async () => this.modelos.set(await this.catalogo.modelosDeMarca(Number(valor))));
  }

  async elegirModelo(valor: string): Promise<void> {
    this.modeloId.set(valor);
    this.versionId.set('');
    this.versiones.set([]);
    this.versionElegida.emit(null);
    if (!valor) return;
    await this.ejecutar(async () => this.versiones.set(await this.catalogo.versionesDeModelo(Number(valor))));
  }

  elegirVersion(valor: string): void {
    this.versionId.set(valor);
    this.versionElegida.emit(valor ? Number(valor) : null);
  }

  reiniciar(): void {
    this.marcaId.set('');
    this.modeloId.set('');
    this.versionId.set('');
    this.modelos.set([]);
    this.versiones.set([]);
    this.versionElegida.emit(null);
  }

  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      await accion();
    } catch (error) {
      this.error.set(mensajeDeApi(error, 'No se pudo consultar el catálogo de motos'));
    } finally {
      this.cargando.set(false);
    }
  }
}