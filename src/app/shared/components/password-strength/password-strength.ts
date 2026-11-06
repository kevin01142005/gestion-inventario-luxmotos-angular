import { Component, computed, input } from '@angular/core';

const NIVELES = [
  { ancho: '0%', color: '#e5e7eb', texto: 'Fortaleza de la contraseña' },
  { ancho: '25%', color: '#d62828', texto: 'Débil' },
  { ancho: '50%', color: '#e07a1a', texto: 'Aceptable' },
  { ancho: '75%', color: '#e0c11a', texto: 'Buena' },
  { ancho: '100%', color: '#1f9d55', texto: 'Fuerte' },
];

@Component({
  selector: 'app-password-strength',
  templateUrl: './password-strength.html',
  styleUrl: './password-strength.css',
})
export class PasswordStrength {
  readonly contrasena = input('');

  readonly nivel = computed(() => {
    const c = this.contrasena();
    let puntaje = 0;
    if (c.length >= 8) puntaje++;
    if (/[A-Z]/.test(c)) puntaje++;
    if (/[0-9]/.test(c)) puntaje++;
    if (/[^A-Za-z0-9]/.test(c)) puntaje++;
    return NIVELES[c ? Math.max(1, puntaje) : 0];
  });
}
