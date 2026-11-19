import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAvailability, pickStaff } from '../worker/lib/availability.js';
import { zonedToUtc, offsetMinutes, dateKeyInZone } from '../worker/lib/time.js';

const hours = [0, 1, 2, 3, 4, 5, 6].map((dow) => ({ dow, isOpen: dow >= 1 && dow <= 5, open: 540, close: 1080 }));
const business = { timezone: 'Asia/Manila', settings: { interval: 30, notice: 2, advance: 60 } };
const staff = [{ id: 'a' }, { id: 'b' }];
const svc = { duration: 60, buffer: 0, staffIds: [] };
// Wednesday 18 Nov 2026, 08:00 in Manila
const now = zonedToUtc('2026-11-18', 480, 'Asia/Manila');

test('time-zone conversion round-trips', () => {
  assert.equal(offsetMinutes(now, 'Asia/Manila'), 480);
  assert.equal(new Date(zonedToUtc('2026-11-18', 540, 'Asia/Manila')).toISOString(), '2026-11-18T01:00:00.000Z');
  assert.equal(dateKeyInZone(zonedToUtc('2026-11-18', 1439, 'Asia/Manila'), 'Asia/Manila'), '2026-11-18');
  // DST: 1:30 AM on 8 Mar 2026 in New York doesn't exist; 2026-07-01 is EDT (-240)
  assert.equal(offsetMinutes(zonedToUtc('2026-07-01', 600, 'America/New_York'), 'America/New_York'), -240);
});

test('slots fit inside hours, respect notice and closed days', () => {
  const out = computeAvailability({ business, hours, timeOff: [], service: svc, staff, busy: [], now, from: '2026-11-18', to: '2026-11-22' });
  // Today: notice pushes the first slot to 10:00 (08:00 + 2h); last start 17:00 so it ends by 18:00
  assert.equal(out.a['2026-11-18'][0], 600);
  assert.equal(out.a['2026-11-18'].at(-1), 1020);
  assert.equal(out.a['2026-11-19'][0], 540);
  assert.equal(out.a['2026-11-21'], undefined); // Saturday closed
  assert.equal(out.a['2026-11-22'], undefined); // Sunday closed
});

test('buffer must also fit before closing', () => {
  const out = computeAvailability({ business, hours, timeOff: [], service: { duration: 60, buffer: 30, staffIds: [] }, staff, busy: [], now, from: '2026-11-19', to: '2026-11-19' });
  assert.equal(out.a['2026-11-19'].at(-1), 990); // 16:30 + 60 + 30 = 18:00
});

test('bookings block their staff member only; time off blocks the day', () => {
  const start = zonedToUtc('2026-11-19', 600, 'Asia/Manila');
  const busy = [{ staffId: 'a', start, end: start + 60 * 60000 }];
  const out = computeAvailability({ business, hours, timeOff: [{ startDate: '2026-11-20', endDate: '2026-11-20' }], service: svc, staff, busy, now, from: '2026-11-19', to: '2026-11-20' });
  assert.ok(!out.a['2026-11-19'].includes(600));
  assert.ok(!out.a['2026-11-19'].includes(570)); // 9:30–10:30 overlaps
  assert.ok(out.a['2026-11-19'].includes(660));
  assert.ok(out.b['2026-11-19'].includes(600));
  assert.equal(out.a['2026-11-20'], undefined);
});

test('service staff restriction and Any assignment', () => {
  const out = computeAvailability({ business, hours, timeOff: [], service: { duration: 60, buffer: 0, staffIds: ['b'] }, staff, busy: [], now, from: '2026-11-19', to: '2026-11-19' });
  assert.equal(out.a, undefined);
  assert.equal(pickStaff(out, '2026-11-19', 540, ['a', 'b'], {}), 'b');
  const both = computeAvailability({ business, hours, timeOff: [], service: svc, staff, busy: [], now, from: '2026-11-19', to: '2026-11-19' });
  assert.equal(pickStaff(both, '2026-11-19', 540, ['a', 'b'], { a: 3, b: 1 }), 'b');
});

test('booking window is clamped to the advance setting', () => {
  const out = computeAvailability({ business: { timezone: 'Asia/Manila', settings: { interval: 30, notice: 2, advance: 3 } }, hours, timeOff: [], service: svc, staff, busy: [], now });
  assert.deepEqual(Object.keys(out.a), ['2026-11-18', '2026-11-19', '2026-11-20']);
});
