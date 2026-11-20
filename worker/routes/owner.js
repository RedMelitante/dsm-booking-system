import { HttpError, json, readJson, str, int, isEmail, newId } from '../lib/http.js';
import { requireUser } from '../lib/auth.js';
import { TEMPLATES, DEFAULT_HOURS, STAFF_COLORS, CURRENCIES, mergeSettings } from '../lib/defaults.js';
import { loadOwnedBusiness, loadParts, currencySymbol, serializeBooking, hydrateService } from '../lib/db.js';
import { isValidTimeZone, zonedToUtc, dateKeyInZone, partsInZone } from '../lib/time.js';
import { computeAvailability } from '../lib/availability.js';
import { RESERVED_SLUGS } from '../../src/lib/reserved.js';
import { emailConfigured, sendTest } from '../lib/email.js';
import { googleConfigured, listCalendars } from '../lib/google.js';
import { afterStatusChange, afterReschedule } from '../lib/sync.js';

// ---- Slugs

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export async function slugStatus(env, raw, exceptBizId) {
  const slug = String(raw || '').toLowerCase().replace(/-+$/, '');
  if (!slug) return { slug, status: 'empty', message: 'Pick a short web address for your page.' };
  if (slug.length < 3) return { slug, status: 'error', message: 'Use at least 3 characters.' };
  if (slug.length > 40 || !SLUG_RE.test(slug)) return { slug, status: 'error', message: 'Use lower-case letters, numbers and dashes.' };
  if (RESERVED_SLUGS.indexOf(slug) >= 0) return { slug, status: 'error', message: 'That address is reserved. Try another.' };
  const taken = await env.DB.prepare('SELECT id FROM businesses WHERE slug = ?').bind(slug).first();
  if (taken && taken.id !== exceptBizId) {
    const cands = [slug + '-ph', slug + '-bookings', slug + '-2'];
    const r = await env.DB.prepare('SELECT slug FROM businesses WHERE slug IN (?, ?, ?)').bind(...cands).all();
    const used = r.results.map((x) => x.slug);
    return { slug, status: 'taken', message: '[domain]/' + slug + ' is already taken.', suggestions: cands.filter((c) => used.indexOf(c) < 0) };
  }
  return { slug, status: 'ok', message: '[domain]/' + slug + ' is available.' };
}

export async function checkSlug(env, request, slug) {
  await requireUser(env, request);
  return json(await slugStatus(env, slug));
}

// ---- Business create / read / update

function staffInsert(env, bizId, s, sort) {
  return env.DB.prepare('INSERT INTO staff (id, business_id, name, role, color, sort) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(s.id, bizId, s.name, s.role, s.color, sort);
}

function serviceInsert(env, bizId, s, sort) {
  return env.DB.prepare(
    `INSERT INTO services (id, business_id, name, category, duration, price, from_price, buffer, description, active, is_package, badge, meta, includes, addons, questions, staff_ids, sort, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    s.id, bizId, s.name, s.category, s.duration, s.price, s.fromPrice ? 1 : 0, s.buffer, s.description, s.active ? 1 : 0,
    s.isPackage ? 1 : 0, s.badge || '', s.meta || '', JSON.stringify(s.includes || []), JSON.stringify(s.addons || []),
    JSON.stringify(s.questions || []), JSON.stringify(s.staffIds || []), sort, Date.now() + sort,
  );
}

export async function createBusiness(env, request) {
  const user = await requireUser(env, request);
  const body = await readJson(request);
  const name = str(body.name, 120);
  const errors = {};
  if (!name) errors.name = 'Enter your business name.';
  const slug = await slugStatus(env, body.slug);
  if (slug.status !== 'ok') errors.slug = slug.status === 'empty' ? 'Choose an address for your booking page.' : slug.message;
  const templateKey = TEMPLATES[body.template] ? body.template : null;
  if (!templateKey) errors.template = 'Choose a template, or start from scratch.';
  const currency = CURRENCIES[body.currency] !== undefined ? body.currency : null;
  if (!currency) errors.currency = 'Choose a currency.';
  const timezone = str(body.timezone, 64);
  if (!isValidTimeZone(timezone)) errors.timezone = 'Choose a time zone.';
  if (Object.keys(errors).length) throw new HttpError(400, 'Check the highlighted fields.', { errors, slugStatus: slug });

  const t = TEMPLATES[templateKey];
  const id = newId();
  const ownerStaff = { id: newId(), name: user.name, role: t.staffRole, color: STAFF_COLORS[0] };
  const settings = mergeSettings({}, { ownerEmail: user.email, fromName: name });
  const stmts = [
    env.DB.prepare(
      `INSERT INTO businesses (id, owner_id, slug, name, website, template, currency, timezone, accent, kind, place, svc_noun, staff_noun, any_name, any_role, staff_sub, policy, deposit_pct, categories, settings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '#5B4BDB', ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, user.id, slug.slug, name, str(body.website, 200), templateKey, currency, timezone, t.kind, t.svcNoun, t.staffNoun,
      t.anyName, t.anyRole, t.staffSub, t.policy, t.deposit || 0, JSON.stringify(t.categories), JSON.stringify(settings), Date.now()),
    staffInsert(env, id, ownerStaff, 0),
    ...DEFAULT_HOURS.map((h) => env.DB.prepare('INSERT INTO hours (business_id, dow, is_open, open_min, close_min) VALUES (?, ?, ?, ?, ?)')
      .bind(id, h.dow, h.isOpen ? 1 : 0, h.open, h.close)),
    ...t.services.map((s, i) => serviceInsert(env, id, {
      id: newId(), name: s.name, category: s.category, duration: s.duration, price: s.price, fromPrice: !!s.fromPrice, buffer: s.buffer || 0,
      description: s.description, active: true, isPackage: !!s.isPackage, badge: s.badge, includes: s.includes,
      addons: (s.addons || []).map((a) => ({ id: newId(), name: a.name, price: a.price })),
      questions: t.questions.map((q) => Object.assign({}, q, { id: newId() })), staffIds: [ownerStaff.id],
    }, i)),
  ];
  try {
    await env.DB.batch(stmts);
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, '[domain]/' + slug.slug + ' is already taken.', { errors: { slug: '[domain]/' + slug.slug + ' is already taken.' } });
    throw e;
  }
  return json({ business: { id, slug: slug.slug, name } }, 201);
}

function serializeOwner(env, biz, parts) {
  const g = parts.google;
  return {
    business: {
      id: biz.id, slug: biz.slug, name: biz.name, website: biz.website, template: biz.template, currency: biz.currency,
      currencySymbol: currencySymbol(biz.currency), timezone: biz.timezone, accent: biz.accent, kind: biz.kind, place: biz.place,
      svcNoun: biz.svc_noun, staffNoun: biz.staff_noun, policy: biz.policy, depositPct: biz.deposit_pct, categories: biz.categories,
      settings: biz.settings,
    },
    services: parts.services, staff: parts.staff, hours: parts.hours, timeOff: parts.timeOff,
    google: {
      configured: googleConfigured(env), connected: !!g, email: g ? g.email : '', calendarId: g ? g.calendar_id : 'primary',
      blockBusy: g ? !!g.block_busy : true, twoWay: g ? !!g.two_way : true, addAnswers: g ? !!g.add_answers : false,
    },
    emailConfigured: emailConfigured(env),
  };
}

export async function getBusiness(env, request, id) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, id);
  return json(serializeOwner(env, biz, await loadParts(env, biz.id)));
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function updateBusiness(env, request, id) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, id);
  const body = await readJson(request);
  const set = {};
  if (body.name !== undefined) { const v = str(body.name, 120); if (!v) throw new HttpError(400, 'Enter your business name.'); set.name = v; }
  if (body.website !== undefined) set.website = str(body.website, 200);
  if (body.kind !== undefined) set.kind = str(body.kind, 80);
  if (body.place !== undefined) set.place = str(body.place, 160);
  if (body.policy !== undefined) set.policy = str(body.policy, 400);
  if (body.accent !== undefined) { if (!HEX.test(body.accent)) throw new HttpError(400, 'Choose a valid colour.'); set.accent = body.accent; }
  if (body.timezone !== undefined) { if (!isValidTimeZone(body.timezone)) throw new HttpError(400, 'Choose a time zone.'); set.timezone = body.timezone; }
  if (body.slug !== undefined && body.slug !== biz.slug) {
    const st = await slugStatus(env, body.slug, biz.id);
    if (st.status !== 'ok') throw new HttpError(400, st.message, { slugStatus: st });
    set.slug = st.slug;
  }
  if (body.settings) {
    const s = body.settings;
    const patch = {};
    if (s.interval !== undefined) patch.interval = int(s.interval, 5, 240, 30);
    if (s.notice !== undefined) patch.notice = int(s.notice, 0, 336, 2);
    if (s.advance !== undefined) patch.advance = int(s.advance, 1, 365, 60);
    for (const k of ['approval', 'staffStep', 'prices']) if (s[k] !== undefined) patch[k] = !!s[k];
    if (s.ownerEmail !== undefined) { const e = str(s.ownerEmail, 254); if (e && !isEmail(e)) throw new HttpError(400, 'Enter a valid email, like you@business.com.'); patch.ownerEmail = e; }
    if (s.fromName !== undefined) patch.fromName = str(s.fromName, 120);
    if (s.notify) {
      patch.notify = {};
      for (const k of ['newBooking', 'confirmation', 'changes', 'digest', 'followUp']) if (s.notify[k] !== undefined) patch.notify[k] = !!s.notify[k];
      if (s.notify.remind !== undefined) patch.notify.remind = ['24', '2', 'both', 'off'].indexOf(String(s.notify.remind)) >= 0 ? String(s.notify.remind) : '24';
    }
    set.settings = JSON.stringify(mergeSettings(biz.settings, patch));
  }
  const keys = Object.keys(set);
  if (keys.length) {
    try {
      await env.DB.prepare('UPDATE businesses SET ' + keys.map((k) => k + ' = ?').join(', ') + ' WHERE id = ?').bind(...keys.map((k) => set[k]), biz.id).run();
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'That address was just taken. Try another.');
      throw e;
    }
  }
  const fresh = await loadOwnedBusiness(env, user, id);
  return json(serializeOwner(env, fresh, await loadParts(env, fresh.id)));
}

// ---- Services

function cleanService(body, staffIds) {
  const s = {
    name: str(body.name, 120) || 'Untitled',
    category: str(body.category, 40) || '',
    duration: int(body.duration, 5, 24 * 60, 60),
    price: int(body.price, 0, 100000000, 0),
    fromPrice: !!body.fromPrice,
    buffer: int(body.buffer, 0, 240, 0),
    description: str(body.description, 600),
    active: body.active !== false,
    isPackage: !!body.isPackage,
    badge: str(body.badge, 40),
    meta: str(body.meta, 60),
    includes: (Array.isArray(body.includes) ? body.includes : []).map((x) => str(x, 120)).filter(Boolean).slice(0, 20),
    addons: (Array.isArray(body.addons) ? body.addons : []).slice(0, 20).map((a) => ({ id: str(a.id, 64) || newId(), name: str(a.name, 120) || 'Add-on', price: int(a.price, 0, 100000000, 0) })),
    questions: (Array.isArray(body.questions) ? body.questions : []).slice(0, 30).map((q) => ({
      id: str(q.id, 64) || newId(), label: str(q.label, 300) || 'Question',
      type: ['yesno', 'select', 'short', 'long'].indexOf(q.type) >= 0 ? q.type : 'short', req: !!q.req,
      options: (Array.isArray(q.options) ? q.options : []).map((o) => str(o, 80)).filter(Boolean).slice(0, 20),
    })),
    staffIds: (Array.isArray(body.staffIds) ? body.staffIds : []).filter((x) => staffIds.indexOf(x) >= 0),
  };
  if (s.isPackage) s.category = 'pkg';
  return s;
}

async function staffIdsOf(env, bizId) {
  const r = await env.DB.prepare('SELECT id FROM staff WHERE business_id = ?').bind(bizId).all();
  return r.results.map((x) => x.id);
}

export async function createService(env, request, bizId) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const s = cleanService(await readJson(request), await staffIdsOf(env, biz.id));
  s.id = newId();
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM services WHERE business_id = ?').bind(biz.id).first();
  await serviceInsert(env, biz.id, s, n.n).run();
  return json({ service: hydrateService(await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(s.id).first()) }, 201);
}

export async function updateService(env, request, bizId, sid) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const s = cleanService(await readJson(request), await staffIdsOf(env, biz.id));
  const r = await env.DB.prepare(
    `UPDATE services SET name = ?, category = ?, duration = ?, price = ?, from_price = ?, buffer = ?, description = ?, active = ?, is_package = ?,
     badge = ?, meta = ?, includes = ?, addons = ?, questions = ?, staff_ids = ? WHERE id = ? AND business_id = ?`,
  ).bind(s.name, s.category, s.duration, s.price, s.fromPrice ? 1 : 0, s.buffer, s.description, s.active ? 1 : 0, s.isPackage ? 1 : 0,
    s.badge, s.meta, JSON.stringify(s.includes), JSON.stringify(s.addons), JSON.stringify(s.questions), JSON.stringify(s.staffIds), sid, biz.id).run();
  if (!r.meta.changes) throw new HttpError(404, 'Service not found.');
  return json({ service: hydrateService(await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(sid).first()) });
}

export async function deleteService(env, request, bizId, sid) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  await env.DB.prepare('DELETE FROM services WHERE id = ? AND business_id = ?').bind(sid, biz.id).run();
  return json({ ok: true });
}

// ---- Staff

export async function createStaff(env, request, bizId) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const body = await readJson(request);
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM staff WHERE business_id = ?').bind(biz.id).first();
  const s = { id: newId(), name: str(body.name, 120) || 'New staff member', role: str(body.role, 80), color: STAFF_COLORS[n.n % STAFF_COLORS.length] };
  await staffInsert(env, biz.id, s, n.n).run();
  return json({ staff: (await loadParts(env, biz.id)).staff }, 201);
}

export async function updateStaff(env, request, bizId, stid) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const body = await readJson(request);
  await env.DB.prepare('UPDATE staff SET name = ?, role = ? WHERE id = ? AND business_id = ?')
    .bind(str(body.name, 120) || 'Staff member', str(body.role, 80), stid, biz.id).run();
  return json({ staff: (await loadParts(env, biz.id)).staff });
}

export async function deleteStaff(env, request, bizId, stid) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const parts = await loadParts(env, biz.id);
  if (parts.staff.length <= 1) throw new HttpError(400, 'Keep at least one staff member.');
  const stmts = [env.DB.prepare('DELETE FROM staff WHERE id = ? AND business_id = ?').bind(stid, biz.id)];
  for (const s of parts.services) {
    if (s.staffIds.indexOf(stid) >= 0) {
      stmts.push(env.DB.prepare('UPDATE services SET staff_ids = ? WHERE id = ?').bind(JSON.stringify(s.staffIds.filter((x) => x !== stid)), s.id));
    }
  }
  await env.DB.batch(stmts);
  const fresh = await loadParts(env, biz.id);
  return json({ staff: fresh.staff, services: fresh.services });
}

// ---- Hours and time off

export async function putHours(env, request, bizId) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const body = await readJson(request);
  const rows = Array.isArray(body.hours) ? body.hours : [];
  if (rows.length !== 7) throw new HttpError(400, 'Send all seven days.');
  const stmts = rows.map((h) => {
    const dow = int(h.dow, 0, 6, 0);
    const open = int(h.open, 0, 1439, 540);
    const close = int(h.close, 1, 1440, 1080);
    if (h.isOpen && close <= open) throw new HttpError(400, 'Closing time must be after opening time.');
    return env.DB.prepare('INSERT OR REPLACE INTO hours (business_id, dow, is_open, open_min, close_min) VALUES (?, ?, ?, ?, ?)')
      .bind(biz.id, dow, h.isOpen ? 1 : 0, open, close);
  });
  await env.DB.batch(stmts);
  return json({ hours: (await loadParts(env, biz.id)).hours });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function addTimeOff(env, request, bizId) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const body = await readJson(request);
  const a = String(body.startDate || ''), z = String(body.endDate || body.startDate || '');
  if (!DATE_RE.test(a) || !DATE_RE.test(z) || z < a) throw new HttpError(400, 'Choose a start and end date.');
  await env.DB.prepare('INSERT INTO time_off (id, business_id, start_date, end_date, note) VALUES (?, ?, ?, ?, ?)')
    .bind(newId(), biz.id, a, z, str(body.note, 120)).run();
  return json({ timeOff: (await loadParts(env, biz.id)).timeOff }, 201);
}

export async function deleteTimeOff(env, request, bizId, tid) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  await env.DB.prepare('DELETE FROM time_off WHERE id = ? AND business_id = ?').bind(tid, biz.id).run();
  return json({ timeOff: (await loadParts(env, biz.id)).timeOff });
}

// ---- Bookings

export async function listBookings(env, request, bizId) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const url = new URL(request.url);
  const from = Number(url.searchParams.get('from')) || Date.now() - 7 * 86400000;
  const to = Number(url.searchParams.get('to')) || from + 7 * 86400000;
  if (to - from > 100 * 86400000) throw new HttpError(400, 'Choose a shorter range.');
  const r = await env.DB.prepare('SELECT * FROM bookings WHERE business_id = ? AND start_utc >= ? AND start_utc < ? ORDER BY start_utc')
    .bind(biz.id, from, to).all();
  const pending = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings WHERE business_id = ? AND status = 'pending' AND end_utc > ?")
    .bind(biz.id, Date.now()).first();
  return json({ bookings: r.results.map(serializeBooking), pendingCount: pending.n });
}

const TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['cancelled', 'completed', 'no-show'],
  completed: ['no-show'],
  'no-show': ['completed'],
  cancelled: [],
};

export async function updateBooking(env, request, ctx, bizId, bid) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const body = await readJson(request);
  const b = await env.DB.prepare('SELECT * FROM bookings WHERE id = ? AND business_id = ?').bind(bid, biz.id).first();
  if (!b) throw new HttpError(404, 'Booking not found.');
  const now = Date.now();
  if (body.note !== undefined) {
    await env.DB.prepare('UPDATE bookings SET note = ?, updated_at = ? WHERE id = ?').bind(str(body.note, 2000), now, b.id).run();
  }
  if (body.status !== undefined && body.status !== b.status) {
    if ((TRANSITIONS[b.status] || []).indexOf(body.status) < 0) throw new HttpError(400, 'A ' + b.status + ' booking cannot be marked ' + body.status + '.');
    await env.DB.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').bind(body.status, now, b.id).run();
    const fresh = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(b.id).first();
    ctx.waitUntil(afterStatusChange(env, fresh, biz));
  }
  const out = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(b.id).first();
  return json({ booking: serializeBooking(out) });
}

// ---- Email and Google settings

export async function testEmail(env, request, bizId) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  if (!emailConfigured(env)) throw new HttpError(503, "Email sending isn't set up on this site yet.");
  const r = await sendTest(env, biz, user);
  if (!r.sent) throw new HttpError(502, "The email provider didn't accept the message. Check the sender settings.");
  return json({ ok: true, to: biz.settings.ownerEmail || user.email });
}

export async function updateGoogle(env, request, bizId) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const body = await readJson(request);
  const conn = await env.DB.prepare('SELECT * FROM google_connections WHERE business_id = ?').bind(biz.id).first();
  if (!conn) throw new HttpError(404, 'Google Calendar is not connected.');
  await env.DB.prepare('UPDATE google_connections SET calendar_id = ?, block_busy = ?, two_way = ?, add_answers = ? WHERE business_id = ?').bind(
    body.calendarId !== undefined ? str(body.calendarId, 300) || 'primary' : conn.calendar_id,
    body.blockBusy !== undefined ? (body.blockBusy ? 1 : 0) : conn.block_busy,
    body.twoWay !== undefined ? (body.twoWay ? 1 : 0) : conn.two_way,
    body.addAnswers !== undefined ? (body.addAnswers ? 1 : 0) : conn.add_answers,
    biz.id,
  ).run();
  return getBusiness(env, request, bizId);
}

export async function disconnectGoogle(env, request, bizId) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  await env.DB.prepare('DELETE FROM google_connections WHERE business_id = ?').bind(biz.id).run();
  return getBusiness(env, request, bizId);
}

export async function googleCalendars(env, request, bizId) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const conn = await env.DB.prepare('SELECT * FROM google_connections WHERE business_id = ?').bind(biz.id).first();
  if (!conn) return json({ calendars: [] });
  try {
    return json({ calendars: await listCalendars(env, conn) });
  } catch (e) {
    console.error(e && e.message);
    return json({ calendars: [], error: 'Could not load calendars from Google.' });
  }
}

// ---- Owner rescheduling

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function rescheduleSlots(env, biz, b, date) {
  const parts = await loadParts(env, biz.id);
  const svc = parts.services.find((x) => x.id === b.service_id);
  const duration = Math.round((b.end_utc - b.start_utc) / 60000);
  const buffer = Math.round((b.block_end_utc - b.end_utc) / 60000);
  const dayStart = zonedToUtc(date, 0, biz.timezone);
  const r = await env.DB.prepare("SELECT staff_id, start_utc, block_end_utc FROM bookings WHERE business_id = ? AND id != ? AND status IN ('pending', 'confirmed') AND block_end_utc > ? AND start_utc < ?")
    .bind(biz.id, b.id, dayStart - 86400000, dayStart + 2 * 86400000).all();
  const staffId = b.staff_id && parts.staff.some((x) => x.id === b.staff_id) ? b.staff_id : (parts.staff[0] && parts.staff[0].id);
  const avail = computeAvailability({
    // Owners can move a booking inside the minimum-notice window and beyond the booking window.
    business: { timezone: biz.timezone, settings: Object.assign({}, biz.settings, { notice: 0, advance: 365 }) },
    hours: parts.hours, timeOff: parts.timeOff,
    service: { duration: svc ? svc.duration : duration, buffer: svc ? svc.buffer : buffer, staffIds: [staffId] },
    staff: parts.staff, busy: r.results.map((x) => ({ staffId: x.staff_id, start: x.start_utc, end: x.block_end_utc })),
    now: Date.now(), from: date, to: date,
  });
  return { slots: (avail[staffId] && avail[staffId][date]) || [], staffId, duration: svc ? svc.duration : duration, buffer: svc ? svc.buffer : buffer };
}

export async function bookingSlots(env, request, bizId, bid) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const b = await env.DB.prepare('SELECT * FROM bookings WHERE id = ? AND business_id = ?').bind(bid, biz.id).first();
  if (!b) throw new HttpError(404, 'Booking not found.');
  const date = new URL(request.url).searchParams.get('date') || dateKeyInZone(b.start_utc, biz.timezone);
  if (!DAY_RE.test(date)) throw new HttpError(400, 'Choose a date.');
  const r = await rescheduleSlots(env, biz, b, date);
  const p = partsInZone(b.start_utc, biz.timezone);
  return json({ date, slots: r.slots, current: dateKeyInZone(b.start_utc, biz.timezone) === date ? p.min : null });
}

export async function rescheduleBooking(env, request, ctx, bizId, bid) {
  const user = await requireUser(env, request);
  const biz = await loadOwnedBusiness(env, user, bizId);
  const body = await readJson(request);
  const b = await env.DB.prepare('SELECT * FROM bookings WHERE id = ? AND business_id = ?').bind(bid, biz.id).first();
  if (!b) throw new HttpError(404, 'Booking not found.');
  if (['pending', 'confirmed'].indexOf(b.status) < 0) throw new HttpError(400, 'Only upcoming bookings can be moved.');
  const date = String(body.date || '');
  const minute = Number(body.time);
  if (!DAY_RE.test(date) || !Number.isInteger(minute)) throw new HttpError(400, 'Choose a new date and time.');
  const r = await rescheduleSlots(env, biz, b, date);
  if (r.slots.indexOf(minute) < 0) throw new HttpError(409, 'That time is no longer free. Pick another.');
  const start = zonedToUtc(date, minute, biz.timezone);
  const end = start + r.duration * 60000;
  try {
    await env.DB.prepare('UPDATE bookings SET start_utc = ?, end_utc = ?, block_end_utc = ?, staff_id = ?, updated_at = ? WHERE id = ?')
      .bind(start, end, end + r.buffer * 60000, r.staffId, Date.now(), b.id).run();
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'That time is no longer free. Pick another.');
    throw e;
  }
  const fresh = await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(b.id).first();
  ctx.waitUntil(afterReschedule(env, fresh, biz));
  return json({ booking: serializeBooking(fresh) });
}
