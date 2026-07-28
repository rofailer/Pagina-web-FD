# Operación segura y respuesta a secretos expuestos

Esta guía complementa el README. Está dirigida a quienes administran el despliegue, MySQL y el repositorio remoto de Firmas Digitales FD.

## Principios

- Trata cualquier secreto confirmado alguna vez en Git como comprometido, aunque el archivo ya haya sido eliminado.
- Rota primero las credenciales activas; limpiar el historial no invalida copias, clones o registros existentes.
- Usa valores diferentes por entorno y guárdalos únicamente en el gestor de secretos del proveedor.
- Prueba restauraciones de copias de seguridad en un entorno aislado.
- No publiques credenciales, hashes, llaves privadas ni volcados SQL en issues, chats o logs.

## Alta de producción

1. Crea una base y aplica `firmas_digitales_v2.sql`. Para una instalación existente, confirma y migra primero la columna `users.session_version`.
2. Crea un usuario MySQL exclusivo para la aplicación.
3. Concede únicamente los permisos DML que requiera la aplicación. No uses `root`, privilegios globales ni permisos `ALTER`.
4. Configura `DB_SSL_MODE=verify-identity` y la CA del proveedor cuando estén disponibles. Usa `verify-ca` si el servicio no permite validar el nombre del host.
5. Genera un `JWT_SECRET` aleatorio de al menos 32 bytes y exclusivo del entorno.
6. Define `CORS_ORIGINS` solo con los orígenes HTTPS reales, sin rutas.
7. Configura las cuotas de cargas y generación de llaves según la capacidad del servicio.
8. Si las cuentas seed continúan pendientes, carga `INITIAL_ADMIN_PASSWORD` e `INITIAL_OWNER_PASSWORD` desde el gestor de secretos.
9. Despliega, inicia sesión en cada cuenta seed y cambia inmediatamente sus contraseñas.
10. Elimina las variables `INITIAL_*` después de comprobar que ya no son necesarias.
11. Ejecuta las pruebas y verifica que `/health` no exponga información interna.

## Rotación después de una exposición

### 1. Contener

1. Restringe temporalmente el acceso al despliegue si hay señales de uso no autorizado.
2. Conserva registros relevantes con acceso limitado.
3. Identifica entornos, ramas, tags, forks, despliegues y copias que pudieron recibir el secreto.

### 2. Rotar MySQL

1. Crea un usuario nuevo de mínimo privilegio con una contraseña aleatoria.
2. Actualiza `DB_USER` y `DB_PASSWORD` en el gestor de secretos.
3. Redespliega y comprueba `/health`, inicio de sesión, firma y verificación.
4. Revoca o elimina el usuario anterior.
5. Revisa conexiones, exportaciones y consultas anómalas durante el periodo de exposición.

Cambiar únicamente `DB_PASSWORD` en el archivo local no protege otros despliegues ni invalida credenciales ya copiadas.

### 3. Rotar JWT

1. Genera un `JWT_SECRET` nuevo.
2. Actualízalo en todos los procesos del mismo entorno de forma coordinada.
3. Redespliega todas las instancias.
4. Confirma que los JWT anteriores dejaron de funcionar.

Esta rotación cierra todas las sesiones normales y administrativas; los usuarios deberán autenticarse de nuevo.

### 4. Cuentas privilegiadas

1. Cambia las contraseñas de `owner` y `admin`.
2. Revisa roles, estados de cuenta y usuarios creados recientemente.
3. Invalida sesiones desde el servidor mediante logout, cambio de contraseña, rol o estado.
4. Comprueba que las cuentas seed no conserven contraseñas históricas o de demostración.

### 5. Material criptográfico heredado

Las llaves actuales se cifran con la contraseña elegida por cada usuario. Si una revisión antigua del proyecto utilizó un secreto global adicional, no lo retires hasta inventariar y migrar los registros que todavía dependan de él. Después de migrarlos, elimina ese secreto de todos los entornos.

## Historial Git

Reescribir el historial es una operación destructiva y coordinada. Debe realizarse únicamente después de rotar los secretos y con aprobación de los mantenedores.

1. Protege una copia de respaldo del repositorio y registra las ramas/tags que deben conservarse.
2. Acuerda una ventana de mantenimiento: todos los clones existentes quedarán obsoletos.
3. Usa una herramienta especializada, como `git filter-repo`, para retirar únicamente los archivos o valores confirmados.
4. Revisa el resultado en un clon aislado y ejecuta un escáner de secretos.
5. Fuerza de manera coordinada la actualización de ramas y tags remotos.
6. Pide a todos los colaboradores borrar sus clones anteriores y clonar nuevamente.
7. Revisa forks, artefactos de CI, cachés y despliegues; reescribir Git no elimina esas copias.

Nunca pospongas una rotación esperando a completar la limpieza del historial.

## Comprobaciones periódicas

- Ejecutar `npm test` y `npm audit --omit=dev`.
- Ejecutar `npm run security:secrets` antes de confirmar cambios.
- Revisar dependencias y actualizar con pruebas.
- Escanear ramas y pull requests en busca de secretos.
- Probar restauraciones de base de datos.
- Revisar cuentas privilegiadas, roles y actividad inusual.
- Confirmar que TLS, CORS, CSP y límites operativos siguen activos.
- Verificar que `.env`, certificados, volcados y llaves continúan ignorados por Git.

## Respuesta ante un incidente

Registra como mínimo:

- fecha y hora;
- entorno afectado;
- credencial o dato involucrado, sin copiar su valor;
- ventana estimada de exposición;
- acciones de contención y rotación;
- evidencia revisada;
- responsable de cada acción;
- validaciones posteriores.

Si el incidente incluye datos personales o documentos, consulta las obligaciones legales y contractuales aplicables antes de comunicar o eliminar evidencia.
