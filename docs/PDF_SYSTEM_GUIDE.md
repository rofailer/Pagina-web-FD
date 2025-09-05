# 📁 GUÍA DEL SISTEMA PDF

## 🔍 **Archivos del Sistema PDF**

### 🖥️ **Backend (Servidor)**

**Archivo**: `scripts/utils/pdfGenerator.backend.js`

- **Función**: Genera archivos PDF reales descargables
- **Tecnología**: Node.js + pdf-lib library
- **Se ejecuta**: En el servidor cuando usuario firma
- **Resultado**: Archivo .pdf que se descarga

### 📱 **Frontend (Navegador)**

**Archivo**: `scripts/frontend/pdfPreview.frontend.js`

- **Función**: Muestra vista previa visual del PDF
- **Tecnología**: JavaScript + Canvas API
- **Se ejecuta**: En el navegador en tiempo real
- **Resultado**: Imagen preview en pantalla

## 🔄 **Flujo Completo**

```
1. Usuario selecciona plantilla
   ↓
2. pdfPreview.frontend.js → Muestra preview
   ↓
3. Usuario ve cómo quedará el PDF
   ↓
4. Usuario firma documento
   ↓
5. pdfGenerator.backend.js → Genera PDF real
   ↓
6. Usuario descarga PDF idéntico al preview
```

## 🎨 **Plantillas Disponibles**

| Plantilla       | Estilo             | Colores        | Uso                  |
| --------------- | ------------------ | -------------- | -------------------- |
| **Clásico**     | Formal tradicional | Azul marino    | Documentos oficiales |
| **Moderno**     | Contemporáneo      | Azul brillante | Presentaciones       |
| **Minimalista** | Limpio y simple    | Grises         | Certificados         |
| **Elegante**    | Sofisticado        | Púrpura/dorado | Diplomas             |

## ⚙️ **Configuración Global**

- **Ubicación**: Base de datos `global_template_config`
- **Control**: Solo usuarios con rol 'owner'
- **Función**: Unifica plantilla para todos los usuarios
- **Campos**: template_name, logo_path, institution_name

## 🛠️ **Mantenimiento**

### ✅ **Ambos archivos deben estar sincronizados**:

- Mismos nombres de plantillas
- Mismos colores y estilos
- Misma lógica de posicionamiento

### 🐛 **Si hay problemas**:

1. Verificar que ambos archivos usen `cleanTextForPdf()`
2. Comprobar que las plantillas coincidan
3. Revisar que las referencias en server.js sean correctas

## 📞 **Referencias Técnicas**

- **Server.js importa**: `require("./utils/pdfGenerator.backend")`
- **HTML carga**: `<script src="/scripts/frontend/pdfPreview.frontend.js">`
- **API endpoints**: `/api/global-template-config`
