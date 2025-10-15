# Sistema de Personalización PDF

## Descripción General

El Sistema de Personalización PDF permite configurar completamente la apariencia y contenido de los documentos PDF generados por el sistema de firmas digitales. Incluye personalización de plantillas, colores, fuentes, texto del aval y elementos visuales.

## Arquitectura del Sistema

### Estructura de Archivos

```
scripts/
├── templates/
│   ├── template.manager.js    # Gestor principal de plantillas
│   ├── base.template.js       # Funciones base y utilidades
│   ├── clasico.template.js    # Plantilla clásica
│   ├── moderno.template.js    # Plantilla moderna
│   ├── elegante.template.js   # Plantilla elegante
│   └── minimalista.template.js # Plantilla minimalista
├── routes/
│   └── admin.routes.js        # APIs de administración
└── db/
    └── pool.js               # Conexión a base de datos

admin/
├── html/
│   └── panelAdmin.html       # Panel de administración
├── js/
│   └── advanced-config.js    # JavaScript del panel
└── css/
    └── secciones/
        └── aval-text-config.css # Estilos del texto del aval
```

### Base de Datos

La configuración se almacena en la tabla `global_pdf_config`:

```sql
CREATE TABLE global_pdf_config (
  id INT PRIMARY KEY DEFAULT 1,
  selected_template VARCHAR(50) NOT NULL DEFAULT 'clasico',
  color_config JSON DEFAULT ('{"primary": "#2563eb", "secondary": "#64748b", "accent": "#f59e0b"}'),
  font_config JSON DEFAULT ('{"title": "Helvetica-Bold", "body": "Helvetica", "metadata": "Helvetica-Oblique"}'),
  layout_config JSON DEFAULT ('{"marginTop": 50, "marginBottom": 50, "marginLeft": 50, "marginRight": 50, "lineHeight": 1.5}'),
  border_config JSON DEFAULT ('{"style": "classic", "width": 2, "color": "#1f2937", "cornerRadius": 0}'),
  visual_config JSON DEFAULT ('{"showLogo": true, "showInstitution": true, "showDate": true, "showSignature": true}'),
  aval_text_config JSON DEFAULT ('{"template": "...", "variables": ["$autores", "$titulo", "$modalidad"]}'),
  CONSTRAINT single_pdf_config CHECK (id = 1)
);
```

## Funcionalidades Principales

### 1. Selección de Plantillas

#### Plantillas Disponibles:

- **Clásica**: Diseño tradicional con bordes elegantes
- **Moderna**: Diseño contemporáneo y limpio
- **Elegante**: Diseño sofisticado con elementos decorativos
- **Minimalista**: Diseño simple y funcional

#### Configuración:

```json
{
  "selectedTemplate": "clasico" // clasico, moderno, elegante, minimalista
}
```

### 2. Configuración de Colores

#### Esquema de Colores:

```json
{
  "primary": "#2563eb", // Color principal
  "secondary": "#64748b", // Color secundario
  "accent": "#f59e0b", // Color de acento
  "text": "#1f2937", // Color del texto
  "background": "#ffffff" // Color de fondo
}
```

#### Usos:

- **Primary**: Títulos principales, bordes destacados
- **Secondary**: Subtítulos, texto secundario
- **Accent**: Elementos de énfasis, botones
- **Text**: Contenido principal
- **Background**: Fondo del documento

### 3. Configuración de Fuentes

#### Tipos de Fuente:

```json
{
  "title": "Helvetica-Bold", // Títulos principales
  "body": "Helvetica", // Contenido del cuerpo
  "metadata": "Helvetica-Oblique", // Metadatos (fecha, ubicación)
  "signature": "Times-Bold" // Información de firmas
}
```

#### Fuentes Disponibles:

- **Helvetica**: Sans-serif moderna
- **Helvetica-Bold**: Versión en negritas
- **Helvetica-Oblique**: Versión cursiva
- **Times-Roman**: Serif clásica
- **Times-Bold**: Times en negritas
- **Courier**: Monoespaciada

### 4. Configuración de Layout

#### Márgenes y Espaciado:

```json
{
  "marginTop": 60, // Margen superior (px)
  "marginBottom": 60, // Margen inferior (px)
  "marginLeft": 50, // Margen izquierdo (px)
  "marginRight": 50, // Margen derecho (px)
  "lineHeight": 1.6, // Altura de línea
  "titleSize": 24, // Tamaño del título (px)
  "bodySize": 12 // Tamaño del texto (px)
}
```

### 5. Configuración de Bordes

#### Estilos de Borde:

```json
{
  "style": "classic", // classic, modern, elegant, minimal
  "width": 2, // Grosor del borde (px)
  "color": "#1f2937", // Color del borde
  "cornerRadius": 0, // Radio de esquinas (px)
  "showDecorative": true // Mostrar elementos decorativos
}
```

### 6. Configuración Visual

#### Elementos Visuales:

```json
{
  "showLogo": true, // Mostrar logo institucional
  "showInstitution": true, // Mostrar nombre de institución
  "showDate": true, // Mostrar fecha
  "showSignature": true, // Mostrar información de firma
  "showAuthors": true, // Mostrar autores
  "showAvalador": true // Mostrar quien avala
}
```

### 7. Texto del Aval Configurable

#### Sistema de Variables:

El texto del aval soporta variables dinámicas que se reemplazan automáticamente:

**Variables Disponibles:**

- `$autores`: Nombres de los autores del trabajo
- `$titulo`: Título del trabajo de grado
- `$modalidad`: Modalidad de grado (ej: "Programa de Ingeniería Multimedia")
- `$avalador`: Nombre de quien avala el trabajo
- `$fecha`: Fecha del documento
- `$institucion`: Nombre de la institución
- `$ubicacion`: Ubicación donde se emite el documento

#### Configuración del Texto:

```json
{
  "template": "Actuando como director de $modalidad, informo que $autores ha completado su trabajo titulado: $titulo. Avalado por $avalador el $fecha en $institucion.",
  "variables": [
    "$autores",
    "$titulo",
    "$modalidad",
    "$avalador",
    "$fecha",
    "$institucion",
    "$ubicacion"
  ]
}
```

#### Texto Por Defecto:

```
Actuando como director del trabajo de investigación y/o tutor de la modalidad de grado: $modalidad, presentado por el estudiante/s $autores; informo a ustedes que cumplido el proceso de asesorías, alcanzados los objetivos y desarrollados debidamente los criterios de suficiencia académica propuestos, se completa el desarrollo de su propuesta de trabajo de grado titulado: $titulo; para lo cual se emite el concepto: APROBADO, por lo que se solicita la designación de jurados para su correspondiente evaluación, con el fin de formalizar su desarrollo.
```

## APIs de Administración

### Obtener Configuración Actual

```http
GET /api/admin/pdf/config
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "selectedTemplate": "clasico",
    "colorConfig": {...},
    "fontConfig": {...},
    "layoutConfig": {...},
    "borderConfig": {...},
    "visualConfig": {...},
    "avalTextConfig": {...}
  }
}
```

### Actualizar Configuración

```http
PUT /api/admin/pdf/config
Content-Type: application/json

{
  "selectedTemplate": "moderno",
  "colorConfig": {...},
  "fontConfig": {...},
  "layoutConfig": {...},
  "borderConfig": {...},
  "visualConfig": {...},
  "avalTextConfig": {...}
}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Configuración PDF actualizada correctamente"
}
```

## Interfaz de Usuario

### Panel de Administración

El panel de administración (`admin/html/panelAdmin.html`) incluye las siguientes secciones:

#### 1. Selección de Plantilla

- Radio buttons para elegir entre plantillas disponibles
- Vista previa visual de cada plantilla

#### 2. Configuración de Colores

- Color pickers para cada tipo de color
- Vista previa en tiempo real

#### 3. Configuración de Fuentes

- Dropdowns para seleccionar fuentes
- Previsualización de combinaciones

#### 4. Configuración de Layout

- Sliders para márgenes
- Inputs numéricos para tamaños

#### 5. Configuración de Bordes

- Opciones de estilo de borde
- Configuración de grosor y color

#### 6. Elementos Visuales

- Checkboxes para mostrar/ocultar elementos
- Configuración de logo institucional

#### 7. Texto del Aval Configurable

- Editor de texto con inserción de variables
- Grid de variables disponibles
- Vista previa del texto procesado

### JavaScript del Panel

El archivo `admin/js/advanced-config.js` maneja:

- **Carga de configuración**: `getCurrentPdfConfig()`
- **Guardado de configuración**: `savePdfConfig()`
- **Inserción de variables**: `insertVariable()`
- **Vista previa del texto**: `updateAvalPreview()`
- **Validación de formularios**

### Estilos CSS

El archivo `admin/css/secciones/aval-text-config.css` define:

- **Layout del editor de texto**
- **Grid de variables**
- **Estilos de botones de inserción**
- **Área de vista previa**

## Componentes Técnicos

### TemplateManager

**Archivo**: `scripts/templates/template.manager.js`

**Responsabilidades:**

- Gestión de configuración global
- Renderizado de plantillas
- Reemplazo de variables en texto del aval
- Coordinación entre plantillas específicas

**Métodos Principales:**

```javascript
class TemplateManager {
  async getGlobalConfig()                    // Obtener configuración desde BD
  getDefaultConfig()                         // Configuración por defecto
  getTemplateName(config)                    // Determinar plantilla a usar
  async drawTemplateBorder(...)             // Dibujar borde de plantilla
  async drawTemplate(...)                   // Dibujar contenido de plantilla
  prepareDocumentData(data)                 // Preparar datos del documento
  replaceAvalVariables(template, data)      // Reemplazar variables dinámicas
  async getAvalText(config, data)           // Obtener texto del aval procesado
  async renderPdfWithTemplate(...)          // Renderizar PDF completo
}
```

### Plantillas Específicas

Cada plantilla (`clasico.template.js`, `moderno.template.js`, etc.) implementa:

```javascript
// Dibujar contenido de la plantilla
async function drawClassicTemplate(page, width, height, data, fonts, config, pdfDoc)

// Dibujar borde específico de la plantilla
function drawClassicBorder(page, width, height, config)
```

### Base Template

**Archivo**: `scripts/templates/base.template.js`

**Funciones Utilitarias:**

```javascript
function cleanTextForPdf(text)                    // Limpiar texto para PDF
function wrapText(text, font, fontSize, maxWidth) // Ajustar texto a ancho
async function drawLogo(...)                      // Dibujar logo institucional
async function drawElectronicSignature(...)      // Dibujar firma electrónica
```

## Flujo de Generación PDF

### 1. Recepción de Datos

- Usuario envía documento para firmar
- Sistema recibe datos del documento

### 2. Carga de Configuración

- TemplateManager obtiene configuración desde BD
- Se aplica configuración por defecto si es necesario

### 3. Preparación de Datos

- Limpieza de texto para compatibilidad PDF
- Reemplazo de variables en texto del aval
- Preparación de metadatos

### 4. Selección de Plantilla

- Determinación de plantilla según configuración
- Carga de módulo de plantilla específica

### 5. Renderizado

- Creación del documento PDF
- Aplicación de configuración de colores/fuentes
- Dibujo de bordes y elementos decorativos
- Inserción de contenido y firma electrónica

### 6. Finalización

- Guardado del PDF generado
- Entrega al usuario para descarga

## Personalización y Extensión

### Agregar Nueva Plantilla

1. **Crear archivo de plantilla**:

```javascript
// scripts/templates/nueva.template.js
async function drawNuevaTemplate(
  page,
  width,
  height,
  data,
  fonts,
  config,
  pdfDoc
) {
  // Implementación de la plantilla
}

function drawNuevaBorder(page, width, height, config) {
  // Implementación del borde
}

module.exports = { drawNuevaTemplate, drawNuevaBorder };
```

2. **Registrar en TemplateManager**:

```javascript
// En template.manager.js
const { drawNuevaTemplate, drawNuevaBorder } = require('./nueva.template');

// Agregar casos en switch statements
switch (templateName) {
  case 'nueva':
    return drawNuevaTemplate(...);
}
```

3. **Actualizar interfaz**:

```html
<!-- En panelAdmin.html -->
<input type="radio" name="templateSelect" value="nueva" id="template-nueva" />
<label for="template-nueva">Nueva Plantilla</label>
```

### Agregar Nueva Variable

1. **Actualizar mapeo en TemplateManager**:

```javascript
const variableMap = {
  $autores: data.autores,
  $titulo: data.titulo,
  $nueva_variable: data.nuevoCampo, // Nueva variable
  // ...
};
```

2. **Actualizar interfaz**:

```html
<!-- En panelAdmin.html -->
<button onclick="insertVariable('$nueva_variable')" class="variable-btn">
  $nueva_variable
</button>
```

3. **Actualizar configuración por defecto**:

```sql
-- En firmas_digitales_v2.sql
UPDATE global_pdf_config SET aval_text_config = JSON_SET(
  aval_text_config,
  '$.variables',
  JSON_ARRAY('$autores', '$titulo', '$nueva_variable')
);
```

## Consideraciones de Seguridad

### Validación de Entrada

- Sanitización de texto para prevenir inyección
- Validación de tipos en configuración JSON
- Límites de tamaño en campos de texto

### Autenticación

- Solo usuarios con rol 'admin' pueden modificar configuración
- Verificación de sesión en todas las APIs

### Almacenamiento

- Configuración almacenada como JSON validado
- Backup automático antes de cambios
- Log de modificaciones con usuario y timestamp

## Resolución de Problemas

### Problemas Comunes

#### 1. PDF No Se Genera

**Síntomas**: Error al generar PDF
**Causas**:

- Configuración JSON malformada
- Fuente no disponible
- Datos de entrada inválidos

**Solución**:

```javascript
// Verificar configuración
const config = await templateManager.getGlobalConfig();
console.log("Config cargada:", config);

// Verificar datos de entrada
const cleanData = templateManager.prepareDocumentData(inputData);
console.log("Datos preparados:", cleanData);
```

#### 2. Variables No Se Reemplazan

**Síntomas**: Variables como $autores aparecen literalmente en PDF
**Causas**:

- Error en función replaceAvalVariables
- Datos faltantes en objeto de entrada

**Solución**:

```javascript
// Verificar reemplazo de variables
const processedText = templateManager.replaceAvalVariables(template, data);
console.log("Texto procesado:", processedText);
```

#### 3. Estilos No Se Aplican

**Síntomas**: PDF usa estilos por defecto
**Causas**:

- Configuración no guardada en BD
- Error en carga de configuración

**Solución**:

```sql
-- Verificar configuración en BD
SELECT * FROM global_pdf_config WHERE id = 1;
```

### Debugging

#### Habilitar Logs

```javascript
// En template.manager.js
console.log("Configuración cargada:", config);
console.log("Plantilla seleccionada:", templateName);
console.log("Datos del documento:", data);
```

#### Verificar BD

```sql
-- Verificar estructura de configuración
SHOW COLUMNS FROM global_pdf_config;

-- Verificar datos
SELECT
  selected_template,
  JSON_PRETTY(color_config) as colors,
  JSON_PRETTY(aval_text_config) as aval_text
FROM global_pdf_config
WHERE id = 1;
```

## Mantenimiento

### Actualización de Sistema

1. Backup de configuración actual
2. Aplicar cambios de código
3. Migrar configuración si es necesario
4. Verificar funcionamiento

### Backup de Configuración

```sql
-- Crear backup
CREATE TABLE global_pdf_config_backup AS
SELECT * FROM global_pdf_config;

-- Restaurar backup
TRUNCATE global_pdf_config;
INSERT INTO global_pdf_config
SELECT * FROM global_pdf_config_backup;
```

### Monitoreo

- Log de errores en generación PDF
- Métricas de uso de plantillas
- Tiempo de generación de documentos

---

## Conclusión

El Sistema de Personalización PDF ofrece un control completo sobre la apariencia y contenido de los documentos generados, permitiendo adaptarse a diferentes necesidades institucionales y estéticas. Su arquitectura modular facilita la extensión y mantenimiento del sistema.
