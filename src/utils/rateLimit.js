// Limitador sencillo en memoria: máximo `max` intentos por clave cada `windowMs`.
// Suficiente para un solo servidor; si algún día usas varios, habría que moverlo a Redis.
const buckets = new Map();

function hit(key, max, windowMs) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || entry.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

// Limpieza periódica para que el mapa no crezca sin límite
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
}, 10 * 60 * 1000).unref();

module.exports = { hit };
