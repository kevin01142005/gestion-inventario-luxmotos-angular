import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

export function mensajeDeApi(error: unknown, porDefecto: string): string {
  if (error instanceof TimeoutError) {
    return 'El servidor tardó demasiado en responder. Si estaba dormido, espera un minuto e inténtalo de nuevo.';
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión; si el servidor estaba dormido, puede tardar hasta un minuto en despertar.';
    }
    const cuerpo: unknown = error.error;
    if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
      const mensaje = (cuerpo as { message: unknown }).message;
      if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
    }
    if (error.status === 403) return 'No tienes permiso para realizar esta acción.';
    if (error.status === 401) return 'Tu sesión no es válida. Inicia sesión nuevamente.';
    if (error.status === 404) return 'No se encontró el recurso solicitado.';
    return `${porDefecto} (error ${error.status}).`;
  }
  return error instanceof Error && error.message ? error.message : porDefecto;
}
