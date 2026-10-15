// Datos de demostración: crea un usuario de prueba con un CV y una candidatura de ejemplo.
//
//   npm run seed          -> crea (o actualiza) el usuario de prueba y sus datos de ejemplo
//   npm run seed:reset    -> BORRA TODOS LOS DATOS de la base de datos y luego crea lo anterior
//
// Usuario de prueba:  test@gmail.com  /  1234
// Solo para desarrollo local: no uses esta cuenta en un servidor público.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');
const { calculateMatch } = require('../src/utils/matchCalculator');

const TEST_EMAIL = 'test@gmail.com';
const TEST_PASSWORD = '1234';
const TABLES = ['password_resets', 'application_views', 'job_applications', 'cv_skills', 'cv_education', 'cv_experiences', 'cvs', 'users'];

const DEMO_CV = {
  title: 'CV de ejemplo',
  full_name: 'Test Usuario',
  email: TEST_EMAIL,
  phone: '600 000 000',
  summary: 'Desarrollador junior con prácticas en Python y Odoo. Busco mi primer puesto como desarrollador de aplicaciones web.',
  template: 'modern',
  experiences: [{ company: 'Empresa de Ejemplo S.L.', position: 'Prácticas de desarrollo Python', start_date: '2025-03-03', end_date: '2025-06-27', is_current: 0 }],
  education: [{ institution: 'Centro de Formación Ejemplo', degree: 'Técnico Superior en Desarrollo de Aplicaciones Web', start_date: '2023-09-01', end_date: '2025-06-30', is_current: 0 }],
  skills: [['Python', 'Intermedio'], ['Odoo', 'Intermedio'], ['MySQL', 'Básico'], ['JavaScript', 'Básico'], ['Git', 'Básico']]
};

const DEMO_JOB = {
  company_name: 'Tecnologías Demo',
  job_title: 'Desarrollador/a Odoo junior',
  job_description: 'Buscamos desarrollador junior con Python, Odoo y MySQL. Se valorará Docker, PostgreSQL e inglés técnico. Trabajarás en un equipo ágil con Git.',
  slug: 'demo-desarrollador-odoo-junior'
};

async function wipe() {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()');
    const existing = new Set(rows.map(r => String(r.name || r.TABLE_NAME).toLowerCase()));
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of TABLES) {
      if (existing.has(t)) {
        await conn.query(`TRUNCATE TABLE \`${t}\``);
        console.log(`  vaciada: ${t}`);
      }
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    conn.release();
  }
}

async function seed() {
  const hash = await bcrypt.hash(TEST_PASSWORD, 10);

  let userId;
  const [found] = await pool.query('SELECT id FROM users WHERE email = ?', [TEST_EMAIL]);
  if (found.length) {
    userId = found[0].id;
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, userId]);
    // Se rehace el contenido de ejemplo de esta cuenta, sin tocar las demás
    await pool.query('DELETE FROM job_applications WHERE user_id = ?', [userId]);
    await pool.query('DELETE FROM cvs WHERE user_id = ?', [userId]);
  } else {
    const [res] = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [TEST_EMAIL, hash]);
    userId = res.insertId;
  }

  const [cvRes] = await pool.query(
    `INSERT INTO cvs (user_id, title, full_name, email, phone, summary, photo, is_default, template)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?)`,
    [userId, DEMO_CV.title, DEMO_CV.full_name, DEMO_CV.email, DEMO_CV.phone, DEMO_CV.summary, DEMO_CV.template]
  );
  const cvId = cvRes.insertId;

  for (const e of DEMO_CV.experiences) {
    await pool.query('INSERT INTO cv_experiences (cv_id, company, position, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, ?)',
      [cvId, e.company, e.position, e.start_date, e.end_date, e.is_current]);
  }
  for (const e of DEMO_CV.education) {
    await pool.query('INSERT INTO cv_education (cv_id, institution, degree, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, ?)',
      [cvId, e.institution, e.degree, e.start_date, e.end_date, e.is_current]);
  }
  for (const [name, level] of DEMO_CV.skills) {
    await pool.query('INSERT INTO cv_skills (cv_id, skill_name, level) VALUES (?, ?, ?)', [cvId, name, level]);
  }

  const match = calculateMatch({
    title: DEMO_CV.title, summary: DEMO_CV.summary,
    skills: DEMO_CV.skills.map(([skill_name]) => ({ skill_name })),
    experiences: DEMO_CV.experiences, education: DEMO_CV.education
  }, DEMO_JOB.job_description);

  await pool.query(
    `INSERT INTO job_applications (user_id, cv_id, company_name, job_title, job_description, match_percentage, slug)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, cvId, DEMO_JOB.company_name, DEMO_JOB.job_title, DEMO_JOB.job_description, match.percentage, DEMO_JOB.slug]
  );

  return { userId, cvId, percentage: match.percentage };
}

(async () => {
  try {
    if (process.argv.includes('--reset')) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Se niega a borrar la base de datos con NODE_ENV=production.');
        process.exit(1);
      }
      console.log(`Borrando todos los datos de la base "${process.env.DB_NAME || 'cv_matcher_db'}"...`);
      await wipe();
    }
    const r = await seed();
    console.log('\nListo. Datos de demostración creados:');
    console.log(`  Usuario:    ${TEST_EMAIL}`);
    console.log(`  Contraseña: ${TEST_PASSWORD}`);
    console.log(`  CV de ejemplo (id ${r.cvId}) y una candidatura con ${r.percentage}% de compatibilidad.`);
    console.log('  Enlace público de ejemplo: /view.html?slug=' + DEMO_JOB.slug);
  } catch (err) {
    console.error('\nNo se pudo completar:', err.message);
    if (/doesn't exist|no existe/i.test(err.message)) console.error('¿Has creado las tablas? Importa schema.sql primero.');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
