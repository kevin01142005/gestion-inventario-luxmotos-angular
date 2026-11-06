import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { mensajeDeApi } from './api-error';

describe('mensajeDeApi', () => {
  it('usa el mensaje que devuelve la API', () => {
    const error = new HttpErrorResponse({ status: 400, error: { message: 'Correo inválido' } });
    expect(mensajeDeApi(error, 'Falló')).toBe('Correo inválido');
  });

  it('sin conexión explica que el servidor puede estar dormido', () => {
    expect(mensajeDeApi(new HttpErrorResponse({ status: 0 }), 'Falló')).toContain('No se pudo conectar');
  });

  it('el tiempo agotado tiene su propio mensaje', () => {
    expect(mensajeDeApi(new TimeoutError(), 'Falló')).toContain('tardó demasiado');
  });

  it('403 sin cuerpo indica falta de permiso', () => {
    expect(mensajeDeApi(new HttpErrorResponse({ status: 403 }), 'Falló')).toContain('No tienes permiso');
  });

  it('otros estados usan el texto por defecto con el código', () => {
    expect(mensajeDeApi(new HttpErrorResponse({ status: 500 }), 'No se pudo guardar')).toBe('No se pudo guardar (error 500).');
  });

  it('un Error común conserva su mensaje y lo demás usa el texto por defecto', () => {
    expect(mensajeDeApi(new Error('Propio'), 'Falló')).toBe('Propio');
    expect(mensajeDeApi('x', 'Falló')).toBe('Falló');
  });
});
