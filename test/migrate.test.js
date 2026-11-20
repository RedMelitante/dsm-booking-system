import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// splitSql is re-implemented here because migrate.js imports .sql files, which
// only the Workers bundler understands. Keep the two in sync.
const src = fs.readFileSync(new URL('../worker/lib/migrate.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('export function splitSql'), src.indexOf('async function run'));
const splitSql = new Function(body.replace('export ', '') + '\nreturn splitSql;')();

test('migration files split into whole statements', () => {
  const init = splitSql(fs.readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  assert.ok(init.length > 15);
  for (const s of init) assert.match(s, /^(CREATE|INSERT|DELETE)/);
  assert.ok(init.some((s) => s.startsWith('CREATE UNIQUE INDEX bookings_no_double') && s.includes("WHERE status IN ('pending', 'confirmed')")));
  const cleanup = splitSql(fs.readFileSync(new URL('../migrations/0003_remove_demo_data.sql', import.meta.url), 'utf8'));
  assert.ok(cleanup.length >= 10 && cleanup.every((s) => s.startsWith('DELETE FROM')));
  assert.ok(!fs.existsSync(new URL('../migrations/0002_demo_businesses.sql', import.meta.url)), 'no seed migration');
});
