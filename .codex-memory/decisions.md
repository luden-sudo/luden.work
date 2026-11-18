# Decisiones estables

## 2026-11-09 — Total de ahorro en Cuentas

- Cuentas incluye una tarjeta «Total ahorro» que reutiliza el agregado `savings` y abre el gestor existente; no es una cuenta nueva ni se suma al disponible. Fuente: `src/components/aurum-app.tsx`.
- Para ajustar un saldo solicitado hay que considerar el mismo historial que la interfaz: movimientos más pagos de deudas convertidos en apuntes (`ledgerEntries`), no solo transacciones. No guardar importes privados en la memoria.

## 2026-11-02 — Carga financiera al cambiar de mes

- La API admite `columns` exclusivamente en POST de presupuestos para `category` y `amount`: el cliente lo añade a los upserts por lotes que preparan los objetivos mensuales. Rechazarlo impedía abrir Dinero. Fuente: `src/app/api/finance/[table]/route.ts`.
- Regresión sin base real: `node scripts/check-finance-columns.mjs`; comprueba aceptación del lote y rechazo de columnas desconocidas y GET. Tipos, lint, paginación y ahorro comprobados; sin ajustes manuales de datos financieros.

## 2026-10-27 — Distribución de Mi ahorro

- Ajuste solicitado sobre la captura: márgenes interiores propios en la hoja, bloques de total y objetivo más compactos, objetivo en superficie neutra y desplegables sin márgenes acumulados. Se conservan textos, controles y cálculos.
- Fuentes: `app-chrome.css`, `responsive.css`, `form-sheets.css`. Comprobado con lint y diff; sin navegador ni iPhone físico.

## 2026-10-24 — Arranque local desde el repositorio privado

- Petición expresa del propietario: incluir la configuración real de ejecución en GitHub para arrancar una descarga en local. Excepción limitada al archivo raíz `.env`; `.env.local`, credenciales SQL y de despliegue siguen excluidas.
- Next.js carga `.env` automáticamente y `.env.local` tiene prioridad. El entorno local conecta a los datos reales. Fuentes: `.gitignore`, README y `docs/DEVELOPMENT.md`.
- No copiar valores de configuración ni datos personales a esta memoria. El repositorio debe conservar su privacidad; compartirlo entrega también las credenciales incluidas.

## 2026-10-22 — Memoria dentro del repositorio

- Contexto: continuar el proyecto entre chats y varios PC sin reconstruir todo el historial.
- Decisión: usar estos archivos Markdown y el índice de `AGENTS.md`; leer antes de trabajar y actualizar tras cambios relevantes. No copiar conversaciones completas ni datos financieros personales.
- Evidencia: petición del usuario de sustituir Graphify por una skill de memoria; `AGENTS.md` establece el flujo. Graphify no forma parte de la memoria operativa; no se ha eliminado su conexión local.
- Skill instalada: `agent-memory-ledger`, de `Arnie016/codex-prompt-templates`, carpeta `skills/agent-memory-ledger`, revisión `d3f1986878a3f242e510f2464b9bf34a6ee08623`. Solo contiene `SKILL.md`, sin procesos ni servidor externo. Ruta local: `~/.codex/skills/agent-memory-ledger/SKILL.md`.
- Copia portátil en `.agents/skills/agent-memory-ledger/SKILL.md`, incluida en Git: otro PC recibe la skill junto al proyecto. La copia global es opcional. No hace falta ninguna cuenta o servidor para seguir estas notas y `AGENTS.md`.

## 2026-10-22 — Conservar el producto y sus datos

- Decisión del usuario: las mejoras no deben quitar funciones, datos ni detalles importantes de pedidos. Cambios visuales amplios se proponen antes de aplicarlos.
- Evidencia: `AGENTS.md`; cuatro propuestas autorizadas e implementadas el 22-10-2026 en `docs/MEJORAS-VISUALES.md`, con revisión documentada en `docs/QA-INTERFAZ-2026-10-22.md`.
- Preferencias: interfaz sencilla tipo app, móvil prioritario (iPhone 12) y PC; correo de compra prioritario en pedidos, con modelo, talla y destinatario identificables. Mantener estados independientes de entrega, cobro y reembolso.

## 2026-10-22 — Reglas financieras que preservar

- EUR fijo; cálculos en céntimos donde corresponde. Fuentes: `src/lib/finance.ts`, `amount.ts`, `backup.ts`; pruebas `scripts/check-finance.mjs`.
- Ahorro separado del saldo disponible, con objetivos y reparto por mes. Fuente: `src/lib/savings.ts`, `scripts/check-savings.mjs`.
- Caja de pedidos separada; los bonos no deben sumarse a cuentas. Antes de cambiar estos flujos, revisar `docs/GESTIONES.md`, `src/lib/management.ts` y las rutas/SQL implicados.
- Coste de teléfono no reembolsable: separado del dinero de Caja; no eliminarlo al recibir un reembolso. Fuentes: `src/lib/management.ts`, `scripts/check-personal-workflow.mjs`.
- Copia completa por perfil desde el servidor, sin credenciales ni copia parcial en caso de fallo. Fuentes: `src/lib/backup.ts`, `src/app/api/backup/route.ts`, `scripts/check-backup.mjs`.
- Sesión y autorización se validan en servidor. No sustituirlas por una bandera local ni exponer claves privadas. Fuentes: `src/lib/day-server.ts`, `src/app/api/session/route.ts`, `src/lib/supabase.ts`.


## 2026-10-23 — Formularios con menos decisiones visibles

- Autorización: aplicar la propuesta de formularios presentada al usuario conservando negro/azul y las reglas financieras. Fuente: conversación y `src/app/form-sheets.css`.
- Categorías de movimiento recogidas con valor seleccionado, búsqueda y todas las opciones disponibles. Gasto hormiga en Más opciones; cuenta y fecha visibles. `EntryFields` en `aurum-app.tsx`.
- Destino de pedido con Para mí/Vinted/Amigo, comprador opcional recogido, precio previsto identificado y explicaciones económicas en su desplegable. El pago desde Caja y su total permanecen visibles. `management-forms.tsx`.
- Confirmaciones de éxito de Gestiones desaparecen a los 2 segundos; los errores se conservan. `management-app.tsx`.
- Superpowers 7.0.1 instalado/habilitado desde openai-curated-remote; frontend-design de vipulgupta2048/codex-skills instalado en ~/.agents/skills/frontend-design. Aplicar selectivamente: sus sugerencias decorativas no sustituyen la identidad autorizada ni las reglas de seguridad de luden.

## 2026-10-23 — Empezar una tarea antes de hora

- Próxima tarea y Lo siguiente muestran acciones compactas para planes puntuales. Empezar ahora usa la hora de Madrid sincronizada y guarda la tarea mediante save-plan, conservando su duración. Si cruzaría medianoche, exige editar el horario. Terminar anticipadamente se ofrece para la tarea de hoy y usa el completado existente. Las rutinas semanales no se reescriben. Fuentes: today-schedule.tsx y day-app.tsx.
- Ajustes de Mi día conserva sus márgenes interiores; conexiones de Dinero están en un contenedor con separación uniforme. Fuente: form-sheets.css.

## 2026-10-23 — Periodo móvil y estado de pedidos

- En móvil el periodo es un único selector a la derecha: Todo, meses recientes/con movimientos y Elegir otro mes. Los filtros comparten el mismo estado month; escritorio conserva sus controles. Se retiró el texto explicativo bajo Saldo disponible por petición del usuario. Fuente: aurum-app.tsx.
- Seguimiento, cobro, reembolso e intercambio quedan dentro de un único Estado en tarjetas y ficha, conservando todos sus controles. Fuente: management-app.tsx.
- El menú de editar/duplicar/eliminar movimiento conserva márgenes propios dentro de la hoja móvil. Fuente: form-sheets.css.

- Ajuste posterior autorizado: selector móvil de periodo en la cabecera junto al menú y añadir; sin texto visible de sincronización, nota del proyecto ni contador Horario de Madrid. La actualización automática y el reloj de Madrid siguen activos. El encabezado de últimos movimientos baja a 52 px sin cambiar su tipografía.

- Ajuste de cabecera solicitado: sin nombre de perfil encima del título; selector móvil de meses y gestión de repeticiones dentro de los tres puntos. Las repeticiones no aparecen en la lista de movimientos; sus datos y acciones se conservan.
- Nueva deuda agrupa dirección, concepto, persona e importe; fechas, tipo de pago y notas dentro de Fechas y opciones sin cambiar sus nombres ni guardado. Avisos de dinero recibe márgenes propios y se retira la instrucción inferior de instalación de iOS por petición del usuario.
- Periodo móvil: sustituido el select nativo por una hoja con lista temática, selección resaltada, Todo el historial y entrada de mes libre. Evita opciones claras con texto blanco del selector del sistema.

## 2026-10-23 — Presentación del repositorio

- Marca pública luden y dominio principal https://luden.work en README, portada SVG, índice de documentación y About de GitHub. El repositorio técnico aurum-finanzas conserva nombre y privacidad.
- README distingue funciones actuales, puesta en marcha, configuración privada, límites de widgets/Atajos y la prueba de importación que requiere un Excel externo. .env.example documenta únicamente nombres de variables y valores vacíos. No se han publicado capturas ni datos de perfiles.

## 2026-10-23 — Contexto independiente del asistente

- El usuario continuará con Claude y otras herramientas. CLAUDE.md remite a reglas compartidas y docs/AI-CONTEXT.md; docs/DEVELOPMENT.md identifica entorno, pruebas y scripts con efectos secundarios. Las guías enlazan fuentes y no requieren skills locales ni el historial del chat.
- Mantener una guía común, con entradas breves en README/AGENTS/CLAUDE, en lugar de copiar reglas completas y divergentes para cada asistente.

## 2026-10-24 — Paleta Grafito y Zafiro y skeletons

- Autorización del usuario: cambiar la paleta (anula para esta tarea «negro y gris con azul») eligiendo la propuesta A de tres. Solo estética; sin cambios de lógica, textos ni campos.
- Tokens consolidados en un bloque por tema en `src/app/globals.css`; literales de marca sustituidos por tokens en los CSS de la raíz y `gestiones/management.css` (`--mg-*` siguen en `#rrggbb`, dos por tema, por `check-management-display.mjs`). `themeColor` y manifest usan `#0b0d11`.
- Pulido: radios/elevación/movimiento como tokens; navegación activa con `--soft`; hover solo con puntero; `option` con colores del tema. Bloque final de `form-sheets.css`. Corregido que `primary destructive` saliera azul.
- Petición posterior: pantallas de carga sustituidas por `src/components/loading-skeleton.tsx` en Hoy, Dinero y Gestiones; el texto queda para lectores de pantalla y los errores con Reintentar se conservan.
- Verificación: lint, contraste y comprobaciones de `npm test` salvo la importación (falta el Excel externo). `npm run build` compila y pasa TypeScript, pero el prerender falla sin `.env.local` (también antes del cambio). Revisión visual con marcado de muestra a 390 × 844 en claro/oscuro; pantallas con datos reales e iPhone físico sin revisar.# Decisiones estables

## 2026-10-22 — Memoria dentro del repositorio

- Contexto: continuar el proyecto entre chats y varios PC sin reconstruir todo el historial.
- Decisión: usar estos archivos Markdown y el índice de `AGENTS.md`; leer antes de trabajar y actualizar tras cambios relevantes. No copiar conversaciones completas ni datos financieros personales.
- Evidencia: petición del usuario de sustituir Graphify por una skill de memoria; `AGENTS.md` establece el flujo. Graphify no forma parte de la memoria operativa; no se ha eliminado su conexión local.
- Skill instalada: `agent-memory-ledger`, de `Arnie016/codex-prompt-templates`, carpeta `skills/agent-memory-ledger`, revisión `d3f1986878a3f242e510f2464b9bf34a6ee08623`. Solo contiene `SKILL.md`, sin procesos ni servidor externo. Ruta local: `~/.codex/skills/agent-memory-ledger/SKILL.md`.
- Copia portátil en `.agents/skills/agent-memory-ledger/SKILL.md`, incluida en Git: otro PC recibe la skill junto al proyecto. La copia global es opcional. No hace falta ninguna cuenta o servidor para seguir estas notas y `AGENTS.md`.

## 2026-10-22 — Conservar el producto y sus datos

- Decisión del usuario: las mejoras no deben quitar funciones, datos ni detalles importantes de pedidos. Cambios visuales amplios se proponen antes de aplicarlos.
- Evidencia: `AGENTS.md`; cuatro propuestas autorizadas e implementadas el 22-10-2026 en `docs/MEJORAS-VISUALES.md`, con revisión documentada en `docs/QA-INTERFAZ-2026-10-22.md`.
- Preferencias: interfaz sencilla tipo app, móvil prioritario (iPhone 12) y PC; correo de compra prioritario en pedidos, con modelo, talla y destinatario identificables. Mantener estados independientes de entrega, cobro y reembolso.

## 2026-10-22 — Reglas financieras que preservar

- EUR fijo; cálculos en céntimos donde corresponde. Fuentes: `src/lib/finance.ts`, `amount.ts`, `backup.ts`; pruebas `scripts/check-finance.mjs`.
- Ahorro separado del saldo disponible, con objetivos y reparto por mes. Fuente: `src/lib/savings.ts`, `scripts/check-savings.mjs`.
- Caja de pedidos separada; los bonos no deben sumarse a cuentas. Antes de cambiar estos flujos, revisar `docs/GESTIONES.md`, `src/lib/management.ts` y las rutas/SQL implicados.
- Coste de teléfono no reembolsable: separado del dinero de Caja; no eliminarlo al recibir un reembolso. Fuentes: `src/lib/management.ts`, `scripts/check-personal-workflow.mjs`.
- Copia completa por perfil desde el servidor, sin credenciales ni copia parcial en caso de fallo. Fuentes: `src/lib/backup.ts`, `src/app/api/backup/route.ts`, `scripts/check-backup.mjs`.
- Sesión y autorización se validan en servidor. No sustituirlas por una bandera local ni exponer claves privadas. Fuentes: `src/lib/day-server.ts`, `src/app/api/session/route.ts`, `src/lib/supabase.ts`.


## 2026-10-23 — Formularios con menos decisiones visibles

- Autorización: aplicar la propuesta de formularios presentada al usuario conservando negro/azul y las reglas financieras. Fuente: conversación y `src/app/form-sheets.css`.
- Categorías de movimiento recogidas con valor seleccionado, búsqueda y todas las opciones disponibles. Gasto hormiga en Más opciones; cuenta y fecha visibles. `EntryFields` en `aurum-app.tsx`.
- Destino de pedido con Para mí/Vinted/Amigo, comprador opcional recogido, precio previsto identificado y explicaciones económicas en su desplegable. El pago desde Caja y su total permanecen visibles. `management-forms.tsx`.
- Confirmaciones de éxito de Gestiones desaparecen a los 2 segundos; los errores se conservan. `management-app.tsx`.
- Superpowers 7.0.1 instalado/habilitado desde openai-curated-remote; frontend-design de vipulgupta2048/codex-skills instalado en ~/.agents/skills/frontend-design. Aplicar selectivamente: sus sugerencias decorativas no sustituyen la identidad autorizada ni las reglas de seguridad de luden.

## 2026-10-23 — Empezar una tarea antes de hora

- Próxima tarea y Lo siguiente muestran acciones compactas para planes puntuales. Empezar ahora usa la hora de Madrid sincronizada y guarda la tarea mediante save-plan, conservando su duración. Si cruzaría medianoche, exige editar el horario. Terminar anticipadamente se ofrece para la tarea de hoy y usa el completado existente. Las rutinas semanales no se reescriben. Fuentes: today-schedule.tsx y day-app.tsx.
- Ajustes de Mi día conserva sus márgenes interiores; conexiones de Dinero están en un contenedor con separación uniforme. Fuente: form-sheets.css.

## 2026-10-23 — Periodo móvil y estado de pedidos

- En móvil el periodo es un único selector a la derecha: Todo, meses recientes/con movimientos y Elegir otro mes. Los filtros comparten el mismo estado month; escritorio conserva sus controles. Se retiró el texto explicativo bajo Saldo disponible por petición del usuario. Fuente: aurum-app.tsx.
- Seguimiento, cobro, reembolso e intercambio quedan dentro de un único Estado en tarjetas y ficha, conservando todos sus controles. Fuente: management-app.tsx.
- El menú de editar/duplicar/eliminar movimiento conserva márgenes propios dentro de la hoja móvil. Fuente: form-sheets.css.

- Ajuste posterior autorizado: selector móvil de periodo en la cabecera junto al menú y añadir; sin texto visible de sincronización, nota del proyecto ni contador Horario de Madrid. La actualización automática y el reloj de Madrid siguen activos. El encabezado de últimos movimientos baja a 52 px sin cambiar su tipografía.

- Ajuste de cabecera solicitado: sin nombre de perfil encima del título; selector móvil de meses y gestión de repeticiones dentro de los tres puntos. Las repeticiones no aparecen en la lista de movimientos; sus datos y acciones se conservan.
- Nueva deuda agrupa dirección, concepto, persona e importe; fechas, tipo de pago y notas dentro de Fechas y opciones sin cambiar sus nombres ni guardado. Avisos de dinero recibe márgenes propios y se retira la instrucción inferior de instalación de iOS por petición del usuario.
- Periodo móvil: sustituido el select nativo por una hoja con lista temática, selección resaltada, Todo el historial y entrada de mes libre. Evita opciones claras con texto blanco del selector del sistema.

## 2026-10-23 — Presentación del repositorio

- Marca pública luden y dominio principal https://luden.work en README, portada SVG, índice de documentación y About de GitHub. El repositorio técnico aurum-finanzas conserva nombre y privacidad.
- README distingue funciones actuales, puesta en marcha, configuración privada, límites de widgets/Atajos y la prueba de importación que requiere un Excel externo. .env.example documenta únicamente nombres de variables y valores vacíos. No se han publicado capturas ni datos de perfiles.

## 2026-10-23 — Contexto independiente del asistente

- El usuario continuará con Claude y otras herramientas. CLAUDE.md remite a reglas compartidas y docs/AI-CONTEXT.md; docs/DEVELOPMENT.md identifica entorno, pruebas y scripts con efectos secundarios. Las guías enlazan fuentes y no requieren skills locales ni el historial del chat.
- Mantener una guía común, con entradas breves en README/AGENTS/CLAUDE, en lugar de copiar reglas completas y divergentes para cada asistente.

## 2026-10-24 — Paleta Grafito y Zafiro y skeletons

- Autorización del usuario: cambiar la paleta (anula para esta tarea «negro y gris con azul») eligiendo la propuesta A de tres. Solo estética; sin cambios de lógica, textos ni campos.
- Tokens consolidados en un bloque por tema en `src/app/globals.css`; literales de marca sustituidos por tokens en los CSS de la raíz y `gestiones/management.css` (`--mg-*` siguen en `#rrggbb`, dos por tema, por `check-management-display.mjs`). `themeColor` y manifest usan `#0b0d11`.
- Pulido: radios/elevación/movimiento como tokens; navegación activa con `--soft`; hover solo con puntero; `option` con colores del tema. Bloque final de `form-sheets.css`. Corregido que `primary destructive` saliera azul.
- Petición posterior: pantallas de carga sustituidas por `src/components/loading-skeleton.tsx` en Hoy, Dinero y Gestiones; el texto queda para lectores de pantalla y los errores con Reintentar se conservan.
- Verificación: lint, contraste y comprobaciones de `npm test` salvo la importación (falta el Excel externo). `npm run build` compila y pasa TypeScript, pero el prerender falla sin `.env.local` (también antes del cambio). Revisión visual con marcado de muestra a 390 × 844 en claro/oscuro; pantallas con datos reales e iPhone físico sin revisar. Subido a `main` por peticiÃ³n del usuario; confirmar el despliegue de Vercel en luden.work.

## 2026-10-24 — Sistema plano según design.md

- Petición del usuario: seguir un design.md (Breensivo) manteniendo la fuente Geist y la paleta Grafito y Zafiro; no se adoptan sus colores ni Inter.
- Aplicado: sin sombras (`--elev-*: none`), degradados ni brillos; balance como tarjeta neutra; radios 6/10/16; escala de 8 px; márgenes de 24 px en móvil (16 px por debajo de 360 px); títulos de página 28/600; foco de 2 px con separación de 2 px; avisos y toast neutros con borde; chips de estado de Gestiones con texto y borde; skeleton con pulso de opacidad en vez de brillo.
- No adoptado: mono para importes (se mantienen cifras tabulares de Geist) ni el botón secundario sobre `--surface` (sigue en `--field` para no romper los selectores segmentados).
- Verificación: lint, contraste y comprobaciones de npm test salvo la importación; revisión con marcado de muestra a 390 × 844. Sin revisar con datos reales ni en iPhone físico.

## 2026-10-24 — Tarjetas de pedidos de Gestiones

- Solo CSS (bloque final de `src/app/gestiones/management.css`): tarjeta neutra con barra de estado fina con `--order-color` (`::before`), icono y papelera en tono apagado, estados sin fondo con icono en color del tono (columnas en PC, filas en móvil), importes como franja con divisores y cifras tabulares, "Estado" como fila con chevron y segmento seleccionado en `--surface`.
- Mismas funciones y marcado; verificado con marcado de muestra en oscuro/claro, PC y 390 × 844, más lint y contraste. Sin revisar con datos reales.

## 2026-10-28 — Rediseño Apple sin cambios funcionales

- Nueva petición explícita sustituye la identidad plana anterior: tipografía de sistema, superficies claro/oscuro, acento #0071E3, radios 20/24, botones píldora y navegación/hojas translúcidas. DESIGN.md y apple-interface.css son la referencia vigente.
- Se mantienen nombres, atributos, eventos, APIs, datos, permisos y comportamiento de las cuatro áreas. El botón financiero existente se presenta flotante en móvil. AnimatedAmount y MotionRow solo producen efectos visuales y respetan movimiento reducido.
- Contrato comprobado: 15 componentes y 1.333 atributos/controladores. Lint, tipos, build, contraste y pruebas locales disponibles correctos. La importación necesita un Excel externo ausente; sin navegador/iPhone físico. Evidencia en docs/QA-APPLE-2026-10-28.md.
- Revisión tras feedback: títulos/conceptos/importes en negrita 700, etiquetas 600, base 16 px y secundarios mayores. Corregidas clases inexistentes de pedidos en apple-interface.css y retirada la capa plana final de form-sheets que interfería con la cascada. La prueba de contrato ahora verifica que los selectores de pedidos corresponden al marcado real.
- Corrección posterior de captura: acciones de movimiento dependen del ancho del contenedor `.movement-month` (menú compacto bajo 700 px; botones directos desde 700). Evita mostrar ambos conjuntos y desbordar tarjetas estrechas en escritorio. `check-movement-layout.mjs` fallaba antes y pasa después en el modelo de cascada CSS. Tipografía Apple nativa o Geist ya incluida en otros sistemas; suavizado del navegador sin forzarlo. Referencias oficiales en DESIGN.md.

## 2026-10-29 — Cobro junto a seguimiento y entrega

- Petición sobre captura: Seguimiento, Cobro y Entrega comparten una fila de tres columnas en las tarjetas; Cobro ocupa el centro. Se conservan etiquetas/estados y controles. Pedidos personales o sin seguimiento mantienen dos columnas. Cambia solo apple-interface.css; contrato y lint comprobados, sin navegador/iPhone físico.
- Cuadrícula de pedidos: retirada la alineación start heredada que encogía el cuerpo de las tarjetas. Cuerpo al 100% y alineación stretch; una/dos/tres columnas según el ancho real del workspace (680/1040 px). Conserva una columna a 390 px en iPhone 12/13 y permite tres en escritorio amplio. Comprobación de cascada en check-order-grid.mjs; sin prueba física.

## 2026-10-29 — Cobros en cualquier cuenta

- Autorización del usuario: seleccionar BBVA o cualquier cuenta del perfil en Cuenta que recibe. EventForm ofrece todas solo para cobro; los demás registros conservan el filtro business. La función de servidor admite cobro en cuenta personal y conserva existencia/perfil, pendientes, idempotencia, auditoría y vinculación.
- Migración incremental management-collection-accounts.sql sustituye únicamente la validación de scope; no ejecutar el resto de migraciones para este cambio. Las fuentes canónicas de management y teléfono incorporan la misma excepción para instalaciones nuevas.
- Pruebas de formulario y transacción con rollback: Banco/Efectivo/Cripto/Ahorro, reintentos sin duplicación, deuda sin ingreso duplicado, límites y restricciones de pagos. Documentación en docs/GESTIONES.md. El contrato histórico admite exclusivamente este cambio SQL autorizado.


## 2026-10-29 — Horas e iconos de movimientos

- Petición explícita: selector de horas de estilo iPhone e iconos coloreados. `time-picker.tsx` sustituye solo la entrada visual en tareas, rutinas y ajustes; mismos valores HH:mm, validaciones, callbacks y hora de Madrid. Dos ruedas con scroll/snap, Listo/Enter, Escape, confirmación al salir, teclado y borrado de fin opcional.
- Categorías conservadas; Lucide ya instalada con diez tonos por tema. No se incluyen archivos SF Symbols. Capa visual en apple-interface.css; detalles y límites en DESIGN.md. Sin APIs, almacenamiento ni migraciones. Prueba de interacción simulada y contraste; pendiente iPhone/VoiceOver físico.

## 2026-11-18 — Publicación: cuentas, bilingüe, demo y limpieza de credenciales

- Repositorio preparado para ser público: `.env` retirado de Git y `.gitignore` sin excepción. La decisión del 24-10 queda sustituida. El historial anterior contiene credenciales: rotarlas y publicar con historial limpio antes de abrir el repositorio.
- Cuentas con usuario y contraseña (`src/lib/accounts-server.ts`, `/api/auth/*`, `supabase/user-accounts.sql`). El registro crea un perfil `u<hex>` con copia de las tablas `luden_*` mediante `luden_register_user`. El PIN se conserva como acceso heredado (`LEGACY_PROFILES`, `APP_PIN` sin valor por defecto) y desde Ajustes se vincula un usuario al perfil.
- Idiomas: español fuente y diccionario inglés (`src/lib/i18n*.ts`). `t()` para textos, `tv()` para valores mostrados; los valores guardados (categorías, estados) siguen en español y solo se traducen al mostrarse. Idioma por cookie `luden-lang` y Accept-Language; cambiar idioma recarga.
- Pantallas privadas solo en cliente (`client-screens.tsx`); landing, login y registro se renderizan en servidor con `makeT(lang)`.
- Demo (`src/lib/demo.ts`): intercepta `fetch('/api/*')` en la pestaña con datos ficticios en sessionStorage. Nunca llega al servidor.
- CSS: no repetir `-webkit-backdrop-filter` junto a `backdrop-filter`; el compilador conservaba solo la versión con prefijo y Chrome se quedaba sin desenfoque. Hojas de formulario opacas.

## 2026-11-18 — Pulido profesional

- Migración `user-accounts.sql` aplicada en producción (copia previa de funciones y prueba en transacción). Registro y login con usuario activos.
- Hoy usa iconos por tipo de actividad (`activity-icon.tsx`) en lugar de emojis. Las «situaciones rápidas» personales solo se muestran al perfil `luden`.
- Landing y acceso con estilo editorial (ver DESIGN.md). Logo nuevo plano. Botones de la app unificados: píldoras para texto, círculos para iconos.
- Documentación: se retiraron informes de QA con fecha y planes antiguos (siguen en el historial). La guía principal es `docs/PROJECT-GUIDE.md`.
