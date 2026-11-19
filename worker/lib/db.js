import { HttpError } from './http.js';
import { mergeSettings, CURRENCIES } from './defaults.js';

const parse = (s, d) => {
  try { return s ? JSON.parse(s) : d; } catch (e) { return d; }
};

export function initialsOf(name) {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  return w.length ? (w[0].charAt(0) + (w[1] ? w[1].charAt(0) : '')).toUpperCase() : '?';
}

export function hydrateBusiness(row) {
  if (!row) return null;
  return Object.assign({}, row, { settings: mergeSettings(parse(row.settings, {})), categories: parse(row.categories, []) });
}

export function hydrateService(r) {
  return {
    id: r.id, name: r.name, category: r.category, duration: r.duration, price: r.price, fromPrice: !!r.from_price,
    buffer: r.buffer, description: r.description, active: !!r.active, isPackage: !!r.is_package, badge: r.badge, meta: r.meta,
    includes: parse(r.includes, []), addons: parse(r.addons, []), questions: parse(r.questions, []), staffIds: parse(r.staff_ids, []), sort: r.sort,
  };
}

export async function loadBusinessBySlug(env, slug) {
  return hydrateBusiness(await env.DB.prepare('SELECT * FROM businesses WHERE slug = ?').bind(String(slug).toLowerCase()).first());
}

export async function loadOwnedBusiness(env, user, id) {
  const row = await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(id).first();
  if (!row || row.owner_id !== user.id) throw new HttpError(404, 'Business not found.');
  return hydrateBusiness(row);
}

export async function loadParts(env, bizId) {
  const [staff, services, hours, timeOff, google] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM staff WHERE business_id = ? ORDER BY sort, name').bind(bizId),
    env.DB.prepare('SELECT * FROM services WHERE business_id = ? ORDER BY is_package, sort, created_at').bind(bizId),
    env.DB.prepare('SELECT * FROM hours WHERE business_id = ? ORDER BY dow').bind(bizId),
    env.DB.prepare('SELECT * FROM time_off WHERE business_id = ? ORDER BY start_date').bind(bizId),
    env.DB.prepare('SELECT * FROM google_connections WHERE business_id = ?').bind(bizId),
  ]);
  return {
    staff: staff.results.map((s) => ({ id: s.id, name: s.name, role: s.role, color: s.color, initials: initialsOf(s.name), sort: s.sort })),
    services: services.results.map(hydrateService),
    hours: hours.results.map((h) => ({ dow: h.dow, isOpen: !!h.is_open, open: h.open_min, close: h.close_min })),
    timeOff: timeOff.results.map((t) => ({ id: t.id, startDate: t.start_date, endDate: t.end_date, note: t.note })),
    google: google.results[0] || null,
  };
}

export const currencySymbol = (code) => CURRENCIES[code] || '';

export function serializeBooking(b) {
  return {
    id: b.id, ref: b.ref, serviceId: b.service_id, serviceName: b.service_name, staffId: b.staff_id, staffName: b.staff_name,
    start: b.start_utc, end: b.end_utc, status: b.status, firstName: b.first_name, lastName: b.last_name, email: b.email,
    phone: b.phone, answers: parse(b.answers, []), addons: parse(b.addons, []), total: b.total, source: b.source, note: b.note,
    createdAt: b.created_at,
  };
}
