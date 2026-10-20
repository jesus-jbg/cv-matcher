const fs = require('fs');
const path = require('path');
const db = require('./db');

// Columnas añadidas después de la primera versión. Si faltan en tu base de datos
// se crean al arrancar el servidor, así no hace falta tocar phpMyAdmin.
const COLUMNS = [
  { table: 'cvs', column: 'template', ddl: "VARCHAR(20) NOT NULL DEFAULT 'modern'" },
  { table: 'cv_experiences', column: 'description', ddl: 'TEXT NULL' },
  { table: 'cv_education', column: 'description', ddl: 'TEXT NULL' }
];

// Sentencias de schema.sql sin CREATE DATABASE / USE, para poder ejecutarlas en cualquier base de datos
function schemaStatements() {
  const sql = fs.readFileSync(path.join(__dirname, '../../schema.sql'), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  return sql.split(';').map(x => x.trim())
    .filter(x => x && !/^(CREATE DATABASE|USE)\b/i.test(x) && /^CREATE TABLE/i.test(x));
}

// Base de datos vacía (por ejemplo, una nueva en la nube): crea las tablas solas.
async function ensureTables() {
  try {
    const [rows] = await db.query(
      "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'");
    if (rows.length) return;
    for (const stmt of schemaStatements()) await db.query(stmt);
    console.log('🛠  Tablas creadas en una base de datos vacía.');
  } catch (err) {
    console.error('No se pudieron crear las tablas:', err.message);
  }
}

async function ensureSchema() {
  if (process.env.AUTO_SCHEMA !== 'false') await ensureTables();
  for (const { table, column, ddl } of COLUMNS) {
    try {
      const [rows] = await db.query(
        'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [table, column]
      );
      if (rows.length === 0) {
        await db.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${ddl}`);
        console.log(`🛠  Base de datos actualizada: ${table}.${column}`);
      }
    } catch (err) {
      console.error(`No se pudo comprobar ${table}.${column}:`, err.message);
    }
  }
}

module.exports = { ensureSchema, schemaStatements };
