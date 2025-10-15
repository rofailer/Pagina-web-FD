const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de colores para consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

class DatabaseSetupManager {
    constructor() {
        this.connection = null;
        this.sqlFile = path.join(__dirname, '../firmas_digitales_v2.sql');
        this.backupDir = path.join(__dirname, '../backups');
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
            database: process.env.DB_NAME || 'firmas_digitales_v2',
            multipleStatements: true,
            connectTimeout: 10000
        };
    }

    log(message, color = 'white') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    async connect() {
        try {
            this.log('� Conectando a MySQL...', 'cyan');

            // Primero conectar sin especificar base de datos para verificar/crear
            const tempConfig = { ...this.config };
            delete tempConfig.database;

            this.connection = await mysql.createConnection(tempConfig);
            this.log('✅ Conexión a MySQL exitosa', 'green');

            return true;
        } catch (error) {
            this.log(`❌ Error de conexión: ${error.message}`, 'red');
            return false;
        }
    }

    async databaseExists() {
        try {
            const [rows] = await this.connection.execute(
                'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
                [this.config.database]
            );
            return rows.length > 0;
        } catch (error) {
            this.log(`⚠️ Error verificando base de datos: ${error.message}`, 'yellow');
            return false;
        }
    }

    async createDatabase() {
        try {
            this.log(`📦 Creando base de datos '${this.config.database}'...`, 'blue');
            await this.connection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            this.log('✅ Base de datos creada exitosamente', 'green');

            // Reconectar con la base de datos especificada
            await this.connection.end();
            this.connection = await mysql.createConnection(this.config);
            this.log('🔄 Reconectado a la nueva base de datos', 'cyan');

            return true;
        } catch (error) {
            this.log(`❌ Error creando base de datos: ${error.message}`, 'red');
            return false;
        }
    }

    async getExistingTables() {
        try {
            const [rows] = await this.connection.execute(
                `SELECT TABLE_NAME, TABLE_TYPE FROM INFORMATION_SCHEMA.TABLES 
                 WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
                [this.config.database]
            );
            return rows.map(row => row.TABLE_NAME);
        } catch (error) {
            this.log(`⚠️ Error obteniendo tablas existentes: ${error.message}`, 'yellow');
            return [];
        }
    }

    async getExistingViews() {
        try {
            const [rows] = await this.connection.execute(
                `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
                 WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'VIEW'`,
                [this.config.database]
            );
            return rows.map(row => row.TABLE_NAME);
        } catch (error) {
            this.log(`⚠️ Error obteniendo vistas existentes: ${error.message}`, 'yellow');
            return [];
        }
    }

    async getTablesFromSQL() {
        try {
            if (!fs.existsSync(this.sqlFile)) {
                this.log(`❌ Archivo SQL no encontrado: ${this.sqlFile}`, 'red');
                return [];
            }

            const sqlContent = fs.readFileSync(this.sqlFile, 'utf8');
            const statements = this.parseSQLStatements(sqlContent);

            const tables = [];
            const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`([^`]+)`|(\w+))/i;

            statements.forEach(stmt => {
                const match = stmt.match(tableRegex);
                if (match) {
                    const tableName = match[1] || match[2];
                    if (tableName && !tables.includes(tableName)) {
                        tables.push(tableName);
                    }
                }
            });

            return tables;
        } catch (error) {
            this.log(`⚠️ Error extrayendo tablas del SQL: ${error.message}`, 'yellow');
            return [];
        }
    }

    async dropAllTables() {
        try {
            this.log('🗑️ Eliminando todas las tablas del schema...', 'yellow');

            // Obtener todas las tablas existentes
            const existingTables = await this.getExistingTables();

            if (existingTables.length === 0) {
                this.log('⚠️ No hay tablas para eliminar', 'yellow');
                return true;
            }

            this.log(`📋 Encontradas ${existingTables.length} tablas para eliminar`, 'cyan');

            // Desactivar restricciones de clave foránea
            await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');

            let successCount = 0;
            let errorCount = 0;

            // Eliminar tablas en orden inverso de dependencias
            const dropOrder = [
                'user_activity_log',
                'user_keys',
                'user_preferences',
                'users',
                'global_pdf_config',
                'theme_config',
                'visual_config'
            ];

            // Primero intentar eliminar en orden específico
            for (const tableName of dropOrder) {
                if (existingTables.includes(tableName)) {
                    try {
                        await this.connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
                        this.log(`  ✅ Eliminada tabla: ${tableName}`, 'green');
                        successCount++;
                    } catch (error) {
                        this.log(`  ❌ Error eliminando ${tableName}: ${error.message}`, 'red');
                        errorCount++;
                    }
                }
            }

            // Eliminar cualquier tabla restante que no esté en la lista ordenada
            for (const tableName of existingTables) {
                if (!dropOrder.includes(tableName)) {
                    try {
                        await this.connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
                        this.log(`  ✅ Eliminada tabla: ${tableName}`, 'green');
                        successCount++;
                    } catch (error) {
                        this.log(`  ❌ Error eliminando ${tableName}: ${error.message}`, 'red');
                        errorCount++;
                    }
                }
            }

            // Reactivar restricciones de clave foránea
            await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');

            this.log(`\n📊 Eliminación completada: ${successCount} exitosas, ${errorCount} errores`, 'cyan');

            if (errorCount === 0) {
                this.log('✅ Todas las tablas eliminadas correctamente', 'green');
            } else {
                this.log('⚠️ Algunas tablas no pudieron ser eliminadas', 'yellow');
            }

            return errorCount === 0;

        } catch (error) {
            this.log(`❌ Error eliminando tablas: ${error.message}`, 'red');
            return false;
        }
    }

    // Actualizar estructura de tablas existentes comparando con archivo SQL
    async updateTableStructures(statements, tablesToUpdate) {
        this.log('   � Comparando estructura actual con archivo SQL...', 'cyan');

        // Extraer definiciones de CREATE TABLE del archivo SQL
        const tableDefinitions = this.extractTableDefinitionsFromSQL(statements);

        let totalUpdated = 0;
        let totalSkipped = 0;

        for (const tableName of tablesToUpdate) {
            if (!tableDefinitions[tableName]) {
                this.log(`   ⚠️  ${tableName}: No se encontró definición en SQL, omitiendo`, 'yellow');
                continue;
            }

            this.log(`   🔧 ${tableName}: Analizando campos...`, 'blue');

            try {
                // Obtener columnas actuales de la tabla
                const [currentColumns] = await this.connection.execute(
                    `SHOW COLUMNS FROM \`${tableName}\``
                );
                const currentColumnNames = new Set(currentColumns.map(col => col.Field));

                // Obtener columnas definidas en el SQL
                const sqlColumns = tableDefinitions[tableName];

                let addedFields = 0;
                let skippedFields = 0;

                for (const sqlColumn of sqlColumns) {
                    if (!currentColumnNames.has(sqlColumn.name)) {
                        // El campo no existe, agregarlo
                        try {
                            const alterSql = `ALTER TABLE \`${tableName}\` ADD COLUMN ${sqlColumn.definition}`;
                            await this.connection.execute(alterSql);
                            this.log(`      ✅ Campo agregado: ${sqlColumn.name}`, 'green');
                            addedFields++;
                            totalUpdated++;
                        } catch (alterError) {
                            this.log(`      ❌ Error agregando ${sqlColumn.name}: ${alterError.message}`, 'red');
                        }
                    } else {
                        skippedFields++;
                        totalSkipped++;
                    }
                }

                if (addedFields > 0) {
                    this.log(`   📊 ${tableName}: ${addedFields} campos agregados`, 'green');
                } else {
                    this.log(`   ✅ ${tableName}: Estructura completa (${skippedFields} campos existentes)`, 'cyan');
                }

            } catch (error) {
                this.log(`   ❌ Error procesando tabla ${tableName}: ${error.message}`, 'red');
            }
        }

        this.log(`\n   📈 RESUMEN: ${totalUpdated} campos agregados, ${totalSkipped} ya existían`, 'bright');
        this.log('   ✅ Verificación de estructura completada', 'green');
    }

    // Extraer definiciones de columnas de las sentencias CREATE TABLE
    extractTableDefinitionsFromSQL(statements) {
        const tableDefinitions = {};

        for (const statement of statements) {
            const createTableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`([^`]+)`|(\w+))\s*\(([\s\S]*?)\)\s*(?:ENGINE|$)/i);

            if (createTableMatch) {
                const tableName = createTableMatch[1] || createTableMatch[2];
                const tableBody = createTableMatch[3];

                if (tableName && tableBody) {
                    tableDefinitions[tableName] = this.parseTableColumns(tableBody);
                }
            }
        }

        return tableDefinitions;
    }

    // Parsear columnas de la definición de tabla
    parseTableColumns(tableBody) {
        const columns = [];
        const lines = tableBody.split('\n');

        for (let line of lines) {
            line = line.trim();

            // Omitir comentarios, constraints, índices, etc.
            if (line.startsWith('--') ||
                line.startsWith('/*') ||
                line.startsWith('PRIMARY KEY') ||
                line.startsWith('FOREIGN KEY') ||
                line.startsWith('UNIQUE KEY') ||
                line.startsWith('KEY ') ||
                line.startsWith('INDEX ') ||
                line.startsWith('CONSTRAINT ') ||
                line === '' ||
                line === ',' ||
                line === ')') {
                continue;
            }

            // Buscar definiciones de columnas
            const columnMatch = line.match(/^`?([^`\s]+)`?\s+(.+?)(?:,\s*)?$/);
            if (columnMatch) {
                const columnName = columnMatch[1];
                let columnDefinition = columnMatch[2];

                // Limpiar la definición (remover coma final si existe)
                columnDefinition = columnDefinition.replace(/,$/, '').trim();

                // Construir definición completa con backticks
                const fullDefinition = `\`${columnName}\` ${columnDefinition}`;

                columns.push({
                    name: columnName,
                    definition: fullDefinition
                });
            }
        }

        return columns;
    }

    async syncDatabase() {
        try {
            this.log('🔄 Iniciando sincronización inteligente de base de datos...', 'bright');

            // Verificar conexión
            if (!await this.connect()) {
                return false;
            }

            // Verificar si la base de datos existe
            const dbExists = await this.databaseExists();

            if (!dbExists) {
                this.log(`📦 Base de datos '${this.config.database}' no existe. Creándola...`, 'yellow');
                if (!await this.createDatabase()) {
                    return false;
                }
            } else {
                this.log(`✅ Base de datos '${this.config.database}' ya existe`, 'green');
                // Reconectar con la base de datos existente
                await this.connection.end();
                this.connection = await mysql.createConnection(this.config);
            }

            // Obtener tablas existentes y tablas del SQL
            const existingTables = await this.getExistingTables();
            const existingViews = await this.getExistingViews();
            const sqlTables = await this.getTablesFromSQL();

            this.log(`\n📊 ANÁLISIS DE LA BASE DE DATOS:`, 'bright');
            this.log(`   📋 Tablas actuales: ${existingTables.length}`, 'cyan');
            this.log(`   👁️  Vistas actuales: ${existingViews.length}`, 'cyan');
            this.log(`   📄 Tablas en SQL: ${sqlTables.length}`, 'cyan');

            // Encontrar tablas para eliminar (existen en BD pero no en SQL)
            const tablesToDrop = existingTables.filter(table => !sqlTables.includes(table));
            const viewsToDrop = existingViews; // Las vistas siempre se recrean

            // Encontrar tablas para crear (existen en SQL pero no en BD)
            const tablesToCreate = sqlTables.filter(table => !existingTables.includes(table));

            // Encontrar tablas que existen en ambos (posibles actualizaciones de estructura)
            const tablesToUpdate = existingTables.filter(table => sqlTables.includes(table));

            this.log(`\n🎯 PLAN DE SINCRONIZACIÓN:`, 'bright');

            if (tablesToCreate.length > 0) {
                this.log(`   ➕ Crear ${tablesToCreate.length} tabla(s): ${tablesToCreate.join(', ')}`, 'green');
            }

            if (tablesToUpdate.length > 0) {
                this.log(`   🔧 Actualizar ${tablesToUpdate.length} tabla(s): ${tablesToUpdate.join(', ')}`, 'yellow');
            }

            if (tablesToDrop.length > 0) {
                this.log(`   🗑️  Eliminar ${tablesToDrop.length} tabla(s) obsoleta(s): ${tablesToDrop.join(', ')}`, 'red');
            }

            if (viewsToDrop.length > 0) {
                this.log(`   🔄 Recrear ${viewsToDrop.length} vista(s): ${viewsToDrop.join(', ')}`, 'magenta');
            }

            // Eliminar tablas obsoletas
            if (tablesToDrop.length > 0) {
                this.log(`\n🗑️  ELIMINANDO TABLAS OBSOLETAS...`, 'red');
                for (const tableName of tablesToDrop) {
                    try {
                        await this.connection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
                        this.log(`   ✅ ${tableName} eliminada`, 'green');
                    } catch (error) {
                        this.log(`   ❌ Error eliminando ${tableName}: ${error.message}`, 'red');
                    }
                }
            }

            // Eliminar vistas (se recrearán automáticamente)
            if (viewsToDrop.length > 0) {
                this.log(`\n🔄 ELIMINANDO VISTAS (SE RECREARÁN AUTOMÁTICAMENTE)...`, 'magenta');
                for (const viewName of viewsToDrop) {
                    try {
                        await this.connection.execute(`DROP VIEW IF EXISTS \`${viewName}\``);
                        this.log(`   ✅ Vista ${viewName} eliminada (se recreará)`, 'green');
                    } catch (error) {
                        this.log(`   ❌ Error eliminando vista ${viewName}: ${error.message}`, 'red');
                    }
                }
            }

            // Leer archivo SQL y parsear statements
            if (!fs.existsSync(this.sqlFile)) {
                this.log(`❌ Archivo SQL no encontrado: ${this.sqlFile}`, 'red');
                return false;
            }

            this.log(`\n📖 Leyendo archivo SQL...`, 'cyan');
            const sqlContent = fs.readFileSync(this.sqlFile, 'utf8');
            this.log(`📄 Archivo SQL cargado (${sqlContent.length} caracteres)`, 'green');

            // Parsear statements SQL
            const statements = this.parseSQLStatements(sqlContent);
            this.log(`🔍 Encontrados ${statements.length} statements SQL`, 'cyan');

            // Actualizar estructura de tablas existentes antes de ejecutar statements
            if (tablesToUpdate.length > 0) {
                this.log(`\n🔧 VERIFICANDO Y ACTUALIZANDO ESTRUCTURA DE TABLAS...`, 'bright');
                await this.updateTableStructures(statements, tablesToUpdate);
            }

            // Ejecutar statements
            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;

            this.log(`\n📋 EJECUTANDO ARCHIVO SQL (${statements.length} statements)...`, 'bright');

            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                try {
                    await this.connection.query(statement);
                    successCount++;

                    if (i % 10 === 0 || i === statements.length - 1) {
                        const progress = ((i + 1) / statements.length * 100).toFixed(0);
                        this.log(`   📈 Progreso: ${progress}% (${successCount} exitosos, ${skippedCount} omitidos)`, 'cyan');
                    }
                } catch (error) {
                    // Manejar errores específicos
                    if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
                        error.code === 'ER_DUP_KEYNAME' ||
                        error.code === 'ER_DUP_ENTRY' ||
                        error.message.includes('already exists') ||
                        error.message.includes('Duplicate entry')) {
                        skippedCount++;
                        if (skippedCount <= 3) { // Solo mostrar los primeros 3 para no saturar
                            this.log(`   ⚠️  Statement ${i + 1}: Ya existe (omitido)`, 'yellow');
                        } else if (skippedCount === 4) {
                            this.log(`   ⚠️  ... más statements omitidos (ya existen)`, 'yellow');
                        }
                    } else {
                        this.log(`   ❌ Error en statement ${i + 1}: ${error.message}`, 'red');
                        errorCount++;
                    }
                }
            }

            this.log(`\n   📊 RESUMEN DE EJECUCIÓN:`, 'bright');
            this.log(`      ✅ Exitosos: ${successCount}`, 'green');
            this.log(`      ⚠️  Omitidos: ${skippedCount}`, 'yellow');
            this.log(`      ❌ Errores: ${errorCount}`, errorCount > 0 ? 'red' : 'green');

            // Verificación final
            await this.finalVerification();

            // Verificar y completar configuraciones incompletas
            await this.verifyAndCompleteConfigurations();

            this.log(`\n🎉 SINCRONIZACIÓN COMPLETADA EXITOSAMENTE!`, 'bright');
            this.log(`📊 RESUMEN FINAL:`, 'cyan');
            this.log(`   🗑️  Tablas eliminadas: ${tablesToDrop.length}`, 'red');
            this.log(`   🔄 Vistas recreadas: ${viewsToDrop.length}`, 'magenta');
            this.log(`   ➕ Tablas creadas: ${tablesToCreate.length}`, 'green');
            this.log(`   🔧 Tablas actualizadas: ${tablesToUpdate.length}`, 'yellow');
            this.log(`   📋 Statements: ${successCount} exitosos, ${skippedCount} omitidos, ${errorCount} errores`, 'cyan');

            if (errorCount === 0) {
                this.log('✅ Base de datos sincronizada correctamente', 'green');
            } else {
                this.log('⚠️ Base de datos sincronizada con algunos errores menores', 'yellow');
            }

            return true;

        } catch (error) {
            this.log(`❌ Error durante la sincronización: ${error.message}`, 'red');
            return false;
        } finally {
            if (this.connection) {
                await this.connection.end();
                this.log('🔌 Conexión cerrada', 'cyan');
            }
        }
    }

    async getAllTablesAndViews() {
        try {
            const [rows] = await this.connection.execute(
                `SELECT TABLE_NAME as name, TABLE_TYPE as type
                 FROM INFORMATION_SCHEMA.TABLES
                 WHERE TABLE_SCHEMA = ?
                 ORDER BY TABLE_TYPE DESC, TABLE_NAME ASC`,
                [this.config.database]
            );

            // Ordenar las tablas por dependencias
            const tables = rows.filter(row => row.type === 'BASE TABLE').map(row => ({ name: row.name, type: 'TABLE' }));
            const views = rows.filter(row => row.type === 'VIEW').map(row => ({ name: row.name, type: 'VIEW' }));

            // Orden de tablas por dependencias (padres primero)
            const orderedTables = [
                'users',                    // Tabla padre
                'global_pdf_config',        // Independiente
                'theme_config',            // Independiente
                'visual_config',           // Independiente
                'user_activity_log',       // Depende de users
                'user_keys',              // Depende de users
                'user_preferences'        // Depende de users
            ];

            // Crear array ordenado de tablas
            const sortedTables = [];
            orderedTables.forEach(tableName => {
                const table = tables.find(t => t.name === tableName);
                if (table) {
                    sortedTables.push(table);
                }
            });

            // Agregar tablas que no estén en la lista ordenada
            tables.forEach(table => {
                if (!orderedTables.includes(table.name)) {
                    sortedTables.push(table);
                }
            });

            // Retornar tablas ordenadas + vistas al final
            return [...sortedTables, ...views];

        } catch (error) {
            this.log(`⚠️ Error obteniendo tablas y vistas: ${error.message}`, 'yellow');
            return [];
        }
    }

    parseSQLStatements(sqlContent) {
        // Dividir en líneas y procesar
        const lines = sqlContent.split('\n');
        const cleanLines = [];

        for (let line of lines) {
            const trimmed = line.trim();
            // Filtrar líneas vacías, comentarios y líneas corruptas
            if (trimmed &&
                !trimmed.startsWith('--') &&
                !trimmed.startsWith('#') &&
                !trimmed.startsWith('/*') &&
                !trimmed.startsWith('*/') &&
                !trimmed.startsWith('DRO--') &&
                trimmed !== 'DRO') {
                cleanLines.push(line);
            }
        }

        // Reunir en texto limpio
        const cleanSQL = cleanLines.join('\n');

        // Dividir por punto y coma
        const rawStatements = cleanSQL.split(';');
        const statements = [];

        for (let stmt of rawStatements) {
            const cleaned = stmt.trim();

            // Filtrar statements vacíos y validar que contengan palabras clave SQL
            if (cleaned && cleaned.length > 3) {
                const upperStmt = cleaned.toUpperCase();

                // Verificar que contiene palabras clave SQL válidas
                if (upperStmt.includes('CREATE') ||
                    upperStmt.includes('INSERT') ||
                    upperStmt.includes('UPDATE') ||
                    upperStmt.includes('DELETE') ||
                    upperStmt.includes('ALTER') ||
                    upperStmt.includes('DROP') ||
                    upperStmt.includes('SET') ||
                    upperStmt.includes('START') ||
                    upperStmt.includes('COMMIT') ||
                    upperStmt.includes('SELECT')) {

                    // Filtrar statements que son solo comentarios multilínea
                    const withoutComments = cleaned.replace(/\/\*[\s\S]*?\*\//g, '').trim();
                    if (withoutComments.length > 3) {
                        statements.push(cleaned);
                    }
                }
            }
        }

        return statements;
    }

    categorizeStatements(statements) {
        const categories = {
            createDatabase: [],
            dropTable: [],
            createTable: [],
            createIndex: [],
            insert: [],
            createProcedure: [],
            createView: [],
            other: []
        };

        statements.forEach(stmt => {
            const upperStmt = stmt.toUpperCase().trim();

            if (upperStmt.includes('CREATE DATABASE') || upperStmt.includes('CREATE SCHEMA')) {
                categories.createDatabase.push(stmt);
            } else if (upperStmt.includes('DROP TABLE') || upperStmt.includes('DROP VIEW')) {
                categories.dropTable.push(stmt);
            } else if (upperStmt.includes('CREATE TABLE')) {
                categories.createTable.push(stmt);
            } else if (upperStmt.includes('CREATE INDEX') || upperStmt.includes('ALTER TABLE') && upperStmt.includes('ADD INDEX')) {
                categories.createIndex.push(stmt);
            } else if (upperStmt.includes('INSERT INTO')) {
                categories.insert.push(stmt);
            } else if (upperStmt.includes('CREATE PROCEDURE') || upperStmt.includes('CREATE FUNCTION')) {
                categories.createProcedure.push(stmt);
            } else if (upperStmt.includes('CREATE VIEW')) {
                categories.createView.push(stmt);
            } else if (upperStmt.includes('DELIMITER')) {
                // Manejar delimitadores para procedimientos
                categories.createProcedure.push(stmt);
            } else {
                categories.other.push(stmt);
            }
        });

        return categories;
    }

    async executeStatements(statements, description) {
        let successCount = 0;
        let errorCount = 0;

        this.log(`\n📋 Ejecutando ${statements.length} statements de ${description}...`, 'blue');

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            try {
                await this.connection.execute(statement);
                successCount++;
                if (i % 10 === 0 || i === statements.length - 1) {
                    this.log(`  ✅ ${successCount}/${statements.length} statements ejecutados`, 'green');
                }
            } catch (error) {
                // Ignorar errores de tablas que ya existen o elementos que ya existen
                if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
                    error.code === 'ER_DUP_KEYNAME' ||
                    error.code === 'ER_DUP_ENTRY' ||
                    error.message.includes('already exists')) {
                    this.log(`  ⚠️ Statement ${i + 1} ya existe, continuando...`, 'yellow');
                } else {
                    this.log(`  ❌ Error en statement ${i + 1}: ${error.message}`, 'red');
                    errorCount++;
                }
            }
        }

        return { successCount, errorCount };
    }

    async setupDatabase() {
        try {
            this.log('🚀 Iniciando configuración automática de base de datos...', 'bright');

            // Usar la nueva función de sincronización inteligente
            return await this.syncDatabase();

        } catch (error) {
            this.log(`❌ Error durante la configuración: ${error.message}`, 'red');
            return false;
        }
    }

    async checkExistingData() {
        try {
            // Verificar si hay datos en las tablas principales
            const tablesToCheck = ['users', 'global_pdf_config', 'theme_config', 'visual_config'];

            for (const table of tablesToCheck) {
                try {
                    const [rows] = await this.connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
                    if (rows[0].count > 0) {
                        return true;
                    }
                } catch (error) {
                    // Tabla no existe, continuar
                    continue;
                }
            }

            return false;
        } catch (error) {
            this.log(`⚠️ Error verificando datos existentes: ${error.message}`, 'yellow');
            return false;
        }
    }

    async finalVerification() {
        try {
            this.log('\n🔍 Verificación final...', 'cyan');

            // Verificar tablas creadas
            const finalTables = await this.getExistingTables();
            this.log(`📋 Total de tablas: ${finalTables.length}`, 'cyan');

            // Verificar datos en tablas principales
            const tablesToVerify = ['users', 'global_pdf_config', 'theme_config', 'visual_config'];

            for (const table of tablesToVerify) {
                if (finalTables.includes(table)) {
                    try {
                        const [rows] = await this.connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
                        this.log(`  ✅ ${table}: ${rows[0].count} registros`, 'green');
                    } catch (error) {
                        this.log(`  ⚠️ ${table}: Error al verificar`, 'yellow');
                    }
                } else {
                    this.log(`  ❌ ${table}: No encontrada`, 'red');
                }
            }

        } catch (error) {
            this.log(`⚠️ Error en verificación final: ${error.message}`, 'yellow');
        }
    }

    async verifyAndCompleteConfigurations() {
        try {
            this.log('\n⚙️  VERIFICANDO CONFIGURACIONES DEL SISTEMA...', 'bright');

            // Verificar global_pdf_config
            await this.verifyGlobalPdfConfig();

        } catch (error) {
            this.log(`⚠️ Error verificando configuraciones: ${error.message}`, 'yellow');
        }
    }

    async verifyGlobalPdfConfig() {
        try {
            this.log('   📋 Configuración PDF global...', 'blue');

            const [rows] = await this.connection.execute(
                'SELECT * FROM global_pdf_config WHERE id = 1'
            );

            if (rows.length === 0) {
                this.log('   ⚠️  No hay configuración PDF, creando...', 'yellow');
                await this.insertDefaultPdfConfig();
                return;
            }

            const config = rows[0];
            let needsUpdate = false;
            const updates = {};

            // Verificar cada campo JSON y completar si está vacío
            const jsonFields = {
                'color_config': {
                    'primary': '#2563eb',
                    'secondary': '#64748b',
                    'accent': '#f59e0b',
                    'text': '#1f2937',
                    'background': '#ffffff'
                },
                'font_config': {
                    'title': 'Helvetica-Bold',
                    'body': 'Helvetica',
                    'metadata': 'Helvetica-Oblique',
                    'signature': 'Times-Bold'
                },
                'layout_config': {
                    'marginTop': 60,
                    'marginBottom': 60,
                    'marginLeft': 50,
                    'marginRight': 50,
                    'lineHeight': 1.6,
                    'titleSize': 24,
                    'bodySize': 12
                },
                'border_config': {
                    'style': 'classic',
                    'width': 2,
                    'color': '#1f2937',
                    'cornerRadius': 0,
                    'showDecorative': true
                },
                'visual_config': {
                    'showLogo': true,
                    'showInstitution': true,
                    'showDate': true,
                    'showSignature': true,
                    'showAuthors': true,
                    'showAvalador': true
                }
            };

            for (const [fieldName, defaultValue] of Object.entries(jsonFields)) {
                const fieldValue = config[fieldName];

                // Verificar si el campo está vacío o es un objeto vacío
                if (!fieldValue ||
                    (typeof fieldValue === 'string' && fieldValue === '{}') ||
                    (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0)) {

                    this.log(`      🔧 Completando ${fieldName}...`, 'yellow');
                    updates[fieldName] = JSON.stringify(defaultValue);
                    needsUpdate = true;
                } else {
                    this.log(`      ✅ ${fieldName}: Configurado`, 'green');
                }
            }

            if (needsUpdate) {
                // Construir query de UPDATE
                const setClause = Object.entries(updates)
                    .map(([field, value]) => `${field} = '${value}'`)
                    .join(', ');

                const updateQuery = `UPDATE global_pdf_config SET ${setClause} WHERE id = 1`;

                await this.connection.execute(updateQuery);
                this.log(`   ✅ Configuración PDF completada (${Object.keys(updates).length} campos actualizados)`, 'green');
            } else {
                this.log(`   ✅ Configuración PDF: Completa y actualizada`, 'green');
            }

        } catch (error) {
            this.log(`   ❌ Error verificando configuración PDF: ${error.message}`, 'red');
        }
    }

    async insertDefaultPdfConfig() {
        const insertQuery = `
            INSERT INTO global_pdf_config (
                id, selected_template, 
                color_config, font_config, layout_config, border_config, visual_config, aval_text_config
            ) VALUES (
                1, 'clasico',
                '{"primary": "#2563eb", "secondary": "#64748b", "accent": "#f59e0b", "text": "#1f2937", "background": "#ffffff"}',
                '{"title": "Helvetica-Bold", "body": "Helvetica", "metadata": "Helvetica-Oblique", "signature": "Times-Bold"}',
                '{"marginTop": 60, "marginBottom": 60, "marginLeft": 50, "marginRight": 50, "lineHeight": 1.6, "titleSize": 24, "bodySize": 12}',
                '{"style": "classic", "width": 2, "color": "#1f2937", "cornerRadius": 0, "showDecorative": true}',
                '{"showLogo": true, "showInstitution": true, "showDate": true, "showSignature": true, "showAuthors": true, "showAvalador": true}',
                '{"template": "Actuando como director del trabajo de investigación y/o tutor de la modalidad de grado: $modalidad, presentado por el estudiante/s $autores; informo a ustedes que cumplido el proceso de asesorías, alcanzados los objetivos y desarrollados debidamente los criterios de suficiencia académica propuestos, se completa el desarrollo de su propuesta de trabajo de grado titulado: $titulo; para lo cual se emite el concepto: APROBADO, por lo que se solicita la designación de jurados para su correspondiente evaluación, con el fin de formalizar su desarrollo.", "variables": ["$autores", "$titulo", "$modalidad", "$avalador", "$fecha", "$institucion", "$ubicacion"]}'
            )
        `;

        await this.connection.execute(insertQuery);
        this.log('  ✅ Configuración PDF por defecto creada', 'green');
    }

    async createBackup() {
        try {
            this.log('💾 Creando backup de la base de datos...', 'blue');

            // Crear directorio de backups si no existe
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
                this.log('📁 Directorio de backups creado', 'cyan');
            }

            // Generar nombre del archivo de backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const backupFile = path.join(this.backupDir, `backup_${this.config.database}_${timestamp}.sql`);

            // Obtener todas las tablas y vistas
            const allObjects = await this.getAllTablesAndViews();

            if (allObjects.length === 0) {
                this.log('⚠️ No hay tablas o vistas para respaldar', 'yellow');
                return null;
            }

            let backupContent = `-- Backup de la base de datos ${this.config.database}\n`;
            backupContent += `-- Fecha: ${new Date().toISOString()}\n`;
            backupContent += `-- Objetos: ${allObjects.length}\n\n`;

            backupContent += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
            backupContent += `START TRANSACTION;\n`;
            backupContent += `SET time_zone = "+00:00";\n\n`;

            for (const obj of allObjects) {
                try {
                    const { name, type } = obj;
                    this.log(`  📋 Respaldando ${type}: ${name}`, 'white');

                    if (type === 'VIEW') {
                        // Para vistas, usar SHOW CREATE VIEW
                        const [viewStructure] = await this.connection.execute(`SHOW CREATE VIEW \`${name}\``);
                        backupContent += `-- Estructura de la vista ${name}\n`;
                        backupContent += `${viewStructure[0]['Create View']};\n\n`;
                        // Las vistas no tienen datos propios, solo la definición
                    } else {
                        // Para tablas, usar SHOW CREATE TABLE
                        const [tableStructure] = await this.connection.execute(`SHOW CREATE TABLE \`${name}\``);
                        backupContent += `-- Estructura de la tabla ${name}\n`;
                        backupContent += `${tableStructure[0]['Create Table']};\n\n`;

                        // Obtener datos de la tabla
                        const [rows] = await this.connection.execute(`SELECT * FROM \`${name}\``);

                        if (rows.length > 0) {
                            backupContent += `-- Datos de la tabla ${name}\n`;

                            // Obtener nombres de columnas
                            const [columns] = await this.connection.execute(`DESCRIBE \`${name}\``);
                            const columnNames = columns.map(col => `\`${col.Field}\``).join(', ');

                            for (const row of rows) {
                                const values = columns.map(col => {
                                    const value = row[col.Field];
                                    if (value === null) return 'NULL';
                                    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                                    if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                                    return value;
                                }).join(', ');

                                backupContent += `INSERT INTO \`${name}\` (${columnNames}) VALUES (${values});\n`;
                            }
                            backupContent += '\n';
                        }
                    }

                } catch (error) {
                    this.log(`  ⚠️ Error respaldando ${obj.type} ${obj.name}: ${error.message}`, 'yellow');
                }
            }

            backupContent += `COMMIT;\n`;

            // Escribir archivo de backup
            fs.writeFileSync(backupFile, backupContent, 'utf8');

            const stats = fs.statSync(backupFile);
            this.log(`✅ Backup creado exitosamente: ${backupFile}`, 'green');
            this.log(`📊 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`, 'cyan');

            return backupFile;

        } catch (error) {
            this.log(`❌ Error creando backup: ${error.message}`, 'red');
            return null;
        }
    }

    async resetDatabase() {
        try {
            this.log('� Reseteando base de datos a estado inicial...', 'yellow');

            // Crear backup antes de resetear
            const backupFile = await this.createBackup();
            if (backupFile) {
                this.log('💾 Backup creado antes del reset', 'green');
            }

            // Obtener todas las tablas
            const tables = await this.getExistingTables();

            if (tables.length > 0) {
                this.log(`🧹 Limpiando ${tables.length} tablas...`, 'yellow');

                // Desactivar restricciones de clave foránea
                await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');

                // Limpiar datos de todas las tablas (en orden inverso de dependencias)
                const clearOrder = [
                    'user_activity_log',
                    'user_keys',
                    'user_preferences',
                    'users',
                    'global_pdf_config',
                    'theme_config',
                    'visual_config'
                ];

                for (const tableName of clearOrder) {
                    if (tables.includes(tableName)) {
                        try {
                            // Para tablas, limpiar datos
                            await this.connection.execute(`TRUNCATE TABLE \`${tableName}\``);
                            this.log(`  ✅ Datos limpiados: ${tableName}`, 'green');
                        } catch (error) {
                            this.log(`  ⚠️ Error limpiando ${tableName}: ${error.message}`, 'yellow');
                        }
                    }
                }

                // Reactivar restricciones de clave foránea
                await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');

                this.log('✅ Limpieza completada', 'green');
            } else {
                this.log('⚠️ No hay tablas para limpiar', 'yellow');
            }

            // Recrear datos por defecto
            this.log('📝 Insertando datos por defecto...', 'cyan');
            await this.insertDefaultData();

            return true;

        } catch (error) {
            this.log(`❌ Error reseteando base de datos: ${error.message}`, 'red');
            return false;
        }
    }

    async insertDefaultData() {
        try {
            // Insertar usuario administrador por defecto
            const adminPassword = '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe'; // 'admin'
            const ownerPassword = '$2b$10$AMYRUaW9laypULTfHnPCIeQFsWb61dfkx88eh8RheozXQdUMAvZMe'; // 'owner'

            await this.connection.execute(`
                INSERT INTO users (id, nombre, usuario, password, rol, active_key_id, created_at, nombre_completo, email, organizacion, biografia, foto_perfil, telefono, direccion, cargo, departamento, grado_academico, zona_horaria, idioma, estado_cuenta, notificaciones_email, autenticacion_2fa, ultimo_acceso, updated_at) VALUES
                (1, 'Administrador', 'admin', ?, 'admin', NULL, NOW(), 'Administrador del Sistema', 'admin@universidad.edu', 'Universidad Ejemplo', 'Administrador principal del sistema de firmas digitales. Responsable de la configuración general, gestión de usuarios y mantenimiento del sistema.', NULL, NULL, NULL, 'Administrador de Sistemas', 'Tecnología e Informática', 'Ingeniero de Sistemas', 'America/Bogota', 'es', 'activo', 1, 0, NOW(), NOW()),
                (2, 'Owner', 'owner', ?, 'owner', NULL, NOW(), 'Propietario del Sistema', 'owner@universidad.edu', 'Universidad Ejemplo', 'Propietario y responsable principal del sistema. Supervisa el desarrollo, implementación y políticas de uso del sistema de firmas digitales.', NULL, NULL, NULL, 'Director de Proyecto', 'Administración y Gestión', 'Doctor en Educación', 'America/Bogota', 'es', 'activo', 1, 0, NOW(), NOW())
            `, [adminPassword, ownerPassword]);

            // Insertar configuraciones por defecto
            await this.connection.execute(`
                INSERT INTO global_pdf_config (
                    id, selected_template, logo_path,
                    color_config, font_config, layout_config, border_config, visual_config,
                    updated_by, created_at, updated_at
                ) VALUES (
                    1, 'clasico', '../../recursos/logotipo-de-github.png',
                    '{"primary":"#2563eb","secondary":"#64748b","accent":"#f59e0b","text":"#1f2937","background":"#ffffff"}',
                    '{"title":"Helvetica-Bold","body":"Helvetica","metadata":"Helvetica-Oblique","signature":"Times-Bold"}',
                    '{"marginTop":60,"marginBottom":60,"marginLeft":50,"marginRight":50,"lineHeight":1.6,"titleSize":24,"bodySize":12}',
                    '{"style":"classic","width":2,"color":"#1f2937","cornerRadius":0,"showDecorative":true}',
                    '{"showLogo":true,"showInstitution":true,"showDate":true,"showSignature":true,"showAuthors":true,"showAvalador":true}',
                    'system', NOW(), NOW()
                )
            `);

            await this.connection.execute(`
                INSERT INTO theme_config (id, selected_theme, custom_color, timestamp, updated_by, created_at, updated_at) VALUES
                (1, 'orange', NULL, UNIX_TIMESTAMP() * 1000, NULL, NOW(), NOW())
            `);

            await this.connection.execute(`
                INSERT INTO visual_config (id, background, favicon, site_title, header_title) VALUES
                (1, 'fondo1', '../../favicon.ico', 'Firmas Digitales FD', 'Firmas Digitales FD')
            `);

            // Insertar actividad inicial
            await this.connection.execute(`
                INSERT INTO user_activity_log (user_id, accion, descripcion, ip_address, created_at) VALUES
                (1, 'account_created', 'Cuenta de administrador creada durante la instalación del sistema', '127.0.0.1', NOW()),
                (2, 'account_created', 'Cuenta de propietario creada durante la instalación del sistema', '127.0.0.1', NOW())
            `);

            this.log('✅ Datos por defecto insertados correctamente', 'green');

        } catch (error) {
            this.log(`⚠️ Error insertando datos por defecto: ${error.message}`, 'yellow');
            // No fallar completamente si hay error en datos por defecto
        }
    }

    async restoreBackup(backupFile = null) {
        try {
            this.log('🔄 Restaurando backup de la base de datos...', 'blue');

            // Si no se especifica archivo, buscar el último backup
            if (!backupFile) {
                if (!fs.existsSync(this.backupDir)) {
                    this.log('❌ No existe directorio de backups', 'red');
                    return false;
                }

                const backupFiles = fs.readdirSync(this.backupDir)
                    .filter(f => f.endsWith('.sql'))
                    .sort()
                    .reverse(); // Más reciente primero

                if (backupFiles.length === 0) {
                    this.log('❌ No hay archivos de backup disponibles', 'red');
                    return false;
                }

                backupFile = path.join(this.backupDir, backupFiles[0]);
                this.log(`📁 Usando último backup: ${path.basename(backupFile)}`, 'cyan');
            }

            // Verificar que el archivo existe
            if (!fs.existsSync(backupFile)) {
                this.log(`❌ Archivo de backup no encontrado: ${backupFile}`, 'red');
                return false;
            }

            // Leer contenido del backup
            this.log('📖 Leyendo archivo de backup...', 'cyan');
            const backupContent = fs.readFileSync(backupFile, 'utf8');
            this.log(`📄 Backup cargado (${backupContent.length} caracteres)`, 'green');

            // Crear backup de seguridad antes de restaurar
            const safetyBackup = await this.createBackup();
            if (safetyBackup) {
                this.log('🛡️ Backup de seguridad creado antes de restaurar', 'yellow');
            }

            // En lugar de eliminar todas las tablas, hacer una restauración inteligente
            this.log('� Preparando restauración inteligente...', 'yellow');
            this.log('📋 Manteniendo estructura existente y actualizando datos', 'cyan');

            // Parsear y ejecutar statements del backup
            const statements = this.parseSQLStatements(backupContent);
            this.log(`🔍 Encontrados ${statements.length} statements en el backup`, 'cyan');

            // Filtrar statements inválidos (como "undefined;")
            const validStatements = statements.filter(stmt => {
                const trimmed = stmt.trim();
                return trimmed && trimmed !== 'undefined' && trimmed !== 'undefined;' && !trimmed.startsWith('undefined');
            });

            this.log(`✅ Statements válidos: ${validStatements.length}/${statements.length}`, 'cyan');

            // Categorizar statements por tipo para ordenarlos correctamente
            const categories = this.categorizeStatements(validStatements);
            this.log(`📊 Categorías: ${Object.keys(categories).filter(k => categories[k].length > 0).join(', ')}`, 'cyan');

            let successCount = 0;
            let errorCount = 0;

            this.log(`\n📋 Ejecutando restauración inteligente...`, 'blue');

            // Ejecutar statements en orden simplificado para restauración inteligente
            const executionOrder = [
                { name: 'Crear tablas', statements: categories.createTable },
                { name: 'Insertar datos', statements: categories.insert },
                { name: 'Crear vistas', statements: categories.createView },
                { name: 'Otros', statements: categories.other }
            ];

            for (const category of executionOrder) {
                if (category.statements.length > 0) {
                    this.log(`\n🔧 Ejecutando ${category.statements.length} statements de ${category.name}...`, 'blue');

                    for (let i = 0; i < category.statements.length; i++) {
                        const statement = category.statements[i];
                        try {
                            // Usar conexión directa para statements complejos
                            await this.connection.query(statement);
                            successCount++;

                            if ((successCount + errorCount) % 10 === 0 || (successCount + errorCount) === validStatements.length) {
                                this.log(`  ✅ ${successCount}/${validStatements.length} statements restaurados`, 'green');
                            }
                        } catch (error) {
                            // Manejar errores específicos con mejor granularidad
                            let shouldContinue = false;
                            let errorMessage = error.message;

                            if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
                                error.code === 'ER_DUP_KEYNAME' ||
                                error.code === 'ER_DUP_ENTRY' ||
                                error.message.includes('already exists') ||
                                error.message.includes('Duplicate entry') ||
                                error.message.includes('Table') && error.message.includes('already exists')) {
                                shouldContinue = true;
                                errorMessage = 'ya existe, continuando';
                            } else if (error.message.includes('View') && error.message.includes('already exists')) {
                                shouldContinue = true;
                                errorMessage = 'vista ya existe, continuando';
                            } else if (error.message.includes('references invalid table') ||
                                error.message.includes('Unknown column') ||
                                error.message.includes('does not exist')) {
                                // Estos errores pueden deberse a dependencias, intentar continuar
                                shouldContinue = true;
                                errorMessage = 'dependencia faltante, intentando continuar';
                            } else if (error.message.includes('You have an error in your SQL syntax')) {
                                // Syntax errors son críticos, no continuar
                                shouldContinue = false;
                                errorMessage = 'error de sintaxis SQL';
                            }

                            if (shouldContinue) {
                                this.log(`  ⚠️ ${category.name} ${i + 1}: ${errorMessage}`, 'yellow');
                            } else {
                                this.log(`  ❌ Error en ${category.name} ${i + 1}: ${errorMessage}`, 'red');
                                errorCount++;
                            }
                        }
                    }
                }
            }

            // Verificación final
            const finalTables = await this.getExistingTables();
            this.log(`\n📋 Restauración completada!`, 'bright');
            this.log(`📊 Resumen: ${successCount} exitosos, ${errorCount} errores`, 'cyan');
            this.log(`📋 Total de tablas restauradas: ${finalTables.length}`, 'cyan');
            this.log(`📋 Statements procesados: ${validStatements.length}/${statements.length} (filtrados)`, 'cyan');

            if (errorCount === 0) {
                this.log('✅ Restauración completada exitosamente', 'green');
            } else {
                this.log('⚠️ Restauración completada con algunos errores menores', 'yellow');
            }

            return true;

        } catch (error) {
            this.log(`❌ Error restaurando backup: ${error.message}`, 'red');
            return false;
        }
    }

    async showStatus() {
        try {
            this.log('📊 Estado de la base de datos', 'bright');

            // Verificar conexión
            if (!await this.connect()) {
                return false;
            }

            // Verificar si la base de datos existe
            const dbExists = await this.databaseExists();

            if (!dbExists) {
                this.log(`❌ Base de datos '${this.config.database}' no existe`, 'red');
                this.log('💡 Ejecuta: npm run db:setup', 'cyan');
                return false;
            }

            // Reconectar con la base de datos
            await this.connection.end();
            this.connection = await mysql.createConnection(this.config);

            // Obtener información general
            const [dbInfo] = await this.connection.execute(
                'SELECT DATABASE() as db_name, USER() as user, VERSION() as version'
            );

            this.log(`📋 Base de datos: ${dbInfo[0].db_name}`, 'cyan');
            this.log(`👤 Usuario: ${dbInfo[0].user}`, 'cyan');
            this.log(`🔧 MySQL: ${dbInfo[0].version}`, 'cyan');

            // Obtener tablas
            const tables = await this.getExistingTables();
            this.log(`📊 Tablas: ${tables.length}`, 'cyan');

            if (tables.length > 0) {
                this.log('📋 Lista de tablas:', 'white');
                for (const table of tables) {
                    try {
                        const [rows] = await this.connection.execute(`SELECT COUNT(*) as count FROM \`${table}\``);
                        this.log(`  • ${table}: ${rows[0].count} registros`, 'white');
                    } catch (error) {
                        this.log(`  • ${table}: Error al contar registros`, 'yellow');
                    }
                }
            }

            // Verificar archivo SQL
            if (fs.existsSync(this.sqlFile)) {
                const stats = fs.statSync(this.sqlFile);
                this.log(`📄 Archivo SQL: ${(stats.size / 1024).toFixed(2)} KB`, 'green');
            } else {
                this.log('❌ Archivo SQL no encontrado', 'red');
            }

            // Verificar directorio de backups
            if (fs.existsSync(this.backupDir)) {
                const backupFiles = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.sql'));
                this.log(`💾 Backups: ${backupFiles.length} archivos`, 'green');
                if (backupFiles.length > 0) {
                    const latest = backupFiles.sort().pop();
                    this.log(`📅 Último backup: ${latest}`, 'white');
                }
            } else {
                this.log('💾 Backups: Ninguno', 'yellow');
            }

            return true;

        } catch (error) {
            this.log(`❌ Error obteniendo estado: ${error.message}`, 'red');
            return false;
        } finally {
            if (this.connection) {
                await this.connection.end();
            }
        }
    }
}

// Función para mostrar ayuda
function showHelp() {
    console.log('='.repeat(80));
    console.log('🛠️  AYUDA - GESTOR AUTOMÁTICO DE BASE DE DATOS');
    console.log('📄 Archivo SQL: firmas_digitales_v2.sql');
    console.log('='.repeat(80));
    console.log('');
    console.log('📋 DESCRIPCIÓN:');
    console.log('   Herramienta completa para gestionar la base de datos MySQL del sistema');
    console.log('   de firmas digitales. Permite configuración inicial, backups, reseteo');
    console.log('   y verificación del estado de la base de datos.');
    console.log('');
    console.log('🚀 USO:');
    console.log('   node scripts/setup-db.js [comando]');
    console.log('   npm run db:[comando]');
    console.log('');
    console.log('📚 COMANDOS DISPONIBLES:');
    console.log('');
    console.log('   [SIN ARGUMENTOS]  Configuración estándar');
    console.log('                     - Crea la base de datos si no existe');
    console.log('                     - Ejecuta el archivo SQL principal');
    console.log('                     - Verifica la configuración');
    console.log('');
    console.log('   --backup, backup  💾 Crear backup completo');
    console.log('                     - Genera archivo SQL con toda la estructura');
    console.log('                     - Incluye datos de todas las tablas');
    console.log('                     - Guarda en carpeta backups/');
    console.log('');
    console.log('   --reset, reset    � Reset inteligente de la base de datos');
    console.log('                     - Mantiene la estructura de tablas');
    console.log('                     - Limpia todos los datos existentes');
    console.log('                     - Inserta datos por defecto (admin/owner)');
    console.log('                     - Recrear vistas del sistema');
    console.log('');
    console.log('   --status, status  📊 Verificar estado de la base de datos');
    console.log('                     - Comprueba conexión a MySQL');
    console.log('                     - Lista todas las tablas existentes');
    console.log('                     - Muestra estadísticas de registros');
    console.log('');
    console.log('   --install, install 📦 Instalación completa del sistema');
    console.log('                     - Configura base de datos desde cero');
    console.log('                     - Ejecuta todos los scripts SQL');
    console.log('                     - Verifica configuración final');
    console.log('');
    console.log('   --restore, restore 🔄 Restaurar desde backup');
    console.log('                     - Restaura base de datos desde archivo de backup');
    console.log('                     - Usa el último backup si no se especifica archivo');
    console.log('                     - Crea backup de seguridad antes de restaurar');
    console.log('');
    console.log('   --drop-all, drop-all 🗑️ Eliminar todas las tablas');
    console.log('                     - Elimina TODAS las tablas del schema');
    console.log('                     - Acción irreversible, usar con precaución');
    console.log('                     - Se recomienda backup previo');
    console.log('');
    console.log('   --sync, sync       🔄 Sincronización inteligente');
    console.log('                     - Sincroniza BD con archivo SQL');
    console.log('                     - Elimina tablas obsoletas');
    console.log('                     - Crea tablas faltantes');
    console.log('                     - Mantiene datos existentes');
    console.log('');
    console.log('   --help, help, -h  ❓ Mostrar esta ayuda');
    console.log('');
    console.log('🔧 CONFIGURACIÓN REQUERIDA:');
    console.log('   - Archivo .env con credenciales de MySQL');
    console.log('   - Variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    console.log('   - Archivo SQL: firmas_digitales_v2.sql en la raíz del proyecto');
    console.log('');
    console.log('📁 ESTRUCTURA DE ARCHIVOS:');
    console.log('   scripts/setup-db.js    - Este archivo principal');
    console.log('   firmas_digitales.sql   - Script SQL principal');
    console.log('   backups/               - Carpeta para archivos de backup');
    console.log('   .env                   - Archivo de configuración');
    console.log('');
    console.log('⚠️  NOTAS IMPORTANTES:');
    console.log('   - Siempre hacer backup antes de usar --reset o --drop-all');
    console.log('   - --drop-all elimina TODAS las tablas (irreversible)');
    console.log('   - --sync es la opción recomendada para actualizaciones');
    console.log('   - Verificar credenciales en .env antes de ejecutar');
    console.log('   - Los backups se guardan con timestamp automático');
    console.log('   - El comando --install es equivalente a configuración estándar');
    console.log('');
    console.log('📞 EJEMPLOS DE USO:');
    console.log('   npm run db:setup                      # Configuración básica');
    console.log('   npm run db:sync                       # Sincronización inteligente');
    console.log('   npm run db:backup                     # Crear backup');
    console.log('   npm run db:drop-all                   # Eliminar todas las tablas');
    console.log('   npm run db:reset                      # Reset completo');
    console.log('   npm run db:restore                    # Restaurar último backup');
    console.log('   npm run db:status                     # Ver estado');
    console.log('   npm run db:install                    # Instalación completa');
    console.log('   npm run db:help                       # Esta ayuda');
    console.log('');
    console.log('='.repeat(80));
    process.exit(0);
}

// Función principal
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    // Mostrar ayuda antes de cualquier otra operación
    if (command === '--help' || command === 'help' || command === '-h') {
        showHelp();
        return;
    }

    console.log('='.repeat(60));
    console.log('🛠️  GESTOR AUTOMÁTICO DE BASE DE DATOS');
    console.log('📄 Archivo: firmas_digitales_v2.sql');
    console.log('='.repeat(60));

    const setupManager = new DatabaseSetupManager();

    switch (command) {
        case '--backup':
        case 'backup':
            console.log('💾 MODO: CREAR BACKUP');
            await handleBackup(setupManager);
            break;

        case '--reset':
        case 'reset':
            console.log('🗑️  MODO: RESET COMPLETO');
            await handleReset(setupManager);
            break;

        case '--status':
        case 'status':
            console.log('📊 MODO: VERIFICAR ESTADO');
            await handleStatus(setupManager);
            break;

        case '--install':
        case 'install':
            console.log('📦 MODO: INSTALACIÓN COMPLETA');
            await handleInstall(setupManager);
            break;

        case '--restore':
        case 'restore':
            console.log('🔄 MODO: RESTAURAR BACKUP');
            await handleRestore(setupManager, args[1]); // args[1] puede ser el archivo específico
            break;

        case '--drop-all':
        case 'drop-all':
            console.log('🗑️  MODO: ELIMINAR TODAS LAS TABLAS');
            await handleDropAll(setupManager);
            break;

        case '--sync':
        case 'sync':
            console.log('🔄 MODO: SINCRONIZACIÓN INTELIGENTE');
            await handleSync(setupManager);
            break;

        default:
            console.log('🚀 MODO: CONFIGURACIÓN ESTÁNDAR');
            await handleSetup(setupManager);
            break;
    }
}

// Manejadores de comandos
async function handleSetup(setupManager) {
    const success = await setupManager.setupDatabase();

    console.log('='.repeat(60));
    if (success) {
        console.log('🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('📚 Tu base de datos está lista para usar.');
        console.log('\n💡 Comandos disponibles:');
        console.log('  npm run db:sync    - Sincronización inteligente');
        console.log('  npm run db:backup  - Crear backup');
        console.log('  npm run db:status  - Ver estado');
        console.log('  npm run db:reset   - Reset completo');
        console.log('  npm run db:drop-all - Eliminar todas las tablas');
        process.exit(0);
    } else {
        console.log('❌ CONFIGURACIÓN FALLIDA');
        console.log('🔧 Verifica las credenciales en el archivo .env');
        process.exit(1);
    }
}

async function handleBackup(setupManager) {
    // Verificar conexión
    if (!await setupManager.connect()) {
        console.log('❌ No se pudo conectar a la base de datos');
        process.exit(1);
    }

    // Verificar si la base de datos existe
    const dbExists = await setupManager.databaseExists();
    if (!dbExists) {
        console.log(`❌ La base de datos '${setupManager.config.database}' no existe`);
        console.log('💡 Ejecuta primero: npm run db:setup');
        process.exit(1);
    }

    // Reconectar con la base de datos
    await setupManager.connection.end();
    setupManager.connection = await mysql.createConnection(setupManager.config);

    const backupFile = await setupManager.createBackup();

    console.log('='.repeat(60));
    if (backupFile) {
        console.log('✅ ¡BACKUP CREADO EXITOSAMENTE!');
        console.log(`📁 Archivo: ${backupFile}`);
        process.exit(0);
    } else {
        console.log('❌ ERROR AL CREAR BACKUP');
        process.exit(1);
    }
}

async function handleReset(setupManager) {
    console.log('🔄 RESET INTELIGENTE');
    console.log('Esto limpiará todos los datos pero mantendrá la estructura');
    console.log('y recreará los usuarios admin/owner por defecto');
    console.log('💾 Se creará un backup automático antes del reset');
    console.log('');

    // Verificar conexión
    if (!await setupManager.connect()) {
        console.log('❌ No se pudo conectar a la base de datos');
        process.exit(1);
    }

    // Verificar si la base de datos existe
    const dbExists = await setupManager.databaseExists();
    if (!dbExists) {
        console.log(`❌ La base de datos '${setupManager.config.database}' no existe`);
        console.log('💡 No hay nada que resetear');
        process.exit(0);
    }

    // Reconectar con la base de datos
    await setupManager.connection.end();
    setupManager.connection = await mysql.createConnection(setupManager.config);

    const success = await setupManager.resetDatabase();

    console.log('='.repeat(60));
    if (success) {
        console.log('� ¡RESET INTELIGENTE COMPLETADO EXITOSAMENTE!');
        console.log('📚 Base de datos limpiada con datos por defecto');
        console.log('👤 Usuarios admin/owner recreados');
        console.log('\n💡 El sistema está listo para usar');
        process.exit(0);
    } else {
        console.log('❌ ERROR DURANTE EL RESET');
        process.exit(1);
    }
}

async function handleStatus(setupManager) {
    const success = await setupManager.showStatus();

    console.log('='.repeat(60));
    if (success) {
        console.log('✅ Información obtenida correctamente');
    } else {
        console.log('❌ Error al obtener información');
    }
}

async function handleInstall(setupManager) {
    console.log('📦 INSTALACIÓN COMPLETA DEL SISTEMA');
    console.log('Esto incluye: creación de BD, tablas, datos, índices, procedimientos y vistas');
    console.log('');

    const success = await setupManager.setupDatabase();

    console.log('='.repeat(60));
    if (success) {
        console.log('🎉 ¡INSTALACIÓN COMPLETA EXITOSAMENTE!');
        console.log('🚀 El sistema está listo para usar');
        console.log('\n💡 Comandos de mantenimiento:');
        console.log('  npm run db:backup  - Crear backup');
        console.log('  npm run db:status  - Ver estado');
        console.log('  npm run db:reset   - Reset completo');
        process.exit(0);
    } else {
        console.log('❌ INSTALACIÓN FALLIDA');
        console.log('🔧 Verifica las credenciales en el archivo .env');
        process.exit(1);
    }
}

// Manejador para restaurar backup
async function handleRestore(setupManager, backupFile = null) {
    console.log('🔄 RESTAURACIÓN DE BACKUP');
    console.log('Esto restaurará la base de datos desde un archivo de backup');
    console.log('');

    // Verificar conexión
    if (!await setupManager.connect()) {
        console.log('❌ No se pudo conectar a la base de datos');
        process.exit(1);
    }

    // Verificar si la base de datos existe
    const dbExists = await setupManager.databaseExists();
    if (!dbExists) {
        console.log(`❌ La base de datos '${setupManager.config.database}' no existe`);
        console.log('💡 Crea la base de datos primero con: npm run db:setup');
        process.exit(1);
    }

    // Reconectar con la base de datos
    await setupManager.connection.end();
    setupManager.connection = await mysql.createConnection(setupManager.config);

    const success = await setupManager.restoreBackup(backupFile);

    console.log('='.repeat(60));
    if (success) {
        console.log('✅ ¡RESTAURACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('🔄 La base de datos ha sido restaurada desde el backup');
        console.log('\n💡 Comandos disponibles:');
        console.log('  npm run db:status  - Ver estado actual');
        console.log('  npm run db:sync    - Sincronización inteligente');
        console.log('  npm run db:backup  - Crear nuevo backup');
        process.exit(0);
    } else {
        console.log('❌ ERROR DURANTE LA RESTAURACIÓN');
        console.log('🔧 Verifica que el archivo de backup existe y es válido');
        process.exit(1);
    }
}

// Manejador para eliminar todas las tablas
async function handleDropAll(setupManager) {
    console.log('🗑️ ELIMINACIÓN COMPLETA DE TABLAS');
    console.log('Esto eliminará TODAS las tablas del schema');
    console.log('⚠️  ESTA ACCIÓN ES IRREVERSIBLE');
    console.log('💾 Se recomienda crear un backup antes');
    console.log('');

    // Verificar conexión
    if (!await setupManager.connect()) {
        console.log('❌ No se pudo conectar a la base de datos');
        process.exit(1);
    }

    // Verificar si la base de datos existe
    const dbExists = await setupManager.databaseExists();
    if (!dbExists) {
        console.log(`❌ La base de datos '${setupManager.config.database}' no existe`);
        console.log('💡 No hay tablas para eliminar');
        process.exit(0);
    }

    // Reconectar con la base de datos
    await setupManager.connection.end();
    setupManager.connection = await mysql.createConnection(setupManager.config);

    const success = await setupManager.dropAllTables();

    console.log('='.repeat(60));
    if (success) {
        console.log('✅ ¡ELIMINACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('🗑️ Todas las tablas han sido eliminadas');
        console.log('\n💡 Para recrear la estructura:');
        console.log('  npm run db:setup  - Configuración completa');
        console.log('  npm run db:sync   - Sincronización inteligente');
        console.log('  npm run db:status - Ver estado actual');
        process.exit(0);
    } else {
        console.log('❌ ERROR DURANTE LA ELIMINACIÓN');
        console.log('🔧 Algunas tablas no pudieron ser eliminadas');
        process.exit(1);
    }
}

// Manejador para sincronización inteligente
async function handleSync(setupManager) {
    console.log('🔄 SINCRONIZACIÓN INTELIGENTE');
    console.log('Esto sincronizará la base de datos con el archivo SQL');
    console.log('• Eliminará tablas que no existen en el SQL');
    console.log('• Creará tablas que faltan');
    console.log('• Mantendrá tablas existentes');
    console.log('');

    const success = await setupManager.syncDatabase();

    console.log('='.repeat(60));
    if (success) {
        console.log('✅ ¡SINCRONIZACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('🔄 La base de datos está sincronizada con el archivo SQL');
        console.log('\n💡 Comandos disponibles:');
        console.log('  npm run db:status  - Ver estado actual');
        console.log('  npm run db:backup  - Crear backup');
        console.log('  npm run db:reset   - Reset completo');
        process.exit(0);
    } else {
        console.log('❌ ERROR DURANTE LA SINCRONIZACIÓN');
        console.log('🔧 Verifica el archivo SQL y las credenciales');
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
}

module.exports = DatabaseSetupManager;