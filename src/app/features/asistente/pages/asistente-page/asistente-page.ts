import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { ChatBurbuja } from '../../../../shared/components/chat-burbuja/chat-burbuja';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { SectionHeader } from '../../../../shared/components/section-header/section-header';
import { ConfigAsistente, MotorIa, ResultadoPrueba } from '../../models/asistente.model';
import { AsistenteConfigService } from '../../services/asistente-config';
import { AsistenteIaService } from '../../services/asistente-ia';
import { AsistenteService } from '../../services/asistente';
import { normalizarUrlOllama } from '../../utils/motor-ia';

@Component({
  selector: 'app-asistente-page',
  imports: [SectionHeader, ChatBurbuja, EmptyState],
  templateUrl: './asistente-page.html',
  styleUrl: './asistente-page.css',
})
export class AsistentePage {
  private readonly asistente = inject(AsistenteService);
  private readonly ajustes = inject(AsistenteConfigService);
  private readonly ia = inject(AsistenteIaService);

  readonly mensajes = this.asistente.mensajes;
  readonly pensando = this.asistente.pensando;
  readonly texto = signal('');
  readonly lista = viewChild<ElementRef<HTMLElement>>('lista');

  // Panel "Configurar IA": se edita una copia (borrador) y solo se aplica al pulsar "Guardar".
  readonly motorActual = this.ajustes.motorActual;
  readonly panelAbierto = signal(false);
  readonly borrador = signal<ConfigAsistente>({ ...this.ajustes.config() });
  readonly probando = signal(false);
  readonly resultado = signal<ResultadoPrueba | null>(null);

  readonly sugerencias = [
    '¿Qué productos tienen el stock bajo o agotado?',
    '¿Cuánto hemos vendido hoy y este mes?',
    '¿Cuáles son los productos más vendidos?',
    '¿Cuándo se descuenta el stock de una venta?',
  ];

  constructor() {
    effect(() => {
      this.mensajes();
      this.pensando();
      const contenedor = this.lista()?.nativeElement;
      if (contenedor) setTimeout(() => (contenedor.scrollTop = contenedor.scrollHeight));
    });
  }

  actualizar(evento: Event): void {
    this.texto.set((evento.target as HTMLTextAreaElement).value);
  }

  enviar(evento?: Event): void {
    evento?.preventDefault();
    const pregunta = this.texto().trim();
    if (!pregunta || this.pensando()) return;
    this.texto.set('');
    void this.asistente.enviar(pregunta);
  }

  teclaEnter(evento: Event): void {
    if ((evento as KeyboardEvent).shiftKey) return;
    this.enviar(evento);
  }

  usarSugerencia(pregunta: string): void {
    if (this.pensando()) return;
    void this.asistente.enviar(pregunta);
  }

  nuevaConversacion(): void {
    this.asistente.limpiar();
  }

  // ---------------------------------------------------------------- Configurar IA
  alternarPanel(): void {
    const abrir = !this.panelAbierto();
    if (abrir) {
      this.borrador.set({ ...this.ajustes.config() }); // al abrir se parte de lo guardado
      this.resultado.set(null);
    }
    this.panelAbierto.set(abrir);
  }

  cambiarUsarIa(evento: Event): void {
    this.cambiar({ usarIa: (evento.target as HTMLInputElement).checked });
  }

  cambiarMotor(motor: MotorIa): void {
    this.cambiar({ motor });
  }

  cambiarUrl(evento: Event): void {
    this.cambiar({ ollamaUrl: (evento.target as HTMLInputElement).value });
  }

  cambiarModelo(evento: Event): void {
    this.cambiar({ ollamaModelo: (evento.target as HTMLInputElement).value });
  }

  guardar(): void {
    const actual = this.borrador();
    const url = normalizarUrlOllama(actual.ollamaUrl);
    const modelo = actual.ollamaModelo.trim();
    if (actual.motor === 'ollama' && actual.usarIa) {
      if (!url) return this.resultado.set({ ok: false, mensaje: 'La dirección de Ollama no es válida. Ejemplo: http://localhost:11434' });
      if (!modelo) return this.resultado.set({ ok: false, mensaje: 'Escribe el nombre del modelo de Ollama.' });
    }
    const limpio: ConfigAsistente = {
      ...actual,
      ollamaUrl: url ?? this.ajustes.config().ollamaUrl,
      ollamaModelo: modelo || this.ajustes.config().ollamaModelo,
    };
    this.ajustes.guardar(limpio);
    this.borrador.set({ ...limpio });
    this.resultado.set({ ok: true, mensaje: 'Configuración guardada. Se aplica desde la próxima pregunta.' });
  }

  async probar(): Promise<void> {
    if (this.probando()) return;
    const actual = this.borrador();
    this.probando.set(true);
    this.resultado.set(null);
    try {
      this.resultado.set(await this.ia.probar(actual.motor, actual.ollamaUrl, actual.ollamaModelo));
    } finally {
      this.probando.set(false);
    }
  }

  private cambiar(cambio: Partial<ConfigAsistente>): void {
    this.borrador.update(b => ({ ...b, ...cambio }));
    this.resultado.set(null);
  }
}