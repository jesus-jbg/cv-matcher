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
avanzado avanzada avanzados avanzadas intermedio intermedia intermedios intermedias basico basica basicos basicas
nociones nocion principiante iniciacion elemental experto experta expertos expertas senior dominio profundo profunda excelente
medio requiere requieren valora valoran valorar deseable deseables imprescindible imprescindibles requerido
advanced intermediate basic beginner expert
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

// Palabras habituales en ofertas que NO son una habilidad que se pueda tener o no
// (ya sin tildes ni ñ). Se descartan al leer la oferta, así no salen como «te faltan».
const GENERIC = new Set(`
agil agiles carrera colaborar colaboracion colaborativo colaborativa continuo continua continuos continuas control
definir definicion desarrollar desplegar despliegue disenador disenadores disenadora eficiente eficientes eficaz eficaces
encargaras formacion practica practicas competitivo competitiva salario beneficios beneficio sociales seguro medico tickets
restaurante flexible flexibles intensiva intensivo verano aportada aportado plan indispensable indispensables minimo
maximo perfil perfiles revision revisiones resolucion problemas problema funcionalidades funcionalidad nuevas nuevos nueva
nuevo mejora mejoras mejorar calidad solida solido solidas solidos buenas buena buen bueno ambiente dinamico dinamica
motivado motivada proactivo proactiva autonomo autonoma responsable orientado orientada resultados cliente clientes
proceso procesos solucion soluciones entorno entornos area areas dia dias mes meses tiempo vez momento manera forma
parte siempre ademas incluso tipo tipos ejemplo ejemplos aspecto aspectos seran sera tendras podras podran
alto alta altos altas posibilidad posibilidades oportunidad oportunidades crecimiento profesional profesionales
aplicacion aplicaciones metodologia metodologias version versiones colaborador colaboradores comunicacion actitud ganas pasion interes interesado interesada incorporacion
`.split(/\s+/).filter(Boolean));

// Tecnologías que terminan como un verbo en español (docker, angular...): no se descartan.
const TECH_KEEP = new Set(['docker', 'angular', 'composer', 'server', 'router', 'flutter', 'jupyter', 'cucumber', 'polymer',
  'scraper', 'zapier', 'cypher', 'player', 'builder', 'gender', 'ansible', 'vagrant']);

// Formas verbales, adverbios y participios: «desarrollar», «encargarás», «automatizado», «rápidamente».
function looksLikeVerbOrFiller(t) {
  if (TECH_KEEP.has(t) || /[+#.\d]/.test(t)) return false;
  if (t.length >= 6 && /(ar|er|ir)$/.test(t)) return true;
  if (t.length >= 6 && /(aras|eras|iras|aran|eran|iran|aremos|eremos|iremos|amos|emos|ando|iendo|mente)$/.test(t)) return true;
  if (t.length >= 7 && /(ado|ada|ados|adas|ido|ida|idos|idas)$/.test(t)) return true;
  return false;
}

function tokenize(text, { filterGeneric = false } = {}) {
  const raw = normalize(text).match(/[a-z0-9](?:[a-z0-9+#.]*[a-z0-9+#])?/g) || [];
  return raw.filter(t => {
    if (STOPWORDS.has(t)) return false;
    if (/^\d+$/.test(t)) return false;
    if (filterGeneric && (GENERIC.has(t) || looksLikeVerbOrFiller(t))) return false;
    if (t.length >= 3) return true;
    return SHORT_ALLOWED.has(t) || (/[+#]/.test(t) && t.length >= 2);
  });
}

// Raíz de la palabra: quita género, número y terminaciones habituales, de modo que
// «continuo/continua», «desarrollo/desarrollar» o «diseño/diseñadores» cuenten como una sola.
// OJO: debe ser idéntica a stem() de public/js/match.js.
const SUFFIXES = ['amientos', 'imientos', 'amiento', 'imiento', 'aciones', 'iciones', 'adores', 'adoras', 'idades',
  'acion', 'icion', 'ador', 'adora', 'idad', 'mente', 'antes', 'ables', 'ibles', 'ando', 'iendo',
  'ante', 'able', 'ible', 'ados', 'adas', 'idos', 'idas', 'ado', 'ada', 'ido', 'ida',
  'es', 'as', 'os', 'ar', 'er', 'ir', 'a', 'o', 'e', 's'];
function stem(t) {
  if (/[+#.]/.test(t) || t.length < 5) return t;
  for (const suf of SUFFIXES) {
    if (t.endsWith(suf) && t.length - suf.length >= 4) return t.slice(0, -suf.length);
  }
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
    ...(cv.experiences || []).flatMap(e => [e.position, e.company, e.description]),
    ...(cv.education || []).flatMap(e => [e.degree, e.institution, e.description])
  ];
  const set = new Set();
  tokenize(parts.filter(Boolean).join(' ')).forEach(t => {
    variants(stem(t)).forEach(v => set.add(v));
    variants(t).forEach(v => set.add(v));
  });
  return set;
}


// ---------------------------------------------------------------- niveles
// Si la oferta dice «Python avanzado» o «nociones de SQL», se compara con el
// nivel que el usuario marcó en esa habilidad de su CV.
const LEVEL_NAMES = ['Básico', 'Intermedio', 'Avanzado'];
const LEVEL_WORDS = new Map([
  ...['basico', 'basica', 'basicos', 'basicas', 'basic', 'nociones', 'nocion', 'principiante', 'beginner', 'iniciacion', 'elemental']
    .map(w => [w, 0]),
  ...['intermedio', 'intermedia', 'intermedios', 'intermedias', 'intermediate']
    .map(w => [w, 1]),
  ...['avanzado', 'avanzada', 'avanzados', 'avanzadas', 'advanced', 'experto', 'experta', 'expertos', 'expertas',
      'expert', 'senior', 'dominio', 'profundo', 'profunda', 'excelente']
    .map(w => [w, 2])
]);
const MAX_LEVEL_DISTANCE = 6; // palabras entre la habilidad y la palabra de nivel
const COMMA_COST = 2;         // cruzar una coma «aleja» la palabra de nivel (cada ítem de una lista lleva el suyo)
const WORD_RE = /[a-z0-9](?:[a-z0-9+#.]*[a-z0-9+#])?/g;

// Devuelve, para cada habilidad del CV que la oferta menciona con un nivel, el nivel exigido.
function detectRequiredLevels(cvSkills, jobDescription) {
  const skills = (cvSkills || []).map(s => {
    const keys = [...new Set(tokenize(s.skill_name).flatMap(t => variants(stem(t))))];
    const perToken = tokenize(s.skill_name).map(t => new Set(variants(stem(t))));
    return { skill: s, keys, perToken, required: -1 };
  }).filter(x => x.perToken.length);
  if (!skills.length) return [];

  normalize(jobDescription).split(/[\n\r.;:•*]+(?:\s|$)|[\n\r;•*]+|\.\s/).forEach(segment => {
    const words = [];
    const piece = [];
    segment.split(',').forEach((chunk, n) => (chunk.match(WORD_RE) || []).forEach(w => { words.push(w); piece.push(n); }));
    const levelAt = [];
    words.forEach((w, i) => {
      const lv = LEVEL_WORDS.get(w);
      if (lv !== undefined) levelAt.push({ i, lv });
      else if (w === 'medio' && words[i - 1] === 'nivel') levelAt.push({ i, lv: 1 });
    });
    if (!levelAt.length) return;
    const stemmed = words.map(w => variants(stem(w)));

    skills.forEach(x => {
      // Todas las palabras de la habilidad deben aparecer en la misma frase.
      const positions = [];
      for (const set of x.perToken) {
        const at = stemmed.map((vs, i) => (vs.some(v => set.has(v)) ? i : -1)).filter(i => i >= 0);
        if (!at.length) return;
        positions.push(...at);
      }
      let best = null;
      positions.forEach(pos => levelAt.forEach(l => {
        const d = Math.abs(pos - l.i) + COMMA_COST * Math.abs(piece[pos] - piece[l.i]);
        if (d <= MAX_LEVEL_DISTANCE && (!best || d < best.d)) best = { d, lv: l.lv };
      }));
      if (best && best.lv > x.required) x.required = best.lv; // si aparece varias veces, manda la más exigente
    });
  });

  return skills.filter(x => x.required >= 0).map(x => {
    const idx = LEVEL_NAMES.indexOf(x.skill.level);
    const have = idx >= 0 ? idx : 1;
    return {
      skill: x.skill.skill_name, keys: x.keys,
      required: LEVEL_NAMES[x.required], have: LEVEL_NAMES[have],
      ok: have >= x.required,
      credit: have >= x.required ? 1 : (have + 1) / (x.required + 1)
    };
  });
}

function calculateMatch(cv, jobDescription) {
  const empty = { percentage: 0, matched: [], partial: [], missing: [], totalKeywords: 0, skillLevels: [] };
  if (!jobDescription || !String(jobDescription).trim()) return empty;

  // Palabras clave de la oferta: frecuencia -> peso (1 a 2)
  const counts = new Map();
  const display = new Map();
  tokenize(jobDescription, { filterGeneric: true }).forEach(t => {
    const key = stem(t);
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!display.has(key)) display.set(key, t);
  });
  if (counts.size === 0) return empty;

  const cvTerms = buildCvTermSet(cv);
  const skillLevels = detectRequiredLevels(cv.skills, jobDescription);
  // Palabra clave -> fracción que cuenta si el nivel del CV no llega al que pide la oferta
  const credit = new Map();
  skillLevels.filter(l => !l.ok).forEach(l => l.keys.forEach(k => {
    credit.set(k, Math.min(credit.get(k) ?? 1, l.credit));
  }));
  let totalW = 0, matchedW = 0;
  const matched = [], partial = [], missing = [];

  counts.forEach((count, key) => {
    const weight = 1 + Math.min(count - 1, 2) * 0.5;
    totalW += weight;
    const isMatch = variants(key).some(v => cvTerms.has(v));
    const low = isMatch ? variants(key).map(v => credit.get(v)).filter(c => c !== undefined) : [];
    if (isMatch && low.length) { matchedW += weight * Math.min(...low); partial.push({ term: display.get(key), weight }); }
    else if (isMatch) { matchedW += weight; matched.push({ term: display.get(key), weight }); }
    else missing.push({ term: display.get(key), weight });
  });

  const byWeight = (a, b) => b.weight - a.weight || a.term.localeCompare(b.term);
  return {
    percentage: Math.max(0, Math.min(100, Math.round((matchedW / totalW) * 100))),
    matched: matched.sort(byWeight).slice(0, 20).map(x => x.term),
    partial: partial.sort(byWeight).map(x => x.term),
    missing: missing.sort(byWeight).slice(0, 12).map(x => x.term),
    totalKeywords: counts.size,
    skillLevels: skillLevels.map(({ skill, required, have, ok }) => ({ skill, required, have, ok }))
  };
}

module.exports = { calculateMatch };
