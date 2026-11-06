import { decodificarJwt, tokenVigente } from './jwt';
import { crearJwtPrueba } from './sesion-prueba';

describe('JWT', () => {
  it('lee el correo, el rol y la expiración del token', () => {
    const datos = decodificarJwt(crearJwtPrueba('ana@correo.co', 'ADMINISTRADOR', 2000000000));
    expect(datos?.sub).toBe('ana@correo.co');
    expect(datos?.rol).toBe('ADMINISTRADOR');
    expect(datos?.exp).toBe(2000000000);
    expect(datos?.usuarioId).toBe(1);
  });

  it('lee correos con puntos y guiones', () => {
    expect(decodificarJwt(crearJwtPrueba('maria.perez-1@correo.co', 'EMPLEADO'))?.sub).toBe('maria.perez-1@correo.co');
  });

  it('un token mal formado devuelve null', () => {
    expect(decodificarJwt('')).toBeNull();
    expect(decodificarJwt('abc')).toBeNull();
    expect(decodificarJwt('a.b.c')).toBeNull();
    expect(decodificarJwt('a.' + btoa('{"sub":1}') + '.c')).toBeNull();
  });

  it('tokenVigente respeta el margen de seguridad', () => {
    expect(tokenVigente(10000, 1000, 5000)).toBe(true);
    expect(tokenVigente(5500, 1000, 5000)).toBe(false);
    expect(tokenVigente(500, 1000)).toBe(false);
  });
});
