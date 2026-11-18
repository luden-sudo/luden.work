# Gestiones

Implementación para Aurum: `/gestiones`, con Ventas, Amigos, Bonos y Caja.
ScanTap queda excluido. La sección utiliza el PIN y la sesión existentes y respeta el perfil activo.

## Uso

El formulario mantiene el correo de compra visible como primer campo en pedidos personales, Vinted y Amigos, tanto al crear como al editar. Los datos principales siguen el orden correo, modelo, coste, talla, nombre en el paquete y persona según el destino; color y teléfono permanecen en «Más detalles».

- **Añadir:** crea una ficha o un pedido con varios artículos. Solo modelo/plataforma y actividad son obligatorios. Color, talla, persona, referencia y fechas se pueden completar después.
- **Pedido con varios artículos:** comparte referencia; sus gastos adicionales se reparten por igual, ajustando los céntimos para conservar el total exacto.
- **Pago al crear:** los nuevos pedidos de Ventas y Amigos requieren elegir una cuenta de Caja. Crear el pedido registra también su compra (artículo y gastos adicionales; teléfono pagado fuera de Caja) y descuenta el saldo, en una única operación atómica. Los reintentos no duplican pagos y editar no vuelve a descontar. La importación histórica y los bonos siguen sin crear movimientos automáticos.
- **Seguimiento y venta:** se guardan por separado. El cobro se calcula con sus registros; no se marca manualmente.
- **Cobrar / Registrar pago:** permite crear un movimiento, vincular uno existente o cobrar/vincular una deuda existente.
- **Cuenta que recibe un cobro:** permite cualquier cuenta del perfil, incluida BBVA, Efectivo, Cripto y Ahorro. Solo se abona la cuenta elegida y el cobro sigue vinculado al pedido. Cobrar una deuda crea un pago de deuda, sin duplicarlo como ingreso. Compras, gastos y reembolsos nuevos conservan sus restricciones de Caja. La migración incremental `supabase/management-collection-accounts.sql` modifica únicamente esa validación; no ejecuta ajustes de saldos ni rehace el esquema.

La ampliación del 29-10-2026 está comprobada con `check-order-form.mjs` y `check-collection-accounts-db.mjs`. El segundo requiere `TASK_DB_URL` y siempre revierte sus registros de prueba con rollback; no debe utilizarse para alterar saldos. La migración incremental está aplicada al servidor; no repetir las migraciones históricas para continuar este cambio. La cuadrícula adaptable se comprueba con `check-order-grid.mjs` como modelo de CSS, sin certificar el render en iPhone físico.
- **Incidencias:** tienen historial independiente. Abrir un reembolso no registra dinero. Un reembolso recibido puede vincularse a su incidencia.
- **Notas:** cada nota conserva fecha y contenido. Editar una ficha conserva sus valores anteriores.
- **Datos de envío:** correo de compra y nombre en el paquete aparecen en el formulario principal, separados de cliente/amigo. No se deduce el nombre del destinatario a partir del cliente.
- **Reembolso e intercambio:** cada uno tiene seguimiento independiente en la tarjeta y en la ficha. “Reembolso recibido” deja el coste final en 3,70 € y conserva el anterior en el historial. Volver a “Pedido” o desmarcarlo restaura el coste anterior. Estos botones no crean ingresos automáticamente; registrar un abono real sigue usando los movimientos vinculados. Si el coste ya se ajustó a 3,70 €, el cálculo del beneficio no descuenta otra vez un reembolso financiero.
- **Archivar:** oculta una ficha de la lista normal y permite restaurarla. Sus importes siguen contando en el resumen económico.
- **Anular:** un movimiento creado desde Gestiones se elimina del registro financiero y queda documentado en el historial. Un movimiento externo se desvincula sin eliminarlo. Los cobros de deuda creados aquí utilizan solo `debt_payments`, sin duplicar el ingreso.

## Caja y cálculos

“Crear caja de ventas” crea dos cuentas vacías: `Gestiones · Efectivo` y `Gestiones · Banco`, con `scope=business`.
No se asignan saldos iniciales ni se trasladan fondos personales automáticamente.

Los movimientos se guardan en las tablas financieras existentes. Se pueden consultar en Dinero y abrir su gestión de origen.
Los traspasos entre la caja y cuentas personales cambian los saldos, sin sumar ingresos o beneficio.
El saldo disponible, ingresos, gastos y límites del resumen personal excluyen las cuentas de Gestiones.
Dinero conserva el registro completo y permite filtrar por cada cuenta.

- **Saldo de caja:** entradas reales menos salidas reales, incluyendo traspasos y cobros de deudas.
- **Cobrado:** cobros registrados menos devoluciones pagadas al cliente.
- **Pendiente de cobro:** precio acordado menos cobros brutos; solo reservado/vendido. Una devolución no inventa una deuda nueva.
- **Pagado:** compras y gastos adicionales registrados.
- **Pendiente de pago:** coste y gastos previstos menos pagos registrados. Las fichas canceladas no generan pendiente.
- **Stock:** coste y gastos del artículo disponible o reservado, descontando reembolsos recibidos del proveedor.
- **Margen previsto:** precio de artículos vendidos/asignados a amigos menos coste, gastos y devoluciones al cliente, más reembolsos del proveedor recibidos. No representa efectivo cobrado. Los cancelados no suman margen ni ventas acordadas; sus cobros/pagos reales se conservan.
- **Flujo de caja:** cobros y reembolsos recibidos menos compras, gastos y devoluciones pagadas. Excluye traspasos.

Los importes de ficha son previsiones hasta registrar/vincular el dinero real.
Un resumen desplegable utiliza las fichas visibles después de los filtros. Caja muestra el conjunto de ventas y amigos.

## Bonos

Registro independiente de persona, plataforma, aportaciones, recuperaciones, notas y resultado.
No crea ni vincula cuentas, movimientos o deudas. El servidor también impone esta separación.
Los valores originales de aportación y recuperación de bonos importados forman su base histórica informativa;
los registros posteriores se suman a esa base. No alteran saldos financieros.

## Importación

Subir un `.xlsx` de hasta 5 MB abre una vista previa. Importar requiere pulsar “Importar fichas seleccionadas”.
Las pestañas compatibles son las del archivo entregado: Marzo/Abril, Abril/Mayo, Junio/Julio, Agosto,
Septiembre/Octubre, Amigos HACOO y los tres grupos de bonos.

Se omiten ScanTap, filas sin artículo/plataforma y filas de fórmulas preparadas.
Cada ficha conserva pestaña, fila, celdas originales y advertencias. No se interpretan X, Banco, cambios o reembolsos ambiguos.
Las fechas sin contexto no se asignan. Las fechas originales siguen en las celdas de origen.
El seguimiento y la venta entran como “Por revisar”; no se consideran stock ni generan pendientes hasta confirmar su estado.
Color/talla combinados se conservan para revisión. Los posibles duplicados se señalan, sin fusionar.
El identificador combina huella del archivo, pestaña y fila: reimportar el mismo archivo no duplica fichas.
Un archivo modificado tiene una huella distinta; la vista previa vuelve a señalar posibles coincidencias.
Importar ventas/amigos no crea pagos, cobros ni movimientos históricos.

Comprobación con `ventas (1).xlsx`: 139 fichas (82 ventas, 24 amigos, 33 bonos), 3 posibles duplicados.
Por petición del propietario, solo se importan Septiembre/Octubre y Amigos HACOO: 39 fichas (15 y 24 respectivamente), sin crear movimientos ni modificar saldos. Script reproducible: `scripts/import-management-autumn-friends.mjs`; repetirlo no duplica las filas del mismo archivo.

## Arquitectura

- `src/lib/management.ts`: tipos y reglas económicas compartidas.
- `src/lib/management-import.ts`: lectura del Excel en servidor, carga diferida de ExcelJS.
- `src/app/api/management/route.ts`: sesión, perfil, validación, paginación y API.
- `supabase/management.sql`: tablas aditivas, índices, permisos y operación transaccional.
- `src/components/management-app.tsx`: navegación, búsqueda, filtros, fichas, caja y vista previa.
- `src/components/management-forms.tsx`: formularios y ventanas con foco nativo.
- `src/app/gestiones/management.css`: diseño adaptable y tokens de Aurum.

Las escrituras utilizan una función de base de datos con `SECURITY INVOKER`, accesible solo al servidor.
La sesión determina el perfil: el cuerpo de la petición no puede elegir otro usuario.
Un bloqueo por perfil serializa escrituras; claves únicas impiden duplicar un cobro por doble pulsación o reintento.
El servidor rechaza cobros que superen el pendiente, incluso al vincular movimientos o deudas y desde dispositivos distintos. Tampoco admite cobros en pedidos cancelados, por revisar o sin comprador. Los errores revierten la operación completa, incluidos los movimientos que se hubieran preparado.
La versión de ficha detecta conflictos entre dispositivos. Las tablas nuevas tienen RLS y ningún permiso público.

## Activación

El propietario autoriza la activación el 18 de octubre de 2026. `scripts/activate-management.mjs` aplica el esquema,
crea las dos cuentas vacías del perfil luden y comprueba que los saldos y movimientos existentes se conservan.
Las pruebas de base de datos utilizan una transacción que termina en rollback.
La importación del histórico sigue siendo una acción manual con vista previa.

Cuando se autorice la activación:

1. Aplicar `supabase/management.sql` con el procedimiento SQL existente del proyecto.
2. Publicar el código de esta rama.
3. Entrar en Gestiones, abrir Caja y pulsar “Crear caja de ventas”.
4. Probar una ficha temporal y un cobro; anular y archivar al terminar.
5. Importar el Excel desde la vista previa, seleccionando las filas que correspondan.

La migración es aditiva. Para retirar la función de la interfaz se puede volver al código anterior,
manteniendo las tablas y cuentas nuevas para conservar el historial. No eliminar tablas con datos para hacer rollback.

## Verificación

Caja deja Banco, Efectivo y movimientos visibles; las diez métricas y sus explicaciones están dentro de «Ver detalle de ventas y pagos». El reembolso marcado conserva el ajuste a 3,70 € y ofrece registrar/vincular el ingreso real por separado, sin crear dinero automáticamente. La ficha muestra cliente y nombre del paquete juntos. En móvil el resumen tiene tarjetas compactas y distingue «Ingresos menos gastos» del saldo disponible.

- `node --env-file=.env.local scripts/check-management.mjs`: recorrido económico real en una transacción revertida.
- `node scripts/check-management-import.mjs [archivo.xlsx]`: prueba del archivo entregado, sin importarlo.
- `npx tsc --noEmit`, ESLint y `npm run build`.
- Auditoría de interfaz local con datos interceptados: tamaños 320, 390, 768 y 1440 px; listas, formularios, ficha y caja.
- Queda la comprobación física en Safari de iPhone: teclado, áreas seguras y modo instalado no se prueban completamente con emulación.

Skills aplicadas: Apple Design, Caveman, React Best Practices, Responsive Design, Mobile Native,
Web Design Guidelines, Supabase y Supabase Postgres Best Practices. Las skills instaladas quedan disponibles en próximos turnos.

El análisis de dependencias encontró avisos altos preexistentes en Next.js y dependencias de herramientas.
Esta entrega no actualiza el framework completo. La nueva dependencia de Excel utiliza una versión corregida de UUID mediante un override acotado.
# Orden y organización de pedidos

- Caja → Añadir dinero: registra un traspaso desde BBVA, efectivo u otra cuenta personal de uso diario hacia Efectivo/Banco de Gestiones. Propone BBVA y Banco de Caja, permite cambiar origen/destino y conserva fecha/concepto. Las cuentas de ahorro se gestionan desde sus traspasos específicos en Dinero. El acceso Traspasar general sigue disponible.
- El fondeo no aumenta ingresos, gastos ni beneficio. Reduce el saldo de origen, aumenta la caja y conserva el dinero total; una compra posterior se registra como pago desde esa caja. Los reintentos conservan la misma clave de operación para evitar duplicados.

- Las fichas muestran Precio acordado, Coste total (artículo + teléfono + gastos) y Beneficio. Se retira Por cobrar de esta fila; se conserva el indicador de cobro y el registro de pago completo. En artículos de Ventas aún sin vender, la etiqueta es Beneficio previsto y no se suma ese importe al beneficio de ventas completadas.

- Alta simplificada: correo, artículo, persona, talla, importes y teléfono visibles; color/destinatario, estado/entrega, fechas/gastos y próximas acciones permanecen desplegables. No se han eliminado campos.
- Teléfono: número opcional y coste fijo de 0,66 € por pedido nuevo (Ventas/Amigos, no Bonos). `phone_cost` se guarda separado del coste del artículo y participa en coste total, beneficio y valoración de stock, pero no en pagos pendientes de Caja. Si hay varios artículos se reparte una única cuota al céntimo; editar una ficha conserva su parte. Los pedidos antiguos sin este campo mantienen su coste hasta que se editen.
- Reembolso recibido: el artículo queda en 3,70 €, pero `phone_cost` no cambia. Un artículo sin otros gastos mantiene un total de 4,36 €; los gastos adicionales también se conservan. Deshacer el reembolso restaura el coste del artículo sin borrar el teléfono. Guardar costes no crea movimientos de dinero.

- Amigos: cada pedido está asignado/vendido al amigo por defecto; no se ofrece Reservado/Vendido como selector. El precio acordado, la entrega al amigo y los cobros son independientes. Los estados antiguos de Amigos con comprador asignado siguen contando como pedidos comprometidos.
- Entrega independiente mediante `data.delivery_status` (opcional y compatible con el antiguo seguimiento Entregado). Marcar/deshacer entrega conserva el envío y no crea movimientos de dinero. La fecha de entrega se guarda o se limpia según el estado.
- Cobro en todos los pedidos: Sin cobrar / Cobro parcial / Cobrado, calculado a partir de registros reales no anulados. Precio cero no se considera cobrado. El formulario propone el importe pendiente y permite pagos parciales, efectivo/banco o vincular un cobro existente sin duplicarlo. El botón de cobro directo se desactiva al completarlo; las correcciones se hacen desde el historial.

- Estados visibles en lista y detalle con icono, texto y color: reembolso pedido (ámbar), recibido (verde), intercambio pedido (azul) y completado (verde). Las solicitudes activas aparecen primero en las etiquetas; el seguimiento y la venta mantienen sus estados independientes.
- Accesos rápidos a Todos/Reembolsos/Intercambios; los dos últimos incluyen tanto solicitudes como casos terminados. La lista muestra venta y pendiente; costes, importes completos, edición del seguimiento e historial se despliegan en el detalle. Los cambios de estado mantienen las operaciones existentes y no crean movimientos adicionales.
- Limpieza solicitada por el usuario: pedidos existentes retirados mediante borrado lógico, conservando eventos y movimientos financieros. La copia previa se guarda localmente en `work/backups/` y no se publica en Git.
- Los movimientos financieros se conservan tras eliminar un pedido, pero ya no ofrecen enlaces a una ficha retirada.

- Los ceros de una ficha Excel con avisos pendientes se muestran como «Sin confirmar» en lista/detalle. No se cambia el dato ni los cálculos. Tras «Marcar como revisado», se muestran también los ceros confirmados; los pedidos manuales y los importes distintos de cero mantienen su presentación. Estados idénticos se muestran una sola vez.

- En el detalle, cobrar/pagar y editar siguen visibles. «Más acciones» reúne reembolsos, intercambios, notas e incidencias; «Archivo y eliminación» despliega las acciones de archivo y borrado con su confirmación existente. Los filtros rápidos tienen una altura táctil mínima de 44 px.

- Encabezado simplificado: búsqueda y botones Filtros/Opciones. Los filtros rápidos y avanzados se despliegan con Filtros; Opciones contiene importar Excel, resumen, agrupación y alternancia lista/tarjetas. Añadir sigue visible arriba.

- Identificación: correo de compra destacado; en Amigos, después nombre y artículo con talla. En Ventas, correo y artículo con talla.
- «Eliminar pedido» en el detalle pide confirmación. Usa borrado lógico (`data.deleted_at`): se excluye de la API, las listas y los resúmenes, conservando eventos, movimientos financieros y clave de importación para evitar duplicados. La copia se puede recuperar mediante soporte; no se elimina dinero.

- Vista inicial de lista compacta; se puede alternar con tarjetas.
- Los pedidos añadidos en la web aparecen primero, por fecha de creación descendente. Editarlos no cambia su posición.
- En cada lote importado de Excel, las filas inferiores aparecen primero (número de fila descendente). No se modifican fechas ni importes originales.
- Agrupación opcional por cliente/amigo, estado u hoja de origen. Dentro de cada grupo se conserva el mismo orden.
- Reembolso e intercambio se despliegan en cada pedido. El detalle conserva todas las acciones y el historial.


## Pedidos para uso personal
Los pedidos normales nuevos se proponen como «Para mí» y con seguimiento «Pedido».
No necesitan precio de venta y no se consideran stock para vender ni margen previsto.
El pago real sigue registrándose en la cuenta de Caja elegida y se conserva en el flujo de caja.
Los pedidos de amigos mantienen el precio acordado y su entrega diferenciada.
Para vender un artículo personal más adelante, edita el pedido y elige «Para vender»; podrás indicar el precio y marcarlo disponible, reservado o vendido.
Los pedidos existentes y los estados históricos importados no se modifican automáticamente.

## Teléfono pagado fuera de Caja
El pago automático descuenta únicamente artículo y gastos adicionales. El teléfono sigue visible en cada pedido y en su coste económico total. No se crea otro gasto ni un pendiente de pago por los 0,66 €. La migración `management-phone-outside-cash.sql` corrige pagos automáticos anteriores solo cuando coinciden exactamente con su ficha original y movimiento propio; conserva el importe anterior en los detalles del registro.

## Uso personal y móvil · 19/10/2026
- Un único selector para pedidos: Para mí, Para Vinted o Para un amigo. Los datos y estados de los pedidos existentes se conservan. Vinted es la finalidad del pedido, no una conexión automática a esa plataforma.
- La lista Mis pedidos puede filtrarse entre personales y Vinted; Amigos conserva su apartado. El artículo es el título y el correo se puede volver a mostrar desde Opciones.
- Pedidos personales: no se muestra un comprador pendiente ni el botón de cobro. Poner en Vinted abre la edición antes de guardar el cambio.
- Costes: el total de Caja y la cuenta elegida aparecen al lado del botón de creación. El teléfono sigue separado y fuera de Caja. Email, color y teléfono quedan bajo Más detalles; destinatario sigue visible y separado.
- La sincronización de Gestiones se solicita cada 15 segundos mientras la página está visible, al recuperar el foco y al volver a ella. Se pausa mientras se edita o importa; las respuestas antiguas no pisan una lectura más reciente.
- Las listas muestran menos importes y acciones; el desglose, reembolsos, incidencias e historial siguen en cada ficha.
- Navegación principal móvil común: Hoy, Agenda, Dinero y Gestiones. Dinero conserva sus apartados en una barra secundaria. Se cubren orientación horizontal, teclado, objetivos táctiles y formularios de una columna.
- Hoy destaca la tarea actual con completar/editar y una próxima tarea, evitando repetirlas en la lista. Ahorro prioriza el total y el objetivo del mes; cuentas y otros meses son desplegables.
- Verificación: TypeScript, ESLint, pruebas existentes de lógica y renderizado de formularios personal/Vinted/amigos sin navegador. No se certifica renderizado físico de Safari/iPhone ni entrega real de avisos.

## Venta y envío de Vinted
Los artículos sin comprador muestran «Marcar vendido». Ese formulario guarda usuario, precio y fecha, sin registrar ingresos. A continuación queda disponible «Registrar cobro» para el dinero recibido en Caja.
El envío al comprador se guarda en `shipping_status` / `shipping_date`, separado de la recepción de pedidos personales y la entrega a amigos. Los registros antiguos marcados como entregados en Vinted se consideran ya enviados; poner un artículo personal en Vinted empieza con envío pendiente.
El color completo de Vinted corresponde a enviado y cobrado. En amigos sigue correspondiendo a entregado y cobrado, y en pedidos personales a recibido. Las fichas históricas con estados ya confirmados no quedan bloqueadas para cobrar solo por conservar notas de importación.

## Seguimiento coherente con el envío
Marcar un artículo de Vinted enviado actualiza a la vez seguimiento «Enviado» y venta «Vendido». Elegir Enviado desde el seguimiento hace lo mismo. Deshacer el envío devuelve su seguimiento a En casa, conservando la venta y los cobros reales. En los formularios, seguimiento y envío se actualizan juntos; los estados que deshacen la venta quedan bloqueados mientras siga enviado.
La API normaliza esta relación en todos los guardados. La migración `management-shipping-coherence.sql` corrige estados antiguos contradictorios y conserva una copia anterior en el historial; no crea ni cambia movimientos de dinero.


### Estados directos y reversibles
Las tarjetas permiten cambiar Pedido / En casa y, según el destino, Vendido / enviado (Vinted) o Entregado (amigos). Los pedidos personales solo muestran Pedido y En casa. En Vinted, vendido y enviado se registran juntos; se solicita el precio si falta. Pulsar el estado activo o retroceder solicita confirmación. Deshacer una venta conserva los cobros reales: el botón Cobrado permite anular el último cobro con confirmación independiente. Reembolsos e intercambios también piden confirmación para deshacer estados.

Los estados rápidos están plegados en «Cambiar estado del pedido», separado de reembolsos e intercambios. En Vinted el botón principal primero registra la venta y su precio; después ofrece «Vendido · Confirmar cobro». Solo la confirmación del cobro genera el ingreso real. Pulsar Vendido en los estados cuando ya está vendido también abre el cobro; retroceder a En casa permite deshacer la venta con confirmación.

### Corregir Caja y eliminar pedidos
Cada movimiento de Caja permite editar concepto, importe, fecha y cuentas, o eliminarlo con confirmación. Las correcciones actualizan también el registro del pedido asociado; eliminarlas anula ese registro y recalcula el saldo. El borrado de pedidos utiliza una operación atómica que anula sus movimientos propios, conserva los movimientos externos previamente vinculados y guarda historial. Los pedidos borrados anteriormente no se limpian retroactivamente: sus movimientos se pueden revisar desde Caja. Aplicar `supabase/management-cash-edit.sql` antes del despliegue.

### Sincronización y carga ligera · 20/10/2026

- Aplicar `supabase/management-sync.sql` antes de publicar esta versión. Solo añade infraestructura: no corrige ni modifica importes existentes.
- Editar importe, fecha o cuenta desde Dinero actualiza también el evento del pedido en la misma transacción. Eliminar el movimiento anula su evento, conserva la referencia original en el historial y permite cobrar de nuevo. No se permite convertir un cobro vinculado en gasto ni cambiar la deuda de un pago vinculado; tampoco superar el precio pendiente.
- Las escrituras financieras y las de Gestiones comparten un bloqueo por perfil. El control de versión de pedidos y de Caja sigue rechazando ediciones desactualizadas.
- Una revisión privada por perfil evita descargar datos completos cada 15 segundos cuando nada cambia. El resumen se lee de una instantánea coherente; no incluye pedidos eliminados ni sus eventos, ni copias extensas de auditoría.
- El historial completo se conserva en la base de datos y se solicita al abrir cada pedido. Los fallos muestran un reintento y una respuesta antigua no se mezcla con otro pedido. Los permisos de sesión y perfil se aplican también al historial y la revisión.
- Pruebas: `node --env-file=.env.local scripts/check-management.mjs` aplica esquema y datos temporales dentro de una transacción que siempre se revierte. Cubre teléfono fuera de Caja, edición/borrado por ambos apartados, deuda vinculada, sobrecobros, versiones desactualizadas, eliminación de pedidos, equivalencia de totales entre historial completo y compacto, aislamiento de perfiles y permisos públicos.
- Reversión: se puede volver al código anterior conservando las protecciones nuevas. Para desactivar esta infraestructura, primero volver al código anterior y después retirar únicamente los disparadores `aurum_management_write_lock`, `aurum_management_revision` y `aurum_management_ledger_sync` creados por esta migración; conservar tablas financieras, eventos e historial. No reejecutar migraciones de corrección de dinero.

Instalación verificada: `node --env-file=.env.local scripts/verify-management-sync.mjs --apply` aplica la migración dentro de una transacción y comprueba huellas de todos los registros. Sin `--apply`, solo verifica: prueba dos conexiones con escrituras de cero filas que se revierten para comprobar la serialización por perfil y mide el tamaño de las respuestas. `npm test` ejecuta las pruebas locales sin conexión. Con la web arrancada, `AUDIT_ORIGIN` y `AUDIT_PIN`, ejecutar `node scripts/check-management-access.mjs` comprueba las rutas nuevas sin escribir datos financieros.

Dependencias de producción actualizadas a Next 16.3.8, sharp 0.35.5 y source-map-js 1.2.2. `npm audit --omit=dev`: sin vulnerabilidades conocidas en esta revisión. Persisten avisos en la cadena de herramientas de ESLint; no se aplica la degradación incompatible sugerida por `npm audit fix --force`.
