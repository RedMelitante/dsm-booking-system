// Side effects after a booking is created or changes: emails and Google Calendar.
import { sendCustomerConfirmation, sendOwnerAlert, sendStatusChange, sendRescheduled } from './email.js';
import { upsertEvent, deleteEvent } from './google.js';

async function owner(env, biz) {
  return env.DB.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(biz.owner_id).first();
}

async function gcalSync(env, b, biz) {
  const conn = await env.DB.prepare('SELECT * FROM google_connections WHERE business_id = ?').bind(biz.id).first();
  if (!conn) return;
  try {
    if (b.status === 'cancelled' || b.status === 'no-show') {
      if (b.status === 'cancelled' && b.gcal_event_id) {
        await deleteEvent(env, conn, b.gcal_event_id);
        await env.DB.prepare('UPDATE bookings SET gcal_event_id = NULL WHERE id = ?').bind(b.id).run();
      }
      return;
    }
    const id = await upsertEvent(env, conn, b, biz);
    if (id && id !== b.gcal_event_id) await env.DB.prepare('UPDATE bookings SET gcal_event_id = ? WHERE id = ?').bind(id, b.id).run();
  } catch (e) {
    console.error('Google Calendar sync failed', e && e.message);
  }
}

export async function afterCreate(env, b, biz) {
  const o = await owner(env, biz);
  await Promise.allSettled([sendCustomerConfirmation(env, b, biz), sendOwnerAlert(env, b, biz, o), gcalSync(env, b, biz)]);
}

export async function afterStatusChange(env, b, biz) {
  const o = await owner(env, biz);
  await Promise.allSettled([sendStatusChange(env, b, biz, o), gcalSync(env, b, biz)]);
}

export async function afterReschedule(env, b, biz) {
  await Promise.allSettled([sendRescheduled(env, b, biz), gcalSync(env, b, biz)]);
}
