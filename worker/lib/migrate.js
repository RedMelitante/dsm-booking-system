// Applies the SQL files in migrations/ on first use, so a plain `wrangler deploy`
// (as run by Cloudflare's Git builds) is enough. Applied migrations are recorded
// in the same `d1_migrations` table `wrangler d1 migrations apply` uses, so the
// two approaches can be mixed.
import m0001 from '../../migrations/0001_init.sql';
import m0002 from '../../migrations/0002_demo_businesses.sql';

const MIGRATIONS = [
  ['0001_init.sql', m0001],
  ['0002_demo_businesses.sql', m0002],
];

// Strips `--` comments and splits on statement-ending semicolons.
export function splitSql(sql) {
  return sql
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function run(env) {
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)',
  ).run();
  const r = await env.DB.prepare('SELECT name FROM d1_migrations').all();
  const done = new Set(r.results.map((x) => x.name));
  for (const [name, sql] of MIGRATIONS) {
    if (done.has(name)) continue;
    const stmts = splitSql(sql).map((s) => env.DB.prepare(s));
    stmts.push(env.DB.prepare('INSERT INTO d1_migrations (name) VALUES (?)').bind(name));
    try {
      await env.DB.batch(stmts); // one transaction: all or nothing
      console.log('Applied migration', name);
    } catch (e) {
      // Another request may have applied it at the same moment.
      const again = await env.DB.prepare('SELECT 1 FROM d1_migrations WHERE name = ?').bind(name).first();
      if (!again) throw e;
    }
  }
}

let ready = null;
export function ensureSchema(env) {
  if (!ready) ready = run(env).catch((e) => { ready = null; throw e; });
  return ready;
}
