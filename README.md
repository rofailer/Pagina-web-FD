# Sistema de Firmas Digitales

Este proyecto es un sistema web completo para la **firma y verificación de documentos PDF** usando criptografía de llaves públicas y privadas. Incluye gestión de usuarios, llaves, configuración visual, panel de administración, menú responsive, y más.

---

## 🚀 Funcionalidades principales

- **Registro e inicio de sesión de usuarios** con roles (admin/owner/usuario).
- **Generación y gestión de llaves públicas y privadas** con expiración configurable.
- **Firma digital de documentos PDF** usando OpenSSL.
- **Verificación de documentos firmados** con validación de integridad y coincidencia de llaves.
- **Gestión de llaves activas** y selección de algoritmo de cifrado simétrico (AES-256-CBC, AES-192-CBC, AES-128-CBC).
- **Cifrado seguro de llaves privadas** con contraseña del usuario y tipo de cifrado elegido.
- **Cifrado básico de llaves públicas** usando el userId.
- **Gestión automática de carpetas** (`downloads`, `llaves`, `uploads`).
- **Panel de administración** para personalizar:
  - Logo, favicon, colores principales, título, footer, fondo de la web.
- **Menú responsive** con menú hamburguesa y control de acceso según sesión.
- **Modal de login y registro** reutilizable y seguro.
- **Ayuda interactiva** con tutorial flotante.
- **Manejo robusto de errores** y mensajes claros para el usuario.
- **Soporte para varios navegadores y dispositivos (responsive)**.

---

## 🛠️ Requisitos

- Node.js (v18 o superior recomendado)
- OpenSSL instalado y en el PATH del sistema
- XAMPP (para MySQL)
- npm

---

## ⚙️ Instalación

1. **Clona el repositorio:**

   ```sh
   git clone <URL_DEL_REPOSITORIO>
   cd <NOMBRE_DEL_PROYECTO>
   ```

2. **Instala las dependencias:**

   ```sh
   npm install
   ```

3. **Instala OpenSSL:**

   - Descarga desde [slproweb.com](https://slproweb.com/products/Win32OpenSSL.html) y asegúrate de agregarlo al PATH.

4. **Configura el archivo `.env`:**
   Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido (ajusta según tu entorno):

   ```
   DB_HOST=localhost
   DB_PORT=3307
   DB_USER=tu_usuario
   DB_PASSWORD=tu_contraseña
   DB_NAME=firmas_digitales
   JWT_SECRET=un_secreto_seguro
   ```

5. **Importa el esquema de la base de datos:**

   - Usa XAMPP y phpMyAdmin o tu cliente favorito para importar `firmas_digitales.sql`.

6. **Inicia el servidor:**
   ```sh
   npm start
   ```
   El servidor estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 📝 Uso

1. Accede a la interfaz web en tu navegador.
2. Regístrate o inicia sesión.
3. Genera tus llaves, elige el tipo de cifrado simétrico y establece una contraseña segura.
4. Firma documentos PDF y descarga el archivo firmado.
5. Verifica documentos firmados subiendo el PDF original y el firmado.

---

## 🗄️ Base de datos

- Usa MySQL (recomendado con XAMPP).
- Instala dependencias para la base de datos:
  ```sh
  npm install express mysql2 bcryptjs jsonwebtoken cors dotenv
  ```
- Importa el archivo `firmas_digitales.sql` para crear las tablas necesarias.

---

## 🔒 Seguridad y cifrado

- **Llave privada:** Cifrada con la contraseña del usuario y el algoritmo seleccionado (AES-256/192/128-CBC).
- **Llave pública:** Cifrada con el userId del usuario (AES-256-CBC) para evitar lectura directa en la base de datos.
- **Contraseña:** Nunca se almacena, solo se usa para cifrar/descifrar la llave privada.
- **Llaves expiradas:** Solo pueden usarse para verificar, no para firmar.

---

## 📦 Dependencias principales

- [express](https://www.npmjs.com/package/express)
- [mysql2](https://www.npmjs.com/package/mysql2)
- [bcryptjs](https://www.npmjs.com/package/bcryptjs)
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)
- [cors](https://www.npmjs.com/package/cors)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [pdf-lib](https://www.npmjs.com/package/pdf-lib)

Instala todas con:

```sh
npm install express mysql2 bcryptjs jsonwebtoken cors dotenv pdf-lib
```

---

## 📝 Notas y recomendaciones

- Asegúrate de que OpenSSL esté instalado y accesible desde la terminal.
- Si tienes problemas con MySQL en XAMPP, verifica el puerto y que el servicio esté activo.
- Realiza respaldos periódicos de la base de datos.
- Usa contraseñas seguras para tus llaves privadas.
- El sistema está pensado para uso académico y prototipos; revisa los requisitos de seguridad para producción.

---

## 📄 Licencia

Este proyecto es de uso académico y puede ser adaptado para otros fines bajo tu responsabilidad.

---

¿Dudas o sugerencias? ¡Abre un issue o contacta al autor!
