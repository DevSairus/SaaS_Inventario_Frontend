# Guía de rendimiento — frontend Pitbox

## Toda página nueva en `App.jsx` se importa con `lazy()`, no con `import` directo

Hasta el 23 ago 2026, 80 de las ~106 páginas del sitio se importaban de
forma directa (eager) al tope de `App.jsx` — se descargaban TODAS en la
carga inicial, aunque el usuario solo usara un módulo (ej. alguien que solo
usa Taller igual bajaba el código completo de Contabilidad, CRM y
Ensambladora). Ya se convirtieron todas a `lazy()` — ver el resto de este
archivo para el patrón a seguir de acá en adelante.

### El patrón (copiar tal cual)

**1. Import:**

```js
// ❌ No hacer esto para una página nueva:
import MiPaginaNueva from './pages/modulo/MiPaginaNueva';

// ✅ Hacer esto:
const MiPaginaNueva = lazy(() => import('./pages/modulo/MiPaginaNueva'));
```

**2. Uso en la ruta — envolver en `<Suspense>`:**

```jsx
// ❌ No hacer esto:
<Route path="modulo/nueva" element={<TenantRoute module="modulo"><MiPaginaNueva /></TenantRoute>} />

// ✅ Hacer esto:
<Route path="modulo/nueva" element={<TenantRoute module="modulo"><Suspense fallback={<Loading fullScreen />}><MiPaginaNueva /></Suspense></TenantRoute>} />
```

`Suspense` va SIEMPRE pegado al componente lazy, no envolviendo `TenantRoute`
entero — así el gate de módulo/rol de `TenantRoute` se resuelve sin esperar
a que baje el JS de la página.

### Excepción — cuándo SÍ dejar el import directo (eager)

Solo para páginas que tienen que estar disponibles antes/sin depender del
resto del bundle: login, landing, reset de contraseña, y páginas públicas
sin autenticación (seguimiento de OT, cotización pública, agenda pública).
Hoy son estas 8 — si tu página nueva no es una de estas, va lazy:

- `LoginPage`, `LandingPage`, `ResetPasswordPage`
- `WorkOrderPublicPage`, `SeguimientoPublicoPage`, `QuotePublicPage`,
  `PublicAppointmentPage` (rutas `/public/...`, `/ot/:token`, `/agendar/:slug`)
- `NoBranchAssignedPage` (página chica que se muestra apenas autenticado)

Componentes que NO son páginas de ruta (layouts, providers, el propio
`Loading`, `SessionMonitor`, `PwaBootstrap`, etc.) tampoco aplican esta
regla — siguen eager porque son parte del shell de la app, no de una ruta
específica.

### Por qué importa

El bundle principal hoy ronda los ~2.3MB sin comprimir (ver comentario en
`vite.config.js`, sección `VitePWA`/`maximumFileSizeToCacheInBytes`). Cada
página nueva que se agregue como eager vuelve a inflar ese número para
TODOS los usuarios en la carga inicial, incluso tenants que no tienen ese
módulo habilitado. Con `lazy()`, esa página solo se descarga cuando alguien
realmente navega a esa ruta.
