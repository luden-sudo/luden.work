# Agenda libre y registro de Apple Pay

## Agenda de luden

luden usa tareas puntuales: nombre, fecha y hora de inicio. La hora de fin es opcional. El acceso principal abre directamente el formulario; Hoy, Mañana, Otro día y Ahora reducen los pasos en el móvil. Tipo, nota y avisos quedan en Más opciones. Las opciones de clase, cena y modificación de rutina no se muestran en este perfil.

Una tarea sin fin no reserva una duración, no pausa otras actividades y no recibe una hora de fin inferida. Puede marcarse completada. La actividad actual deja de mostrarla al completarse o al empezar otra; las tareas anteriores siguen visibles en el día para revisarlas. Una tarea no se arrastra como actividad actual al día siguiente. Las rutinas semanales de los otros perfiles conservan su funcionamiento.

Antes de publicar, aplicar `supabase/open-ended-tasks.sql`: permite fin nulo y limita la exclusión de solapamientos a eventos con duración explícita. La rutina anterior de luden se reinicia una vez por petición del usuario, conservando una copia privada en `luden_app_config`, clave `task_agenda_reset_v1`. Esa operación no forma parte de despliegues posteriores.

## Apple Pay y BBVA

El usuario eligió BBVA. En Dinero, Ajustes, Apple Pay se puede generar una clave privada, copiar la dirección de importación y seguir las instrucciones para crear una automatización de Atajos. La clave solo permite añadir gastos a la cuenta bancaria BBVA de luden; no autoriza pagos, lecturas ni acceso a los otros perfiles. No se guarda la clave en texto en la base de datos ni en el repositorio. Caduca al año y puede revocarse o sustituirse desde Ajustes.

Aplicar `supabase/apple-pay-import.sql` antes de publicar. La función privada `luden_import_apple_pay` valida la clave y la divisa y guarda movimiento y recibo de importación en una transacción. El identificador de evento debe conservarse al reintentar; un bloqueo transaccional y una clave única evitan duplicar el mismo envío. Reutilizar el identificador con otro contenido genera conflicto. Borrar un movimiento no permite que un reintento lo vuelva a crear.

Atajos envía JSON a `POST /api/apple-pay/import`, con cabecera `Authorization: Bearer CLAVE`. Los campos obligatorios son `amount`, `currency`, `merchant` y `event_id`. Se exige importe positivo con hasta dos decimales, comercio no vacío y moneda coincidente con Ajustes. No hay conversión automática. Si Atajos no proporciona un campo, debe solicitarlo; no se inventan importes ni monedas.

Los registros se guardan como gastos en Compras, con el título Apple Pay · comercio y fecha de recepción en Madrid. El puente recibe datos de Atajos y no verifica el extracto o la liquidación bancaria. Hay que comprobar que la automatización entrega los datos correctos con un pago real; no se importan pagos ficticios para probarlo. Si el pago falla o tiene otro importe definitivo, se corrige o elimina el movimiento normal.

### Opciones investigadas

- **Atajos**: es la opción preparada. Apple permite activar una automatización al acercar una tarjeta de Cartera y enviar JSON a una API. Requiere configuración en el iPhone; generar la clave no activa la automatización.
- **Conexión bancaria**: un proveedor de open banking puede recuperar movimientos con consentimiento. Requiere integración, credenciales del proveedor y comprobar cobertura y condiciones. No se ha contratado ni activado un proveedor.
- **FinanceKit**: está orientado a apps nativas autorizadas y cuentas elegibles de EE. UU. y Reino Unido; no proporciona acceso directo a Cartera desde esta web en España.

Fuentes oficiales: [activador de transacción](https://support.apple.com/es-es/guide/shortcuts/apd65c67538a/ios), [solicitudes JSON desde Atajos](https://support.apple.com/es-es/guide/shortcuts/apd58d46713f/ios), [FinanceKit](https://developer.apple.com/financekit/), [conexión bancaria Tink](https://docs.tink.com/entries/articles/setup-and-integrate-transactions). La documentación de [BudgetBakers](https://support.budgetbakers.com/hc/en-us/articles/26593713953554-Apple-Pay-Integration) muestra el uso de las variables Importe y Comercio en su propia integración con Atajos; Aurum usa su propia API.
