-- Digital Services Master Booking — initial schema (Cloudflare D1 / SQLite).
-- Times are stored as UTC epoch milliseconds. Prices are whole currency units.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT,
  google_sub TEXT UNIQUE,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- SHA-256 of the session token
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX login_attempts_key ON login_attempts(key, at);

CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  website TEXT,
  template TEXT NOT NULL,
  currency TEXT NOT NULL,
  timezone TEXT NOT NULL,
  accent TEXT NOT NULL DEFAULT '#5B4BDB',
  kind TEXT NOT NULL DEFAULT '',
  place TEXT NOT NULL DEFAULT '',
  svc_noun TEXT NOT NULL,
  staff_noun TEXT NOT NULL,
  any_name TEXT NOT NULL,
  any_role TEXT NOT NULL,
  staff_sub TEXT NOT NULL,
  policy TEXT NOT NULL,
  deposit_pct REAL NOT NULL DEFAULT 0,
  categories TEXT NOT NULL DEFAULT '[]',   -- JSON [[key, label], ...]
  settings TEXT NOT NULL DEFAULT '{}',     -- JSON, see worker/lib/defaults.js
  created_at INTEGER NOT NULL
);
CREATE INDEX businesses_owner ON businesses(owner_id);

CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX staff_business ON staff(business_id);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  from_price INTEGER NOT NULL DEFAULT 0,
  buffer INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  is_package INTEGER NOT NULL DEFAULT 0,
  badge TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '',
  includes TEXT NOT NULL DEFAULT '[]',     -- JSON [string]
  addons TEXT NOT NULL DEFAULT '[]',       -- JSON [{id, name, price}]
  questions TEXT NOT NULL DEFAULT '[]',    -- JSON [{id, label, type, req, options}]
  staff_ids TEXT NOT NULL DEFAULT '[]',    -- JSON [staff id]; empty = any staff
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX services_business ON services(business_id);

CREATE TABLE hours (
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  dow INTEGER NOT NULL,                    -- 0 = Sunday
  is_open INTEGER NOT NULL,
  open_min INTEGER NOT NULL,
  close_min INTEGER NOT NULL,
  PRIMARY KEY (business_id, dow)
);

CREATE TABLE time_off (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,                -- YYYY-MM-DD, business time
  end_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX time_off_business ON time_off(business_id);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  ref TEXT NOT NULL UNIQUE,
  business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id TEXT,
  service_name TEXT NOT NULL,
  staff_id TEXT,
  staff_name TEXT NOT NULL,
  start_utc INTEGER NOT NULL,
  end_utc INTEGER NOT NULL,
  block_end_utc INTEGER NOT NULL,          -- end + buffer
  status TEXT NOT NULL,                    -- pending | confirmed | completed | cancelled | no-show
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  sms INTEGER NOT NULL DEFAULT 0,
  answers TEXT NOT NULL DEFAULT '[]',      -- JSON [{q, a}]
  addons TEXT NOT NULL DEFAULT '[]',       -- JSON [{name, price}]
  total INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'Booking page',
  note TEXT NOT NULL DEFAULT '',
  gcal_event_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX bookings_business_time ON bookings(business_id, start_utc);
CREATE INDEX bookings_staff_time ON bookings(staff_id, start_utc);
-- Never two live bookings for the same staff member at the same start time.
CREATE UNIQUE INDEX bookings_no_double ON bookings(staff_id, start_utc) WHERE status IN ('pending', 'confirmed');

CREATE TABLE notifications_sent (
  booking_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (booking_id, kind)
);

CREATE TABLE digests_sent (
  business_id TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY (business_id, day)
);

CREATE TABLE google_connections (
  business_id TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  staff_id TEXT,
  email TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  block_busy INTEGER NOT NULL DEFAULT 1,
  two_way INTEGER NOT NULL DEFAULT 1,
  add_answers INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE oauth_states (
  state TEXT PRIMARY KEY,
  mode TEXT NOT NULL,                      -- login | calendar
  user_id TEXT,
  business_id TEXT,
  expires_at INTEGER NOT NULL
);

CREATE TABLE password_resets (
  id TEXT PRIMARY KEY,                     -- SHA-256 of the reset token
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
