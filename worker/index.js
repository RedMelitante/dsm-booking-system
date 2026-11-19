// Cloudflare Worker entry: JSON API under /api/*, static app for everything else.
import { HttpError, errorResponse, checkOrigin } from './lib/http.js';
import * as auth from './routes/auth.js';
import * as owner from './routes/owner.js';
import * as pub from './routes/public.js';
import { runScheduled } from './cron.js';

const routes = [
  ['GET', '/api/auth/me', (e, r) => auth.me(e, r)],
  ['POST', '/api/auth/signup', (e, r) => auth.signup(e, r)],
  ['POST', '/api/auth/login', (e, r) => auth.login(e, r)],
  ['POST', '/api/auth/logout', (e, r) => auth.logout(e, r)],
  ['POST', '/api/auth/forgot', (e, r, c) => auth.forgotPassword(e, r, c)],
  ['POST', '/api/auth/reset', (e, r) => auth.resetPassword(e, r)],
  ['GET', '/api/auth/google/start', (e, r) => auth.googleStart(e, r)],
  ['GET', '/api/auth/google/callback', (e, r) => auth.googleCallback(e, r)],

  ['GET', '/api/slugs/:slug', (e, r, c, p) => owner.checkSlug(e, r, p.slug)],
  ['POST', '/api/businesses', (e, r) => owner.createBusiness(e, r)],
  ['GET', '/api/businesses/:id', (e, r, c, p) => owner.getBusiness(e, r, p.id)],
  ['PATCH', '/api/businesses/:id', (e, r, c, p) => owner.updateBusiness(e, r, p.id)],
  ['POST', '/api/businesses/:id/services', (e, r, c, p) => owner.createService(e, r, p.id)],
  ['PUT', '/api/businesses/:id/services/:sid', (e, r, c, p) => owner.updateService(e, r, p.id, p.sid)],
  ['DELETE', '/api/businesses/:id/services/:sid', (e, r, c, p) => owner.deleteService(e, r, p.id, p.sid)],
  ['POST', '/api/businesses/:id/staff', (e, r, c, p) => owner.createStaff(e, r, p.id)],
  ['PUT', '/api/businesses/:id/staff/:sid', (e, r, c, p) => owner.updateStaff(e, r, p.id, p.sid)],
  ['DELETE', '/api/businesses/:id/staff/:sid', (e, r, c, p) => owner.deleteStaff(e, r, p.id, p.sid)],
  ['PUT', '/api/businesses/:id/hours', (e, r, c, p) => owner.putHours(e, r, p.id)],
  ['POST', '/api/businesses/:id/time-off', (e, r, c, p) => owner.addTimeOff(e, r, p.id)],
  ['DELETE', '/api/businesses/:id/time-off/:tid', (e, r, c, p) => owner.deleteTimeOff(e, r, p.id, p.tid)],
  ['GET', '/api/businesses/:id/bookings', (e, r, c, p) => owner.listBookings(e, r, p.id)],
  ['PATCH', '/api/businesses/:id/bookings/:bid', (e, r, c, p) => owner.updateBooking(e, r, c, p.id, p.bid)],
  ['GET', '/api/businesses/:id/bookings/:bid/slots', (e, r, c, p) => owner.bookingSlots(e, r, p.id, p.bid)],
  ['POST', '/api/businesses/:id/bookings/:bid/reschedule', (e, r, c, p) => owner.rescheduleBooking(e, r, c, p.id, p.bid)],
  ['POST', '/api/businesses/:id/test-email', (e, r, c, p) => owner.testEmail(e, r, p.id)],
  ['PATCH', '/api/businesses/:id/google', (e, r, c, p) => owner.updateGoogle(e, r, p.id)],
  ['DELETE', '/api/businesses/:id/google', (e, r, c, p) => owner.disconnectGoogle(e, r, p.id)],
  ['GET', '/api/businesses/:id/google/calendars', (e, r, c, p) => owner.googleCalendars(e, r, p.id)],

  ['GET', '/api/public/:slug', (e, r, c, p) => pub.getPublic(e, r, p.slug)],
  ['GET', '/api/public/:slug/availability', (e, r, c, p) => pub.getAvailability(e, r, p.slug)],
  ['POST', '/api/public/:slug/bookings', (e, r, c, p) => pub.createBooking(e, r, c, p.slug)],
].map(([method, pattern, handler]) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  return { method, re, keys, handler };
});

async function handleApi(request, env, ctx) {
  const url = new URL(request.url);
  let pathMatched = false;
  for (const r of routes) {
    const m = r.re.exec(url.pathname);
    if (!m) continue;
    pathMatched = true;
    if (r.method !== request.method) continue;
    const params = {};
    r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
    checkOrigin(request);
    return r.handler(env, request, ctx, params);
  }
  throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'Method not allowed.' : 'Not found.');
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, ctx);
      } catch (e) {
        return errorResponse(e);
      }
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduled(env));
  },
};
