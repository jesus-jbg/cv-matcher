// Extrae el texto de un archivo de CV (PDF, Word .docx o texto plano).
// Detecta el tipo por el contenido real del archivo, no solo por la extensión.
const path = require('path');

function fail(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function extractText(buffer, originalName = '') {
  const ext = path.extname(originalName).toLowerCase();
  const isPdf = buffer.length > 5 && buffer.slice(0, 5).toString('latin1') === '%PDF-';
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b; // "PK" (docx es un zip)

  if (isPdf) {
    let parser;
    try {
      const { PDFParse } = require('pdf-parse'); // pdf-parse v2 (requiere Node 20.16+ o 22.3+)
      parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return String(result.text || '').replace(/^-- \d+ of \d+ --$/gm, ''); // quita los marcadores de página
    } catch (err) {
      console.error('Error leyendo PDF:', err.message);
      throw fail('No se pudo leer el PDF. ¿Está dañado o protegido con contraseña?', 422);
    } finally {
      if (parser) { try { await parser.destroy(); } catch (_) {} }
    }
  }

  if (isZip && ext === '.docx') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }

  if (ext === '.doc') {
    throw fail('Los archivos .doc antiguos no se pueden leer. Guárdalo como .docx o PDF y vuelve a subirlo.');
  }

  if (ext === '.txt') {
    return buffer.toString('utf8');
  }

  throw fail('Formato no admitido. Sube un PDF, un Word (.docx) o un .txt.');
}

// Limpia el texto: saltos de línea uniformes, sin caracteres raros ni espacios repetidos
function cleanText(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​﻿]/g, '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = { extractText, cleanText };