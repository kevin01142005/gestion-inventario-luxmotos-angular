# Gestión de Inventario (Angular)

Aplicación web **frontend** de gestión de inventario, ventas, clientes y proveedores.
La interfaz replica el panel administrativo de referencia (**Bootstrap 5.3 + Bootstrap Icons**): barra superior negra,
tarjetas resumen, tablas con encabezado negro, modales para crear y editar, punto de venta con carrito e IVA, movimientos
de inventario, reportes con pestañas y auditoría.
Todas las tablas usan la librería **DataTables** (búsqueda, orden por columna, paginación, idioma español y **exportar a Excel, PDF, CSV, copiar e imprimir**).

**No se comunica con ninguna API.** Los datos de prueba viven en los servicios de cada feature (con Signals) y las altas,
ediciones y bajas se guardan en `localStorage`.

> Bootstrap, Bootstrap Icons, jQuery, DataTables (con su extensión Buttons, JSZip y pdfmake) se cargan por CDN desde `src/index.html`, así que se necesita internet.

## Ejecutar

```bash
npm install
npm start        # http://localhost:4200
npm test         # pruebas unitarias (Vitest)
npm run build
```
Requiere Node ≥ 22.22.3 (lo exige Angular 22).

## Roles y módulos

El login **no valida credenciales**: se elige el **rol** (Empleado, Administrador o Super usuario) y se ingresa.
Todos los roles llegan al **Panel**; cada uno ve en la barra superior solo los módulos que tiene permitidos, y si intenta
entrar a otra URL a mano vuelve al Panel con un aviso.

| Módulo (ruta)                  | EMPLEADO | ADMINISTRADOR | SUPER_USUARIO |
|--------------------------------|:--------:|:-------------:|:-------------:|
| Panel `/panel` (productos)     | ✅ crea y edita | ✅ + elimina | ✅ + elimina |
| Ventas `/ventas` (punto de venta) | ✅ | ✅ | ✅ |
| Clientes `/clientes`           | ✅ | ✅ | ✅ |
| Inventario `/inventario` (movimientos) | ✅ | ✅ | ✅ |
| Categorías `/categorias`       | 👁 solo lectura | ✅ CRUD | ✅ CRUD |
| Proveedores `/proveedores`     | 👁 solo lectura | ✅ CRUD | ✅ CRUD |
| Reportes `/reportes`           | — | ✅ | ✅ |
| Auditoría `/auditoria`         | — | ✅ | ✅ |
| Registrar usuario `/registro`  | — | ✅ solo empleados | ✅ empleados y administradores |
| **Total de features**          | **6** | **9** | **9** |

**Quién puede registrar a quién** (`ROLES_REGISTRABLES` en `modulos.ts`):

| Quien registra | Puede crear cuentas de |
|----------------|------------------------|
| SUPER_USUARIO  | Empleado y Administrador |
| ADMINISTRADOR  | Solo Empleado |
| EMPLEADO       | Ninguna (no ve el módulo y `registroGuard` bloquea la ruta) |

El formulario solo ofrece los roles permitidos y `UsuariosService.registrar` vuelve a validarlo.

La matriz de permisos vive en **un solo archivo**: `src/app/core/utils/modulos.ts`.

## Reglas de negocio (como en la referencia)

- **Producto:** estado *Agotado* (stock 0), *Stock bajo* (stock ≤ mínimo) o *Disponible*. Código único. El stock solo
  cambia con movimientos de inventario.
- **Categoría:** nace *Pendiente*; un administrador la activa al editarla. Solo las *Activas* se pueden elegir en un
  producto. Eliminar es lógico (*Eliminada*) y se bloquea si tiene productos.
- **Venta:** se crea *Pendiente* (IVA 19 %); al **completarla** se descuenta el stock (movimiento de salida) y se genera
  la factura `FAC-000123`; una pendiente se puede **anular**.
- **Inventario:** una *salida* no puede superar el stock disponible.
- **Auditoría:** cada creación, actualización o eliminación queda registrada con usuario y fecha.

## Estructura (guías appv1 / appv2)

```
src/app
├── core/                         # Se usa UNA sola vez, transversal a las features
│   ├── guards/                   # authGuard, guestGuard, adminGuard, registroGuard
│   ├── models/                   # Role, Modulo, Alerta, RegistroAuditoria
│   ├── services/                 # auth, auditoria
│   └── utils/                    # modulos (roles↔módulos), format, alerta, crud-store, tabla
├── shared/                       # Reutilizable por varias features
│   ├── components/               # header, nav, footer + 13 componentes reutilizables (incluye data-table)
│   ├── directives/               # appSoloAdmin
│   ├── pipes/                    # cop, fechaCorta, fechaHora
│   └── interfaces/               # Pestana, ColumnaTabla
├── features/                     # Una carpeta por funcionalidad
│   ├── auth/                     # pages/login-page, pages/register-page + services/usuarios
│   ├── panel/                    # pages + components (producto-form-modal) + services/productos + models
│   ├── ventas/                   # pages + components (venta-detalle, factura-modal) + services + models
│   ├── clientes/                 # pages + components (cliente-form-modal, historial-compras-modal) + services + models
│   ├── inventario/               # pages + services (movimientos) + models
│   ├── categorias/ proveedores/  # pages + components (*-form-modal) + services + models
│   ├── reportes/                 # pages + services + models
│   └── auditoria/                # pages
├── app.ts / app.html / app.css   # nav + router-outlet + footer
├── app.routes.ts                 # lazy loading (loadComponent) + guards
└── app.config.ts
```

### Componentes reutilizables (16)
`app-header`, `app-nav`, `app-footer`, `app-alerta`, `app-modal`, `app-confirm-modal`, `app-resumen-card`,
`app-kpi-card`, `app-status-badge`, `app-empty-state`, `app-search-box`, `app-section-header`,
`app-resumen-totales`, `app-password-strength`, `app-tabs`, `app-data-table`.

`app-data-table` envuelve DataTables: cada pantalla le pasa `[datos]` y `[columnas]` (título, `render`, orden, clase) y recibe
`(accion)` cuando se pulsa un botón de fila. Si la librería no cargara, muestra una tabla básica equivalente.

## Requisitos del proyecto

- **Sin comunicación con la API:** los servicios usan datos de prueba (`CrudStore` + `localStorage`).
- **Mínimo 10 componentes reutilizados:** 16 (lista arriba), usados en varias páginas.
- **Mínimo 3 features por rol:** Empleado 6, Administrador 9, Super usuario 9.
- **Menú de navegación completo:** `app-nav` muestra solo los módulos del rol, marca el activo y se vuelve menú
  desplegable en pantallas pequeñas.
- **Login con opción de rol:** selector de rol + correo + contraseña (sin validar).
- **Cada rol llega a todos sus módulos permitidos:** menú por rol, `adminGuard` en reportes y auditoría y `registroGuard` en el registro de usuarios.
- **UX y responsive:** Bootstrap más una capa propia en `styles.css`: menú plegable con scroll, tarjetas y reportes que se
  reacomodan, pestañas deslizables y **tablas que se convierten en tarjetas en celulares** (cada celda trae su
  `data-label`). Colores blanco/negro/rojo, alertas, confirmación antes de eliminar y validaciones.

## Pruebas

`npm test` ejecuta, entre otras: matriz de roles (≥3 features por rol), servicio de autenticación, guards por rol,
menú por rol, modal, login, registro de usuarios, y cada pantalla (panel con filtros y CRUD, **punto de venta completo:
crear → completar → factura**, clientes con historial, movimientos de inventario, categorías y proveedores de solo
lectura para el empleado, reportes con pestañas y auditoría).

> Nota para Angular 22: los componentes son `OnPush` por defecto; todas las pantallas guardan su estado en *signals*.
