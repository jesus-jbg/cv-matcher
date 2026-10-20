// Contenido de ejemplo para las cuentas de demostración (botón «Probar la demo»).
const { calculateMatch } = require('./matchCalculator');

const DEMO_CV = {
  title: 'CV de ejemplo',
  full_name: 'Alex Demo',
  email: 'alex.demo@ejemplo.com',
  phone: '600 000 000',
  summary: 'Desarrollador junior con prácticas en Python y Odoo. Busco mi primer puesto como desarrollador de aplicaciones web.',
  template: 'modern',
  experiences: [{
    company: 'Empresa de Ejemplo S.L.', position: 'Prácticas de desarrollo Python',
    start_date: '2025-03-03', end_date: '2025-06-27', is_current: 0,
    description: 'Automaticé informes con Odoo y scripts en Python. Personalicé modelos y vistas y validé datos con SQL.'
  }],
  education: [{
    institution: 'Centro de Formación Ejemplo', degree: 'Técnico Superior en Desarrollo de Aplicaciones Web',
    start_date: '2023-09-01', end_date: '2025-06-30', is_current: 0,
    description: 'Java, PHP, JavaScript y bases de datos MySQL. Proyecto final: aplicación web de gestión de almacén.'
  }],
  skills: [['Python', 'Intermedio'], ['Odoo', 'Intermedio'], ['MySQL', 'Básico'], ['JavaScript', 'Básico'], ['Git', 'Básico']]
};

const DEMO_JOB = {
  company_name: 'Tecnologías Demo',
  job_title: 'Desarrollador/a Odoo junior',
  job_description: 'Buscamos desarrollador junior con Python avanzado, Odoo y MySQL. Se valorará Docker, PostgreSQL e inglés técnico. Trabajarás en un equipo ágil con Git.'
};

// Crea el CV y la candidatura de ejemplo para un usuario. `db` es el pool de mysql2.
async function insertDemoContent(db, userId, slugSuffix) {
  const [cvRes] = await db.query(
    `INSERT INTO cvs (user_id, title, full_name, email, phone, summary, photo, is_default, template)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 1, ?)`,
    [userId, DEMO_CV.title, DEMO_CV.full_name, DEMO_CV.email, DEMO_CV.phone, DEMO_CV.summary, DEMO_CV.template]
  );
  const cvId = cvRes.insertId;
  for (const e of DEMO_CV.experiences) {
    await db.query('INSERT INTO cv_experiences (cv_id, company, position, start_date, end_date, is_current, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cvId, e.company, e.position, e.start_date, e.end_date, e.is_current, e.description]);
  }
  for (const e of DEMO_CV.education) {
    await db.query('INSERT INTO cv_education (cv_id, institution, degree, start_date, end_date, is_current, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [cvId, e.institution, e.degree, e.start_date, e.end_date, e.is_current, e.description]);
  }
  for (const [name, level] of DEMO_CV.skills) {
    await db.query('INSERT INTO cv_skills (cv_id, skill_name, level) VALUES (?, ?, ?)', [cvId, name, level]);
  }
  const match = calculateMatch({
    title: DEMO_CV.title, summary: DEMO_CV.summary,
    skills: DEMO_CV.skills.map(([skill_name, level]) => ({ skill_name, level })),
    experiences: DEMO_CV.experiences, education: DEMO_CV.education
  }, DEMO_JOB.job_description);
  await db.query(
    `INSERT INTO job_applications (user_id, cv_id, company_name, job_title, job_description, match_percentage, slug)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, cvId, DEMO_JOB.company_name, DEMO_JOB.job_title, DEMO_JOB.job_description, match.percentage, `demo-odoo-junior-${slugSuffix}`]
  );
  return { cvId, percentage: match.percentage };
}

module.exports = { insertDemoContent };
