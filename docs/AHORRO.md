# Ahorro mensual

Resumen, Cuentas y Ajustes permiten abrir «Organizar mi ahorro». El objetivo inicial es 200 por mes en la divisa de registro. Se puede elegir cualquier mes, cambiar su objetivo y guardar dinero para él antes de que empiece. El total es el saldo real de todas las cuentas de tipo Ahorro, incluidos sus saldos iniciales.

«Guardar para este mes» crea un traspaso desde una cuenta normal a una cuenta de ahorro. La fecha del movimiento es la fecha real; `savings_month` indica a qué objetivo cuenta. El traspaso aparece en Movimientos, puede editarse o eliminarse y no cuenta como ingreso ni gasto. Los formularios aceptan punto o coma decimal.

El progreso mensual es el ahorro neto: aportaciones menos retiradas. Un traspaso entre dos cuentas de ahorro no lo aumenta. Los movimientos antiguos sin `savings_month` cuentan para el mes de su fecha. Las cantidades históricas se asignan directamente al mes mediante `__aurum_savings_allocation__:ID:AAAA-MM:credit|debit`; el saldo inicial técnico de una cuenta no aparece en la interfaz ni interviene en el cálculo mensual. Al registrar una retirada desde ahorro, se puede elegir el mes al que restarla.

## Cuentas y saldo disponible

Las cuentas normales son BBVA, Efectivo y Cripto. Dentro de Ahorro mensual están Ahorro · Revolut, Ahorro · Cripto y Ahorro · Efectivo; sus identificadores son distintos a los de las cuentas normales. En Resumen, Saldo disponible excluye todas las cuentas de tipo Ahorro. La tarjeta Ahorro total sustituye a Gastos hormiga; el etiquetado y filtro de gastos hormiga en Movimientos se conservan.

El 12 de octubre se corrige la etiqueta de la tarjeta bancaria de ahorro: utiliza el nombre guardado («Ahorro · Revolut») en lugar de mostrar BBVA de forma fija. El BBVA normal no cambia. No se modifican identificadores, saldos ni movimientos; los selectores de traspaso ya utilizan el nombre guardado.

En Movimientos → Traspaso se puede mover dinero entre cualquiera de estas cuentas. El botón Traspasar de una cuenta de ahorro abre el mismo formulario con esa cuenta de origen. Los traspasos entre ahorros cambian el reparto, no el ahorro total ni el progreso mensual. Las retiradas aumentan el disponible y reducen el ahorro; las aportaciones hacen lo contrario.

En Movimientos → Traspaso → Entre meses se puede reasignar una cantidad de un objetivo mensual a otro. Por ejemplo, de noviembre a octubre o de octubre a septiembre. Esta operación no mueve dinero entre cuentas, no crea ingresos ni gastos y no cambia el ahorro total; solo resta la cantidad del mes de origen y la suma al mes de destino. No se permite trasladar más de lo disponible en el mes de origen.

Al elegir un mes, las tarjetas Efectivo, Cripto y Revolut muestran únicamente cuánto ahorro de ese mes corresponde a cada cuenta. El total superior sigue mostrando el dinero físico reunido entre todas las cuentas. Los nuevos traspasos entre meses conservan también la cuenta de ahorro de origen para que el reparto mensual sea exacto.

El 13 de octubre se asignó el traspaso anterior de 180 € a sus cuentas originales sin cambiar ningún saldo: 170,60 € de Efectivo y 9,40 € de Revolut. El objetivo de septiembre quedó en 200 €. También se trasladaron los 7 € de noviembre a octubre. Tras comprobar los datos reales, el reparto queda en septiembre 180 €, octubre 17 € y noviembre 0 €; faltan 3 € reales para poder completar septiembre sin dejar octubre en negativo.

El 17 de octubre se retiró la atribución mensual basada en saldo inicial. El reparto confirmado queda en septiembre con 188,60 € de Efectivo y en octubre con 75 € de Revolut y 20 € de Cripto; Efectivo en octubre y las tres cuentas en noviembre quedan a cero. BBVA no se modifica. Las antiguas claves `__aurum_savings_opening__` permanecen inertes durante la ventana de compatibilidad y pueden utilizarse únicamente para rollback.

`node --env-file=.env.local scripts/setup-savings-pockets.mjs` es una operación puntual autorizada, no parte del despliegue. Se ejecuta en una transacción con precondiciones, comprueba el ajuste exacto del efectivo y la conservación del historial, y guarda un marcador para que repetirla no duplique cuentas ni traspasos. Mantiene el ID de Ahorro Efectivo (renombrada), crea las cuentas faltantes con saldo cero y conserva todos los movimientos previos. Para revertir inmediatamente: retirar solo la atribución, conciliación y marcador creados; retirar el traspaso de octubre creado por esta operación; deshacer el ajuste de +20 del saldo inicial de Efectivo; restaurar el nombre antiguo y eliminar únicamente las cuentas nuevas vacías. Si hay movimientos posteriores, conservarlos y conciliar con traspasos compensatorios, nunca borrar historial del usuario.

## Objetivos y persistencia

Las cuentas de tipo Ahorro se gestionan dentro de «Organizar mi ahorro», no como tarjetas independientes en Cuentas. «Dónde está mi ahorro» muestra su saldo real y permite indicar Efectivo, Banco o Cripto. El nombre identifica el banco (por ejemplo «Ahorro BBVA»). Se conserva el saldo existente sin crear un movimiento nuevo ni duplicarlo en el total. La ubicación se guarda por ID en `__aurum_savings_location__:ID` (1 efectivo, 2 banco, 3 cripto). Antes de configurarla se propone por el nombre de la cuenta. No se incluyen como ahorro los saldos de las cuentas normales.

Se reutiliza `luden_budgets`, que ya guarda límites y configuración financiera, con claves separadas:

- `__aurum_savings_default__`: importe inicial de 200.
- `__aurum_savings_goal__:AAAA-MM`: objetivo guardado de un mes.
- `__aurum_savings_template__:AAAA-MM`: importe recurrente desde esa fecha.

«Usar también para próximos meses» guarda una plantilla desde el mes siguiente al elegido. Las plantillas tienen fecha para no cambiar objetivos anteriores. Un objetivo guardado explícitamente para otro mes tiene prioridad. Al cargar datos se fija el objetivo del mes actual sin sobrescribir uno existente. Las claves se excluyen de la lista normal de límites. La copia de datos exportada incluye los objetivos y el mes de cada aportación.

## Preparación y comprobación

Antes de publicar: `node --env-file=.env.local scripts/apply-monthly-savings.mjs`. Aplica `supabase/monthly-savings.sql`, añade la columna opcional y los objetivos iniciales sin reescribir movimientos. Comprueba que los datos financieros anteriores se mantienen. Los permisos privados y las rutas protegidas por PIN no cambian. Para instalaciones nuevas, ejecutar también esta preparación después de crear las tablas financieras.

`node scripts/check-savings.mjs` prueba cálculos, anticipos, retiradas, transferencias internas, decimales, plantillas fechadas y cambios de año. Con servidor local, `AUDIT_ORIGIN` y `AUDIT_PIN`, `node scripts/verify-savings.mjs` prueba dos sesiones con cuentas y movimientos temporales y los elimina. No modifica saldos ni movimientos del usuario.

El despliegue es compatible con clientes anteriores: la nueva columna es opcional y las claves de ahorro permanecen fuera de los límites. Para un rollback se conservan columna y objetivos; no es necesario borrar datos. Recargar las pestañas abiertas para utilizar la nueva interfaz.
