export interface MensajeSala {
  tipo: 'mensaje';
  id: number;
  usuarioId: number;
  autor: string;
  texto: string;
  hora: string;
}

export interface AvisoSala {
  tipo: 'sistema';
  texto: string;
  hora: string;
}

export type EntradaSala = MensajeSala | AvisoSala;

export interface UsuarioConectado {
  id: number;
  nombre: string;
}