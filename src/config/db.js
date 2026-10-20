const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'cv_matcher_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Las bases de datos en la nube suelen exigir conexión cifrada: DB_SSL=true
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_STRICT !== 'false' } : undefined
});

module.exports = pool;