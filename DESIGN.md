# luden · Interfaz Apple

Rediseño solicitado el 28-10-2026. Sustituye las decisiones visuales anteriores de estilo plano/Grafito; conserva producto, funciones y datos. Aplicación personal de uso frecuente en móvil, con referencia iPhone 12 de 390 × 844 CSS px y escritorio con barra lateral.

## Sistema visual

- Tipografía: sistema Apple en iPhone/Mac; en otros sistemas se usa Geist ya incluida y después Inter/system-ui. Sin distribuir SF Pro ni descargar otra fuente. Suavizado nativo del navegador; no forzar antialias que adelgace los caracteres.
- Ajuste del 28-10 tras feedback: texto base 16 px; títulos, conceptos e importes en 700; controles/etiquetas en 600, secundarios 13–14 px. Cortes por palabras en títulos/etiquetas; correos largos admiten ajuste por caracteres. La capa plana obsoleta de form-sheets se retiró para evitar conflictos de cascada.
- Claro: lienzo #F5F5F7, superficies blancas, texto #1D1D1F, secundario #68686E. El secundario es algo más oscuro que la referencia para conservar contraste en campos y fondos azulados.
- Oscuro: lienzo negro, superficies #1C1C1E, campos #2C2C2E, texto #F5F5F7. Acento de acción #0071E3; enlaces azules adaptados por tema. Verde para ingresos, rojo para gastos y errores; los estados de pedidos conservan su semántica independiente.
- Tokens de tema, radios, escala de espacios, sombra, materiales y movimiento en `globals.css`. Formas 12/20/24 px; botones de acción en píldora; tarjetas con elevación suave. Bordes de campo visibles, foco de 2 px y objetivos táctiles de al menos 44 px.
- Navegación y hojas con materiales translúcidos y blur de 20 px. `prefers-reduced-transparency` los hace opacos. No se animan filtros ni desenfoque.

## Composición y adaptación

En móvil la navegación compartida de cuatro áreas queda abajo, separada de las zonas seguras. Dinero conserva sus cinco apartados en controles segmentados y convierte su botón de añadir existente en un «+» flotante con el mismo nombre accesible y controlador. Desde 801 px se conserva la barra lateral y las cuadrículas amplias.

Los movimientos se adaptan al ancho de `.movement-month` con consultas de contenedor: bajo 700 px, un único menú de acciones; desde 700 px, botones directos y menú oculto. A 480/340 px se reorganizan columnas para texto, importe y menú. No elegir las acciones por el ancho global de ventana: una tarjeta de resumen puede ser estrecha en escritorio.

Pedidos: el contenido de cada tarjeta se estira al 100%, sin heredar alineación start que lo encoge. El workspace define una/dos/tres columnas con umbrales de contenido de 680/1040 px; iPhone 12/13 a 390 px permanece en una columna. Seguimiento, Cobro y Entrega conservan sus columnas interiores y ajustan textos largos.

Resumen: total con cifra protagonista, estadísticas secundarias y listas agrupadas. Cuentas, deudas y ahorro usan superficies y jerarquía comunes. Agenda conserva reloj, tareas, emojis funcionales y acciones. Pedidos conserva correo, artículo, destinatario, importes y estados, junto con los controles existentes dentro de Estado.

Las hojas usan cabecera/pie estables, scroll interior y los mecanismos existentes de bloqueo del fondo y encuadre del teclado. Inputs de 16 px, sin bloquear el zoom. El menú de periodo permanece en los tres puntos.

## Movimiento y accesibilidad

Entrada por opacidad y desplazamiento corto, escalonado acotado de tarjetas, pulsación a 0,97 y hojas con curva suave. El componente `AnimatedAmount` cuenta una copia decorativa: el texto accesible siempre conserva el importe exacto proporcionado por el cálculo existente. `MotionRow` mantiene el mismo div y sus clases; al salir dibuja una copia inerte de 180 ms y la retira. Ninguna animación modifica, espera ni reproduce una operación financiera.

`prefers-reduced-motion` desactiva entradas, escalas y contadores. Contraste de tokens comprobado con 60 combinaciones claro/oscuro. No interpretar esa comprobación como una auditoría visual o de VoiceOver completa.

## Fuentes y límites

`apple-interface.css` es la capa final de presentación después de `form-sheets.css`; mantiene compatibilidad con los estilos de ruta de Gestiones mediante alcance específico. No añadir otra capa de rediseño: editar esta. `layout.tsx` conserva viewport/PWA y actualiza solo la importación visual y los colores del navegador. Se reutiliza `manifest.webmanifest` con sus rutas e iconos existentes.

No se ha usado navegador ni dispositivo físico en esta revisión.

Referencias consultadas: [tipografía](https://developer.apple.com/design/human-interface-guidelines/typography), [botones](https://developer.apple.com/design/human-interface-guidelines/buttons) y [listas](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) de Apple HIG. Se aplica su jerarquía y adaptación; la web no usa componentes nativos de UIKit.


## Horas y símbolos · 29-10-2026

- `time-picker.tsx`: campo compacto con dos ruedas en línea, formato 24 horas y todos los minutos. Listo/Enter confirma; Escape o cerrar el campo descarta; salir del control confirma antes de guardar el formulario. Se conserva un input nativo para validar los campos obligatorios. Las horas se guardan con los mismos callbacks HH:mm; Ahora sigue tomando Madrid. La hora de fin opcional se puede borrar.
- Mismo componente en tareas, rutinas semanales y ajustes puntuales. Ruedas con scroll nativo, snap de 44 px, teclado (flechas, Inicio/Fin, páginas y números), etiquetas y opción seleccionada. No depende de una ventana emergente del sistema ni añade bibliotecas.
- Los símbolos de categorías usan Lucide existente, vectores de trazo uniforme y diez tonos adaptados a claro/oscuro. Los archivos propietarios de SF Symbols no se distribuyen. El color identifica la categoría; el importe sigue identificando ingreso/gasto.
- Referencia: [Pickers de Apple](https://developer.apple.com/design/human-interface-guidelines/pickers). `check-time-picker.mjs` comprueba las interacciones con DOM simulado y `check-contrast.mjs` verifica también el contraste gráfico de los símbolos (3:1). Sin comprobación física en Safari/VoiceOver.

## Páginas públicas (landing, login, registro)

Estilo editorial distinto del interior de la app: fondo papel cálido (#FAFAF7, alterno #F2F1EC), titulares en Schibsted Grotesk de peso normal, texto en la fuente del sistema, bordes finos en lugar de sombras, botones rectangulares de 10 px y un único color de marca (#2457E6, oscuro #173A9E para los bloques de producto). Logo: una «l» y un punto blancos sobre un cuadrado redondeado de color plano. Estilos en `src/app/public.css`; el logo en `src/components/logo.tsx` y `public/brand/logo-mark.svg`.

## Interior de la app (desde el 18-11-2026)

La app usa la misma estética que la web mediante `src/app/app-editorial.css`, cargada al final: fondo papel cálido en claro (#FAFAF7) y casi negro en oscuro (#0E0E10), bordes finos en tarjetas, esquinas de 10–16 px, botones rectangulares de 10 px, controles segmentados con pista blanca y elemento seleccionado en relieve, títulos de página en Schibsted Grotesk y azul de marca #2457E6. El tema por defecto sigue al sistema («Automático»). La cabecera de cada pantalla aparece con un fundido sin desplazamiento: un `transform` en un antecesor atraparía el botón flotante «+».
