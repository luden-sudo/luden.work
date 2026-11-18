# Avisos de dinero y revisión móvil

Hoy y Rutinas también revisados en tamaños de iPhone 12 y con texto ampliado. En Rutinas, el catálogo semanal se conserva en una sección plegable, evitando mostrar dos listas completas de actividades. Respeta movimiento reducido, foco de teclado y mantiene la edición al desplegarla.

## Uso

En **Dinero → Deudas → Avisos** (también en Ajustes), activa los recordatorios en cada dispositivo que deba recibirlos. Elige una hora de Madrid. Se envía un resumen diario solo cuando hay deudas pendientes, también sin fecha límite. Primero se muestra la deuda con vencimiento más próximo; las demás se cuentan en el mismo aviso.

Por privacidad, nombres e importes están ocultos al principio. Activa **Mostrar nombres e importes** para recibir mensajes como «Iván te debe 15,00 €». Se calcula el importe restante después de todos los pagos registrados, no el total original. Las deudas saldadas quedan excluidas. No se cambia ningún saldo al enviar un aviso.

En iPhone requiere iOS 16.4 o posterior: Safari → Compartir → Añadir a pantalla de inicio; abrir Aurum desde ese icono y permitir las notificaciones al pulsar Activar. Concentración y los ajustes de iOS pueden retrasarlas o silenciarlas. La prueba se solicita con un botón: no se pide permiso al entrar. Los avisos de rutina y de dinero se activan y desactivan por separado; cerrar sesión no cancela una suscripción ya autorizada, para cancelarla hay que desactivar los avisos.

Al tocar un aviso se abre directamente Dinero → Deudas. Si la sesión caducó, se pide el mismo PIN antes de mostrar los datos.

## Implementación y despliegue

- Se reutilizan VAPID, `/api/notifications`, el service worker y el cron existente `aurum-routine-notifications`, que llama al dispatcher cada minuto. No se añade otro cron ni otro proveedor.
- `supabase/finance-notifications.sql` añade preferencias por dispositivo y una tabla privada de entregas con clave única `(subscription_id, day)`. El consentimiento de rutina previo se conserva; el cliente anterior sigue funcionando. Los nuevos dispositivos que solo activan Dinero no reciben Rutinas.
- Aplicación: `node --env-file=.env.local scripts/apply-finance-notifications.mjs`. Repetible; verifica huellas de todos los datos financieros/rutinas, RLS, permisos y cron sin imprimir claves.
- Lecturas del recordatorio paginadas, divisa de Ajustes, cálculos en céntimos. Ventana de envío: los primeros 10 minutos de la hora elegida. Como máximo un resumen por día de Madrid y dispositivo, incluso con llamadas concurrentes. Un fallo transitorio libera la entrega para reintentar dentro de esa ventana; 404/410 retiran la suscripción caducada. TTL de 10 minutos para evitar avisos antiguos acumulados.
- Si el servicio queda inaccesible durante toda la ventana, no se envía un aviso atrasado: se reanuda al día siguiente. No se garantiza una entrega exacta al segundo ni que iOS muestre un aviso silenciado.
- Tablas sin acceso `anon`/`authenticated`; solo el servidor con sesión PIN o dispatcher con secreto puede consultar los avisos. No hay claves privadas en el navegador. La navegación del service worker permite únicamente Hoy y Deudas.
- Reversión: volver al código anterior y conservar la ampliación de esquema. No borrar datos/columnas; la ampliación es compatible. Desactivar `finance_enabled` evita futuros recordatorios; no afecta a Rutinas.

## Comprobaciones

`node scripts/check-finance-notifications.mjs` prueba importes parciales, cobros/pagos, deudas saldadas, céntimos, privacidad, zona de Madrid y cambio de hora, autorización, validación del destino, separación de consentimientos, deduplicación, reintentos y enlaces seguros. Se usan suscripciones aisladas simuladas, no se envían avisos a dispositivos reales durante las pruebas.

Revisión visual con WebKit: 360×780 (12 mini), 390×844 (12/12 Pro), 428×926 (12 Pro Max), 844×390 horizontal y 1280×900 escritorio; claro/oscuro y texto ampliado al 125%. Dinero: Resumen, Movimientos, Cuentas, Deudas, Límites, Ajustes, avisos y formularios. Sin desbordamiento horizontal en las comprobaciones. Nombres largos de deuda ahora a ancho completo, importe separado debajo; aviso compacto junto al filtro; ahorro eliminado de Ajustes para no duplicarlo. Se conservan navegación, colores semánticos y márgenes seguros, con controles principales de al menos 44 px. No equivale a una prueba física de recepción en un iPhone.

La revisión aplica Apple Design: jerarquía clara, texto adaptable, objetivos táctiles cómodos, protección de contenido sensible y permisos contextuales. Referencias: [Accesibilidad](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Tipografía](https://developer.apple.com/design/human-interface-guidelines/typography), [Color](https://developer.apple.com/design/human-interface-guidelines/color), [iOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-ios), [Notificaciones](https://developer.apple.com/design/human-interface-guidelines/notifications), [Gestionar avisos](https://developer.apple.com/design/human-interface-guidelines/managing-notifications), [Navegación](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets). Requisitos web push: [WebKit, iOS 16.4](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
