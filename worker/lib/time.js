// Time-zone helpers. Business hours and slots are minutes since midnight in the
// business's IANA time zone; everything stored is UTC epoch milliseconds.

const fmtCache = new Map();
function fmt(tz) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23', weekday: 'short',
    });
    fmtCache.set(tz, f);
  }
  return f;
}

const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// Wall-clock parts of a UTC instant in `tz`.
export function partsInZone(ms, tz) {
  const p = {};
  for (const x of fmt(tz).formatToParts(new Date(ms))) p[x.type] = x.value;
  return {
    y: +p.year, m: +p.month, d: +p.day, // m is 1-12
    hour: +p.hour % 24, minute: +p.minute, second: +p.second,
    dow: WD[p.weekday], min: (+p.hour % 24) * 60 + +p.minute,
  };
}

// Offset of `tz` from UTC at instant `ms`, in minutes (e.g. Manila = +480).
export function offsetMinutes(ms, tz) {
  const p = partsInZone(ms, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

// UTC instant for wall-clock `dateKey` (YYYY-MM-DD) + `min` minutes in `tz`.
export function zonedToUtc(dateKey, min, tz) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, min);
  let off = offsetMinutes(guess, tz);
  let ms = guess - off * 60000;
  const off2 = offsetMinutes(ms, tz);
  if (off2 !== off) ms = guess - off2 * 60000;
  return ms;
}

export const pad = (n) => (n < 10 ? '0' : '') + n;
export const dateKey = (y, m, d) => y + '-' + pad(m) + '-' + pad(d);

// YYYY-MM-DD for `ms` in `tz`.
export function dateKeyInZone(ms, tz) {
  const p = partsInZone(ms, tz);
  return dateKey(p.y, p.m, p.d);
}

// Add days to a YYYY-MM-DD key (calendar arithmetic, no time zone involved).
export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return dateKey(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export const dowOfKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

export function fmtTime(min) {
  const m = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), mm = m % 60;
  return (h % 12 === 0 ? 12 : h % 12) + ':' + pad(mm) + ' ' + (h >= 12 ? 'PM' : 'AM');
}

const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "Thursday, 19 November 2026, 2:00 PM" in `tz`.
export function fmtWhen(ms, tz) {
  const p = partsInZone(ms, tz);
  return WDL[p.dow] + ', ' + p.d + ' ' + MONL[p.m - 1] + ' ' + p.y + ', ' + fmtTime(p.min);
}
