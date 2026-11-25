import { Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/services/auth';
import { mensajeDeApi } from '../../../../core/utils/api-error';
import { ControladorAlerta } from '../../../../core/utils/alerta';
import { formatearMoneda } from '../../../../core/utils/format';
import { Alerta } from '../../../../shared/components/alerta/alerta';
import { ResumenCard } from '../../../../shared/components/resumen-card/resumen-card';
import { SectionHeader } from '../../../../shared/components/section-header/section-header';
import { SoloAdminDirective } from '../../../../shared/directives/solo-admin.directive';
import { CategoriasService } from '../../../categorias/services/categorias';
import { ReportesService } from '../../../reportes/services/reportes';
import { esStockBajo } from '../../models/producto.model';
import { ProductosService } from '../../services/productos';

@Component({
  selector: 'app-grafica-page',
  imports: [Alerta, ResumenCard, SectionHeader, SoloAdminDirective],
  templateUrl: './grafica-page.html',
  styleUrl: './grafica-page.css',
})
export class GraficaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly auth = inject(AuthService);
  private readonly productosSvc = inject(ProductosService);
  private readonly categoriasSvc = inject(CategoriasService);
  private readonly reportes = inject(ReportesService);

  readonly alerta = new ControladorAlerta();

  readonly estadisticas = this.reportes.estadisticas;
  readonly ventasMes = computed(() => formatearMoneda(this.estadisticas().totalVentasDelMes));

  readonly totalProductos = computed(() => this.productosSvc.productos().length);
  readonly categoriasActivas = computed(() => this.categoriasSvc.activas().length);
  readonly stockBajo = computed(() => this.productosSvc.productos().filter(p => esStockBajo(p) && p.stockActual > 0).length);
  readonly agotados = computed(() => this.productosSvc.productos().filter(p => p.stockActual === 0).length);

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('mensaje') === 'sin_permiso') {
      this.alerta.aviso('Tu rol no tiene permiso para acceder a esa sección.');
    }
    if (this.auth.esAdmin()) this.reportes.cargarEstadisticas().catch(() => undefined);
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      await Promise.all([this.productosSvc.cargar(), this.categoriasSvc.cargar()]);
    } catch (error) {
      this.alerta.error(mensajeDeApi(error, 'No se pudieron cargar los datos del panel'));
    }
  }
}