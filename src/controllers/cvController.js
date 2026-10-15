const db = require('../config/db');

// Listar todos los CVs del usuario autenticado
exports.getCvList = async (req, res) => {
  try {
    // OJO: la tabla `cvs` NO tiene columna updated_at en el esquema actual.
    // Pedirla provocaba ER_BAD_FIELD_ERROR -> HTTP 500 -> selector vacío.
    const [cvs] = await db.query(
      'SELECT id, title, is_default FROM cvs WHERE user_id = ? ORDER BY is_default DESC, id DESC',
      [req.user.id]
    );
    res.set('Cache-Control', 'no-store');
    res.json(cvs);
  } catch (err) {
    console.error('Error en getCvList:', err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener un CV específico por su ID o el preferente/por defecto
exports.getCV = async (req, res) => {
  try {
    const cvId = req.params.id;
    let cvs = [];

    if (cvId) {
      [cvs] = await db.query('SELECT * FROM cvs WHERE id = ? AND user_id = ?', [cvId, req.user.id]);
    } else {
      [cvs] = await db.query('SELECT * FROM cvs WHERE user_id = ? ORDER BY is_default DESC, id ASC LIMIT 1', [req.user.id]);
    }

    if (cvs.length === 0) {
      return res.status(404).json({ error: 'CV no encontrado' });
    }

    const cv = cvs[0];
    const [experiences] = await db.query('SELECT * FROM cv_experiences WHERE cv_id = ?', [cv.id]);
    const [education] = await db.query('SELECT * FROM cv_education WHERE cv_id = ?', [cv.id]);
    const [skills] = await db.query('SELECT * FROM cv_skills WHERE cv_id = ?', [cv.id]);

    cv.experiences = experiences;
    cv.education = education;
    cv.skills = skills;

    res.json(cv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Guardar o Actualizar un CV completo con sus relaciones (todo en UNA transacción:
// o se guarda el CV entero o no se guarda nada)
const MAX_PHOTO_CHARS = 3 * 1024 * 1024; // ~2,2 MB de imagen real en base64
const PHOTO_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;
const cleanDate = (d) => (typeof d === 'string' && d.trim() !== '' ? d.trim() : null);

exports.saveCV = async (req, res) => {
  const { cv_id, title, full_name, email, phone, summary, photo, is_default, template, experiences, education, skills } = req.body;

  if (photo) {
    if (typeof photo !== 'string' || !PHOTO_RE.test(photo)) {
      return res.status(400).json({ error: 'La foto no es una imagen válida (PNG, JPG, WEBP o GIF).' });
    }
    if (photo.length > MAX_PHOTO_CHARS) {
      return res.status(413).json({ error: 'La foto es demasiado pesada. Usa una de menos de 2 MB.' });
    }
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Si se edita un CV existente, debe pertenecer al usuario
    if (cv_id) {
      const [own] = await conn.query('SELECT id FROM cvs WHERE id = ? AND user_id = ?', [cv_id, req.user.id]);
      if (own.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'CV no encontrado' });
      }
    }

    if (is_default) {
      await conn.query('UPDATE cvs SET is_default = 0 WHERE user_id = ?', [req.user.id]);
    }

    let targetCvId = cv_id;

    if (cv_id) {
      await conn.query(
        `UPDATE cvs SET title = ?, full_name = ?, email = ?, phone = ?, summary = ?, photo = ?, is_default = ?, template = ? 
         WHERE id = ? AND user_id = ?`,
        [title || 'Mi CV', full_name || '', email || '', phone || '', summary || '', photo || null, is_default ? 1 : 0, template || 'modern', cv_id, req.user.id]
      );
    } else {
      const [result] = await conn.query(
        `INSERT INTO cvs (user_id, title, full_name, email, phone, summary, photo, is_default, template) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, title || 'Nuevo CV', full_name || '', email || '', phone || '', summary || '', photo || null, is_default ? 1 : 0, template || 'modern']
      );
      targetCvId = result.insertId;
    }

    // Experiencias (se reemplazan por las enviadas)
    await conn.query('DELETE FROM cv_experiences WHERE cv_id = ?', [targetCvId]);
    const expRows = (experiences || [])
      .filter(e => e.company && e.position)
      .map(e => [targetCvId, e.company, e.position, cleanDate(e.start_date), cleanDate(e.end_date), e.is_current ? 1 : 0]);
    if (expRows.length) {
      await conn.query('INSERT INTO cv_experiences (cv_id, company, position, start_date, end_date, is_current) VALUES ?', [expRows]);
    }

    // Educación
    await conn.query('DELETE FROM cv_education WHERE cv_id = ?', [targetCvId]);
    const eduRows = (education || [])
      .filter(e => e.institution && e.degree)
      .map(e => [targetCvId, e.institution, e.degree, cleanDate(e.start_date), cleanDate(e.end_date), e.is_current ? 1 : 0]);
    if (eduRows.length) {
      await conn.query('INSERT INTO cv_education (cv_id, institution, degree, start_date, end_date, is_current) VALUES ?', [eduRows]);
    }

    // Habilidades
    await conn.query('DELETE FROM cv_skills WHERE cv_id = ?', [targetCvId]);
    const skillRows = (skills || [])
      .filter(s => s.skill_name)
      .map(s => [targetCvId, s.skill_name, s.level || 'Básico']);
    if (skillRows.length) {
      await conn.query('INSERT INTO cv_skills (cv_id, skill_name, level) VALUES ?', [skillRows]);
    }

    await conn.commit();
    res.json({ message: 'CV guardado correctamente', cv_id: targetCvId });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch (_) {} }
    console.error('Error al guardar CV:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
};

// Borrar un CV (solo si pertenece al usuario autenticado)
exports.deleteCV = async (req, res) => {
  const cvId = parseInt(req.params.id, 10);
  if (!Number.isInteger(cvId)) {
    return res.status(400).json({ error: 'ID de CV no válido' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [own] = await conn.query('SELECT id FROM cvs WHERE id = ? AND user_id = ?', [cvId, req.user.id]);
    if (own.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'CV no encontrado' });
    }

    await conn.query('DELETE FROM cv_experiences WHERE cv_id = ?', [cvId]);
    await conn.query('DELETE FROM cv_education WHERE cv_id = ?', [cvId]);
    await conn.query('DELETE FROM cv_skills WHERE cv_id = ?', [cvId]);

    // Las candidaturas ya generadas con este CV se conservan (cv_id pasa a NULL)
    // Si la columna no admite NULL, el DELETE final avisará con un 409.
    try {
      await conn.query('UPDATE job_applications SET cv_id = NULL WHERE cv_id = ? AND user_id = ?', [cvId, req.user.id]);
    } catch (e) { /* se resuelve abajo si hay restricción */ }

    await conn.query('DELETE FROM cvs WHERE id = ? AND user_id = ?', [cvId, req.user.id]);
    await conn.commit();

    res.json({ message: 'CV eliminado correctamente', cv_id: cvId });
  } catch (err) {
    if (conn) { try { await conn.rollback(); } catch (_) {} }
    console.error('Error al borrar CV:', err);
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
      return res.status(409).json({ error: 'No se puede borrar: hay candidaturas que usan este CV.' });
    }
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
};