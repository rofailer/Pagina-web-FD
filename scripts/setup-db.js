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
                'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
                [this.config.database]
            );
            return rows.map(row => row.TABLE_NAME);
        } catch (error) {
            this.log(`⚠️ Error obteniendo tablas existentes: ${error.message}`, 'yellow');
            return [];
        }
    }

    parseSQLStatements(sqlContent) {
        const statements = [];
        let currentStatement = '';
        let inMultiLineComment = false;
        let inSingleLineComment = false;
        let inString = false;
        let stringChar = '';
        let inDelimiterBlock = false;
        let delimiter = ';';

        // Dividir por líneas para procesar mejor
        const lines = sqlContent.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Saltar líneas vacías
            if (!line) continue;

            // Manejar cambios de delimitador
            if (line.toUpperCase().startsWith('DELIMITER ')) {
                delimiter = line.split(' ')[1];
                continue;
            }

            // Si estamos en un bloque de delimitador especial
            if (delimiter !== ';') {
                if (line.includes(delimiter)) {
                    currentStatement += line + '\n';
                    statements.push(currentStatement.trim());
                    currentStatement = '';
                    delimiter = ';'; // Reset al delimitador por defecto
                    continue;
                }
                currentStatement += line + '\n';
                continue;
            }

            // Manejar comentarios multilinea
            if (!inString && !inSingleLineComment && line.includes('/*')) {
                inMultiLineComment = true;
                currentStatement += line + '\n';
                if (line.includes('*/')) {
                    inMultiLineComment = false;
                }
                continue;
            }

            if (inMultiLineComment) {
                currentStatement += line + '\n';
                if (line.includes('*/')) {
                    inMultiLineComment = false;
                }
                continue;
            }

            // Manejar comentarios de una línea
            if (!inString && line.startsWith('--')) {
                continue; // Ignorar comentarios de línea completa
            }

            // Manejar strings
            let processedLine = '';
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const nextChar = line[j + 1] || '';

                if (!inString && (char === '"' || char === "'")) {
                    inString = true;
                    stringChar = char;
                } else if (inString && char === stringChar && line[j - 1] !== '\\') {
                    inString = false;
                    stringChar = '';
                }

                processedLine += char;
            }

            currentStatement += processedLine + '\n';

            // Detectar fin de statement (solo si no estamos en string)
            if (!inString && line.endsWith(';')) {
                const trimmed = currentStatement.trim();
                if (trimmed && !trimmed.startsWith('--') && trimmed !== ';') {
                    statements.push(trimmed);
                }
                currentStatement = '';
            }
        }

        // Agregar último statement si existe
        const trimmed = currentStatement.trim();
        if (trimmed && !trimmed.startsWith('--')) {
            statements.push(trimmed);
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
            } else if (upperStmt.includes('DROP TABLE')) {
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

            // Leer archivo SQL
            if (!fs.existsSync(this.sqlFile)) {
                this.log(`❌ Archivo SQL no encontrado: ${this.sqlFile}`, 'red');
                return false;
            }

            this.log('📖 Leyendo archivo SQL...', 'cyan');
            const sqlContent = fs.readFileSync(this.sqlFile, 'utf8');
            this.log(`📄 Archivo SQL cargado (${sqlContent.length} caracteres)`, 'green');

            // Parsear statements SQL
            const statements = this.parseSQLStatements(sqlContent);
            this.log(`🔍 Encontrados ${statements.length} statements SQL`, 'cyan');

            // Ejecutar statements en orden (sin categorizar)
            let successCount = 0;
            let errorCount = 0;

            this.log(`\n📋 Ejecutando ${statements.length} statements en orden...`, 'blue');

            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                try {
                    // Usar conexión directa para statements complejos
                    await this.connection.query(statement);
                    successCount++;

                    if (i % 5 === 0 || i === statements.length - 1) {
                        this.log(`  ✅ ${successCount}/${statements.length} statements ejecutados`, 'green');
                    }
                } catch (error) {
                    // Ignorar errores de elementos que ya existen
                    if (error.code === 'ER_TABLE_EXISTS_ERROR' ||
                        error.code === 'ER_DUP_KEYNAME' ||
                        error.code === 'ER_DUP_ENTRY' ||
                        error.message.includes('already exists') ||
                        error.message.includes('Duplicate entry')) {
                        this.log(`  ⚠️ Statement ${i + 1} ya existe, continuando...`, 'yellow');
                    } else {
                        this.log(`  ❌ Error en statement ${i + 1}: ${error.message}`, 'red');
                        errorCount++;
                    }
                }
            }

            // Verificación final
            await this.finalVerification();

            this.log('\n🎉 Configuración de base de datos completada!', 'bright');
            this.log(`📊 Resumen: ${successCount} exitosos, ${errorCount} errores`, 'cyan');

            if (errorCount === 0) {
                this.log('✅ Base de datos configurada correctamente', 'green');
            } else {
                this.log('⚠️ Base de datos configurada con algunos errores menores', 'yellow');
            }

            return true;

        } catch (error) {
            this.log(`❌ Error durante la configuración: ${error.message}`, 'red');
            return false;
        } finally {
            if (this.connection) {
                await this.connection.end();
                this.log('🔌 Conexión cerrada', 'cyan');
            }
        }
    }

    async checkExistingData() {
        try {
            // Verificar si hay datos en las tablas principales
            const tablesToCheck = ['users', 'global_template_config', 'theme_config', 'visual_config'];

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
            const tablesToVerify = ['users', 'global_template_config', 'theme_config', 'visual_config'];

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

            // Obtener todas las tablas
            const tables = await this.getExistingTables();

            if (tables.length === 0) {
                this.log('⚠️ No hay tablas para respaldar', 'yellow');
                return null;
            }

            let backupContent = `-- Backup de la base de datos ${this.config.database}\n`;
            backupContent += `-- Fecha: ${new Date().toISOString()}\n`;
            backupContent += `-- Tablas: ${tables.length}\n\n`;

            backupContent += `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n`;
            backupContent += `START TRANSACTION;\n`;
            backupContent += `SET time_zone = "+00:00";\n\n`;

            for (const table of tables) {
                try {
                    this.log(`  📋 Respaldando tabla: ${table}`, 'white');

                    // Obtener estructura de la tabla
                    const [structure] = await this.connection.execute(`SHOW CREATE TABLE \`${table}\``);
                    backupContent += `-- Estructura de la tabla ${table}\n`;
                    backupContent += `${structure[0]['Create Table']};\n\n`;

                    // Obtener datos de la tabla
                    const [rows] = await this.connection.execute(`SELECT * FROM \`${table}\``);

                    if (rows.length > 0) {
                        backupContent += `-- Datos de la tabla ${table}\n`;

                        // Obtener nombres de columnas
                        const [columns] = await this.connection.execute(`DESCRIBE \`${table}\``);
                        const columnNames = columns.map(col => `\`${col.Field}\``).join(', ');

                        for (const row of rows) {
                            const values = columns.map(col => {
                                const value = row[col.Field];
                                if (value === null) return 'NULL';
                                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                                if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                                return value;
                            }).join(', ');

                            backupContent += `INSERT INTO \`${table}\` (${columnNames}) VALUES (${values});\n`;
                        }
                        backupContent += '\n';
                    }

                } catch (error) {
                    this.log(`  ⚠️ Error respaldando tabla ${table}: ${error.message}`, 'yellow');
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
            this.log('🗑️ Reseteando base de datos...', 'red');

            // Crear backup antes de resetear
            const backupFile = await this.createBackup();
            if (backupFile) {
                this.log('💾 Backup creado antes del reset', 'green');
            }

            // Obtener todas las tablas
            const tables = await this.getExistingTables();

            if (tables.length > 0) {
                this.log(`🗑️ Eliminando ${tables.length} tablas...`, 'yellow');

                // Desactivar restricciones de clave foránea
                await this.connection.execute('SET FOREIGN_KEY_CHECKS = 0');

                // Eliminar todas las tablas
                for (const table of tables) {
                    try {
                        await this.connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
                        this.log(`  ✅ Eliminada: ${table}`, 'green');
                    } catch (error) {
                        this.log(`  ⚠️ Error eliminando ${table}: ${error.message}`, 'yellow');
                    }
                }

                // Reactivar restricciones de clave foránea
                await this.connection.execute('SET FOREIGN_KEY_CHECKS = 1');

                this.log('✅ Todas las tablas eliminadas', 'green');
            } else {
                this.log('⚠️ No hay tablas para eliminar', 'yellow');
            }

            return true;

        } catch (error) {
            this.log(`❌ Error reseteando base de datos: ${error.message}`, 'red');
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

// Función principal
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

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
        console.log('  npm run db:backup  - Crear backup');
        console.log('  npm run db:status  - Ver estado');
        console.log('  npm run db:reset   - Reset completo');
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
    console.log('⚠️  ATENCIÓN: Esta acción eliminará TODOS los datos');
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
        console.log('🗑️  ¡RESET COMPLETADO EXITOSAMENTE!');
        console.log('📚 Base de datos vacía y lista para nueva instalación');
        console.log('\n💡 Para instalar nuevamente: npm run db:setup');
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

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
}

module.exports = DatabaseSetupManager;