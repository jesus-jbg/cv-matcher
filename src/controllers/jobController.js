const db = require('../config/db');
const { calculateMatch } = require('../utils/matchCalculator');

function generateSlug(company, jobTitle) {
  const cleanStr = `${company}-${jobTitle}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-');
  const randomCode = Math.random().toString(36).substring(2, 7);
  return `${cleanStr}-${randomCode}`;
}

// Carga experiencia, estudios y habilidades del CV y calcula el match con la oferta
async function loadAndMatch(cv, jobDescription) {
  const [experiences] = await db.query('SELECT company, position, description FROM cv_experiences WHERE cv_id = ?', [cv.id]);
  const [education] = await db.query('SELECT institution, degree, description FROM cv_education WHERE cv_id = ?', [cv.id]);
  const [skills] = await db.query('SELECT skill_name, level FROM cv_skills WHERE cv_id = ?', [cv.id]);
  cv.experiences = experiences;
  cv.education = education;
  cv.skills = skills;
  return calculateMatch(cv, jobDescription);
}

const matchPayload = (result) => ({
  match_percentage: result.percentage,
  matched_keywords: result.matched,
  partial_keywords: result.partial,
  missing_keywords: result.missing,
  skill_levels: result.skillLevels,
  total_keywords: result.totalKeywords
});

// 1. Crear solicitud de empleo / candidatura
exports.createApplication = async (req, res) => {
  const { company_name, job_title, job_description, selected_cv_id } = req.body;
  try {
    let cvToMatch = null;

    if (selected_cv_id) {
      const [cvs] = await db.query('SELECT * FROM cvs WHERE id = ? AND user_id = ?', [selected_cv_id, req.user.id]);
      cvToMatch = cvs[0];
    } else {
      const [cvs] = await db.query('SELECT * FROM cvs WHERE user_id = ? ORDER BY is_default DESC, id ASC LIMIT 1', [req.user.id]);
      cvToMatch = cvs[0];
    }

    if (!cvToMatch) {
      return res.status(400).json({ error: 'No tienes ningún CV guardado para comparar.' });
    }

    const result = await loadAndMatch(cvToMatch, job_description);
    const matchPercentage = result.percentage;
    const slug = generateSlug(company_name, job_title);

    const [inserted] = await db.query(
      `INSERT INTO job_applications (user_id, cv_id, company_name, job_title, job_description, match_percentage, slug) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, cvToMatch.id, company_name, job_title, job_description, matchPercentage, slug]
    );

    res.json({
      message: 'Candidatura generada con éxito',
      id: inserted.insertId,
      ...matchPayload(result),
      cv_title: cvToMatch.title || `CV #${cvToMatch.id}`,
      company_name, job_title, slug
    });
  } catch (err) {
    console.error('Error al crear candidatura:', err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Obtener lista de candidaturas del usuario
exports.getApplications = async (req, res) => {
  try {
    const [jobs] = await db.query(
      'SELECT ja.*, c.title as cv_title FROM job_applications ja LEFT JOIN cvs c ON ja.cv_id = c.id WHERE ja.user_id = ? ORDER BY ja.created_at DESC',
      [req.user.id]
    );
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Obtener candidatura pública por slug (Línea que faltaba)
exports.getApplicationBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const [jobs] = await db.query(
      'SELECT ja.*, c.full_name, c.email, c.phone, c.summary FROM job_applications ja LEFT JOIN cvs c ON ja.cv_id = c.id WHERE ja.slug = ?',
      [slug]
    );

    if (jobs.length === 0) {
      return res.status(404).json({ error: 'Candidatura no encontrada' });
    }

    res.json(jobs[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Borrar una candidatura (solo si es del usuario que la pide)
exports.deleteApplication = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Identificador no válido' });
  }
  try {
    const [result] = await db.query(
      'DELETE FROM job_applications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Candidatura no encontrada' });
    }
    res.json({ message: 'Candidatura eliminada' });
  } catch (err) {
    console.error('Error al borrar candidatura:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


// 5. Añadir una habilidad al CV de una candidatura y recalcular su porcentaje
exports.addSkillToApplication = async (req, res) => {
  const id = Number(req.params.id);
  const name = String((req.body || {}).skill_name || '').trim().slice(0, 60);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Identificador no válido' });
  if (!name) return res.status(400).json({ error: 'Falta el nombre de la habilidad' });
  try {
    const [jobs] = await db.query('SELECT * FROM job_applications WHERE id = ? AND user_id = ?', [id, req.user.id]);
    const job = jobs[0];
    if (!job) return res.status(404).json({ error: 'Candidatura no encontrada' });
    if (!job.cv_id) return res.status(409).json({ error: 'El CV de esta candidatura ya no existe.' });
    const [cvs] = await db.query('SELECT * FROM cvs WHERE id = ? AND user_id = ?', [job.cv_id, req.user.id]);
    if (!cvs[0]) return res.status(409).json({ error: 'El CV de esta candidatura ya no existe.' });

    const [dup] = await db.query('SELECT id FROM cv_skills WHERE cv_id = ? AND LOWER(skill_name) = LOWER(?)', [job.cv_id, name]);
    const added = dup.length === 0;
    if (added) {
      await db.query('INSERT INTO cv_skills (cv_id, skill_name, level) VALUES (?, ?, ?)', [job.cv_id, name, 'Intermedio']);
    }

    const result = await loadAndMatch(cvs[0], job.job_description);
    await db.query('UPDATE job_applications SET match_percentage = ? WHERE id = ? AND user_id = ?', [result.percentage, id, req.user.id]);
    res.json({ added, id, cv_id: job.cv_id, ...matchPayload(result) });
  } catch (err) {
    console.error('Error al añadir habilidad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
