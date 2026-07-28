# Contribuir a Firmas Digitales FD

Gracias por ayudar a mejorar el proyecto.

## Preparar el entorno

1. Crea un fork o una rama de trabajo.
2. Instala dependencias con `npm ci`.
3. Copia `.env.example` a `.env` y usa únicamente secretos de desarrollo.
4. Importa `firmas_digitales_v2.sql` en una base local.
5. Ejecuta `npm test` antes y después de tus cambios.

## Enviar cambios

- Mantén cada cambio enfocado y explica su motivación.
- Incluye pruebas para correcciones de seguridad o regresiones.
- No confirmes `.env`, credenciales, certificados, llaves, documentos reales ni
  copias de bases de datos.
- Ejecuta `npm audit --omit=dev`.
- Describe cualquier migración de esquema o variable de entorno nueva.

Las contribuciones aceptadas se publican bajo la licencia ISC del repositorio.

## Vulnerabilidades

No abras un issue público para vulnerabilidades. Sigue [SECURITY.md](SECURITY.md).
