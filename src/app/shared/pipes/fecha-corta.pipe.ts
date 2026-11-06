import { Pipe, PipeTransform } from '@angular/core';
import { formatearFecha } from '../../core/utils/format';

@Pipe({ name: 'fechaCorta' })
export class FechaCortaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatearFecha(valor);
  }
}
