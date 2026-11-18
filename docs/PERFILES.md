# Perfiles y cuentas

Cada persona tiene un **perfil** con sus propias tablas (`<perfil>_accounts`, `<perfil>_transactions`, …). El perfil original usa las tablas `luden_*`. Las sesiones van firmadas en una cookie HttpOnly e incluyen el identificador del perfil; el servidor lo comprueba en cada petición.

## Registro con usuario y contraseña

- `/register` crea la cuenta mediante `luden_register_user` (ver [user-accounts.sql](../supabase/user-accounts.sql)): guarda el usuario con la contraseña cifrada (scrypt con sal) y crea las tablas privadas del perfil, sus claves foráneas y los disparadores de Gestiones en una sola transacción.
- `/login` comprueba usuario y contraseña. Los intentos están limitados por dirección (10 cada 15 minutos).
- `REGISTRATION_DISABLED=1` cierra el registro sin afectar a las cuentas existentes.

## Acceso heredado con PIN

Los perfiles creados antes de las cuentas pueden seguir entrando con un PIN de 6 cifras:

- `LEGACY_PROFILES` lista esos perfiles (`id:Nombre,id:Nombre`).
- El perfil `luden` usa `APP_PIN`; el resto guarda un hash scrypt en `luden_app_config` con la clave `profile_pin:<id>`.
- Desde **Ajustes → Cuenta y acceso** se puede crear un usuario y contraseña para un perfil con PIN, sin mover datos.

## Separación de datos

El cliente nunca consulta la base de datos directamente: todas las operaciones pasan por las rutas `/api/*`, que resuelven la tabla del perfil autenticado con `profileTable`. Los avisos de un dispositivo pertenecen a un único perfil; al iniciar sesión se retiran de los demás.
