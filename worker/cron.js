// Runs every 15 minutes (see wrangler.jsonc triggers).
import { hydrateBusiness } from './lib/db.js';
import { sendReminder, sendFollowUp, sendDigest } from './lib/email.js';
import { getEvent } from './lib/google.js';
import { partsInZone, dateKeyInZone, zonedToUtc, addDays } from './lib/time.js';
import { afterStatusChange } from './lib/sync.js';

const H = 3600000;

async function once(env, bookingId, kind, fn) {
  const r = await env.DB.prepare('INSERT OR IGNORE INTO notifications_sent (booking_id, kind, at) VALUES (?, ?, ?)').bind(bookingId, kind, Date.now()).run();
  if (r.meta.changes) await fn();
}

async function bizCache(env) {
  const cache = new Map();
  return async (id) => {
    if (!cache.has(id)) cache.set(id, hydrateBusiness(await env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(id).first()));
    return cache.get(id);
  };
}

export async function runScheduled(env) {
  const now = Date.now();
  const getBiz = await bizCache(env);

  // 1. Past confirmed bookings become completed.
  await env.DB.prepare("UPDATE bookings SET status = 'completed', updated_at = ? WHERE status = 'confirmed' AND end_utc < ?").bind(now, now).run();

  // 2. Reminders 24 hours and/or 2 hours before.
  const upcoming = await env.DB.prepare("SELECT * FROM bookings WHERE status = 'confirmed' AND start_utc > ? AND start_utc <= ?").bind(now, now + 24 * H).all();
  for (const b of upcoming.results) {
    const biz = await getBiz(b.business_id);
    if (!biz) continue;
    const when = biz.settings.notify.remind;
    const left = b.start_utc - now;
    const lead = b.start_utc - b.created_at;
    if ((when === '24' || when === 'both') && left > 2 * H && lead > 26 * H) await once(env, b.id, 'rem24', () => sendReminder(env, b, biz));
    if ((when === '2' || when === 'both') && left <= 2 * H && lead > 4 * H) await once(env, b.id, 'rem2', () => sendReminder(env, b, biz));
  }

  // 3. Follow-up email 2 hours after the visit.
  const done = await env.DB.prepare("SELECT * FROM bookings WHERE status = 'completed' AND end_utc <= ? AND end_utc > ?").bind(now - 2 * H, now - 8 * H).all();
  for (const b of done.results) {
    const biz = await getBiz(b.business_id);
    if (biz && biz.settings.notify.followUp) await once(env, b.id, 'followup', () => sendFollowUp(env, b, biz));
  }

  // 4. Daily agenda at 7:00 AM business time.
  const all = await env.DB.prepare('SELECT * FROM businesses').all();
  for (const row of all.results) {
    const biz = hydrateBusiness(row);
    if (!biz.settings.notify.digest) continue;
    const p = partsInZone(now, biz.timezone);
    if (p.hour < 7) continue;
    const day = dateKeyInZone(now, biz.timezone);
    const ins = await env.DB.prepare('INSERT OR IGNORE INTO digests_sent (business_id, day) VALUES (?, ?)').bind(biz.id, day).run();
    if (!ins.meta.changes) continue;
    const from = zonedToUtc(day, 0, biz.timezone), to = zonedToUtc(addDays(day, 1), 0, biz.timezone);
    const list = await env.DB.prepare("SELECT * FROM bookings WHERE business_id = ? AND status IN ('pending', 'confirmed') AND start_utc >= ? AND start_utc < ? ORDER BY start_utc").bind(biz.id, from, to).all();
    const owner = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(biz.owner_id).first();
    await sendDigest(env, biz, owner, list.results);
  }

  // 5. Two-way Google Calendar sync: moved or deleted events update the booking.
  const conns = await env.DB.prepare('SELECT * FROM google_connections WHERE two_way = 1').all();
  for (const conn of conns.results) {
    const biz = await getBiz(conn.business_id);
    if (!biz) continue;
    const list = await env.DB.prepare("SELECT * FROM bookings WHERE business_id = ? AND gcal_event_id IS NOT NULL AND status IN ('pending', 'confirmed') AND start_utc > ? AND start_utc < ? LIMIT 100")
      .bind(biz.id, now, now + 30 * 24 * H).all();
    for (const b of list.results) {
      try {
        const ev = await getEvent(env, conn, b.gcal_event_id);
        if (ev.gone || ev.status === 'cancelled') {
          await env.DB.prepare("UPDATE bookings SET status = 'cancelled', gcal_event_id = NULL, updated_at = ? WHERE id = ?").bind(now, b.id).run();
          await afterStatusChange(env, Object.assign({}, b, { status: 'cancelled', gcal_event_id: null }), biz);
          continue;
        }
        const s = Date.parse(ev.start && ev.start.dateTime), e = Date.parse(ev.end && ev.end.dateTime);
        if (s && e && (s !== b.start_utc || e !== b.end_utc)) {
          const buffer = b.block_end_utc - b.end_utc;
          await env.DB.prepare('UPDATE bookings SET start_utc = ?, end_utc = ?, block_end_utc = ?, updated_at = ? WHERE id = ?').bind(s, e, e + buffer, now, b.id).run();
        }
      } catch (err) {
        console.error('Two-way sync failed for', b.ref, err && err.message);
      }
    }
  }

  // 6. Housekeeping.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM oauth_states WHERE expires_at < ?').bind(now),
  ]);
}
