export class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || {};
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, headers),
  });
}

export function errorResponse(e) {
  if (e instanceof HttpError) return json(Object.assign({ error: e.message }, e.extra), e.status);
  console.error(e && e.stack ? e.stack : e);
  return json({ error: 'Something went wrong. Please try again.' }, 500);
}

export async function readJson(request) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new HttpError(415, 'Send JSON.');
  try {
    return await request.json();
  } catch (e) {
    throw new HttpError(400, 'Invalid JSON.');
  }
}

export function parseCookies(request) {
  const out = {};
  const raw = request.headers.get('cookie') || '';
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

export function cookie(name, value, { maxAge, secure = true } = {}) {
  let c = name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; SameSite=Lax';
  if (secure) c += '; Secure';
  if (maxAge !== undefined) c += '; Max-Age=' + maxAge;
  return c;
}

// Cookie-authenticated writes must come from our own pages.
export function checkOrigin(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return;
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'Cross-site request blocked.');
}

export const str = (v, max = 500) => String(v == null ? '' : v).trim().slice(0, max);
export const int = (v, min, max, dflt) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
};
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
export const newId = () => crypto.randomUUID();
