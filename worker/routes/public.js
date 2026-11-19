import { HttpError, json, readJson, str, isEmail, newId } from '../lib/http.js';
import { loadBusinessBySlug, loadParts, currencySymbol, initialsOf } from '../lib/db.js';
import { computeAvailability, pickStaff } from '../lib/availability.js';
import { zonedToUtc, dateKeyInZone, addDays } from '../lib/time.js';
import { busyTimes } from '../lib/google.js';
import { afterCreate } from '../lib/sync.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function load(env, slug) {
  const biz = await loadBusinessBySlug(env, slug);
  if (!biz) throw new HttpError(404, 'Booking page not found.');
  return { biz, parts: await loadParts(env, biz.id) };
}

// Shape mirrors the booking page's data model (see src/pages/BookingPage.jsx).
export async function getPublic(env, request, slug) {
  const { biz, parts } = await load(env, slug);
  const services = parts.services.filter((s) => s.active);
  const usedCats = {};
  services.forEach((s) => { usedCats[s.isPackage ? 'pkg' : s.category] = true; });
  const cats = [['all', 'All']].concat(biz.categories.filter((c) => c[0] !== 'all' && usedCats[c[0]]));
  Object.keys(usedCats).forEach((k) => { if (k && !cats.some((c) => c[0] === k)) cats.push([k, k === 'pkg' ? 'Packages' : cap(k)]); });
  const noun = biz.svc_noun;
  return json({
    biz: {
      id: biz.id, name: biz.name, initials: initialsOf(biz.name), kind: biz.kind, place: biz.place, tzId: biz.timezone,
      cur: currencySymbol(biz.currency), currency: biz.currency, slug: biz.slug, accent: biz.accent,
    },
    svcNoun: noun,
    svcTitle: noun === 'package' ? 'Choose a package' : 'Select a ' + noun,
    staffNoun: biz.staff_noun,
    staffTitle: 'Choose a ' + biz.staff_noun.toLowerCase(),
    anyName: biz.any_name, anyRole: biz.any_role, staffSub: biz.staff_sub,
    deposit: biz.deposit_pct || 0,
    policy: biz.policy,
    settings: { staffStep: biz.settings.staffStep, prices: biz.settings.prices, approval: biz.settings.approval, advance: biz.settings.advance },
    cats: cats.length > 2 ? cats : [['all', 'All']],
    services: services.map((s) => ({
      id: s.id, cat: s.isPackage ? 'pkg' : s.category, name: s.name, dur: s.duration, price: s.price, from: s.fromPrice,
      desc: s.description, pkg: s.isPackage, badge: s.badge, meta: s.meta, includes: s.includes,
      addons: s.addons, questions: s.questions, staffIds: s.staffIds,
    })),
    staff: parts.staff.map((s) => ({ id: s.id, name: s.name, role: s.role, initials: s.initials, color: s.color })),
  });
}

async function busyFor(env, biz, parts, fromMs, toMs, now) {
  const r = await env.DB.prepare("SELECT staff_id, start_utc, block_end_utc FROM bookings WHERE business_id = ? AND status IN ('pending', 'confirmed') AND block_end_utc > ? AND start_utc < ?")
    .bind(biz.id, Math.max(fromMs, now), toMs).all();
  const busy = r.results.map((b) => ({ staffId: b.staff_id, start: b.start_utc, end: b.block_end_utc }));
  const g = parts.google;
  if (g && g.block_busy) {
    try {
      const staffId = g.staff_id || (parts.staff[0] && parts.staff[0].id);
      for (const b of await busyTimes(env, g, Math.max(fromMs, now), toMs)) busy.push({ staffId, start: b.start, end: b.end });
    } catch (e) {
      console.error('Google busy lookup failed', e && e.message);
    }
  }
  return busy;
}

function availabilityFor(biz, parts, service, busy, now, from, to) {
  return computeAvailability({
    business: { timezone: biz.timezone, settings: biz.settings },
    hours: parts.hours, timeOff: parts.timeOff,
    service: { duration: service.duration, buffer: service.buffer, staffIds: service.staffIds },
    staff: parts.staff, busy, now, from, to,
  });
}

export async function getAvailability(env, request, slug) {
  const { biz, parts } = await load(env, slug);
  const url = new URL(request.url);
  const service = parts.services.find((s) => s.id === url.searchParams.get('service') && s.active);
  if (!service) throw new HttpError(404, 'Service not found.');
  const now = Date.now();
  const today = dateKeyInZone(now, biz.timezone);
  const last = addDays(today, biz.settings.advance);
  const busy = await busyFor(env, biz, parts, zonedToUtc(today, 0, biz.timezone), zonedToUtc(addDays(last, 1), 0, biz.timezone), now);
  return json({ timezone: biz.timezone, today, last, staff: availabilityFor(biz, parts, service, busy, now) });
}

export async function createBooking(env, request, ctx, slug) {
  const { biz, parts } = await load(env, slug);
  const body = await readJson(request);
  const service = parts.services.find((s) => s.id === body.serviceId && s.active);
  if (!service) throw new HttpError(400, 'Choose a ' + biz.svc_noun + ' to continue.');
  const date = String(body.date || '');
  const minute = Number(body.time);
  if (!DATE_RE.test(date) || !Number.isInteger(minute)) throw new HttpError(400, 'Pick a start time to continue.');

  const firstName = str(body.firstName, 80), lastName = str(body.lastName, 80);
  const email = str(body.email, 254).toLowerCase();
  if (!firstName || !isEmail(email) || !body.agree) throw new HttpError(400, 'Fill in the required fields (*) to continue.');
  const answersIn = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const answers = [];
  for (const q of service.questions) {
    const a = str(answersIn[q.id], 2000);
    if (q.req && !a) throw new HttpError(400, 'Fill in the required fields (*) to continue.');
    if ((q.type === 'yesno' && a && ['Yes', 'No'].indexOf(a) < 0) || (q.type === 'select' && a && q.options.indexOf(a) < 0)) {
      throw new HttpError(400, 'Choose one of the options for "' + q.label + '".');
    }
    answers.push({ q: q.label, a });
  }
  const addons = service.addons.filter((a) => Array.isArray(body.addons) && body.addons.indexOf(a.id) >= 0);
  const total = service.price + addons.reduce((n, a) => n + a.price, 0);

  // Re-check the slot against live availability for that day.
  const now = Date.now();
  const dayStart = zonedToUtc(date, 0, biz.timezone);
  const busy = await busyFor(env, biz, parts, dayStart - 86400000, dayStart + 2 * 86400000, now);
  const avail = availabilityFor(biz, parts, service, busy, now, date, date);
  const order = parts.staff.map((s) => s.id).filter((id) => avail[id]);
  let staffId = body.staffId && body.staffId !== 'any' ? String(body.staffId) : null;
  const taken = () => new HttpError(409, 'That time was just booked. Pick another time.', { code: 'slot_taken' });
  if (staffId) {
    if (!avail[staffId]) throw new HttpError(400, 'Choose a ' + biz.staff_noun.toLowerCase() + ' option to continue.');
    if (!(avail[staffId][date] || []).includes(minute)) throw taken();
  } else {
    const load = {};
    busy.forEach((b) => { if (b.staffId) load[b.staffId] = (load[b.staffId] || 0) + 1; });
    staffId = pickStaff(avail, date, minute, order, load);
    if (!staffId) throw taken();
  }
  const staff = parts.staff.find((s) => s.id === staffId);

  const start = zonedToUtc(date, minute, biz.timezone);
  const end = start + service.duration * 60000;
  const b = {
    id: newId(), ref: 'BK-' + (100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)),
    business_id: biz.id, service_id: service.id, service_name: service.name + (addons.length ? ' + ' + addons.map((a) => a.name).join(', ') : ''),
    staff_id: staffId, staff_name: staff.name, start_utc: start, end_utc: end, block_end_utc: end + service.buffer * 60000,
    status: biz.settings.approval ? 'pending' : 'confirmed', first_name: firstName, last_name: lastName, email,
    phone: str(body.phone, 40), sms: body.sms ? 1 : 0, answers: JSON.stringify(answers),
    addons: JSON.stringify(addons.map((a) => ({ name: a.name, price: a.price }))), total,
    source: body.embed ? 'Website embed' : 'Booking page', note: '', gcal_event_id: null, created_at: now, updated_at: now,
  };
  const cols = Object.keys(b);
  for (let attempt = 0; ; attempt++) {
    try {
      await env.DB.prepare('INSERT INTO bookings (' + cols.join(', ') + ') VALUES (' + cols.map(() => '?').join(', ') + ')').bind(...cols.map((k) => b[k])).run();
      break;
    } catch (e) {
      const msg = String(e.message);
      if (msg.includes('bookings.ref') && attempt < 3) { b.ref = 'BK-' + (100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)); continue; }
      if (msg.includes('UNIQUE')) throw taken();
      throw e;
    }
  }
  ctx.waitUntil(afterCreate(env, b, biz));
  return json({
    booking: { ref: b.ref, status: b.status, start, end, staffId, staffName: staff.name, total, email },
  }, 201);
}
