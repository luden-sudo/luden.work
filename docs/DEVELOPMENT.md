# Desarrollo y comprobaciones de luden

Entrada para asistentes: [PROJECT-GUIDE.md](PROJECT-GUIDE.md). Reglas: [AGENTS.md](../AGENTS.md).

## Entorno existente

```sh
npm ci
npx vercel link
npx vercel env pull .env.local
npm run dev
```

Usar la cuenta y el proyecto autorizados. El dominio principal es **luden.work**, el repositorio **ludenelenterrador/luden.work** y la rama habitual **main**. No renombrarlos ni cambiar permisos para que encajen con la marca.

En otro ordenador, `CLAUDE.md` y `AGENTS.md` orientan la lectura inicial. Las skills y plugins son complementos locales, no dependencias de ejecución de la app. `package.json` y `package-lock.json` definen sus dependencias.

## Variables

El repositorio es público y **no incluye configuración real**: `.env*` está ignorado salvo `.env.example`. Copia `.env.example` a `.env.local` (o usa `npx vercel env pull .env.local` si tienes acceso al proyecto). Sin base de datos, `/demo` muestra toda la interfaz con datos ficticios en el navegador.

| Variable | Dónde se usa |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Inicialización del cliente y compilación. No autorizan por sí solas las tablas financieras privadas. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor; datos privados. La implementación también admite `SUPABASE_SECRET_KEY`. |
| `SUPABASE_JWT_SECRET` | Firma de sesión; ver fallback en `day-server.ts`. |
| `POSTGRES_URL_NON_POOLING` | Scripts SQL que requieran conexión directa; no necesario para dibujar la interfaz. |
| `AUDIT_ORIGIN` / `AUDIT_PIN` | Algunos scripts de acceso o revisión autenticada. Tratarlos como privados. |

No sacar claves del servidor al cliente para arreglar un error de configuración. Conservar los prefijos públicos/privados y la autorización por perfil.

## Comandos por nivel de riesgo

| Comando o grupo | Qué demuestra | Precaución |
| --- | --- | --- |
| `npm run lint` | Reglas de código | No demuestra comportamiento ni aspecto. |
| `npm run build` | Compilación y generación de rutas | Necesita configuración; no demuestra acceso a producción. |
| `node scripts/check-mobile-viewport.mjs` | Geometría del teclado y efecto con DOM simulado | No es una prueba de Safari. |
| `node scripts/check-finance.mjs` | Importes, saldos y deudas con datos de prueba | No audita saldos reales. |
| `node scripts/check-order-form.mjs` | Estructura renderizada de formularios | No comprueba teclado físico. |
| `node scripts/check-personal-workflow.mjs` | Reglas de formulario/estado personal, amigo y Vinted | No guarda pedidos reales. |
| `node scripts/check-savings.mjs` | Cálculos del ahorro | No cambia objetivos reales. |
| `node scripts/check-day.mjs` | Fechas, Madrid y comportamiento de tareas | No prueba entrega de notificaciones. |
| `npm test` | Batería exacta de `package.json` | Se detiene si falta el Excel externo de importación; ver debajo. |
| `npm run test:management` | Integración SQL | Lee el script y su entorno: utiliza base de datos y transacciones. |
| `apply-*`, `set-*`, `migrate-*`, `secure-*`, `activate-*`, `import-*`, `setup-*` | Preparación o modificación | Pueden escribir datos, cambiar permisos o saldos. No ejecutar para explorar. |
| `verify-*`, `audit-*` y otros `check-*` | Varía según script | El nombre no garantiza solo lectura. Leer antes, incluidos flags `--apply`. |

### Excel externo

`check-management-import.mjs` necesita un libro con las filas concretas de su fixture. Por defecto busca una ruta local de otro equipo. También acepta la ruta como argumento:

```sh
node scripts/check-management-import.mjs /ruta/al/libro-de-prueba.xlsx
```

No crear un archivo vacío para hacer pasar el comando, no inventar sus resultados y no subir un Excel privado al repositorio. Si falta, comunicarlo y ejecutar las comprobaciones independientes por separado cuando esté autorizado.

## Revisión móvil

Objetivo inicial: **390 × 844**, también con altura útil reducida, orientación horizontal y texto ampliado. En claro y oscuro:

- Título y acciones sin solaparse; ninguna región requiere desplazamiento horizontal accidental.
- Teclado decimal, texto, correo y selectores: campo visible, cabecera y guardar accesibles.
- Abrir/cerrar formularios conserva el desplazamiento de fondo y no deja la página bloqueada.
- Categorías, detalles y menús se pueden operar con teclado; foco y selección son visibles.
- Números y segundos completos; textos largos no tapan importes ni acciones.
- Movimiento reducido no impide completar una acción.

Usar navegador o dispositivos solo cuando lo autorice la petición vigente. Nunca guardar capturas con datos personales en Git. La emulación es útil, pero no permite afirmar que se probó un iPhone real. Referencia: [revisión del 23/10/2026](QA-IPHONE12-2026-10-23.md).

## Publicar y comprobar

Seguir el alcance autorizado en la conversación actual. En este proyecto el push a `main` está integrado con Vercel; confirmar el despliegue correspondiente al mismo commit y el dominio final. No crear otro proyecto o cambiar DNS porque un despliegue tarde.

Un cambio SQL se documenta y aplica únicamente en el entorno autorizado. Tener un archivo en `supabase/` no demuestra que esa función exista en la base de datos activa. No ejecutar toda la carpeta como una migración acumulativa: contiene scripts de distintas etapas del proyecto.

## Entrega a otra persona o asistente

Dejar un resumen breve con:

- Objetivo y cambios realizados.
- Archivos o rutas principales.
- Comprobaciones ejecutadas y resultados, incluidos fallos y bloqueos.
- Commit/rama y estado de publicación, si hubo publicación.
- Pendientes reales y límites de dispositivo/configuración.

No incluir credenciales, dumps ni registros personales. Actualizar `.codex-memory/` solo si cambió una decisión estable o un pendiente; no duplicar toda esta guía.
