import { WritableSignal, signal } from '@angular/core';

const PREFIJO = 'motolux:';

export class CrudStore<T extends { id: number }> {
  private readonly _items: WritableSignal<T[]>;
  readonly items;

  constructor(
    private readonly key: string,
    private readonly seed: T[],
  ) {
    this._items = signal<T[]>(this.cargar());
    this.items = this._items.asReadonly();
  }

  siguienteId(): number {
    return Math.max(0, ...this._items().map(i => i.id)) + 1;
  }

  buscar(id: number): T | undefined {
    return this._items().find(i => i.id === id);
  }

  add(item: T) {
    this.guardar([...this._items(), item]);
  }

  update(id: number, cambios: Partial<T>) {
    this.guardar(this._items().map(i => (i.id === id ? { ...i, ...cambios } : i)));
  }

  remove(id: number) {
    this.guardar(this._items().filter(i => i.id !== id));
  }

  private cargar(): T[] {
    try {
      const raw = localStorage.getItem(PREFIJO + this.key);
      if (raw) return JSON.parse(raw) as T[];
    } catch { }
    return structuredClone(this.seed);
  }

  private guardar(items: T[]) {
    this._items.set(items);
    try { localStorage.setItem(PREFIJO + this.key, JSON.stringify(items)); } catch { }
  }
}
