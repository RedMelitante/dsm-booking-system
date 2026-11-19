import { HttpError, parseCookies, cookie } from './http.js';

const ITER = 100000; // Workers' PBKDF2 maximum
const SESSION_COOKIE = 'dsm_session';
const DAY = 86400000;

export const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(password, salt, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await pbkdf2(password, salt, ITER);
  return 'pbkdf2$' + ITER + '$' + b64(salt) + '$' + b64(bits);
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [scheme, iter, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2') return false;
  const bits = new Uint8Array(await pbkdf2(password, unb64(salt), Number(iter)));
  const want = unb64(hash);
  if (bits.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ want[i];
  return diff === 0;
}

export async function sha256(text) {
  return b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

const secureCookies = (request) => new URL(request.url).protocol === 'https:';

// Creates a session and returns the Set-Cookie header value.
export async function createSession(env, request, userId, remember = true) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32)));
  const ttl = remember ? 30 * DAY : DAY;
  const now = Date.now();
  await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, now + ttl, now).run();
  return cookie(SESSION_COOKIE, token, { maxAge: remember ? ttl / 1000 : undefined, secure: secureCookies(request) });
}

export async function destroySession(env, request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await sha256(token)).run();
  return cookie(SESSION_COOKIE, '', { maxAge: 0, secure: secureCookies(request) });
}

export async function currentUser(env, request) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const row = await env.DB.prepare(
    'SELECT u.id, u.name, u.email, u.google_sub FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ?',
  ).bind(await sha256(token), Date.now()).first();
  return row || null;
}

export async function requireUser(env, request) {
  const user = await currentUser(env, request);
  if (!user) throw new HttpError(401, 'Log in to continue.');
  return user;
}

// Failed-login throttling: at most 10 failures per email+IP per 15 minutes.
const WINDOW = 15 * 60000;
export async function checkLoginRate(env, key) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at > ?')
    .bind(key, Date.now() - WINDOW).first();
  if (row && row.n >= 10) throw new HttpError(429, 'Too many attempts. Wait 15 minutes and try again.');
}
export async function recordLoginFailure(env, key) {
  await env.DB.prepare('INSERT INTO login_attempts (key, at) VALUES (?, ?)').bind(key, Date.now()).run();
}
export async function clearLoginFailures(env, key) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key),
    env.DB.prepare('DELETE FROM login_attempts WHERE at < ?').bind(Date.now() - WINDOW),
  ]);
}
