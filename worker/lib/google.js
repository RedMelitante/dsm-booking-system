// Google sign-in and Google Calendar (OAuth 2.0, no passwords stored).
// Configure GOOGLE_CLIENT_ID (var) and GOOGLE_CLIENT_SECRET (secret), and add
// https://<your host>/api/auth/google/callback as an authorized redirect URI.

export const googleConfigured = (env) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

const SCOPES = {
  login: 'openid email profile',
  calendar: 'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
};

export const redirectUri = (request) => new URL('/api/auth/google/callback', request.url).toString();

export function authUrl(env, request, mode, state) {
  const q = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(request),
    response_type: 'code',
    scope: SCOPES[mode],
    state,
    include_granted_scopes: 'true',
  });
  if (mode === 'calendar') {
    q.set('access_type', 'offline');
    q.set('prompt', 'consent');
  } else {
    q.set('prompt', 'select_account');
  }
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q.toString();
}

async function tokenRequest(env, params) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(Object.assign({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET }, params)),
  });
  if (!res.ok) throw new Error('Google token error ' + res.status + ': ' + (await res.text()));
  return res.json();
}

export const exchangeCode = (env, request, code) =>
  tokenRequest(env, { code, grant_type: 'authorization_code', redirect_uri: redirectUri(request) });

export async function userInfo(accessToken) {
  const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: 'Bearer ' + accessToken } });
  if (!res.ok) throw new Error('Google userinfo error ' + res.status);
  return res.json(); // { sub, email, email_verified, name }
}

const tokenCache = new Map();
export async function accessTokenFor(env, conn) {
  const hit = tokenCache.get(conn.business_id);
  if (hit && hit.exp > Date.now() + 60000 && hit.rt === conn.refresh_token) return hit.token;
  const t = await tokenRequest(env, { refresh_token: conn.refresh_token, grant_type: 'refresh_token' });
  tokenCache.set(conn.business_id, { token: t.access_token, exp: Date.now() + t.expires_in * 1000, rt: conn.refresh_token });
  return t.access_token;
}

async function gapi(env, conn, path, init = {}) {
  const token = await accessTokenFor(env, conn);
  const res = await fetch('https://www.googleapis.com/calendar/v3' + path, {
    ...init,
    headers: Object.assign({ authorization: 'Bearer ' + token, 'content-type': 'application/json' }, init.headers || {}),
  });
  if (res.status === 404 || res.status === 410) return { gone: true };
  if (!res.ok) throw new Error('Google Calendar ' + res.status + ': ' + (await res.text()));
  return res.status === 204 ? {} : res.json();
}

export async function listCalendars(env, conn) {
  const r = await gapi(env, conn, '/users/me/calendarList?minAccessRole=writer');
  return (r.items || []).map((c) => ({ id: c.id, name: c.summaryOverride || c.summary, primary: !!c.primary }));
}

// Busy intervals [{ start, end }] (UTC ms) on the connected calendar. Our own booking
// events are included, which is harmless: those times are already blocked by the booking.
export async function busyTimes(env, conn, fromMs, toMs) {
  const r = await gapi(env, conn, '/freeBusy', {
    method: 'POST',
    body: JSON.stringify({ timeMin: new Date(fromMs).toISOString(), timeMax: new Date(toMs).toISOString(), items: [{ id: conn.calendar_id }] }),
  });
  const cal = r.calendars && r.calendars[conn.calendar_id];
  return ((cal && cal.busy) || []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

function eventBody(b, biz, conn) {
  let description = 'Booking ' + b.ref + '\n' + (b.first_name + ' ' + b.last_name).trim() + ' · ' + b.email + (b.phone ? ' · ' + b.phone : '');
  if (conn.add_answers) {
    for (const a of JSON.parse(b.answers || '[]')) description += '\n' + a.q + ': ' + (a.a || '—');
  }
  return {
    summary: b.service_name + ' · ' + (b.first_name + ' ' + b.last_name).trim() + (b.status === 'pending' ? ' (pending)' : ''),
    description,
    location: biz.place || undefined,
    start: { dateTime: new Date(b.start_utc).toISOString() },
    end: { dateTime: new Date(b.end_utc).toISOString() },
    extendedProperties: { private: { dsmBookingRef: b.ref } },
    transparency: 'opaque',
  };
}

export async function upsertEvent(env, conn, b, biz) {
  const cal = encodeURIComponent(conn.calendar_id);
  if (b.gcal_event_id) {
    const r = await gapi(env, conn, '/calendars/' + cal + '/events/' + encodeURIComponent(b.gcal_event_id), { method: 'PATCH', body: JSON.stringify(eventBody(b, biz, conn)) });
    if (!r.gone) return b.gcal_event_id;
  }
  const r = await gapi(env, conn, '/calendars/' + cal + '/events', { method: 'POST', body: JSON.stringify(eventBody(b, biz, conn)) });
  return r.id;
}

export async function deleteEvent(env, conn, eventId) {
  if (!eventId) return;
  await gapi(env, conn, '/calendars/' + encodeURIComponent(conn.calendar_id) + '/events/' + encodeURIComponent(eventId), { method: 'DELETE' });
}

export async function getEvent(env, conn, eventId) {
  return gapi(env, conn, '/calendars/' + encodeURIComponent(conn.calendar_id) + '/events/' + encodeURIComponent(eventId));
}
