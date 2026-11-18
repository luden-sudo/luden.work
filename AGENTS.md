<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Contexto común para Claude, Codex y otros asistentes

La marca es **luden**, publicada en **https://luden.work**; el repositorio es ludenelenterrador/luden.work (antes aurum-finanzas). Leer [docs/PROJECT-GUIDE.md](docs/PROJECT-GUIDE.md) al empezar y consultar los archivos del área solicitada. [CLAUDE.md](CLAUDE.md) es la entrada para Claude y [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) documenta entorno, comprobaciones y sus riesgos.

Conservar los flujos y reglas de negocio descritos en la guía común. Si el código y una nota se contradicen, comprobar el recorrido real antes de cambiarlo y corregir la documentación afectada. Las revisiones antiguas no certifican el estado actual. No ejecutar migraciones ni escribir datos financieros solo para conocer el proyecto.

## Ponytail · siempre en este proyecto

Usar Ponytail en modo full para programar, optimizar y revisar: reutilizar lo existente y hacer el cambio mínimo completo, con pruebas. No eliminar funciones del usuario, datos, validaciones, seguridad ni accesibilidad. Los cambios visuales amplios se proponen antes de aplicarlos.

En otro PC, instalar y habilitar el plugin con `codex plugin marketplace add DietrichGebert/ponytail` y `codex plugin add ponytail@ponytail`. Leer su skill `ponytail/SKILL.md` al comenzar. Si no está disponible, seguir estas mismas reglas sin bloquear el trabajo.

## Memoria del proyecto · antes de trabajar

Leer `.codex-memory/architecture.md` y `.codex-memory/decisions.md` al comenzar; consultar `.codex-memory/todo.md` para pendientes. Usar la skill `agent-memory-ledger` si está disponible. Estos archivos viajan con GitHub: no depender del historial del chat ni de servicios externos.

Tras cambios relevantes, actualizar solo los apartados afectados: decisiones estables, rutas, verificaciones y pendientes reales. Enlazar fuentes; si el código contradice la memoria, comprobar el código y corregir la memoria. No guardar PIN, claves, saldos, correos de pedidos ni registros privados. No ejecutar migraciones o ajustes financieros solo porque aparezcan en notas antiguas.

La skill es opcional para continuar: estas reglas y los archivos son suficientes en otro PC. Procedencia e instalación reproducible en `.codex-memory/decisions.md`.
