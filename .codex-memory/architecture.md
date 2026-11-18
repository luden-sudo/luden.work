# Mapa de luden

Mapa actualizado contra el código el 28-10-2026. Índice de orientación, no sustituto del código ni inventario de datos reales.

```text
luden · Next.js App Router → Vercel · luden.work
├─ Hoy /hoy → DayApp → /api/day → rutinas, tareas y planes
├─ Agenda /rutinas → DayApp → day-plan + day-adjustments
├─ Dinero /dinero → AurumApp
│  ├─ Resumen, movimientos, cuentas, deudas, límites y ahorro
│  ├─ supabase.ts (cliente adaptado) → /api/finance/[table]
│  └─ finance.ts + savings.ts → cálculos compartidos
├─ Gestiones /gestiones → ManagementApp → /api/management
│  ├─ pedidos personales, Vinted, amigos y bonos
│  └─ Caja, pagos, cobros, entregas y reembolsos
└─ Servicios compartidos
   ├─ /api/session + day-server.ts → autorización en servidor
   ├─ profiles.ts → perfiles y selección de tablas
   ├─ /api/backup + backup.ts → copia completa del perfil
   ├─ /api/notifications + dispatch → avisos
   ├─ /api/widget + widget-script.ts → Scriptable
   └─ /api/apple-pay → importación mediante Atajos
```

## Dónde mirar

- Pantallas y formularios: `src/components/aurum-app.tsx`, `management-app.tsx`, `day-app.tsx`. Navegación compartida: `area-nav.tsx` exporta `AreaNav` (barra móvil) y `AppSidebar` (las cuatro secciones en PC). Dinero conserva sus cinco apartados en subnavegación adaptable. Base común de diálogos de añadir/editar en `form-sheets.css` (hoja inferior móvil, centro en PC); bloques y listas en `app-chrome.css`; pedidos en `gestiones/management.css`.
- Persistencia: rutas de `src/app/api/`; utilidades privadas y sesión en `src/lib/day-server.ts`. Datos sincronizados en servidor, no una demo basada en localStorage. `src/lib/profiles.ts` define tres perfiles: no asumir que solo existe luden.
- Dinero: `src/lib/amount.ts` acepta coma/punto; `finance.ts` calcula importes y reutiliza el formateador EUR. `supabase.ts` pagina movimientos y pagos; `AurumApp.refresh` inicia las lecturas en paralelo.
- Pedidos: `src/lib/management.ts`, `management-import.ts`; reglas de sincronización en `supabase/management-sync.sql` y SQL específicos. Consultar `docs/GESTIONES.md` antes de alterar pagos o Caja.
- Apariencia: orden de importación en `src/app/layout.tsx`: `globals.css`, `day.css`, `app-chrome.css`, `responsive.css`, `form-sheets.css`, `apple-interface.css`. Tokens en globals; la última capa contiene el rediseño Apple autorizado. Fuente visual vigente: `DESIGN.md`. `presentation-motion.tsx` anima solo copias visuales; cálculos y eventos intactos.
- Guías por función: `docs/AHORRO.md`, `MI-DIA.md`, `PERFILES.md`, `AVISOS-DINERO.md`, `TAREAS-Y-APPLE-PAY.md`. Comprobar vigencia contra código.

## Verificación

- `npm test`: pruebas locales de copia, cálculos, paginación, pedidos, ahorro y rutina. Lista exacta en `package.json`.
- `npm run lint` y `npm run build`: comprobaciones de código y compilación.
- Las pruebas de acceso/integración y scripts `apply-*`, `set-*`, `migrate-*`, `verify-*` no son todos de solo lectura: leerlos y comprobar entorno antes de ejecutarlos. No hacer cambios en producción para orientarse.
- Pruebas de escritorio o emulación no garantizan Safari/iPhone físico.

## Documentos históricos

`docs/ARCHITECTURE.md` y `docs/ROADMAP.md` conservan el planteamiento inicial. No son la arquitectura vigente ni una lista de funciones pendientes. Este mapa y el código verificado tienen prioridad.

- Teclado y diálogos móviles: `viewport-sizing.tsx` bloquea el fondo y encuadra el campo; geometría comprobable en `mobile-viewport.ts` y `scripts/check-mobile-viewport.mjs`. Límites y resultados en `docs/QA-IPHONE12-2026-10-23.md`.

- Entrada común para asistentes: `CLAUDE.md` → `AGENTS.md` → `docs/PROJECT-GUIDE.md`; entorno y comprobaciones en `docs/DEVELOPMENT.md`. Mantener estos archivos sin datos de perfiles.
