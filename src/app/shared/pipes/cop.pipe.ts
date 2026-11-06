import { Pipe, PipeTransform } from '@angular/core';
import { formatearMoneda } from '../../core/utils/format';

@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatearMoneda(valor);
  }
}
