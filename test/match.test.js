// Pruebas del cálculo de compatibilidad.  Ejecutar:  npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateMatch } = require('../src/utils/matchCalculator');

const cv = (over = {}) => ({
  title: 'CV', summary: '', experiences: [], education: [],
  skills: [{ skill_name: 'Python', level: 'Intermedio' }, { skill_name: 'MySQL', level: 'Básico' }],
  ...over
});

test('oferta vacía: 0 % y sin palabras clave', () => {
  const r = calculateMatch(cv(), '   ');
  assert.equal(r.percentage, 0);
  assert.equal(r.totalKeywords, 0);
});

test('CV que cubre toda la oferta: 100 %', () => {
  const r = calculateMatch(cv(), 'Python MySQL');
  assert.equal(r.percentage, 100);
  assert.deepEqual(r.missing, []);
});

test('separa lo que está en el CV de lo que falta', () => {
  const r = calculateMatch(cv(), 'Buscamos Python, MySQL y Docker');
  assert.ok(r.matched.includes('python') && r.matched.includes('mysql'));
  assert.deepEqual(r.missing, ['docker']);
  assert.ok(r.percentage > 0 && r.percentage < 100);
});

test('ignora tildes, mayúsculas y la ñ', () => {
  const r = calculateMatch(cv({ skills: [{ skill_name: 'Diseño web', level: 'Básico' }] }), 'DISEÑO WEB');
  assert.equal(r.percentage, 100);
});

test('unifica género, número y terminaciones: continuo/continua cuentan una vez', () => {
  const r = calculateMatch(cv({ skills: [] }), 'integración continua y despliegue continuo');
  const all = [...r.matched, ...r.partial, ...r.missing];
  assert.equal(all.filter(t => t.startsWith('continu')).length, 0, 'palabra genérica descartada');
});

test('descarta palabras genéricas de las ofertas (ágil, carrera, colaborar…)', () => {
  const r = calculateMatch(cv({ skills: [] }), 'Equipo ágil, plan de carrera, colaborar y desarrollar. Docker.');
  assert.deepEqual(r.missing, ['docker']);
});

test('no descarta tecnologías que acaban como un verbo (Docker, Angular)', () => {
  const r = calculateMatch(cv({ skills: [] }), 'Docker y Angular');
  assert.deepEqual(r.missing.sort(), ['angular', 'docker']);
});

test('los comentarios de experiencia y estudios cuentan como parte del CV', () => {
  const sin = calculateMatch(cv({ skills: [] }), 'Odoo');
  assert.equal(sin.percentage, 0);
  const con = calculateMatch(cv({
    skills: [], experiences: [{ company: 'X', position: 'Dev', description: 'Personalicé módulos de Odoo' }]
  }), 'Odoo');
  assert.equal(con.percentage, 100);
});

test('detecta el nivel que pide la oferta y avisa si el tuyo es menor', () => {
  const r = calculateMatch(cv(), 'Python avanzado y MySQL nivel básico');
  const py = r.skillLevels.find(l => l.skill === 'Python');
  const my = r.skillLevels.find(l => l.skill === 'MySQL');
  assert.deepEqual([py.required, py.have, py.ok], ['Avanzado', 'Intermedio', false]);
  assert.deepEqual([my.required, my.have, my.ok], ['Básico', 'Básico', true]);
  assert.ok(r.partial.includes('python'), 'Python cuenta solo en parte');
  assert.ok(r.matched.includes('mysql'));
});

test('cada habilidad de una lista lleva su propio nivel', () => {
  const r = calculateMatch(cv({ skills: [{ skill_name: 'Java', level: 'Avanzado' }, { skill_name: 'SQL', level: 'Básico' }] }),
    'Java avanzado, SQL básico');
  assert.equal(r.skillLevels.find(l => l.skill === 'Java').required, 'Avanzado');
  assert.equal(r.skillLevels.find(l => l.skill === 'SQL').required, 'Básico');
});

test('subir el nivel de la habilidad sube el porcentaje', () => {
  const oferta = 'Python avanzado y MySQL';
  const bajo = calculateMatch(cv(), oferta).percentage;
  const alto = calculateMatch(cv({ skills: [{ skill_name: 'Python', level: 'Avanzado' }, { skill_name: 'MySQL', level: 'Básico' }] }), oferta).percentage;
  assert.ok(alto > bajo, `${alto} debería ser mayor que ${bajo}`);
  assert.equal(alto, 100);
});

test('añadir una habilidad que falta sube el porcentaje', () => {
  const oferta = 'Python, MySQL y Docker';
  const antes = calculateMatch(cv(), oferta).percentage;
  const despues = calculateMatch(cv({ skills: [...cv().skills, { skill_name: 'Docker', level: 'Intermedio' }] }), oferta).percentage;
  assert.ok(despues > antes);
});

test('el porcentaje siempre está entre 0 y 100', () => {
  for (const t of ['x', 'Python '.repeat(50), 'Java C# Go Rust Kotlin Swift Dart']) {
    const p = calculateMatch(cv(), t).percentage;
    assert.ok(p >= 0 && p <= 100);
  }
});
