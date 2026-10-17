// Vista previa en vivo del CV y exportación a PDF / Word.
// Todo el texto del usuario pasa por escapeHtml antes de entrar en el HTML.
import { escapeHtml as esc, formatMonthYear } from './ui.js';

const PAGE_W = 794; // ancho A4 a 96 dpi
const SAFE_IMG = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

function range(item, endLabel) {
  const start = formatMonthYear(item.start_date);
  const end = item.is_current ? endLabel : formatMonthYear(item.end_date);
  if (start && end) return `${start} – ${end}`;
  return start || end || '';
}

function parts(data) {
  const photo = SAFE_IMG.test(data.photo || '') ? data.photo : '';
  return {
    template: ['classic', 'minimal', 'sidebar', 'executive', 'creative'].includes(data.template) ? data.template : 'modern',
    name: esc(data.full_name || 'Tu nombre'),
    email: esc(data.email || ''),
    phone: esc(data.phone || ''),
    summary: esc(data.summary || '').replace(/\n/g, '<br>'),
    photo,
    exps: (data.experiences || []).filter(e => e.company || e.position),
    edus: (data.education || []).filter(e => e.institution || e.degree),
    skills: (data.skills || []).filter(s => s.skill_name)
  };
}

// Comentario de una experiencia/estudio (saltos de línea respetados)
const note = (e, style = 'font-size:12px;color:#475569;margin-top:3px;line-height:1.45;') =>
  e.description ? `<div style="${style}">${esc(e.description).replace(/\n/g, '<br>')}</div>` : '';

const img = (src, size = 80) =>
  src ? `<img src="${src}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">` : '';

function modern(p) {
  const accent = '#0f4a3c';
  const h2 = 'font-size:14px;font-weight:bold;color:#1e293b;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin:0 0 12px;';
  return `
  <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;padding:30px;color:#1e293b;box-sizing:border-box;width:100%;">
    <div style="display:flex;align-items:center;gap:20px;background:${accent};color:#fff;padding:25px;border-radius:12px;margin-bottom:25px;">
      ${p.photo ? `<div style="border:3px solid #fff;border-radius:50%;flex:none;">${img(p.photo)}</div>` : ''}
      <div>
        <h1 style="font-size:26px;font-weight:bold;margin:0;">${p.name}</h1>
        <p style="font-size:13px;opacity:.9;margin:5px 0 0;">${[p.email, p.phone].filter(Boolean).join(' | ')}</p>
      </div>
    </div>
    ${p.summary ? `<div style="margin-bottom:25px;background:#f1f6f3;padding:15px;border-left:4px solid ${accent};border-radius:0 8px 8px 0;"><h2 style="font-size:13px;font-weight:bold;color:${accent};margin:0 0 6px;">PERFIL PROFESIONAL</h2><p style="font-size:13px;line-height:1.5;margin:0;">${p.summary}</p></div>` : ''}
    ${p.exps.length ? `<div style="margin-bottom:25px;"><h2 style="${h2}">EXPERIENCIA LABORAL</h2>${p.exps.map(e => `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;gap:12px;"><strong style="font-size:14px;color:#334155;">${esc(e.position)}</strong><span style="font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;">${esc(range(e, 'Presente'))}</span></div><div style="font-size:13px;color:#475569;">${esc(e.company)}</div>${note(e)}</div>`).join('')}</div>` : ''}
    ${p.edus.length ? `<div style="margin-bottom:25px;"><h2 style="${h2}">EDUCACIÓN</h2>${p.edus.map(e => `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;gap:12px;"><strong style="font-size:14px;color:#334155;">${esc(e.degree)}</strong><span style="font-size:12px;color:#64748b;font-weight:600;white-space:nowrap;">${esc(range(e, 'En curso'))}</span></div><div style="font-size:13px;color:#475569;">${esc(e.institution)}</div>${note(e)}</div>`).join('')}</div>` : ''}
    ${p.skills.length ? `<div><h2 style="${h2}">HABILIDADES Y TECNOLOGÍAS</h2><div style="display:flex;flex-wrap:wrap;gap:8px;">${p.skills.map(s => `<span style="background:#e4efea;color:#0f4a3c;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;">${esc(s.skill_name)} (${esc(s.level)})</span>`).join('')}</div></div>` : ''}
  </div>`;
}

function classic(p) {
  const h2 = 'font-size:14px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:3px;margin:0 0 8px;';
  return `
  <div style="font-family:Georgia,serif;padding:30px;color:#1a1a1a;box-sizing:border-box;width:100%;">
    <div style="display:flex;align-items:center;gap:20px;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px;">
      ${p.photo ? `<div style="border:2px solid #333;padding:2px;border-radius:50%;flex:none;">${img(p.photo)}</div>` : ''}
      <div>
        <h1 style="font-size:28px;margin:0;text-transform:uppercase;letter-spacing:1px;">${p.name}</h1>
        <p style="font-size:13px;color:#555;margin:5px 0 0;">${[p.email && `Correo: ${p.email}`, p.phone && `Teléfono: ${p.phone}`].filter(Boolean).join(' | ')}</p>
      </div>
    </div>
    ${p.summary ? `<div style="margin-bottom:20px;"><h2 style="${h2}">Extracto profesional</h2><p style="font-size:13px;line-height:1.6;margin:0;">${p.summary}</p></div>` : ''}
    ${p.exps.length ? `<div style="margin-bottom:20px;"><h2 style="${h2}">Experiencia laboral</h2>${p.exps.map(e => `<div style="margin-bottom:10px;"><strong style="font-size:14px;">${esc(e.position)}</strong> – <em>${esc(e.company)}</em> <span style="font-size:12px;color:#666;float:right;">${esc(range(e, 'Presente'))}</span>${note(e, 'clear:both;font-size:12px;color:#333;padding-top:3px;line-height:1.45;')}</div>`).join('')}</div>` : ''}
    ${p.edus.length ? `<div style="margin-bottom:20px;"><h2 style="${h2}">Educación</h2>${p.edus.map(e => `<div style="margin-bottom:10px;"><strong style="font-size:14px;">${esc(e.degree)}</strong> – <em>${esc(e.institution)}</em> <span style="font-size:12px;color:#666;float:right;">${esc(range(e, 'En curso'))}</span>${note(e, 'clear:both;font-size:12px;color:#333;padding-top:3px;line-height:1.45;')}</div>`).join('')}</div>` : ''}
    ${p.skills.length ? `<div><h2 style="${h2}">Competencias técnicas</h2><p style="font-size:13px;margin:0;">${p.skills.map(s => `${esc(s.skill_name)} (${esc(s.level)})`).join(' • ')}</p></div>` : ''}
  </div>`;
}

function minimal(p) {
  const h2 = 'font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:0 0 8px;';
  return `
  <div style="font-family:Arial,sans-serif;padding:30px;color:#222;box-sizing:border-box;width:100%;">
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:25px;">
      ${p.photo ? `<div style="flex:none;">${img(p.photo)}</div>` : ''}
      <div>
        <h1 style="font-size:32px;font-weight:300;margin:0;color:#111;">${p.name}</h1>
        <p style="font-size:12px;color:#666;margin:5px 0 0;">${[p.email, p.phone].filter(Boolean).join(' &nbsp;•&nbsp; ')}</p>
      </div>
    </div>
    ${p.summary ? `<div style="margin-bottom:25px;"><h2 style="${h2}">Sobre mí</h2><p style="font-size:13px;line-height:1.6;color:#333;margin:0;">${p.summary}</p></div>` : ''}
    ${p.exps.length ? `<div style="margin-bottom:25px;"><h2 style="${h2}">Experiencia</h2>${p.exps.map(e => `<div style="margin-bottom:12px;"><div style="font-size:14px;font-weight:bold;">${esc(e.position)} <span style="font-weight:normal;color:#666;">en ${esc(e.company)}</span></div><div style="font-size:12px;color:#999;">${esc(range(e, 'Presente'))}</div>${note(e, 'font-size:12px;color:#444;margin-top:3px;line-height:1.45;')}</div>`).join('')}</div>` : ''}
    ${p.edus.length ? `<div style="margin-bottom:25px;"><h2 style="${h2}">Formación</h2>${p.edus.map(e => `<div style="margin-bottom:12px;"><div style="font-size:14px;font-weight:bold;">${esc(e.degree)}</div><div style="font-size:12px;color:#666;">${esc(e.institution)}${range(e, 'En curso') ? ` (${esc(range(e, 'En curso'))})` : ''}</div>${note(e, 'font-size:12px;color:#444;margin-top:3px;line-height:1.45;')}</div>`).join('')}</div>` : ''}
    ${p.skills.length ? `<div><h2 style="${h2}">Tecnologías</h2><div style="display:flex;flex-wrap:wrap;gap:8px;font-size:12px;">${p.skills.map(s => `<span style="background:#f1f5f9;padding:4px 10px;border-radius:4px;">${esc(s.skill_name)} (${esc(s.level)})</span>`).join('')}</div></div>` : ''}
  </div>`;
}

// Lateral: columna oscura a la izquierda (foto, contacto, habilidades) y contenido a la derecha.
function sidebar(p) {
  const side = '#0f4a3c';
  const h2 = 'font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#0f4a3c;border-bottom:2px solid #0f4a3c;padding-bottom:5px;margin:0 0 10px;';
  const sh = 'font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#ffe14a;margin:0 0 8px;';
  return `
  <div style="display:flex;align-items:stretch;min-height:1050px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1e293b;box-sizing:border-box;width:100%;">
    <div style="width:250px;flex:none;background:${side};color:#fff;padding:30px 20px;box-sizing:border-box;">
      ${p.photo ? `<div style="text-align:center;margin-bottom:22px;"><img src="${p.photo}" alt="" style="width:130px;height:130px;border-radius:50%;object-fit:cover;border:3px solid #fff;"></div>` : ''}
      ${(p.email || p.phone) ? `<div style="margin-bottom:22px;"><h2 style="${sh}">Contacto</h2>${p.email ? `<p style="font-size:12px;margin:0 0 5px;word-break:break-all;">${p.email}</p>` : ''}${p.phone ? `<p style="font-size:12px;margin:0;">${p.phone}</p>` : ''}</div>` : ''}
      ${p.skills.length ? `<div><h2 style="${sh}">Habilidades</h2>${p.skills.map(s => `<p style="font-size:12px;margin:0 0 6px;">${esc(s.skill_name)} <span style="opacity:.7;">· ${esc(s.level)}</span></p>`).join('')}</div>` : ''}
    </div>
    <div style="flex:1;padding:34px 30px;box-sizing:border-box;">
      <h1 style="font-size:30px;font-weight:bold;margin:0 0 22px;color:#0f172a;">${p.name}</h1>
      ${p.summary ? `<div style="margin-bottom:22px;"><h2 style="${h2}">Perfil</h2><p style="font-size:13px;line-height:1.55;margin:0;">${p.summary}</p></div>` : ''}
      ${p.exps.length ? `<div style="margin-bottom:22px;"><h2 style="${h2}">Experiencia</h2>${p.exps.map(e => `<div style="margin-bottom:12px;"><strong style="font-size:14px;">${esc(e.position)}</strong><div style="font-size:13px;color:#475569;">${esc(e.company)}</div><div style="font-size:12px;color:#64748b;">${esc(range(e, 'Presente'))}</div>${note(e)}</div>`).join('')}</div>` : ''}
      ${p.edus.length ? `<div><h2 style="${h2}">Formación</h2>${p.edus.map(e => `<div style="margin-bottom:12px;"><strong style="font-size:14px;">${esc(e.degree)}</strong><div style="font-size:13px;color:#475569;">${esc(e.institution)}</div><div style="font-size:12px;color:#64748b;">${esc(range(e, 'En curso'))}</div>${note(e)}</div>`).join('')}</div>` : ''}
    </div>
  </div>`;
}

// Ejecutivo: tipografía con serifa, azul marino y títulos de sección en columna a la izquierda.
function executive(p) {
  const navy = '#1b2a41';
  const row = (title, body) => `<div style="display:flex;gap:22px;padding:16px 0;border-top:1px solid #cfd6df;"><div style="width:130px;flex:none;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${navy};">${title}</div><div style="flex:1;">${body}</div></div>`;
  return `
  <div style="font-family:Georgia,'Times New Roman',serif;padding:34px 34px 30px;color:#1a1a1a;box-sizing:border-box;width:100%;">
    <div style="display:flex;align-items:center;gap:22px;padding-bottom:20px;">
      ${p.photo ? `<div style="flex:none;">${img(p.photo, 92)}</div>` : ''}
      <div>
        <h1 style="font-size:30px;font-weight:normal;letter-spacing:.5px;margin:0;color:${navy};">${p.name}</h1>
        <p style="font-family:Arial,sans-serif;font-size:12px;color:#555;margin:6px 0 0;">${[p.email, p.phone].filter(Boolean).join('  ·  ')}</p>
      </div>
    </div>
    ${p.summary ? row('Perfil', `<p style="font-size:13px;line-height:1.6;margin:0;">${p.summary}</p>`) : ''}
    ${p.exps.length ? row('Experiencia', p.exps.map(e => `<div style="margin-bottom:11px;"><div style="display:flex;justify-content:space-between;gap:12px;"><strong style="font-size:14px;">${esc(e.position)}</strong><span style="font-family:Arial,sans-serif;font-size:11px;color:#666;white-space:nowrap;">${esc(range(e, 'Presente'))}</span></div><div style="font-size:13px;font-style:italic;color:#444;">${esc(e.company)}</div>${note(e, 'font-size:12.5px;color:#333;margin-top:3px;line-height:1.5;')}</div>`).join('')) : ''}
    ${p.edus.length ? row('Formación', p.edus.map(e => `<div style="margin-bottom:11px;"><div style="display:flex;justify-content:space-between;gap:12px;"><strong style="font-size:14px;">${esc(e.degree)}</strong><span style="font-family:Arial,sans-serif;font-size:11px;color:#666;white-space:nowrap;">${esc(range(e, 'En curso'))}</span></div><div style="font-size:13px;font-style:italic;color:#444;">${esc(e.institution)}</div>${note(e, 'font-size:12.5px;color:#333;margin-top:3px;line-height:1.5;')}</div>`).join('')) : ''}
    ${p.skills.length ? row('Competencias', `<p style="font-size:13px;line-height:1.7;margin:0;">${p.skills.map(s => `${esc(s.skill_name)} <span style="color:#777;">(${esc(s.level)})</span>`).join('  ·  ')}</p>`) : ''}
  </div>`;
}

// Creativo: nombre subrayado con rotulador amarillo, foto con esquinas redondeadas y etiquetas con borde.
function creative(p) {
  const h2 = 'display:inline-block;font-size:15px;font-weight:800;margin:0 0 10px;background:linear-gradient(transparent 55%,#ffe14a 55%);padding:0 4px;';
  return `
  <div style="font-family:'Trebuchet MS','Segoe UI',Arial,sans-serif;padding:34px;color:#222;box-sizing:border-box;width:100%;border-left:10px solid #ffe14a;">
    <div style="display:flex;align-items:center;gap:22px;margin-bottom:26px;">
      ${p.photo ? `<img src="${p.photo}" alt="" style="width:96px;height:96px;border-radius:22px;object-fit:cover;flex:none;">` : ''}
      <div>
        <h1 style="font-size:34px;font-weight:800;margin:0;line-height:1.1;color:#111;"><span style="background:linear-gradient(transparent 60%,#ffe14a 60%);padding:0 4px;">${p.name}</span></h1>
        <p style="font-size:12px;color:#555;margin:9px 0 0;">${[p.email, p.phone].filter(Boolean).join('   ·   ')}</p>
      </div>
    </div>
    ${p.summary ? `<div style="margin-bottom:24px;"><h2 style="${h2}">Sobre mí</h2><p style="font-size:13px;line-height:1.6;margin:0;">${p.summary}</p></div>` : ''}
    ${p.exps.length ? `<div style="margin-bottom:24px;"><h2 style="${h2}">Experiencia</h2>${p.exps.map(e => `<div style="margin-bottom:12px;padding-left:12px;border-left:3px solid #0f4a3c;"><strong style="font-size:14px;">${esc(e.position)}</strong> <span style="font-size:13px;color:#444;">· ${esc(e.company)}</span><div style="font-size:12px;color:#777;">${esc(range(e, 'Presente'))}</div>${note(e, 'font-size:12px;color:#444;margin-top:3px;line-height:1.45;')}</div>`).join('')}</div>` : ''}
    ${p.edus.length ? `<div style="margin-bottom:24px;"><h2 style="${h2}">Formación</h2>${p.edus.map(e => `<div style="margin-bottom:12px;padding-left:12px;border-left:3px solid #0f4a3c;"><strong style="font-size:14px;">${esc(e.degree)}</strong> <span style="font-size:13px;color:#444;">· ${esc(e.institution)}</span><div style="font-size:12px;color:#777;">${esc(range(e, 'En curso'))}</div>${note(e, 'font-size:12px;color:#444;margin-top:3px;line-height:1.45;')}</div>`).join('')}</div>` : ''}
    ${p.skills.length ? `<div><h2 style="${h2}">Habilidades</h2><div style="display:flex;flex-wrap:wrap;gap:8px;">${p.skills.map(s => `<span style="border:2px solid #111;border-radius:999px;font-size:12px;font-weight:700;padding:3px 11px;">${esc(s.skill_name)}</span>`).join('')}</div></div>` : ''}
  </div>`;
}

export const TEMPLATES = ['modern', 'classic', 'minimal', 'sidebar', 'executive', 'creative'];

export function buildCvHtml(data) {
  const p = parts(data);
  switch (p.template) {
    case 'classic': return classic(p);
    case 'minimal': return minimal(p);
    case 'sidebar': return sidebar(p);
    case 'executive': return executive(p);
    case 'creative': return creative(p);
    default: return modern(p);
  }
}

/* ------------------------------------------------------- vista previa */
export function mountPreview({ stage, wrap, paper }) {
  const fit = () => {
    const avail = stage.clientWidth - 32; // 16px de margen a cada lado
    if (avail <= 0) return;
    const scale = Math.min(1, Math.max(0.2, avail / PAGE_W));
    paper.style.transform = `scale(${scale})`;
    wrap.style.width = `${PAGE_W * scale}px`;
    wrap.style.height = `${paper.offsetHeight * scale}px`;
  };
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(stage);
  else window.addEventListener('resize', fit);

  return {
    render(data) {
      paper.innerHTML = buildCvHtml(data);
      fit();
    },
    fit
  };
}

/* --------------------------------------------------------- exportación */
const HTML2PDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar el generador de PDF. Comprueba tu conexión a internet.'));
    document.head.appendChild(s);
  });
}

export function fileBaseName(title) {
  const base = String(title || 'CV')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return base || 'CV';
}

export async function exportPdf(data) {
  await loadScript(HTML2PDF_URL);
  // El CV debe estar dentro de la página (no suelto en memoria) y con ancho fijo;
  // si no, html2canvas lo captura vacío y el PDF sale en blanco.
  // El contenedor externo es el que se coloca; el elemento que se captura NO debe
  // ser absolute/fixed, porque html2pdf lo clona y le saldría altura 0.
  const holder = document.createElement('div');
  holder.style.cssText = `position:absolute;left:0;top:0;width:${PAGE_W}px;background:#fff;color:#000;z-index:-1;`;
  const el = document.createElement('div');
  el.style.cssText = `width:${PAGE_W}px;background:#fff;`;
  el.innerHTML = buildCvHtml(data);
  holder.appendChild(el);
  document.body.appendChild(holder);
  const scrollY = window.scrollY;
  window.scrollTo(0, 0);
  try {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    await window.html2pdf().set({
      margin: 0,
      filename: `${fileBaseName(data.title)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    }).from(el).save();
  } finally {
    holder.remove();
    window.scrollTo(0, scrollY);
  }
}

// Word abre este HTML como documento editable. Se guarda como .doc (no .docx):
// con .docx Word avisaría de que la extensión no coincide con el contenido.
export function exportWord(data) {
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>${buildCvHtml(data)}</body></html>`;
  const blob = new Blob(['﻿' + doc], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileBaseName(data.title)}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
