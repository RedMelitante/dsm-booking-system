# Digital Services Master — Booking

A multi-industry, multi-website booking system: marketing site, sign-up and setup, an owner dashboard, and a public booking page per business that can also be embedded on any website. The frontend is built from the Claude Design handoff in [`design/handoff/`](design/handoff/README.md) and deploys to **Cloudflare Workers** as static assets.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build in dist/
npm run cf:dev       # build, then serve dist/ with wrangler (Workers runtime)
npm run deploy       # build, then deploy to Cloudflare Workers
```

`npm run deploy` needs a Cloudflare account (`npx wrangler login` once). The app runs on the Worker's free `workers.dev` address until a custom domain is attached.

## Routes

| Route | Screen |
|---|---|
| `/` | Marketing homepage |
| `/signup`, `/login` | Create account, log in (validation and error states) |
| `/setup` | Two-step business setup (name + booking URL, template + region) |
| `/dashboard`, `/dashboard/{bookings,services,availability,booking-page,integrations}` | Owner dashboard; each tab has its own URL |
| `/[business-slug]` | Public booking page (service → staff → date & time → details → confirmation) |
| `/[business-slug]?embed=true` | Embed view for iframes. Deep links: `&service=[id]`, `&staff=[id]`, `&hide_staff=1` |
| `/embed.js` | Host-site script: auto-resizes inline iframes, powers `<button data-book="[slug]">` popups |
| `/embed-demo` | The booking page embedded in an example client website |
| `/styleguide` | Design tokens and component states |

Demo business slugs: `lumen-skin-studio`, `brightside-dental`, `snapshot-booth-co`.

## Project layout

```
design/handoff/        Claude Design handoff pack, kept as delivered (specs, flows, tokens, sample data, canvas boards)
design/tools/          Script that produced the first port of the canvas boards into src/pages
public/                Static files served as-is: embed.js, _headers, favicon, robots.txt
src/App.jsx            Route table, page titles, embed height reporting
src/pages/             One component per design board (see below), plus NotFoundPage
src/lib/               Router, time-zone clock, calendar links (.ics / Google), reserved slugs, demo businesses
src/styles/tokens.css  Design tokens from the handoff (fonts are loaded in index.html)
src/styles/base.css    Document defaults, per-page link colours, focus rings
src/data/              Demo businesses JSON from the handoff, for seeding the backend
wrangler.jsonc         Workers config: serves dist/ with single-page-app fallback
```

### How the pages relate to the design

Each file in `src/pages/` is a direct port of one canvas board in `design/handoff/canvas-source/`:

| Board | Page |
|---|---|
| `Home.dc.html` (+ `HomePhone`) | `HomePage.jsx` |
| `Signup.dc.html` (+ `Login`, phone variants) | `AuthPage.jsx` (`mode="Sign up"` / `"Log in"`) |
| `Onboarding.dc.html` (+ phone) | `SetupPage.jsx` |
| `Main.dc.html` (+ `BookingPhone`) | `BookingPage.jsx` |
| `Dashboard.dc.html` | `DashboardPage.jsx` |
| `Embed.dc.html` | `EmbedDemoPage.jsx` |
| `Tokens.dc.html` | `StyleguidePage.jsx` |

Markup, inline styles and copy are carried over as designed, and each page keeps its board's own logic class (the design canvas used a React-compatible component model). The phone boards are not separate pages: every page measures its own width and switches to the phone layout below the design's breakpoints (760px for the booking page, homepage and dashboard; 600px for auth and setup).

Changes made on top of the boards:

- **Booking page**: availability is computed from the real current date and time in the business's time zone (the prototype was pinned to 19 Nov 2026), with the 2-hour minimum notice. The slot time zone defaults to the visitor's browser zone. "Add to Google Calendar" and "Apple / Outlook (.ics)" produce working links. Embed deep links are supported.
- **Dashboard**: tabs map to `/dashboard/*` sub-routes and follow the browser back button; "View booking page", "Open", and the customer email and phone links work.
- **Setup**: reserved slugs come from the single list in `src/lib/reserved.js`; the time zone defaults to the browser's zone.
- **Embed demo**: shows the real `?embed=true` page in an iframe, resized by `/embed.js`.
- **404 page** for unknown slugs, built from the auth page shell.

`design/tools/convert-canvas.mjs` generated the first version of these pages. They have been edited since, so don't re-run it over `src/pages/`. If the design changes, convert the board to a scratch folder and merge the diff by hand.

## Not built yet (needs the backend)

The handoff covers the frontend only. These parts still run on demo data in the browser:

- Accounts and sessions. Sign-up and log-in validate on the client and then go to `/setup` or `/dashboard`. The login error banner and the duplicate-email message (`taken@example.com`) are demo states.
- Slug availability in setup checks a fixed demo list instead of the database.
- Businesses, services, staff, bookings and dashboard edits live in component state. The dashboard week shows the sample week of 16–21 Nov 2026.
- Confirmation and alert emails, Google Calendar OAuth and sync, and payments.

Seed data for the API is in `src/data/demo-businesses.json`. Routes, validation messages and booking rules are specified in `design/handoff/flows-and-rules.md`.

## Open decisions (from the handoff)

- Domain: shown as `[domain]` throughout the UI.
- Pro plan price (`[Price]`) and the final Free vs Pro split.
- Email provider for Workers, and whether customers can reschedule or cancel from the confirmation email.
