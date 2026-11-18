# Mi día, rutinas y Aurum

`/hoy` muestra actividad actual, siguiente actividad, horario y progreso. `/rutinas` permite crear, editar y eliminar bloques recurrentes. `/dinero` conserva la gestión financiera de Aurum. El horario utiliza Europe/Madrid.

## Datos y acceso

Los nuevos datos se guardan en las tablas `luden_day_*`; no se migran ni sustituyen movimientos financieros. Los endpoints requieren una sesión firmada de 30 días en una cookie HttpOnly. Las tablas financieras, de configuración, widgets y notificaciones no son accesibles con las claves públicas. Dinero usa el proxy privado `/api/finance/*`.

Los recordatorios de deudas se gestionan dentro de Dinero y son independientes de los avisos de actividades: [Avisos de dinero](AVISOS-DINERO.md).

`supabase/day.sql` y `scripts/apply-day.mjs` preparan las tablas y el horario inicial adaptado del ZIP. La preparación es repetible: no reemplaza las rutinas que hayas editado y conserva las claves de notificaciones existentes. Requiere `.env.local` con las variables de Supabase y Postgres del proyecto. No subas ese archivo a GitHub.

## Notificaciones de iPhone

Añade la web a la pantalla de inicio y ábrela desde el icono. En Hoy, entra en Ajustes y pulsa Activar avisos. iOS 16.4 o posterior admite Web Push para apps instaladas. La opción envía una notificación de prueba. El permiso depende del dispositivo y no se sincroniza entre móviles.

Supabase ejecuta el trabajo `aurum-routine-notifications` cada minuto mediante `pg_cron` y `pg_net`. Llama a `/api/notifications/dispatch` con un secreto guardado en la base de datos. Los avisos se deduplican por dispositivo, actividad y día. Las actividades completadas no generan aviso. Una actividad debe tener activada la opción de avisar. Los permisos, modos de concentración, conexión y servicios de Apple pueden retrasar la recepción; no se garantiza una alarma exacta al segundo.

Si cambia el dominio de producción, actualiza la URL del trabajo en `scripts/apply-day.mjs` y vuelve a ejecutarlo. No regeneres las claves VAPID de una instalación con dispositivos suscritos.

## Scriptable

En Ajustes de Mi día, pulsa Preparar mi widget. Copia el script a uno nuevo en Scriptable, llámalo Aurum · Mi día y ejecútalo. Añade un widget de Scriptable a Inicio o Bloqueo y selecciona el script. No necesita una cuenta distinta ni pegar credenciales de Supabase.

En el widget mediano, la actividad actual ocupa aproximadamente el 60 % de la izquierda y la siguiente el 40 % de la derecha. El ancho y la jerarquía tipográfica se adaptan a los tamaños habituales de iPhone. Si ya tenías el widget instalado, prepara uno nuevo y sustituye el código del script anterior para recibir este diseño.

El widget rectangular de la pantalla bloqueada muestra el progreso, la actividad actual, un contador destacado y la hora de la siguiente actividad. iOS aplica su apariencia monocroma para integrarlo con el fondo y el estilo del reloj.

El script contiene un token de solo lectura para el horario, válido hasta un año. No muestra el PIN ni contiene claves administrativas. Desvincular widgets revoca todos estos tokens. El widget conserva la última lectura para fallos de conexión y pide actualizarla cuando queda obsoleta. iOS controla el momento de refresco; Scriptable no envía los avisos de la web.

## Verificación

- `node scripts/check-day.mjs`: zona horaria, cambio de hora, medianoche y horarios vacíos.
- `node scripts/check-finance.mjs`: cálculos financieros.
- `node scripts/verify-day.mjs`: servidor local, PIN, sesión, CRUD de rutinas, widget y WebKit. Crea una rutina temporal y la elimina al terminar; no modifica movimientos financieros. Playwright se instala por separado; se puede indicar su módulo con `PLAYWRIGHT_MODULE`.
- `npm run build` y `npm run lint`.

La recepción real de Web Push y el widget deben comprobarse en el iPhone después de conceder permisos y configurarlo. Las simulaciones de WebKit no sustituyen esa comprobación.
# Rutina personal

## Planes puntuales

En Hoy y Rutinas, «Cambiar mi día» permite añadir un plan o ajustar actividades para una fecha. Hoy/Mañana son accesos rápidos. Antes de guardar se muestran las actividades interrumpidas, el horario adaptado y dónde se retoma. Los ajustes se calculan en la app, sin proveedor externo ni coste por uso.

Los planes ocupan únicamente su franja del día seleccionado. Se recortan o pausan los bloques que coinciden; si queda tiempo del bloque interrumpido, se retoma al terminar. No se retrasa el resto de la jornada ni se recupera automáticamente el tiempo perdido. Se pueden añadir planes en fines de semana libres. Por ahora cada plan debe empezar y terminar el mismo día. Editar o eliminar un plan recalcula la vista sin modificar la rutina recurrente.

Datos: columnas opcionales `plan_date` y `end_time` en `luden_day_blocks`, manteniendo los identificadores, progreso y permisos existentes. Una restricción GiST impide planes simultáneos incluso entre dispositivos. `blocksFor` es la única función que adapta el horario para la web, los avisos y Scriptable. Los avisos se calculan después de aplicar todos los planes, incluidos los que no tienen aviso propio. Se mantiene como máximo un aviso por actividad y día (retomar no duplica uno ya enviado).

Despliegue: aplicar `supabase/day-plans.sql` antes de publicar el código; `scripts/apply-day.mjs` también lo incluye para instalaciones nuevas. Es aditivo e idempotente. Las rutinas originales no se reescriben. Para volver a una versión sin planes, exportar y retirar únicamente los registros con `plan_date` antes del rollback; no borrar las columnas ni las rutinas. Clientes anteriores deben recargar la web tras actualizar. Widgets ya instalados siguen leyendo el horario adaptado; para el nuevo contador de fin de plan, regenerar el script desde Ajustes.

Pruebas: `node scripts/check-day-plans.mjs` verifica interrupciones, reanudación, cancelación, múltiples planes y fines de semana. `scripts/verify-day-plans.mjs` usa un servidor local (puerto 3103 por defecto), PIN en `AUDIT_PIN` y Playwright de `work/qa-runtime`; prueba la API con un plan temporal sin avisos en 2099 y lo elimina, después comprueba ocho diseños WebKit con datos simulados. No modifica las finanzas.

Horario actualizado el 5 de octubre de 2026: 20 actividades de lunes a viernes, desde levantarse a las 07:00 hasta dormir a las 23:45. Sábado y domingo libres. La plantilla está en `scripts/day-seed.json`; la app lee el horario editable guardado en la base de datos, no sobrescribe cambios al desplegar.

## Cambios por día

«Entro más tarde» conserva la salida de FP y permite desplazar despertar, desayuno, preparación y salida de casa manteniendo sus duraciones. «No hay clase» quita FP y los desplazamientos, dejando tiempo libre. «Cambiar actividades» permite renombrar, mover o quitar cualquier actividad de esa fecha. «Ceno fuera» abre un plan de comida editable; su franja pausa lo que coincida.

Tocar una actividad en Hoy o en el calendario abre sus cambios para ese día. «Todas las rutinas» y «Editar la rutina semanal» modifican la repetición. «Restaurar rutina de este día», seguido de Guardar, retira los cambios de esa fecha y conserva sus planes puntuales.

Los cambios se guardan en `luden_day_changes` (RLS y acceso exclusivo del servidor), con fecha, ajustes y revisión. La API rechaza actividades desconocidas, horas inválidas, solapamientos de rutina y escrituras sobre una revisión antigua. Una petición guarda el conjunto de ajustes de la fecha de forma atómica. Las horas de fin originales se conservan al quitar actividades, por lo que los huecos quedan libres. Los planes puntuales se aplican después, con el mismo cálculo en web, notificaciones y widget.

Aplicar `node --env-file=.env.local scripts/apply-day-changes.mjs` antes de publicar esta versión. La tabla es aditiva; el script verifica permisos y que la rutina siga intacta. `scripts/check-day-changes.mjs` prueba el cálculo; `scripts/verify-day-changes.mjs` prueba dos sesiones, editar, restaurar, conflictos de revisión y limpieza de un día temporal. Requiere servidor local, `AUDIT_ORIGIN`, `AUDIT_PIN` y `.env.local`.

Huecos completados: vuelta del instituto 14:45–15:00, descanso 21:30–21:45 y recoger el cuarto 21:50–22:00, tras cinco minutos para lavarse los dientes. El horario anterior y su progreso se conservaron en una copia privada `routine_backup_2026-10-05T19:28:46.132Z` dentro de `luden_app_config`. Las finanzas no se modificaron.

