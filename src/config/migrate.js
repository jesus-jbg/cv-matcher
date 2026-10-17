const db = require('./db');

// Columnas añadidas después de la primera versión. Si faltan en tu base de datos
// se crean al arrancar el servidor, así no hace falta tocar phpMyAdmin.
const COLUMNS = [
  { table: 'cvs', column: 'template', ddl: "VARCHAR(20) NOT NULL DEFAULT 'modern'" },
  { table: 'cv_experiences', column: 'description', ddl: 'TEXT NULL' },
  { table: 'cv_education', column: 'description', ddl: 'TEXT NULL' }
];

async function ensureSchema() {
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

module.exports = { ensureSchema };
