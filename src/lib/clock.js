// Time helpers for the booking flow. Availability is computed in the business's
// own time zone, so "today" and "now" are read in that zone, not the visitor's.

const formatters = new Map();
const cache = new Map();

function formatterFor(tz) {
  if (!formatters.has(tz)) {
    formatters.set(
      tz,
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hourCycle: 'h23',
      }),
    );
  }
  return formatters.get(tz);
}

// { y, m (0-11), d, min (minutes since midnight) } for the current moment in `tz`.
export function zonedNow(tz) {
  const key = tz || 'local';
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < 15000) return hit.parts;
  let parts;
  try {
    const p = {};
    formatterFor(tz)
      .formatToParts(new Date(now))
      .forEach((x) => {
        p[x.type] = x.value;
      });
    parts = { y: +p.year, m: +p.month - 1, d: +p.day, min: (+p.hour % 24) * 60 + +p.minute };
  } catch (e) {
    const n = new Date(now);
    parts = { y: n.getFullYear(), m: n.getMonth(), d: n.getDate(), min: n.getHours() * 60 + n.getMinutes() };
  }
  cache.set(key, { at: now, parts });
  return parts;
}

export const todayParts = (tz) => zonedNow(tz);
export const nowMinutes = (tz) => zonedNow(tz).min;

// The visitor's browser time zone if it is one of `allowed`, otherwise `fallback`.
export function browserTimeZone(allowed, fallback) {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && (!allowed || allowed.indexOf(tz) >= 0)) return tz;
  } catch (e) {
    /* ignore */
  }
  return fallback;
}
