# Política de seguridad

## Versiones compatibles

La rama `main` contiene la versión mantenida. Las correcciones de seguridad se
aplican primero allí; las revisiones antiguas no reciben soporte garantizado.

## Reportar una vulnerabilidad

No publiques vulnerabilidades, credenciales, llaves privadas, documentos ni
volcados SQL en un issue público.

Usa un
[reporte privado de seguridad de GitHub](https://github.com/rofailer/Pagina-web-FD/security/advisories/new)
e incluye:

- componente y versión o commit afectado;
- pasos mínimos para reproducir el problema;
- impacto observado;
- mitigaciones conocidas;
- un medio de contacto para coordinar la respuesta.

No incluyas datos personales reales. Usa cuentas, documentos y secretos de
prueba.

## Proceso de respuesta

Los mantenedores intentarán:

1. confirmar la recepción;
2. reproducir y clasificar el impacto;
3. preparar una corrección y pruebas de regresión;
4. coordinar la publicación responsable;
5. documentar rotaciones o acciones operativas necesarias.

La guía [docs/SECURITY_OPERATIONS.md](docs/SECURITY_OPERATIONS.md) contiene el
procedimiento de rotación de secretos y respuesta operativa.
