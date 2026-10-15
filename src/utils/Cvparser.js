// Análisis BÁSICO de un CV en texto plano (sin IA): detecta contacto, secciones,
// fechas, experiencia, estudios y habilidades con reglas. Es una aproximación:
// el usuario siempre revisa el resultado en el formulario antes de guardar.

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------------------------------------------------------------- secciones
const HEADINGS = {
  summary: ['perfil', 'perfil profesional', 'resumen', 'resumen profesional', 'sobre mi', 'acerca de mi',
    'objetivo', 'objetivo profesional', 'presentacion', 'profile', 'professional profile', 'summary',
    'professional summary', 'about me', 'about', 'personal statement'],
  experience: ['experiencia', 'experiencia profesional', 'experiencia laboral', 'experiencia de trabajo',
    'historial laboral', 'trayectoria profesional', 'practicas', 'practicas profesionales', 'work experience',
    'professional experience', 'experience', 'employment history', 'employment', 'work history'],
  education: ['formacion', 'formacion academica', 'formacion y estudios', 'educacion', 'educacion y formacion',
    'estudios', 'estudios realizados', 'education', 'academic background', 'academic education', 'studies', 'training'],
  skills: ['habilidades', 'competencias', 'competencias tecnicas', 'habilidades tecnicas',
    'habilidades y competencias', 'conocimientos', 'conocimientos tecnicos', 'tecnologias', 'aptitudes',
    'skills', 'technical skills', 'key skills', 'technologies', 'tech stack', 'herramientas'],
  other: ['idiomas', 'languages', 'certificaciones', 'certificados', 'cursos', 'cursos y certificaciones',
    'formacion complementaria', 'datos personales', 'datos de contacto', 'contacto', 'contact', 'referencias',
    'references', 'intereses', 'hobbies', 'aficiones', 'informacion adicional', 'otros datos', 'proyectos',
    'projects', 'voluntariado', 'logros', 'publicaciones', 'carnet de conducir', 'permiso de conducir',
    'disponibilidad', 'enlaces', 'links', 'redes']
};

function headingOf(line) {
  const n = norm(line).replace(/[:\-–—•·_*#|]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!n || n.length > 45) return null;
  for (const [key, list] of Object.entries(HEADINGS)) {
    if (list.includes(n)) return key;
  }
  return null;
}

// -------------------------------------------------------------------- fechas
const MONTH = '(?:ene|jan|feb|mar|abr|apr|may|jun|jul|ago|aug|sep|set|oct|nov|dic|dec)[a-z]*\\.?';
const DATE_TOKEN = `(?:${MONTH}\\s+(?:de\\s+)?\\d{4}|\\d{1,2}[\\/.-]\\d{1,2}[\\/.-]\\d{4}|\\d{1,2}[\\/.-]\\d{4}|\\d{4})`;
const PRESENT = '(?:actualidad|actualmente|actual|presente|present|current|hoy|now|en curso|ahora)';
const RANGE_RE = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|a|al|hasta|to|until)\\s*(${DATE_TOKEN}|${PRESENT})`, 'i');
const MONTHS = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };

const pad = (n) => String(n).padStart(2, '0');

function toISO(token) {
  const t = norm(token).trim();
  let m;
  if ((m = t.match(/^([a-z]+)\.?\s+(?:de\s+)?(\d{4})$/))) {
    const mm = MONTHS[m[1].slice(0, 3)];
    return mm ? `${m[2]}-${pad(mm)}-01` : null;
  }
  if ((m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) {
    const [d, mo] = [+m[1], +m[2]];
    return mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${m[3]}-${pad(mo)}-${pad(d)}` : null;
  }
  if ((m = t.match(/^(\d{1,2})[\/.-](\d{4})$/))) {
    return +m[1] >= 1 && +m[1] <= 12 ? `${m[2]}-${pad(+m[1])}-01` : null;
  }
  if ((m = t.match(/^(\d{4})$/))) return `${m[1]}-01-01`;
  return null;
}

function findRange(line) {
  const n = norm(line);
  const m = n.match(RANGE_RE);
  if (!m) return null;
  const startISO = toISO(m[1]);
  if (!startISO) return null;
  const endIsPresent = new RegExp(`^${PRESENT}$`, 'i').test(m[2].trim());
  const endISO = endIsPresent ? null : toISO(m[2]);
  if (!endIsPresent && !endISO) return null;
  return { start: startISO, end: endISO, current: endIsPresent, index: m.index, length: m[0].length };
}

function findLoneYear(line) {
  const m = norm(line).match(/\b((?:19|20)\d{2})\b/);
  return m ? { year: m[1], index: m.index, length: 4 } : null;
}

// ------------------------------------------------------------------ utilidades
const BULLET_RE = /^\s*[•·▪■●○◦\-–—*►➢✓✔]\s*/;
const isBullet = (l) => BULLET_RE.test(l);
const stripBullet = (l) => l.replace(BULLET_RE, '').trim();
const COMPANY_RE = /\b(s\.?l\.?u?\.?|s\.?a\.?|ltd|inc|llc|gmbh|corp|factory|group|grupo|consulting|consultores|consultoria|solutions|soluciones|technologies|tecnologias|systems|sistemas|studio|labs|software|company|empresa|ayuntamiento|fundacion|banco|hospital)\b/;
const INSTITUTION_RE = /\b(universidad|university|instituto|ies|escuela|colegio|ilerna|academia|academy|school|college|centro|facultad|campus|udemy|coursera|fp|uned|uoc)\b/;

function titleCase(s) {
  return s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}

function cleanPiece(s) {
  return s.replace(/^[\s|,;:–—\-()@]+|[\s|,;:–—\-()@]+$/g, '').replace(/\s{2,}/g, ' ').trim();
}

function splitSections(lines) {
  const sections = { header: [], summary: [], experience: [], education: [], skills: [], other: [] };
  let current = 'header';
  let found = false;
  for (const line of lines) {
    const h = headingOf(line);
    if (h) { current = h; found = true; continue; }
    sections[current].push(line);
  }
  return { sections, found };
}

// ------------------------------------------------------------------ contacto
function findEmail(text) {
  const m = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0] : '';
}

function findPhone(text) {
  const candidates = text.match(/\+?\d[\d\s().-]{7,}\d/g) || [];
  for (const c of candidates) {
    const digits = c.replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 13) return c.replace(/\s{2,}/g, ' ').trim();
  }
  return '';
}

function findName(headerLines) {
  for (const raw of headerLines.slice(0, 8)) {
    const line = raw.trim();
    if (!line || /@|https?:|www\.|\d/.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 5 || line.length > 50) continue;
    if (!words.every(w => /^[\p{L}][\p{L}'.-]*$/u.test(w))) continue;
    if (headingOf(line)) continue;
    return line === line.toUpperCase() ? titleCase(line) : line;
  }
  return '';
}

// ------------------------------------------------------------------ entradas
// Convierte un bloque (experiencia o estudios) en entradas usando las líneas con fechas como ancla.
function parseEntries(lines, kind) {
  const entries = [];
  const dateLines = [];
  lines.forEach((l, i) => {
    if (isBullet(l)) return;
    const range = findRange(l);
    if (range) { dateLines.push({ i, range }); return; }
    if (kind === 'education' && l.length < 90) {
      const y = findLoneYear(l);
      if (y) dateLines.push({ i, range: { start: null, end: `${y.year}-01-01`, current: false, index: y.index, length: y.length } });
    }
  });
  if (dateLines.length === 0) return entries;

  // Estilo: fecha ANTES del título (la primera fecha abre el bloque) o DESPUÉS (el título va encima de la fecha)
  const style = dateLines[0].i === 0 ? 'after' : 'before';
  const used = new Set(dateLines.map(d => d.i));
  const isHeaderLine = (l) => l && !isBullet(l) && l.length <= 80 && !headingOf(l);

  dateLines.forEach((d, k) => {
    const line = lines[d.i];
    const remainder = cleanPiece(line.slice(0, d.range.index) + ' ' + line.slice(d.range.index + d.range.length));
    const pieces = [];

    if (style === 'before') {
      const lowerBound = k > 0 ? dateLines[k - 1].i + 1 : 0;
      const above = [];
      for (let j = d.i - 1; j >= lowerBound && above.length < 2; j--) {
        if (used.has(j) || !isHeaderLine(lines[j])) break;
        above.unshift(cleanPiece(lines[j]));
      }
      pieces.push(...above);
      if (remainder.length >= 3) pieces.push(remainder);
    } else {
      if (remainder.length >= 3) pieces.push(remainder);
      const upperBound = k + 1 < dateLines.length ? dateLines[k + 1].i : lines.length;
      for (let j = d.i + 1; j < upperBound && pieces.length < 2; j++) {
        if (used.has(j) || !isHeaderLine(lines[j])) break;
        pieces.push(cleanPiece(lines[j]));
      }
    }

    entries.push({ pieces: pieces.filter(Boolean), range: d.range, style });
  });
  return entries.slice(0, 12);
}

function splitPair(text) {
  // Separadores claros primero; " at " (inglés) solo si no hay otro. No se divide por " en ":
  // rompería títulos como "Grado en Ingeniería Informática".
  for (const re of [/\s[|@–—-]\s/, /,\s+/, /\s+at\s+/i]) {
    const parts = text.split(re).map(cleanPiece).filter(Boolean);
    if (parts.length >= 2) return [parts[0], parts.slice(1).join(' - ')];
  }
  return [text];
}

const POSITION_RE = /\b(desarrollador[a]?|developer|programador[a]?|ingenier[oa]|engineer|analista|analyst|tecnico|technician|administrativ[oa]|gerente|manager|director[a]?|jefe|jefa|responsable|consultor[a]?|disenador[a]?|designer|becari[oa]|practicas|intern|auxiliar|coordinador[a]?|comercial|asistente|assistant|especialista|specialist|arquitecto|tester|qa|devops|profesor[a]?|monitor[a]?|operari[oa]|dependiente|vendedor[a]?|conductor[a]?|enfermer[oa]|camarer[oa]|cocinero|recepcionista|abogad[oa]|contable|lead|senior|junior|full ?stack|backend|frontend|administrador[a]?|soporte|support|teacher|trainer|formador[a]?|repartidor[a]?|mozo|peon|electricista|mecanico|secretari[oa])\b/;
const DEGREE_RE = /\b(grado|tecnico|master|bachillerato|licenciatura|ingenieria|diplomatura|doctorado|curso|certificado|certificacion|bachelor|bsc|msc|degree|ciclo|formacion profesional|eso|postgrado|especialista|diploma)\b/;

// ¿Qué pieza es la "organización" (empresa / institución)? 'a' | 'b' | null si no hay pistas claras
function orgSignal(a, b, orgRe, titleRe) {
  const na = norm(a), nb = norm(b);
  const aOrg = orgRe.test(na) || titleRe.test(nb);
  const bOrg = orgRe.test(nb) || titleRe.test(na);
  if (aOrg && !bOrg) return 'a';
  if (bOrg && !aOrg) return 'b';
  return null;
}

// Prepara las entradas: reparte las piezas en [primera, segunda] y vota el orden dominante del documento
function resolveEntries(entries, orgRe, titleRe) {
  const prepared = entries.map(e => {
    let pieces = e.pieces.slice(0, 2);
    if (pieces.length === 1) pieces = splitPair(pieces[0]);
    return { ...e, pair: pieces.length >= 2 ? [pieces[0], pieces.slice(1).join(' - ')] : null, single: pieces[0] || '' };
  });
  const votes = { a: 0, b: 0 };
  prepared.forEach(e => {
    if (!e.pair) return;
    const sig = orgSignal(e.pair[0], e.pair[1], orgRe, titleRe);
    if (sig) votes[sig]++;
  });
  // por defecto: primero el título/puesto y luego la organización (formato más habitual)
  const dominant = votes.a > votes.b ? 'a' : 'b';
  return prepared.map(e => {
    if (!e.pair) return { ...e, org: '', title: '' , lone: e.single };
    const sig = orgSignal(e.pair[0], e.pair[1], orgRe, titleRe) || dominant;
    return sig === 'a'
      ? { ...e, org: e.pair[0], title: e.pair[1] }
      : { ...e, org: e.pair[1], title: e.pair[0] };
  });
}

const datesOf = (r) => ({
  start_date: r.start || '',
  end_date: r.current ? '' : (r.end || ''),
  is_current: r.current ? 1 : 0
});

function buildExperiences(entries) {
  return resolveEntries(entries, COMPANY_RE, POSITION_RE).map(e => {
    let company = e.org, position = e.title;
    if (!e.pair && e.lone) {
      if (COMPANY_RE.test(norm(e.lone)) && !POSITION_RE.test(norm(e.lone))) company = e.lone;
      else position = e.lone;
    }
    return { company, position, ...datesOf(e.range) };
  });
}

function buildEducation(entries) {
  return resolveEntries(entries, INSTITUTION_RE, DEGREE_RE).map(e => {
    let institution = e.org, degree = e.title;
    if (!e.pair && e.lone) {
      if (INSTITUTION_RE.test(norm(e.lone)) && !DEGREE_RE.test(norm(e.lone))) institution = e.lone;
      else degree = e.lone;
    }
    return { institution, degree, ...datesOf(e.range) };
  });
}

// ------------------------------------------------------------------ habilidades
function parseSkills(lines) {
  const out = [];
  const seen = new Set();
  for (const raw of lines) {
    let line = stripBullet(raw);
    const colon = line.indexOf(':');
    if (colon > 0 && line.slice(0, colon).split(/\s+/).length <= 3) line = line.slice(colon + 1);
    for (let item of line.split(/[,;|•·▪]|\s[-–—]\s/)) {
      item = cleanPiece(item).replace(/\.$/, '');
      if (item.length < 2 || item.length > 40 || item.split(/\s+/).length > 4) continue;
      const key = norm(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
      if (out.length >= 40) return out;
    }
  }
  return out;
}

// ------------------------------------------------------------------ saneado común
const str = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');

// Quita duplicados (sin distinguir mayúsculas ni tildes) conservando la PRIMERA aparición
function dedupeFirst(names) {
  const seen = new Map();
  names.forEach(n => { const k = norm(n); if (!seen.has(k)) seen.set(k, n); });
  return [...seen.values()];
}

// Garantiza tipos y longitudes seguros, venga el resultado del análisis básico o de la IA
function sanitizeCv(raw) {
  const r = raw || {};
  const cap = (arr, n) => (Array.isArray(arr) ? arr.slice(0, n) : []);
  const dates = (e) => {
    const current = e.is_current ? 1 : 0;
    return { start_date: isoDate(e.start_date), end_date: current ? '' : isoDate(e.end_date), is_current: current };
  };
  const skillNames = cap(r.skills, 60)
    .map(s => (typeof s === 'string' ? s : s && s.skill_name))
    .map(s => str(s, 60)).filter(Boolean);

  return {
    full_name: str(r.full_name, 120),
    email: str(r.email, 120),
    phone: str(r.phone, 40),
    summary: str(r.summary, 1500),
    experiences: cap(r.experiences, 15).map(e => ({
      company: str(e.company, 120), position: str(e.position, 120), ...dates(e)
    })).filter(e => e.company || e.position),
    education: cap(r.education, 15).map(e => ({
      institution: str(e.institution, 120), degree: str(e.degree, 120), ...dates(e)
    })).filter(e => e.institution || e.degree),
    skills: dedupeFirst(skillNames).slice(0, 40).map(n => ({ skill_name: n, level: 'Intermedio' }))
  };
}

// ------------------------------------------------------------------ principal
function parseCvText(text) {
  const lines = String(text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const { sections, found } = splitSections(lines);
  const warnings = [];

  const headTop = sections.header.join('\n');
  const email = findEmail(text);
  const phone = findPhone(headTop) || findPhone(String(text).slice(0, 1500));
  const full_name = findName(sections.header);

  const summary = sections.summary.map(stripBullet).join(' ').replace(/\s{2,}/g, ' ').slice(0, 900);
  const experiences = buildExperiences(parseEntries(sections.experience, 'experience'));
  const education = buildEducation(parseEntries(sections.education, 'education'));
  const skills = parseSkills(sections.skills);

  if (!found) warnings.push('No se detectaron secciones (Experiencia, Formación, Habilidades...). Revisa y completa los datos a mano.');
  if (!full_name) warnings.push('No se pudo detectar tu nombre.');
  if (found && sections.experience.length && experiences.length === 0) warnings.push('No se pudieron separar las experiencias: añádelas a mano.');
  if (found && sections.education.length && education.length === 0) warnings.push('No se pudieron separar los estudios: añádelos a mano.');
  if (experiences.some(e => !e.company || !e.position)) warnings.push('Algunas experiencias quedaron sin empresa o puesto: complétalas antes de guardar.');
  if (education.some(e => !e.institution || !e.degree)) warnings.push('Algunos estudios quedaron sin institución o título: complétalos antes de guardar.');

  const cv = sanitizeCv({ full_name, email, phone, summary, experiences, education, skills });
  cv.warnings = warnings;
  return cv;
}

module.exports = { parseCvText, sanitizeCv };