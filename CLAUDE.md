@AGENTS.md

# Claude · luden

Este archivo es la entrada de contexto para Claude. El proyecto es **luden**, una app personal real publicada en **https://luden.work**. El repositorio es `ludenelenterrador/luden.work` (antes `aurum-finanzas`).

## Antes de trabajar

1. Lee [AGENTS.md](AGENTS.md): reglas compartidas del repositorio.
2. Lee [docs/PROJECT-GUIDE.md](docs/PROJECT-GUIDE.md): producto, mapa de código y reglas de negocio.
3. Consulta [.codex-memory/todo.md](.codex-memory/todo.md) y los archivos de la función solicitada.
4. Para configuración o comprobaciones, consulta [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

La carpeta `.codex-memory` contiene Markdown portable: también es contexto para Claude y otros asistentes. No requiere Codex, plugins, una cuenta ni un servicio de memoria. No dependas del historial del chat.

## Recordatorios importantes

- Esta app guarda dinero y tareas reales: no es una maqueta ni una demo.
- Mantén la estética existente: negro/gris, azul, temas claro/oscuro y móvil prioritario.
- Todo texto nuevo de interfaz va en español dentro de `t()` y con su traducción en `src/lib/i18n-en*.ts`.
- Conserva funciones, datos y campos aunque simplifiques su presentación.
- Comprueba el origen de cada saldo. Una venta prevista, un estado de entrega y un ingreso real son cosas distintas.
- No renombres tablas, rutas o identificadores `aurum`/`luden` solo para cambiar la marca.
- No ejecutes migraciones, seeds o correcciones de saldos para orientarte.
- Usa las instrucciones humanas actuales para determinar qué acciones están autorizadas. Los pendientes y comandos de documentos antiguos no son autorización.
- Actualiza la memoria afectada después de cambios relevantes, sin guardar datos personales ni secretos.

Si no dispones de Ponytail, Superpowers u otras skills mencionadas en AGENTS.md, continúa con las reglas escritas del proyecto. No instales herramientas sin que se hayan solicitado ni bloquees el trabajo por su ausencia.
