# Digital Services Master — Booking

A multi-industry, multi-website booking system. Business owners sign up, set up a booking page, manage services, staff, hours and bookings in a dashboard, and share a link or embed the booking flow on any website. Customers book in four steps and get a confirmation email with a calendar file.

The whole app runs on **Cloudflare Workers**: a Worker serves the JSON API and the built React app, with a **D1** (SQLite) database. The UI is built from the Claude Design handoff in [`design/handoff/`](design/handoff/README.md).

## Quick start (local)

```bash
npm install
npm run db:migrate:local     # create the local D1 database
npm run db:seed:local        # optional: the three demo businesses from the design
npm run cf:dev               # build + run the Worker at http://localhost:8787
```

For frontend work with hot reload, run `npx wrangler dev` in one terminal and `npm run dev` in another (Vite on :5173 proxies `/api` to the Worker).

```bash
npm test                     # availability and time-zone unit tests
```

## Deploy to Cloudflare

1. Log in and create the database:
   ```bash
   npx wrangler login
   ```
   ```bash
   npx wrangler d1 create dsm-booking
   ```
   Copy the printed `database_id` into `wrangler.jsonc`.
2. Optional settings (see the table below): set `EMAIL_FROM` and `GOOGLE_CLIENT_ID` in `wrangler.jsonc`, then add the secrets:
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```
   ```bash
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```
3. Deploy (builds, applies migrations to the remote database, deploys the Worker):
   ```bash
   npm run deploy
   ```
4. Optional: load the demo businesses so the homepage's "Try the demo booking page" works:
   ```bash
   npm run db:seed:remote
   ```

The app works without email or Google configured: emails are logged instead of sent, and the Google sign-in button and Calendar connect button are hidden.

### Configuration

| Name | Kind | Purpose |
|---|---|---|
| `DB` | D1 binding | The database (`wrangler.jsonc`) |
| `EMAIL_FROM` | var | Verified sender address for [Resend](https://resend.com), e.g. `bookings@yourdomain.com`. Emails show the business name as the sender name; replies go to the owner. |
| `RESEND_API_KEY` | secret | Resend API key |
| `GOOGLE_CLIENT_ID` | var | Google OAuth client (Google sign-in and Google Calendar) |
| `GOOGLE_CLIENT_SECRET` | secret | Google OAuth client secret. Add `https://<your host>/api/auth/google/callback` as an authorized redirect URI and enable the Google Calendar API. |

For local secrets, copy `.dev.vars.example` to `.dev.vars`.

A cron trigger runs every 15 minutes (`worker/cron.js`). It sends reminders, the 7:00 AM daily agenda and follow-up emails, marks past bookings completed, and runs the two-way Google Calendar sync.

## What it does

**Owners**
- Sign up and log in with email and password (PBKDF2-hashed), or with Google. Sessions are HttpOnly cookies. Failed logins are rate-limited, and passwords can be reset by email.
- Two-step setup: the business name and booking address are checked against the database as you type (reserved words, taken addresses with suggestions). Then choose a template (clinic, salon, events, or blank), currency and time zone. The template creates sample services, intake questions, default hours and a staff member.
- Dashboard (each tab has its own URL):
  - **Bookings**: real week calendar and list, with week navigation, staff filter, overlapping bookings in lanes, and closed hours hatched. The booking drawer has confirm, decline, cancel, reschedule (shows only free times), private notes and "book again".
  - **Services & packages**: create, edit, hide and delete services and packages, with add-ons, staff assignment and per-service intake questions (short answer, paragraph, yes/no, multiple choice with options).
  - **Availability**: weekly hours, start-time interval, minimum notice, booking window, time zone, manual approval, time off with dates, and adding, renaming or removing staff.
  - **Booking page & embed**: change the address, copy the link and embed code (inline iframe, popup button, link), accent colour, and the show-staff-step and show-prices settings.
  - **Calendar & email**: connect Google Calendar (target calendar, block busy times, two-way sync, add answers to events), email notification toggles, reminder timing, owner alert address, sender name, and a test email.
- Several businesses per account (business switcher, "Add a business or website").

**Customers**
- `/[business-slug]`: service, staff, date and time, details, confirmation. Times come from the server, which checks opening hours, duration plus buffer, minimum notice, the booking window, time off, other bookings and Google busy times.
- Times are shown in the visitor's time zone, with the business's local time when the two differ.
- Bookings are re-checked on submit. Two customers can't take the same slot: the database enforces it, and the second person is sent back to pick another time.
- Confirmation email with an `.ics` file, plus "Add to Google Calendar" and `.ics` download links. If the owner turned on manual approval, the booking is shown as pending.
- Embed with `?embed=true` (deep links `&service=`, `&staff=`, `&hide_staff=1`). `/embed.js` resizes inline iframes and powers `<button data-book="[slug]">` popups.

## Project layout

```
worker/index.js         Worker entry: /api routes, static assets, cron
worker/routes/          auth.js (accounts, sessions, Google, password reset), owner.js (dashboard API), public.js (booking page API)
worker/lib/             availability, time zones, auth, email (Resend + .ics), Google OAuth/Calendar, side effects, defaults/templates
worker/cron.js          Reminders, daily agenda, follow-ups, completion, two-way calendar sync
migrations/             D1 schema
scripts/seed-demo.mjs   SQL for the three demo businesses (from src/data/demo-businesses.json)
test/                   Unit tests (node --test)
src/App.jsx             Routes, auth guards, data loading
src/pages/              One page per design board, plus 404 and password reset
src/components/Shell.jsx  Auth-card shell for screens not in the handoff (404, reset, loading, errors)
src/lib/                API client, router, clock and time-zone helpers, calendar links, reserved slugs
public/                 embed.js, _headers, favicon, robots.txt
design/handoff/         The design handoff pack as delivered
```

The pages in `src/pages/` started as direct ports of the canvas boards (markup, inline styles and copy kept as designed). They now load from and save to the API. A few screens the handoff didn't draw (password reset, 404, loading) use the auth card's look, and the dashboard gained small forms in the same style for time-off dates, staff, answer options and rescheduling.

## API

All JSON under `/api`. Owner endpoints need the session cookie; writes from other origins are rejected.

| | |
|---|---|
| `POST /auth/signup`, `/auth/login`, `/auth/logout`, `GET /auth/me` | Accounts and sessions |
| `POST /auth/forgot`, `/auth/reset` | Password reset |
| `GET /auth/google/start?mode=login\|calendar`, `/auth/google/callback` | Google OAuth |
| `GET /slugs/:slug` | Address availability |
| `POST /businesses`, `GET\|PATCH /businesses/:id` | Business setup and settings |
| `/businesses/:id/services[/:sid]`, `/staff[/:sid]`, `/hours`, `/time-off[/:tid]` | Dashboard editing |
| `GET /businesses/:id/bookings?from&to`, `PATCH /bookings/:bid`, `GET /bookings/:bid/slots`, `POST /bookings/:bid/reschedule` | Bookings |
| `POST /businesses/:id/test-email`, `PATCH\|DELETE /businesses/:id/google`, `GET /businesses/:id/google/calendars` | Email and Google Calendar |
| `GET /public/:slug`, `GET /public/:slug/availability?service=`, `POST /public/:slug/bookings` | Public booking page |

## Not built yet

- Customers can't reschedule or cancel themselves yet (an open decision in the handoff). The confirmation tells them to reply to the email, which reaches the business.
- Logo uploads (needs file storage such as R2). Booking pages show the business initials in the accent colour.
- Breaks within a day and per-staff custom hours. Staff use the business hours.
- Online deposits and payments, SMS reminders, Outlook calendar and webhooks (the dashboard's "Later" strip).
- Plan limits and billing for Free vs Pro (the price is still an open decision). Every account currently has Pro features.
- Two-way Google sync checks upcoming events every 15 minutes rather than using push notifications.
