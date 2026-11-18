# Estado y siguientes pasos

Actualizado: 22-10-2026. No interpretar propuestas como autorización para implementarlas.

- Hecho antes de esta memoria: optimización de lecturas paralelas y formateador EUR, commit `27489b4`. En esa revisión pasaron `npm test`, lint y build; no asumir que siguen pasando después de nuevos cambios.
- Hecho: memoria portable y mapa enlazados desde `AGENTS.md`; skill `agent-memory-ledger` incluida en Git.
- Hecho por autorización del usuario: navegación compartida, listas más claras, formularios por bloques y tamaños consistentes. Pruebas, lint, build y revisión WebKit/iPhone 12 emulado correctos; detalles y límites en `docs/QA-INTERFAZ-2026-10-22.md`.
- Pendiente de prueba en dispositivo: Safari en iPhone físico, teclado real, VoiceOver e instalación. No afirmar que se han probado todos los iPhone.
- Graphify: el usuario ha dejado de intentar conectarlo. La última comprobación falló con `no_workspace`; no afirmar acceso al grafo ni volver a pedir autorizaciones sin una nueva petición.

Al cerrar trabajo relevante: sustituir el estado obsoleto, anotar la comprobación realizada y dejar solo pendientes reales; no acumular un diario del chat.

- 23-10-2026: formularios simplificados por autorización, base visual compartida y aviso de éxito de Gestiones limitado a 2 s. Revisar en iPhone físico el teclado y la hoja inferior; esta pasada se limita a código y compilación, sin navegador ni cambios financieros.

- 23-10-2026: corregida la prioridad CSS del destino de pedido seleccionado, el separador inicial de objetivos ocultos y los márgenes de Mi agenda; filas de movimientos compactadas sin reducir el menú táctil. Comprobación de tipos y lint correctos; sin navegador en esta pasada.

- Revisión móvil 23-10: correcciones de teclado/fondo/áreas táctiles, pruebas simuladas y build correctos. Pendiente Safari/iPhone físico y Excel externo de importación; detalles en docs/QA-IPHONE12-2026-10-23.md.
