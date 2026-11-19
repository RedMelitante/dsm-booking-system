# Routes, flows and rules

This is the behaviour behind the designs: what each route is, how screens connect, and the validation and booking rules the prototype already follows. Hand it to whoever builds the Cloudflare Workers app (you, Codex or another developer) alongside `design-prompt.md`.

`[domain]` is a placeholder until a domain is chosen. While building, the Worker can run on its free `workers.dev` address; a custom domain can be attached later without changing any routes.

## Routes

| Route | Screen | Who sees it |
|---|---|---|
| `/` | Marketing homepage | Public |
| `/signup` | Create account | Public |
| `/login` | Log in | Public |
| `/setup` | 2-step business setup | New owner, first login only |
| `/dashboard` | Owner dashboard (tabs below) | Logged-in owner |
| `/dashboard/bookings` | Week calendar / list + booking drawer | Owner |
| `/dashboard/services` | Services, packages, add-ons, custom questions | Owner |
| `/dashboard/availability` | Weekly hours, booking rules, time off, staff schedules | Owner |
| `/dashboard/booking-page` | Public link, embed code, branding | Owner |
| `/dashboard/integrations` | Google Calendar and email notifications | Owner |
| `/[business-slug]` | Public booking page (5 steps) | Customers |
| `/[business-slug]?embed=true` | Same flow, stripped for iframes | Customers on a client's website |
| `/embed.js` | Script that resizes the iframe and powers the popup button | Client websites |

The dashboard sub-routes are a suggestion; the prototype switches tabs inside one page.

### Reserved slugs

Because business pages live at the top level (`[domain]/[slug]`), these can never be claimed as a business address: `admin`, `api`, `app`, `book`, `dashboard`, `login`, `signup`, `setup`, `help`, `www`, `demo`, `test`, `embed.js`, plus any future top-level route (`pricing`, `privacy`, `terms`, `blog`, `docs`, `status`). Keep this list in one place in the code.

## User flows

1. **New business**: `/` → "Start free" or "Create your booking page" → `/signup` → `/setup` step 1 → step 2 → `/dashboard`.
2. **Returning owner**: `/` → "Log in" → `/login` → `/dashboard`.
3. **Customer, direct**: shared link `[domain]/[slug]` → steps 1–5 → confirmation email + `.ics`.
4. **Customer, on a client site**: client page with the iframe → same 5 steps inside the iframe → confirmation.
5. **Owner, after a booking**: email alert → `/dashboard` → booking drawer → Confirm (if manual approval is on) → customer gets the confirmation.

## Sign up & log in rules

- **Sign up**: name required ("Enter your name."); email required and must look like an email ("Enter a valid email, like you@business.com."); duplicate email → "An account already uses this email." + "Log in instead" link; password at least 8 characters ("Use at least 8 characters.").
- **Password strength meter** (sign-up only): one point each for 8+ characters, a number, upper + lower case, and 12+ characters or a symbol. Under 8 characters always shows "Too short". Labels: Too short / Weak / Fair / Good / Strong; bar colour red (0–1), amber (2), green (3–4).
- **Log in**: email format check; password required ("Enter your password."); wrong credentials → banner "That email and password don't match. Try again or reset your password." Editing email or password clears the banner. Rate-limit failed attempts on the server.
- Errors appear only after the first submit, then update live as the user types.
- "Continue with Google" uses Google sign-in (OAuth). For calendar sync, ask for calendar access later, from the Calendar & email tab, not at sign-up.

## Business setup rules

- **Business name**: required ("Enter your business name.").
- **Slug** auto-fills from the name (lower case, non-letters/numbers become `-`, max 40) until the owner edits it by hand. Allowed characters: `a–z`, `0–9`, `-`. Minimum 3 characters.
- **Slug status messages**: empty → "Pick a short web address for your page." · too short → "Use at least 3 characters." · reserved → "That address is reserved. Try another." · taken → "[domain]/[slug] is already taken." with suggestions `[slug]-ph`, `[slug]-bookings`, `[slug]-2` · OK → "[domain]/[slug] is available." Check availability against the database as the owner types (debounced).
- **Template**: Clinics & Medical, Salons & Wellness, Events & Rentals, or Start from scratch. A template pre-loads 3 sample services, 3 intake questions and the staff label; scratch creates none. All of it is editable later.
- **Currency** (PHP, AUD, USD, SGD, NZD, GBP) and **time zone** (default from the browser) are required; both have defaults.
- Finishing creates the business, its booking page, default weekly hours and the template data, then opens `/dashboard`.

## Public booking flow rules

- **Step gating**: Continue is disabled until the step is complete — a service (step 1), a staff/resource choice or "Any" (step 2), a start time (step 3), and the required fields (step 4). A helper line under the button says what's missing.
- **Changing an earlier choice** (service or staff) clears the chosen time, because availability depends on both.
- **Packages and add-ons**: add-ons only appear for the selected package and add to the total live.
- **Availability**: a start time is offered only if it fits fully inside opening hours for the service's duration plus buffer, respects minimum notice (default 2 hours) and the booking window (default 60 days), and at least one eligible staff member/resource is free. "Any" = free if any eligible staff member is free. Taken times are hidden, not greyed. Days with no times are disabled in the calendar.
- **First visit to step 3** selects the first available date automatically.
- **Time zones**: store everything in UTC. Show the slot list in the visitor's chosen time zone (default: browser), group slots into Morning (< 12:00), Afternoon (12:00–16:59) and Evening (17:00+), and label any slot that falls on another calendar day with "next day" / "previous day". When the visitor's zone differs from the business's, show the notice bar and add "[Business] local time: …" to the summary. In the real build, compute the calendar grid itself in the visitor's zone too (the prototype keeps it in business time).
- **Step 4**: first name and email required; owner-defined questions marked required must be answered; booking-policy checkbox required. Yes/No and multiple-choice questions render as single-select chips.
- **Confirmation**: reference number, email to the customer with an `.ics` attachment, alert email to the owner, event added to the linked Google Calendar.
- **Deposits** (events template): show "30% deposit (amount) due after the business confirms" in the summary. Taking payment is not in scope yet.

## Booking statuses

`pending` (manual approval on) → `confirmed` → `completed`, or `cancelled` / `no-show`. Week view: pending = dashed amber border; cancelled and no-show = grey with strikethrough. Drawer actions: pending → Confirm / Decline; confirmed → Reschedule / Cancel; past → Book again.

## Embed

- `?embed=true` removes the header, footer and grey page background, forces the compact stepper and the bottom summary bar, and drops the outer max-width.
- `embed.js` listens for `postMessage` height events from the iframe and resizes it, so there is no inner scrollbar.
- Optional deep-link parameters: `&service=[id]`, `&staff=[id]`, `&hide_staff=1`.
- Modes offered in the dashboard: Inline iframe, Popup button (`<button data-book="[slug]">`), plain Link.

## Google Calendar & email

- Google Calendar connects per staff member with Google sign-in (OAuth), never an email password. Options: target calendar, block busy times (busy events hide slots), two-way sync (moving or deleting the event updates the booking), add customer answers to the event description.
- Email notifications: new-booking alert to the owner, customer confirmation with `.ics`, reschedule/cancellation notices to both sides, optional daily agenda at 7:00 AM, optional follow-up 2 hours after the visit, reminders 24 hours / 2 hours / both / off before the booking. Sender name = business name; replies go to the owner's address.

## Open decisions

- Domain (currently `[domain]`).
- Pro price (`[Price]` / month) and the Free vs Pro split. The prototype assumes Free = 1 page, 1 staff calendar, up to 3 custom questions; Pro = unlimited pages and staff, packages/add-ons/deposits, custom domain, no "Powered by" badge.
- Email sending provider for Workers.
- Whether customers can reschedule or cancel themselves from the confirmation email.
- Overlapping bookings in the week view (side-by-side lanes) are specified but not drawn in the prototype.
