import { Directive, OnInit, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth';

@Directive({ selector: '[appSoloAdmin]' })
export class SoloAdminDirective implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly plantilla = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly contenedor = inject(ViewContainerRef);

  ngOnInit(): void {
    this.contenedor.clear();
    if (this.auth.esAdmin()) {
      this.contenedor.createEmbeddedView(this.plantilla);
    }
  }
}
