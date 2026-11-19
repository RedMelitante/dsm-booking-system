import { fmtWhen } from './time.js';

// Email via Resend (https://resend.com). Configure:
//   RESEND_API_KEY (secret)  — API key
//   EMAIL_FROM     (var)     — verified sender address, e.g. bookings@yourdomain.com
// Without them, emails are logged instead of sent and the API reports `emailConfigured: false`.

export const emailConfigured = (env) => !!(env.RESEND_API_KEY && env.EMAIL_FROM);

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function sendEmail(env, { to, subject, text, html, replyTo, fromName, attachments }) {
  if (!emailConfigured(env)) {
    console.log('[email not configured] to=%s subject=%s', to, subject);
    return { sent: false, reason: 'not_configured' };
  }
  const from = (fromName ? '"' + String(fromName).replace(/"/g, '') + '" ' : '') + '<' + env.EMAIL_FROM + '>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, html, reply_to: replyTo || undefined, attachments }),
  });
  if (!res.ok) {
    console.error('Resend error', res.status, await res.text());
    return { sent: false, reason: 'provider_error' };
  }
  return { sent: true };
}

const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = (s) => String(s || '').replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');

export function icsFor(b, biz, method = 'REQUEST') {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Digital Services Master//Booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:' + method,
    'BEGIN:VEVENT',
    'UID:' + b.ref + '@dsm-booking',
    'DTSTAMP:' + stamp(Date.now()),
    'DTSTART:' + stamp(b.start_utc),
    'DTEND:' + stamp(b.end_utc),
    'SUMMARY:' + icsEsc(b.service_name + ' · ' + biz.name),
    'DESCRIPTION:' + icsEsc('Booking reference ' + b.ref + '. ' + biz.policy),
    'LOCATION:' + icsEsc(biz.place),
    'STATUS:' + (b.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'),
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}

const toB64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};

function layout(title, rows, foot) {
  const table = rows.map(([k, v]) =>
    '<tr><td style="padding:8px 0;color:#5B616E;font-size:14px;vertical-align:top;width:120px">' + esc(k) + '</td>' +
    '<td style="padding:8px 0;color:#0F1115;font-size:14px;font-weight:600">' + esc(v).replace(/\n/g, '<br>') + '</td></tr>').join('');
  return '<div style="font-family:Inter,system-ui,sans-serif;background:#F7F7F8;padding:24px">' +
    '<div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E6E7EB;border-radius:16px;padding:28px">' +
    '<h1 style="margin:0 0 16px;font-size:22px;line-height:28px;color:#0F1115">' + esc(title) + '</h1>' +
    '<table style="width:100%;border-collapse:collapse">' + table + '</table>' +
    (foot ? '<p style="margin:16px 0 0;font-size:13px;line-height:18px;color:#5B616E">' + esc(foot) + '</p>' : '') +
    '</div><p style="text-align:center;font-size:12px;color:#5B616E">Powered by Digital Services Master</p></div>';
}
const textOf = (title, rows, foot) => [title, '', ...rows.map(([k, v]) => k + ': ' + v), '', foot || ''].join('\n');

function bookingRows(b, biz, staffNoun) {
  const rows = [
    ['Reference', b.ref],
    ['Service', b.service_name],
    [staffNoun || 'With', b.staff_name],
    ['When', fmtWhen(b.start_utc, biz.timezone) + ' (' + biz.timezone + ')'],
  ];
  if (biz.place) rows.push(['Where', biz.place]);
  return rows;
}

const ownerAddress = (biz, owner) => (biz.settings.ownerEmail || owner.email);
const fromNameOf = (biz) => biz.settings.fromName || biz.name;

export async function sendCustomerConfirmation(env, b, biz) {
  if (!biz.settings.notify.confirmation) return;
  const pending = b.status === 'pending';
  const title = pending ? 'Booking request received' : "You're booked";
  const rows = bookingRows(b, biz, biz.staff_noun);
  rows.push(['Status', pending ? 'Waiting for ' + biz.name + ' to confirm' : 'Confirmed']);
  return sendEmail(env, {
    to: b.email, subject: (pending ? 'Booking request: ' : 'Confirmed: ') + b.service_name + ' with ' + biz.name,
    html: layout(title, rows, biz.policy), text: textOf(title, rows, biz.policy),
    replyTo: biz.settings.ownerEmail || undefined, fromName: fromNameOf(biz),
    attachments: [{ filename: b.ref + '.ics', content: toB64(icsFor(b, biz)) }],
  });
}

export async function sendOwnerAlert(env, b, biz, owner) {
  if (!biz.settings.notify.newBooking) return;
  const rows = bookingRows(b, biz, biz.staff_noun);
  rows.push(['Customer', (b.first_name + ' ' + b.last_name).trim()], ['Email', b.email]);
  if (b.phone) rows.push(['Mobile', b.phone]);
  for (const a of JSON.parse(b.answers || '[]')) rows.push([a.q, a.a || '—']);
  const title = b.status === 'pending' ? 'New booking to confirm' : 'New booking';
  return sendEmail(env, {
    to: ownerAddress(biz, owner), subject: title + ': ' + b.first_name + ' · ' + b.service_name,
    html: layout(title, rows, 'Open your dashboard to manage this booking.'), text: textOf(title, rows),
    replyTo: b.email, fromName: 'Digital Services Master',
  });
}

export async function sendStatusChange(env, b, biz, owner) {
  if (!biz.settings.notify.changes) return;
  const map = { confirmed: 'Your booking is confirmed', cancelled: 'Your booking was cancelled' };
  const title = map[b.status];
  if (!title) return;
  const rows = bookingRows(b, biz, biz.staff_noun);
  const attachments = [{ filename: b.ref + '.ics', content: toB64(icsFor(b, biz, b.status === 'cancelled' ? 'CANCEL' : 'REQUEST')) }];
  await sendEmail(env, {
    to: b.email, subject: title + ' · ' + biz.name, html: layout(title, rows, biz.policy), text: textOf(title, rows, biz.policy),
    replyTo: biz.settings.ownerEmail || undefined, fromName: fromNameOf(biz), attachments,
  });
  if (b.status === 'cancelled') {
    const t2 = 'Booking cancelled';
    await sendEmail(env, { to: ownerAddress(biz, owner), subject: t2 + ': ' + b.first_name + ' · ' + b.service_name, html: layout(t2, rows), text: textOf(t2, rows), fromName: 'Digital Services Master' });
  }
}

export async function sendReminder(env, b, biz) {
  const title = 'Reminder: ' + b.service_name;
  const rows = bookingRows(b, biz, biz.staff_noun);
  return sendEmail(env, { to: b.email, subject: title + ' with ' + biz.name, html: layout(title, rows, biz.policy), text: textOf(title, rows, biz.policy), replyTo: biz.settings.ownerEmail || undefined, fromName: fromNameOf(biz) });
}

export async function sendFollowUp(env, b, biz) {
  const title = 'Thanks for visiting ' + biz.name;
  const foot = 'We hope to see you again. Reply to this email if there is anything we can do better.';
  return sendEmail(env, { to: b.email, subject: title, html: layout(title, [['Service', b.service_name]], foot), text: textOf(title, [['Service', b.service_name]], foot), replyTo: biz.settings.ownerEmail || undefined, fromName: fromNameOf(biz) });
}

export async function sendDigest(env, biz, owner, bookings) {
  const title = "Today's bookings · " + biz.name;
  const rows = bookings.length
    ? bookings.map((b) => [fmtWhen(b.start_utc, biz.timezone).split(', ').pop(), b.first_name + ' ' + b.last_name + ' · ' + b.service_name + (b.status === 'pending' ? ' (pending)' : '')])
    : [['', 'No bookings today.']];
  return sendEmail(env, { to: ownerAddress(biz, owner), subject: title, html: layout(title, rows), text: textOf(title, rows), fromName: 'Digital Services Master' });
}

export async function sendTest(env, biz, owner) {
  const title = 'Test email from your booking page';
  const rows = [['Business', biz.name], ['Sender name', fromNameOf(biz)]];
  return sendEmail(env, { to: ownerAddress(biz, owner), subject: title, html: layout(title, rows, 'Email notifications are working.'), text: textOf(title, rows), fromName: fromNameOf(biz) });
}

export async function sendRescheduled(env, b, biz) {
  if (!biz.settings.notify.changes) return;
  const title = 'Your booking has moved';
  const rows = bookingRows(b, biz, biz.staff_noun);
  return sendEmail(env, {
    to: b.email, subject: title + ' · ' + biz.name, html: layout(title, rows, biz.policy), text: textOf(title, rows, biz.policy),
    replyTo: biz.settings.ownerEmail || undefined, fromName: fromNameOf(biz),
    attachments: [{ filename: b.ref + '.ics', content: toB64(icsFor(b, biz)) }],
  });
}
