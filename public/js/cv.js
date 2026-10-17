// Pantalla "Mis CVs": estantería, editor, importación, vista previa y exportación.
import { api } from './api.js';
import { state, emit } from './store.js';
import { $, $$, escapeHtml, icon, toast, confirmDialog, debounce, toDateInput, setLoading } from './ui.js';
import { mountPreview, exportPdf, exportWord } from './cv-preview.js';
import { navigate, currentView } from './router.js';

const LEVELS = ['Básico', 'Intermedio', 'Avanzado'];
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

let photo = '';        // foto del CV en base64 (JPEG reducido)
let baseline = null;   // JSON del estado guardado; null = CV todavía sin guardar
let preview = null;
let importBusy = false;

/* ============================================================ formulario */

function readForm() {
  const val = id => ($(id).value || '').trim();
  const cell = (li, sel) => (($(sel, li) || {}).value || '').trim();
  return {
    cv_id: $('#currentCvId').value || null,
    title: val('#cvTitle'),
    full_name: val('#fullName'),
    email: val('#cvEmail'),
    phone: val('#phone'),
    summary: val('#summary'),
    photo,
    is_default: $('#isDefaultCv').checked,
    template: ($('input[name="template"]:checked') || {}).value || 'modern',
    experiences: $$('#experienceContainer > li').map(li => {
      const current = $('.exp-current', li).checked;
      return {
        company: cell(li, '.exp-company'), position: cell(li, '.exp-position'),
        start_date: cell(li, '.exp-start'), end_date: current ? '' : cell(li, '.exp-end'),
        is_current: current ? 1 : 0,
        description: cell(li, '.exp-desc')
      };
    }),
    education: $$('#educationContainer > li').map(li => {
      const current = $('.edu-current', li).checked;
      return {
        institution: cell(li, '.edu-institution'), degree: cell(li, '.edu-degree'),
        start_date: cell(li, '.edu-start'), end_date: current ? '' : cell(li, '.edu-end'),
        is_current: current ? 1 : 0,
        description: cell(li, '.edu-desc')
      };
    }),
    skills: $$('#skillContainer > li').map(li => ({ skill_name: li.dataset.name, level: li.dataset.level }))
  };
}

const isDirty = () => baseline === null || baseline !== JSON.stringify(readForm());

function updateStatus() {
  const box = $('#saveState');
  const text = $('#saveStateText');
  const hasId = !!$('#currentCvId').value;
  box.classList.toggle('is-new', !hasId);
  box.classList.toggle('is-dirty', hasId && isDirty());
  text.textContent = !hasId ? 'CV nuevo · sin guardar' : isDirty() ? 'Cambios sin guardar' : 'Todo guardado';
}

const refresh = debounce(() => {
  if (preview) preview.render(readForm());
  updateStatus();
}, 120);

function resetFields() {
  ['#currentCvId', '#cvTitle', '#fullName', '#cvEmail', '#phone', '#summary', '#skillInput'].forEach(sel => { $(sel).value = ''; });
  $('#isDefaultCv').checked = false;
  $('input[name="template"][value="modern"]').checked = true;
  ['#experienceContainer', '#educationContainer', '#skillContainer'].forEach(sel => { $(sel).innerHTML = ''; });
  photo = '';
  paintPhoto();
  syncEmpty();
}

function fillForm(cv, { unsaved = false } = {}) {
  resetFields();
  $('#currentCvId').value = unsaved ? '' : (cv.id == null ? '' : cv.id);
  $('#cvTitle').value = cv.title || '';
  $('#fullName').value = cv.full_name || '';
  $('#cvEmail').value = cv.email || '';
  $('#phone').value = cv.phone || '';
  $('#summary').value = cv.summary || '';
  $('#isDefaultCv').checked = !!Number(cv.is_default);
  photo = cv.photo || '';
  paintPhoto();

  const tpl = $(`input[name="template"][value="${CSS.escape(cv.template || 'modern')}"]`);
  (tpl || $('input[name="template"][value="modern"]')).checked = true;

  (cv.experiences || []).forEach(e => addExperience(e));
  (cv.education || []).forEach(e => addEducation(e));
  (cv.skills || []).forEach(s => addSkill(s.skill_name, LEVELS.includes(s.level) ? s.level : 'Intermedio'));
  syncEmpty();

  baseline = unsaved ? null : JSON.stringify(readForm());
  state.currentCvId = String($('#currentCvId').value);
  renderShelf();
  refresh.flush ? refresh.flush() : refresh();
  if (preview) preview.render(readForm());
  updateStatus();
}

function blankForm() {
  resetFields();
  baseline = JSON.stringify(readForm());
  state.currentCvId = '';
  renderShelf();
  if (preview) preview.render(readForm());
  updateStatus();
}

async function confirmDiscard() {
  if (!isDirty()) return true;
  const name = $('#cvTitle').value.trim();
  return confirmDialog({
    title: '¿Descartar los cambios?',
    message: name
      ? `Tienes cambios sin guardar en «${name}». Si continúas, se perderán.`
      : 'Tienes cambios sin guardar. Si continúas, se perderán.',
    confirmText: 'Descartar cambios',
    cancelText: 'Seguir editando',
    tone: 'danger'
  });
}

/* ============================================================== filas */

function entryTools() {
  return `
    <div class="entry-tools">
      <button type="button" class="icon-btn" data-action="up" aria-label="Subir">${icon('up')}</button>
      <button type="button" class="icon-btn" data-action="down" aria-label="Bajar">${icon('down')}</button>
      <button type="button" class="icon-btn is-danger" data-action="remove-entry" aria-label="Eliminar">${icon('trash')}</button>
    </div>`;
}

function setEndState(li, currentSel, endSel) {
  const current = $(currentSel, li).checked;
  const end = $(endSel, li);
  end.disabled = current;
  if (current) end.value = '';
}

function addExperience(data = {}, { focus = false } = {}) {
  const li = document.createElement('li');
  li.className = 'entry';
  li.dataset.kind = 'experience';
  li.innerHTML = `
    <div class="grid-2">
      <label class="field"><span>Puesto</span><input class="input exp-position" type="text" required maxlength="120"></label>
      <label class="field"><span>Empresa</span><input class="input exp-company" type="text" required maxlength="120"></label>
      <label class="field"><span>Desde</span><input class="input exp-start" type="date"></label>
      <label class="field"><span>Hasta</span><input class="input exp-end" type="date"></label>
      <label class="field span-2"><span>Comentario <em class="opt">(opcional)</em></span><textarea class="textarea entry-note exp-desc" rows="3" maxlength="1000" placeholder="Qué hacías: tareas, tecnologías y logros. Ej.: Automaticé informes en Odoo con Python y reduje el trabajo manual."></textarea></label>
    </div>
    <div class="entry-foot">
      <label class="check"><input type="checkbox" class="exp-current"><span>Trabajo aquí actualmente</span></label>
      ${entryTools()}
    </div>`;
  $('.exp-position', li).value = data.position || '';
  $('.exp-company', li).value = data.company || '';
  $('.exp-start', li).value = toDateInput(data.start_date);
  $('.exp-end', li).value = toDateInput(data.end_date);
  $('.exp-desc', li).value = data.description || '';
  $('.exp-current', li).checked = !!Number(data.is_current);
  setEndState(li, '.exp-current', '.exp-end');
  $('#experienceContainer').appendChild(li);
  syncEmpty();
  if (focus) $('.exp-position', li).focus();
  return li;
}

function addEducation(data = {}, { focus = false } = {}) {
  const li = document.createElement('li');
  li.className = 'entry';
  li.dataset.kind = 'education';
  li.innerHTML = `
    <div class="grid-2">
      <label class="field"><span>Título</span><input class="input edu-degree" type="text" required maxlength="120"></label>
      <label class="field"><span>Centro</span><input class="input edu-institution" type="text" required maxlength="120"></label>
      <label class="field"><span>Desde</span><input class="input edu-start" type="date"></label>
      <label class="field"><span>Hasta</span><input class="input edu-end" type="date"></label>
      <label class="field span-2"><span>Comentario <em class="opt">(opcional)</em></span><textarea class="textarea entry-note edu-desc" rows="3" maxlength="1000" placeholder="Qué estudiaste: asignaturas, tecnologías, proyecto final. Ej.: Java, PHP, MySQL y un proyecto final de gestión de almacén."></textarea></label>
    </div>
    <div class="entry-foot">
      <label class="check"><input type="checkbox" class="edu-current"><span>Sigo estudiando</span></label>
      ${entryTools()}
    </div>`;
  $('.edu-degree', li).value = data.degree || '';
  $('.edu-institution', li).value = data.institution || '';
  $('.edu-start', li).value = toDateInput(data.start_date);
  $('.edu-end', li).value = toDateInput(data.end_date);
  $('.edu-desc', li).value = data.description || '';
  $('.edu-current', li).checked = !!Number(data.is_current);
  setEndState(li, '.edu-current', '.edu-end');
  $('#educationContainer').appendChild(li);
  syncEmpty();
  if (focus) $('.edu-degree', li).focus();
  return li;
}

function syncEmpty() {
  $('#experienceEmpty').hidden = $('#experienceContainer').children.length > 0;
  $('#educationEmpty').hidden = $('#educationContainer').children.length > 0;
}

function moveEntry(li, dir) {
  const sibling = dir < 0 ? li.previousElementSibling : li.nextElementSibling;
  if (!sibling) return;
  if (dir < 0) li.parentNode.insertBefore(li, sibling);
  else li.parentNode.insertBefore(sibling, li);
  const btn = $(`[data-action="${dir < 0 ? 'up' : 'down'}"]`, li);
  if (btn) btn.focus();
  refresh();
}

function removeEntry(li) {
  const parent = li.parentNode;
  const next = li.nextElementSibling;
  const label = li.dataset.kind === 'education' ? 'Estudio eliminado' : 'Experiencia eliminada';
  li.remove();
  syncEmpty();
  refresh();
  toast(label, {
    action: {
      label: 'Deshacer',
      onClick: () => {
        if (next && next.parentNode === parent) parent.insertBefore(li, next);
        else parent.appendChild(li);
        syncEmpty();
        refresh();
      }
    }
  });
}

/* ======================================================== habilidades */

function paintSkill(li) {
  const lv = LEVELS.indexOf(li.dataset.level) + 1 || 2;
  li.dataset.lv = String(lv);
  const btn = $('.chip-level', li);
  btn.setAttribute('aria-label', `${li.dataset.name}: nivel ${li.dataset.level.toLowerCase()}. Pulsa para cambiarlo`);
  btn.title = `Nivel: ${li.dataset.level}`;
}

function addSkill(rawName, level = 'Intermedio') {
  const name = String(rawName || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (!name) return false;
  const exists = $$('#skillContainer > li').some(li => li.dataset.name.toLowerCase() === name.toLowerCase());
  if (exists) return false;

  const li = document.createElement('li');
  li.className = 'chip skill-row';
  li.dataset.name = name;
  li.dataset.level = LEVELS.includes(level) ? level : 'Intermedio';
  li.innerHTML = `
    <span class="chip-name">${escapeHtml(name)}</span>
    <button type="button" class="chip-level" data-action="level"><i></i><i></i><i></i></button>
    <button type="button" class="chip-x" data-action="remove-skill" aria-label="Quitar ${escapeHtml(name)}">${icon('x')}</button>`;
  $('#skillContainer').appendChild(li);
  paintSkill(li);
  return true;
}

function commitSkillInput() {
  const input = $('#skillInput');
  const pieces = input.value.split(/[,;\n]/);
  let added = false;
  pieces.forEach(p => { if (addSkill(p)) added = true; });
  input.value = '';
  if (added) refresh();
}

/* =============================================================== foto */

function paintPhoto() {
  const img = $('#photoPreview');
  const has = !!photo;
  img.hidden = !has;
  $('#avatarEmpty').hidden = has;
  $('#photoRemoveBtn').hidden = !has;
  $('#photoBtn').lastChild.textContent = has ? 'Cambiar foto' : 'Subir foto';
  if (has) img.src = photo; else img.removeAttribute('src');
}

// Reduce la foto a un máximo de maxSize px y la comprime a JPEG (decenas de KB en vez de varios MB)
function resizeImageToDataUrl(file, maxSize = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('El archivo no es una imagen'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

async function onPhotoPicked(file) {
  if (!file) return;
  try {
    photo = await resizeImageToDataUrl(file);
    paintPhoto();
    refresh();
  } catch (err) {
    console.error('Error al procesar la foto:', err);
    toast('No se pudo procesar la imagen. Prueba con otra foto en JPG o PNG.', { type: 'error' });
  }
}

/* ========================================================== estantería */

const cvTitle = c => (c.title && String(c.title).trim()) || `CV sin título #${c.id}`;

function renderShelf() {
  const ul = $('#cvListContainer');
  if (!state.cvs.length) {
    ul.innerHTML = `<li class="shelf-empty empty-hint">Aún no tienes ningún CV. Importa uno que ya tengas o rellena el formulario de abajo y pulsa Guardar.</li>`;
    return;
  }
  const open = String($('#currentCvId').value);
  ul.innerHTML = state.cvs.map(c => {
    const def = Number(c.is_default) === 1;
    const isOpen = String(c.id) === open;
    const title = cvTitle(c);
    const t = escapeHtml(title);
    return `
      <li class="cv-card${isOpen ? ' is-open' : ''}${def ? ' is-default' : ''}">
        <button type="button" class="cv-card-main" data-action="open" data-id="${c.id}" aria-label="Abrir ${t}"${isOpen ? ' aria-current="true"' : ''}>
          <span class="cv-thumb" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="cv-card-body">
            <span class="cv-card-title">${t}</span>
            <span class="cv-card-meta">${def ? 'Preferente' : 'Secundario'}${isOpen ? ' · abierto' : ''}</span>
          </span>
        </button>
        <div class="cv-card-tools">
          <button type="button" class="icon-btn" data-action="star" data-id="${c.id}" aria-pressed="${def}" title="${def ? 'Quitar como preferente' : 'Marcar como preferente'}" aria-label="${def ? 'Quitar' : 'Marcar'} ${t} como preferente">${icon('star', { fill: def })}</button>
          <span class="spacer"></span>
          <button type="button" class="icon-btn" data-action="duplicate" data-id="${c.id}" title="Duplicar" aria-label="Duplicar ${t}">${icon('copy')}</button>
          <button type="button" class="icon-btn is-danger" data-action="delete" data-id="${c.id}" title="Borrar" aria-label="Borrar ${t}">${icon('trash')}</button>
        </div>
      </li>`;
  }).join('');
}

function renderShelfSkeleton() {
  $('#cvListContainer').innerHTML = [1, 2, 3].map(() =>
    '<li class="cv-card"><div class="skel" style="height:84px;border-radius:0"></div><div style="padding:14px 16px 18px;display:grid;gap:8px"><div class="skel" style="height:16px;width:70%"></div><div class="skel" style="height:12px;width:30%"></div></div></li>'
  ).join('');
}

function renderShelfError(err) {
  const ul = $('#cvListContainer');
  ul.innerHTML = `
    <li class="shelf-empty callout is-error">
      ${icon('alert')}
      <div>
        <strong>No se pudieron cargar tus CVs.</strong>
        <div>${escapeHtml(err.message)}</div>
        <button type="button" class="btn btn-secondary btn-sm" data-action="retry" style="margin-top:10px">Reintentar</button>
      </div>
    </li>`;
}

async function loadList({ openFirst = false, skeleton = false } = {}) {
  if (skeleton) renderShelfSkeleton();
  try {
    state.cvs = await api('/api/cv/list');
  } catch (err) {
    renderShelfError(err);
    return false;
  }
  renderShelf();
  emit('cvs');
  if (openFirst) {
    if (state.cvs.length) await openCv(state.cvs[0].id, { force: true });
    else blankForm();
  }
  return true;
}

/* ============================================================ acciones */

export async function openCv(id, { force = false, scroll = false } = {}) {
  if (!force && !(await confirmDiscard())) return false;
  try {
    const cv = await api(`/api/cv/${id}`);
    fillForm(cv);
    if (scroll) $('#cvForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  } catch (err) {
    toast(err.message, { type: 'error' });
    return false;
  }
}

async function newCv() {
  if (!(await confirmDiscard())) return;
  blankForm();
  $('#cvForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#cvTitle').focus();
}

async function duplicateCv(id) {
  if (!(await confirmDiscard())) return;
  try {
    const cv = await api(`/api/cv/${id}`);
    fillForm({ ...cv, title: `${cvTitle(cv)} (copia)`, is_default: 0 }, { unsaved: true });
    toast('Copia lista. Cambia lo que quieras y pulsa Guardar.');
    $('#cvForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('#cvTitle').focus();
  } catch (err) {
    toast(err.message, { type: 'error' });
  }
}

function toSavePayload(cv, isDefault) {
  return {
    cv_id: cv.id,
    title: cv.title || 'Mi CV',
    full_name: cv.full_name || '',
    email: cv.email || '',
    phone: cv.phone || '',
    summary: cv.summary || '',
    photo: cv.photo || '',
    is_default: isDefault,
    template: cv.template || 'modern',
    experiences: (cv.experiences || []).map(e => ({
      company: e.company, position: e.position,
      start_date: toDateInput(e.start_date), end_date: toDateInput(e.end_date),
      is_current: Number(e.is_current) ? 1 : 0,
      description: e.description || ''
    })),
    education: (cv.education || []).map(e => ({
      institution: e.institution, degree: e.degree,
      start_date: toDateInput(e.start_date), end_date: toDateInput(e.end_date),
      is_current: Number(e.is_current) ? 1 : 0,
      description: e.description || ''
    })),
    skills: (cv.skills || []).map(s => ({ skill_name: s.skill_name, level: s.level }))
  };
}

async function setDefault(id) {
  const current = state.cvs.find(c => String(c.id) === String(id));
  const makeDefault = !(current && Number(current.is_default) === 1);
  try {
    const cv = await api(`/api/cv/${id}`);
    await api('/api/cv/save', { method: 'POST', body: toSavePayload(cv, makeDefault) });
    await loadList();
    if (String($('#currentCvId').value) === String(id)) {
      if (!isDirty()) fillForm({ ...cv, is_default: makeDefault ? 1 : 0 });
      else $('#isDefaultCv').checked = makeDefault;
    }
    toast(makeDefault ? `«${cvTitle(cv)}» es ahora tu CV preferente` : 'Ya no tienes CV preferente', { type: 'ok' });
  } catch (err) {
    toast(err.message, { type: 'error' });
  }
}

async function deleteCv(id) {
  const cv = state.cvs.find(c => String(c.id) === String(id));
  const name = cv ? cvTitle(cv) : 'este CV';
  const ok = await confirmDialog({
    title: `¿Borrar «${name}»?`,
    message: 'Se elimina el CV con sus experiencias, estudios y habilidades. Las candidaturas que lo usaron se conservan. No se puede deshacer.',
    confirmText: 'Borrar CV',
    tone: 'danger'
  });
  if (!ok) return;
  try {
    await api(`/api/cv/${id}`, { method: 'DELETE' });
    toast('CV borrado', { type: 'ok' });
    const wasOpen = String($('#currentCvId').value) === String(id);
    if (wasOpen) { blankForm(); await loadList({ openFirst: true }); }
    else await loadList();
    emit('jobs:changed');
  } catch (err) {
    toast(err.message, { type: 'error' });
  }
}

async function save(e) {
  e.preventDefault();
  const btn = $('#saveCvBtn');
  if (btn.disabled) return;
  setLoading(btn, true, 'Guardando…');
  try {
    const res = await api('/api/cv/save', { method: 'POST', body: readForm() });
    $('#currentCvId').value = res.cv_id;
    state.currentCvId = String(res.cv_id);
    baseline = JSON.stringify(readForm());
    await loadList();
    updateStatus();
    toast('CV guardado', { type: 'ok' });
  } catch (err) {
    toast(err.message, { type: 'error' });
  } finally {
    setLoading(btn, false);
  }
}

/* ======================================================== importación */

function showImportStatus(tone, html) {
  const box = $('#importStatus');
  if (!html) { box.hidden = true; box.innerHTML = ''; return; }
  const iconName = tone === 'ok' ? 'check' : tone === 'error' ? 'alert' : tone === 'warn' ? 'alert' : 'info';
  box.className = `callout is-${tone}`;
  box.innerHTML = `${icon(iconName)}<div style="flex:1">${html}</div><button type="button" class="icon-btn" data-action="dismiss-import" aria-label="Cerrar aviso" style="margin:-8px -8px -8px 0">${icon('x')}</button>`;
  box.hidden = false;
}

async function importFile(file) {
  if (importBusy || !file) return;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!['pdf', 'docx', 'txt'].includes(ext)) {
    showImportStatus('error', ext === 'doc'
      ? 'Los archivos <b>.doc</b> antiguos no se pueden leer. Guárdalo como <b>.docx</b> o como PDF y vuelve a subirlo.'
      : 'Formato no admitido. Sube un <b>PDF</b>, un <b>Word (.docx)</b> o un <b>.txt</b>.');
    return;
  }
  if (file.size > MAX_IMPORT_BYTES) {
    showImportStatus('error', 'El archivo supera los 5 MB.');
    return;
  }
  if (currentView() !== 'cvs') navigate('cvs');
  if (!(await confirmDiscard())) return;

  importBusy = true;
  const btn = $('#importCvBtn');
  setLoading(btn, true, 'Analizando…');
  showImportStatus('info', `Leyendo <b>${escapeHtml(file.name)}</b> y rellenando los campos…`);

  try {
    const formData = new FormData();
    formData.append('file', file);
    const data = await api('/api/cv/import', { method: 'POST', formData });

    fillForm({ ...data, id: '', is_default: 0, template: 'modern', photo: '' }, { unsaved: true });

    const found = [
      data.experiences.length ? `${data.experiences.length} experiencia(s)` : null,
      data.education.length ? `${data.education.length} estudio(s)` : null,
      data.skills.length ? `${data.skills.length} habilidad(es)` : null
    ].filter(Boolean);
    const warnings = (data.warnings || []).map(w => `<li>${escapeHtml(w)}</li>`).join('');
    showImportStatus(warnings ? 'warn' : 'ok',
      `<strong>CV importado ${data.method === 'ai' ? 'con IA' : 'con el análisis básico'}${found.length ? ': ' + found.join(', ') : ''}.</strong><br>` +
      'Revisa los datos (la foto no se importa) y pulsa <b>Guardar CV</b> para crearlo.' +
      (warnings ? `<ul>${warnings}</ul>` : ''));
    $('#cvForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showImportStatus('error', escapeHtml(err.message || 'No se pudo importar el CV.'));
  } finally {
    importBusy = false;
    setLoading(btn, false);
  }
}

/* ===================================================== desde otras vistas */

// Añade una habilidad al CV indicado (botón "+" del análisis de oferta).
export async function addSkillToCv(name, cvId) {
  navigate('cvs');
  if (cvId && String($('#currentCvId').value) !== String(cvId)) {
    const opened = await openCv(cvId);
    if (!opened) return false;
  }
  const added = addSkill(name, 'Intermedio');
  refresh();
  toast(added
    ? `«${name}» añadida a las habilidades. Pulsa Guardar CV para conservarla.`
    : `«${name}» ya estaba en las habilidades de este CV.`);
  const target = $('#skillContainer');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return added;
}

// El análisis de ofertas ya guardó la habilidad en la base de datos. Si ese mismo CV está abierto
// en el editor, se actualiza para que un «Guardar CV» posterior no la borre.
export async function syncOpenCv(cvId, skillName) {
  if (!cvId || String($('#currentCvId').value) !== String(cvId)) return;
  if (!isDirty()) {
    try { fillForm(await api(`/api/cv/${cvId}`)); } catch (_) { /* se recargará al abrirlo */ }
    return;
  }
  addSkill(skillName, 'Intermedio'); // hay cambios sin guardar: se conservan y se suma la habilidad
  refresh();
}

/* ================================================================ init */

export async function initCvs() {
  preview = mountPreview({ stage: $('#previewStage'), wrap: $('#previewWrap'), paper: $('#previewPaper') });

  const form = $('#cvForm');
  form.addEventListener('submit', save);
  form.addEventListener('input', refresh);
  form.addEventListener('change', e => {
    if (e.target.matches('.exp-current')) setEndState(e.target.closest('li'), '.exp-current', '.exp-end');
    if (e.target.matches('.edu-current')) setEndState(e.target.closest('li'), '.edu-current', '.edu-end');
    refresh();
  });

  form.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn || !form.contains(btn)) return;
    const li = btn.closest('li');
    switch (btn.dataset.action) {
      case 'up': moveEntry(li, -1); break;
      case 'down': moveEntry(li, 1); break;
      case 'remove-entry': removeEntry(li); break;
      case 'level': {
        const next = LEVELS[(LEVELS.indexOf(li.dataset.level) + 1) % LEVELS.length];
        li.dataset.level = next;
        paintSkill(li);
        refresh();
        break;
      }
      case 'remove-skill': li.remove(); refresh(); $('#skillInput').focus(); break;
      default: break;
    }
  });

  $('#addExperienceBtn').addEventListener('click', () => { addExperience({}, { focus: true }); refresh(); });
  $('#addEducationBtn').addEventListener('click', () => { addEducation({}, { focus: true }); refresh(); });

  const skillInput = $('#skillInput');
  skillInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitSkillInput(); }
  });
  skillInput.addEventListener('paste', e => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (/[,;\n]/.test(text)) { e.preventDefault(); skillInput.value = text; commitSkillInput(); }
  });
  skillInput.addEventListener('blur', commitSkillInput);

  $('#photoBtn').addEventListener('click', () => $('#photoInput').click());
  $('#photoInput').addEventListener('change', e => { onPhotoPicked(e.target.files[0]); e.target.value = ''; });
  $('#photoRemoveBtn').addEventListener('click', () => { photo = ''; paintPhoto(); refresh(); });

  $('#newCvBtn').addEventListener('click', newCv);
  $('#importCvBtn').addEventListener('click', () => $('#importCvInput').click());
  $('#importCvInput').addEventListener('change', e => { importFile(e.target.files[0]); e.target.value = ''; });
  $('#importStatus').addEventListener('click', e => {
    if (e.target.closest('[data-action="dismiss-import"]')) showImportStatus('info', '');
  });

  $('#cvListContainer').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    switch (btn.dataset.action) {
      case 'open': openCv(id, { scroll: true }); break;
      case 'star': setDefault(id); break;
      case 'duplicate': duplicateCv(id); break;
      case 'delete': deleteCv(id); break;
      case 'retry': loadList({ openFirst: !$('#currentCvId').value && !isDirty(), skeleton: true }); break;
      default: break;
    }
  });

  $('#downloadPdfBtn').addEventListener('click', async e => {
    const btn = e.currentTarget;
    setLoading(btn, true, 'Generando…');
    try { await exportPdf(readForm()); }
    catch (err) { toast(err.message || 'No se pudo generar el PDF.', { type: 'error' }); }
    finally { setLoading(btn, false); }
  });
  $('#downloadWordBtn').addEventListener('click', () => exportWord(readForm()));

  // Vista previa en pantallas estrechas
  const pane = $('#previewPane');
  const closePreview = () => { pane.classList.remove('is-open'); $('#previewToggle').focus(); };
  $('#previewToggle').addEventListener('click', () => {
    pane.classList.add('is-open');
    preview.fit();
    $('#previewClose').focus();
  });
  $('#previewClose').addEventListener('click', closePreview);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && pane.classList.contains('is-open')) closePreview();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && currentView() === 'cvs') {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  window.addEventListener('beforeunload', e => {
    if (isDirty() && ($('#currentCvId').value || baseline === null)) { e.preventDefault(); e.returnValue = ''; }
  });

  // Arrastrar un archivo sobre la página para importarlo
  const overlay = $('#dropOverlay');
  let depth = 0;
  const hasFiles = e => Array.from((e.dataTransfer && e.dataTransfer.types) || []).includes('Files');
  document.addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; overlay.hidden = false; } });
  document.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
  document.addEventListener('dragleave', e => {
    if (!hasFiles(e)) return;
    depth = Math.max(0, depth - 1);
    if (!depth) overlay.hidden = true;
  });
  document.addEventListener('drop', e => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    overlay.hidden = true;
    const file = e.dataTransfer.files[0];
    if (file) importFile(file);
  });

  blankForm();
  await loadList({ openFirst: true, skeleton: true });
}
