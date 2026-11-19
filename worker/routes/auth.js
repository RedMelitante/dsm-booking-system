import { HttpError, json, readJson, str, isEmail, newId } from '../lib/http.js';
import {
  hashPassword, verifyPassword, createSession, destroySession, currentUser,
  checkLoginRate, recordLoginFailure, clearLoginFailures, requireUser, sha256, b64,
} from '../lib/auth.js';
import { sendEmail } from '../lib/email.js';
import { googleConfigured, authUrl, exchangeCode, userInfo } from '../lib/google.js';
import { initialsOf } from '../lib/db.js';

async function businessesOf(env, userId) {
  const r = await env.DB.prepare('SELECT id, name, slug, accent, website FROM businesses WHERE owner_id = ? ORDER BY created_at').bind(userId).all();
  return r.results.map((b) => Object.assign(b, { initials: initialsOf(b.name) }));
}

export async function me(env, request) {
  const user = await currentUser(env, request);
  return json({
    user: user ? { id: user.id, name: user.name, email: user.email } : null,
    businesses: user ? await businessesOf(env, user.id) : [],
    googleConfigured: googleConfigured(env),
  });
}

export async function signup(env, request) {
  const body = await readJson(request);
  const name = str(body.name, 120);
  const email = str(body.email, 254).toLowerCase();
  const password = String(body.password || '');
  const errors = {};
  if (!name) errors.name = 'Enter your name.';
  if (!email) errors.email = 'Enter your email address.';
  else if (!isEmail(email)) errors.email = 'Enter a valid email, like you@business.com.';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  if (password.length > 200) errors.password = 'Use 200 characters or fewer.';
  if (Object.keys(errors).length) throw new HttpError(400, 'Check the highlighted fields.', { errors });

  const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) throw new HttpError(409, 'An account already uses this email.', { errors: { email: 'An account already uses this email.' }, code: 'email_taken' });

  const id = newId();
  await env.DB.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, email, name, await hashPassword(password), Date.now()).run();
  const setCookie = await createSession(env, request, id, true);
  return json({ user: { id, name, email }, businesses: [] }, 201, { 'set-cookie': setCookie });
}

export async function login(env, request) {
  const body = await readJson(request);
  const email = str(body.email, 254).toLowerCase();
  const password = String(body.password || '');
  if (!isEmail(email) || !password) throw new HttpError(400, 'Enter your email and password.');
  const key = email + '|' + (request.headers.get('cf-connecting-ip') || '');
  await checkLoginRate(env, key);
  const user = await env.DB.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?').bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await recordLoginFailure(env, key);
    throw new HttpError(401, "That email and password don't match.", { code: 'bad_credentials' });
  }
  await clearLoginFailures(env, key);
  const setCookie = await createSession(env, request, user.id, body.remember !== false);
  return json({ user: { id: user.id, name: user.name, email: user.email }, businesses: await businessesOf(env, user.id) }, 200, { 'set-cookie': setCookie });
}

export async function logout(env, request) {
  return json({ ok: true }, 200, { 'set-cookie': await destroySession(env, request) });
}

// ---- Google OAuth

export async function googleStart(env, request) {
  if (!googleConfigured(env)) throw new HttpError(503, 'Google sign-in is not set up for this site yet.');
  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') === 'calendar' ? 'calendar' : 'login';
  let userId = null, businessId = null;
  if (mode === 'calendar') {
    const user = await requireUser(env, request);
    businessId = url.searchParams.get('business');
    const b = await env.DB.prepare('SELECT id FROM businesses WHERE id = ? AND owner_id = ?').bind(businessId, user.id).first();
    if (!b) throw new HttpError(404, 'Business not found.');
    userId = user.id;
  }
  const state = newId();
  await env.DB.prepare('INSERT INTO oauth_states (state, mode, user_id, business_id, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(state, mode, userId, businessId, Date.now() + 10 * 60000).run();
  return Response.redirect(authUrl(env, request, mode, state), 302);
}

const redirect = (to, headers = {}) => new Response(null, { status: 302, headers: Object.assign({ location: to }, headers) });

export async function googleCallback(env, request) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  const row = state ? await env.DB.prepare('SELECT * FROM oauth_states WHERE state = ?').bind(state).first() : null;
  if (state) await env.DB.prepare('DELETE FROM oauth_states WHERE state = ? OR expires_at < ?').bind(state, Date.now()).run();
  if (!row || row.expires_at < Date.now()) return redirect('/login?google=expired');
  if (!code) return redirect(row.mode === 'calendar' ? '/dashboard/integrations?google=cancelled' : '/login?google=cancelled');

  const tokens = await exchangeCode(env, request, code);
  const info = await userInfo(tokens.access_token);

  if (row.mode === 'calendar') {
    const user = await currentUser(env, request);
    if (!user || user.id !== row.user_id) return redirect('/login');
    if (!tokens.refresh_token) return redirect('/dashboard/integrations?google=no_refresh');
    const firstStaff = await env.DB.prepare('SELECT id FROM staff WHERE business_id = ? ORDER BY sort LIMIT 1').bind(row.business_id).first();
    await env.DB.prepare(
      `INSERT INTO google_connections (business_id, staff_id, email, refresh_token, calendar_id, created_at) VALUES (?, ?, ?, ?, 'primary', ?)
       ON CONFLICT(business_id) DO UPDATE SET email = excluded.email, refresh_token = excluded.refresh_token, staff_id = excluded.staff_id`,
    ).bind(row.business_id, firstStaff ? firstStaff.id : null, info.email, tokens.refresh_token, Date.now()).run();
    return redirect('/dashboard/integrations?google=connected');
  }

  if (!info.email_verified) return redirect('/login?google=unverified');
  const email = String(info.email).toLowerCase();
  let user = await env.DB.prepare('SELECT id FROM users WHERE google_sub = ?').bind(info.sub).first();
  if (!user) {
    user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (user) await env.DB.prepare('UPDATE users SET google_sub = ? WHERE id = ?').bind(info.sub, user.id).run();
  }
  if (!user) {
    user = { id: newId() };
    await env.DB.prepare('INSERT INTO users (id, email, name, google_sub, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(user.id, email, str(info.name, 120) || email.split('@')[0], info.sub, Date.now()).run();
  }
  const setCookie = await createSession(env, request, user.id, true);
  const hasBiz = await env.DB.prepare('SELECT id FROM businesses WHERE owner_id = ? LIMIT 1').bind(user.id).first();
  return redirect(hasBiz ? '/dashboard' : '/setup', { 'set-cookie': setCookie });
}

// ---- Password reset

export async function forgotPassword(env, request, ctx) {
  const body = await readJson(request);
  const email = str(body.email, 254).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'Enter a valid email, like you@business.com.');
  const key = 'reset|' + (request.headers.get('cf-connecting-ip') || '');
  await checkLoginRate(env, key);
  await recordLoginFailure(env, key); // counts requests, not failures
  const user = await env.DB.prepare('SELECT id, name FROM users WHERE email = ?').bind(email).first();
  if (user) {
    const token = b64(crypto.getRandomValues(new Uint8Array(32))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]);
    await env.DB.prepare('INSERT INTO password_resets (id, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), user.id, Date.now() + 3600000).run();
    const link = new URL('/reset-password?token=' + token, request.url).toString();
    ctx.waitUntil(sendEmail(env, {
      to: email, subject: 'Reset your Digital Services Master password', fromName: 'Digital Services Master',
      text: 'Hi ' + user.name + ',\n\nUse this link within an hour to choose a new password:\n' + link + '\n\nIf you did not ask for this, ignore this email.',
      html: '<p>Hi ' + user.name.replace(/[<>&]/g, '') + ',</p><p>Use this link within an hour to choose a new password:</p><p><a href="' + link + '">Choose a new password</a></p><p>If you did not ask for this, ignore this email.</p>',
    }));
  }
  // Same answer either way, so the form can't be used to find accounts.
  return json({ ok: true });
}

export async function resetPassword(env, request) {
  const body = await readJson(request);
  const token = String(body.token || '');
  const password = String(body.password || '');
  if (password.length < 8) throw new HttpError(400, 'Use at least 8 characters.', { errors: { password: 'Use at least 8 characters.' } });
  const id = await sha256(token);
  const row = await env.DB.prepare('SELECT * FROM password_resets WHERE id = ?').bind(id).first();
  if (!row || row.expires_at < Date.now()) throw new HttpError(400, 'This reset link has expired. Ask for a new one.', { code: 'expired' });
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(await hashPassword(password), row.user_id),
    env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(row.user_id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id),
  ]);
  const setCookie = await createSession(env, request, row.user_id, true);
  return json({ ok: true, businesses: await businessesOf(env, row.user_id) }, 200, { 'set-cookie': setCookie });
}
