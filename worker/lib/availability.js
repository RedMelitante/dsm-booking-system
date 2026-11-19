import { zonedToUtc, dateKeyInZone, addDays, dowOfKey, partsInZone } from './time.js';

// Computes open start times for one service, per eligible staff member.
//
// business: { timezone, settings: { interval, notice (hours), advance (days) } }
// hours:    [{ dow, isOpen, open, close }]   minutes since midnight, business time
// timeOff:  [{ startDate, endDate }]           YYYY-MM-DD, inclusive
// service:  { duration, buffer, staffIds }     empty staffIds = every staff member
// staff:    [{ id }]
// busy:     [{ staffId, start, end }]          UTC ms; existing bookings (incl. buffer) and calendar busy times.
//                                              staffId null = blocks everyone.
// now:      UTC ms
// from/to:  optional YYYY-MM-DD range (clamped to today .. today + advance)
//
// Returns { [staffId]: { [YYYY-MM-DD]: [startMinute, ...] } }.
// A start time is offered only if service + buffer fits inside opening hours,
// it is at least `notice` hours away, and the staff member has no overlap.
export function computeAvailability({ business, hours, timeOff, service, staff, busy, now, from, to }) {
  const tz = business.timezone;
  const s = business.settings || {};
  const interval = Math.max(5, Number(s.interval) || 30);
  const noticeMs = (Number(s.notice) || 0) * 3600000;
  const advance = Math.max(1, Number(s.advance) || 60);
  const dur = Number(service.duration) || 30;
  const buffer = Number(service.buffer) || 0;

  const eligible = (service.staffIds && service.staffIds.length
    ? staff.filter((x) => service.staffIds.indexOf(x.id) >= 0)
    : staff).map((x) => x.id);

  const today = dateKeyInZone(now, tz);
  const last = addDays(today, advance);
  const start = from && from > today ? from : today;
  const end = to && to < last ? to : last;

  const byDow = {};
  for (const h of hours) byDow[h.dow] = h;
  const off = (key) => timeOff.some((t) => key >= t.startDate && key <= t.endDate);

  const busyBy = {};
  const global = [];
  for (const b of busy) {
    if (b.staffId) (busyBy[b.staffId] = busyBy[b.staffId] || []).push(b);
    else global.push(b);
  }
  const free = (id, a, z) => {
    const list = (busyBy[id] || []).concat(global);
    for (const b of list) if (b.start < z && b.end > a) return false;
    return true;
  };

  const out = {};
  for (const id of eligible) out[id] = {};
  for (let key = start; key <= end; key = addDays(key, 1)) {
    const h = byDow[dowOfKey(key)];
    if (!h || !h.isOpen || off(key)) continue;
    for (let t = h.open; t + dur + buffer <= h.close; t += interval) {
      const a = zonedToUtc(key, t, tz);
      if (a < now + noticeMs) continue;
      const z = a + (dur + buffer) * 60000;
      for (const id of eligible) {
        if (free(id, a, z)) (out[id][key] = out[id][key] || []).push(t);
      }
    }
  }
  return out;
}

// Picks the eligible staff member to assign when the customer chose "Any":
// the one with the fewest bookings that day, then by list order.
export function pickStaff(avail, dateKey, minute, staffOrder, loadByStaff) {
  const ok = staffOrder.filter((id) => avail[id] && avail[id][dateKey] && avail[id][dateKey].indexOf(minute) >= 0);
  ok.sort((x, y) => (loadByStaff[x] || 0) - (loadByStaff[y] || 0));
  return ok[0] || null;
}

export { partsInZone };
