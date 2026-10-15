// Calcula la compatibilidad entre un CV y la descripción de una oferta.
// Método: se extraen las palabras clave relevantes de la oferta (sin palabras
// vacías), se ponderan por frecuencia y se mide qué proporción aparece en el CV.
// Es un análisis por coincidencia de términos, no semántico.

const STOPWORDS = new Set(`
a al algo algun alguna algunas alguno algunos ante antes aqui asi aun aunque bajo bien cada como con contra
cual cuales cuando de del desde donde dos durante e el ella ellas ello ellos en entre era es esa esas ese eso
esos esta estan estar estas este esto estos fue fueron ha han hasta hay la las le les lo los mas me mi mis mucho
muy nada ni no nos nosotros nuestra nuestras nuestro nuestros o os otra otras otro otros para pero poco por porque
que quien se sea segun ser si sido sin sobre solo son su sus tambien tanto te tendra tener tengo ti todo todos tu
tus un una uno unos vosotros y ya yo
the and for with you your our are will have has this that from they their them his her its not but can all any
may must should would could into over such than then there these those been being was were who whom which what
when where while about also each other some very per via etc
experiencia experiencias trabajo trabajos trabajar empresa empresas equipo equipos buscamos busca buscar ofrecemos
ofrece ofrecer requisitos requisito requerido requeridos necesario necesarios valorable valorables valorara se
incorporacion incorporar puesto puestos oferta ofertas candidato candidatos persona personas funciones funcion
responsabilidades tareas tarea anos ano minima minimo minimos conocimientos conocimiento nivel capacidad
habilidades habilidad buen buena buenos buenas gran grandes importante importantes proyecto proyectos
trabajamos formar formamos parte jornada contrato salario horario modalidad remoto presencial hibrido
job work team company role position looking seeking offer experience years skills knowledge requirements
responsibilities candidate ability strong good great plus including nice
`.split(/\s+/).filter(Boolean));

const SHORT_ALLOWED = new Set(['js', 'ui', 'ux', 'qa', 'ai', 'ia', 'go', 'ci', 'cd', 'bi', 'ml']);

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function tokenize(text) {
  const raw = normalize(text).match(/[a-z0-9](?:[a-z0-9+#.]*[a-z0-9+#])?/g) || [];
  return raw.filter(t => {
    if (STOPWORDS.has(t)) return false;
    if (/^\d+$/.test(t)) return false;
    if (t.length >= 3) return true;
    return SHORT_ALLOWED.has(t) || (/[+#]/.test(t) && t.length >= 2);
  });
}

function stem(t) {
  if (/[+#.]/.test(t)) return t;
  if (t.length > 5 && t.endsWith('es')) return t.slice(0, -2);
  if (t.length > 4 && t.endsWith('s')) return t.slice(0, -1);
  return t;
}

// node.js -> [node.js, nodejs, node]
function variants(token) {
  const out = new Set([token]);
  if (token.includes('.')) {
    out.add(token.replace(/\./g, ''));
    token.split('.').forEach(p => { if (p.length >= 3) out.add(p); });
  }
  return [...out];
}

function buildCvTermSet(cv) {
  const parts = [
    cv.title, cv.summary,
    ...(cv.skills || []).flatMap(s => [s.skill_name, s.skill_name]),
    ...(cv.experiences || []).flatMap(e => [e.position, e.company]),
    ...(cv.education || []).flatMap(e => [e.degree, e.institution])
  ];
  const set = new Set();
  tokenize(parts.filter(Boolean).join(' ')).forEach(t => {
    variants(stem(t)).forEach(v => set.add(v));
    variants(t).forEach(v => set.add(v));
  });
  return set;
}

function calculateMatch(cv, jobDescription) {
  const empty = { percentage: 0, matched: [], missing: [], totalKeywords: 0 };
  if (!jobDescription || !String(jobDescription).trim()) return empty;

  // Palabras clave de la oferta: frecuencia -> peso (1 a 2)
  const counts = new Map();
  const display = new Map();
  tokenize(jobDescription).forEach(t => {
    const key = stem(t);
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!display.has(key)) display.set(key, t);
  });
  if (counts.size === 0) return empty;

  const cvTerms = buildCvTermSet(cv);
  let totalW = 0, matchedW = 0;
  const matched = [], missing = [];

  counts.forEach((count, key) => {
    const weight = 1 + Math.min(count - 1, 2) * 0.5;
    totalW += weight;
    const isMatch = variants(key).some(v => cvTerms.has(v));
    if (isMatch) { matchedW += weight; matched.push({ term: display.get(key), weight }); }
    else missing.push({ term: display.get(key), weight });
  });

  const byWeight = (a, b) => b.weight - a.weight || a.term.localeCompare(b.term);
  return {
    percentage: Math.max(0, Math.min(100, Math.round((matchedW / totalW) * 100))),
    matched: matched.sort(byWeight).slice(0, 20).map(x => x.term),
    missing: missing.sort(byWeight).slice(0, 12).map(x => x.term),
    totalKeywords: counts.size
  };
}

module.exports = { calculateMatch };