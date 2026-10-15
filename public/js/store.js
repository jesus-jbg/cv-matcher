// Estado compartido entre pantallas y un bus de eventos mínimo.

export const state = {
  cvs: [],        // [{ id, title, is_default }]
  jobs: [],       // candidaturas
  currentCvId: '' // CV abierto en el editor ('' = CV nuevo sin guardar)
};

const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

export function emit(event, payload) {
  (listeners.get(event) || []).forEach(fn => {
    try { fn(payload); } catch (err) { console.error(`Error en oyente de "${event}":`, err); }
  });
}

// CV que el servidor usa cuando no se elige ninguno: el preferente o, si no hay, el más antiguo.
export function defaultCvId() {
  if (!state.cvs.length) return '';
  const preferred = state.cvs.find(c => Number(c.is_default) === 1);
  if (preferred) return String(preferred.id);
  return String(Math.min(...state.cvs.map(c => Number(c.id))));
}
