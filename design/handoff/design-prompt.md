# Digital Services Master Booking — UI/UX Design Prompt

Paste everything below the line into Claude Design (or any design or code generator), together with `tokens/tokens.css`. Routes, validation rules and sample data are in `flows-and-rules.md` and `sample-data/`.

---

## ROLE & GOAL

Design the frontend for **Digital Services Master**, a white-label, multi-industry, multi-website booking platform that will run on Cloudflare Workers. One app serves many businesses and websites:

- Marketing homepage at `/`
- Sign up at `/signup`, Log in at `/login`, first-login Business setup at `/setup`
- Owner dashboard at `/dashboard`
- Each business's public booking page at `/[business-slug]`
- An iframe version of that page at `/[business-slug]?embed=true`

No domain has been chosen yet: write it as `[domain]` everywhere (for example `[domain]/lumen-skin-studio`).

Blend three references: **Fresha's** clean, mobile-first service → staff flow; **Odoo Appointments'** two-column calendar + time-slot layout; and **EventDeskly's** packages, add-ons and custom intake questions. Use industry-neutral building blocks (service/package, staff/resource, questions) so one layout works for clinics, salons and event rentals; only the labels change (Professional / Dentist / Booth).

## BRAND

- Product name: **Digital Services Master**. Wordmark in Plus Jakarta Sans 800, 17px (15px on phone).
- Logo: 32px ink (#0F1115) rounded tile (radius 9) with a white calendar-with-check stroke icon.
- The app shell is neutral. Each business brings its own accent colour and logo to its booking page.

## VISUAL STYLE

Calm, neutral app shell where the only colour is the business's accent. Light theme, white cards on a soft grey canvas, 1px borders instead of shadows, generous whitespace. No gradients, no emoji, no left-border accent cards. Inline stroke icons, 1.75–2px, rounded caps, 16–20px.

## COLOUR TOKENS

- `--ink #0F1115` text, primary buttons · `--ink-2 #2B2F36` form labels · `--body #4A505C` descriptions · `--muted #5B616E` meta and captions (≥4.5:1 on white and canvas)
- `--border #D9DBE1` inputs, time slots · `--line #E6E7EB` card borders · `--divider #EEEFF2`
- `--subtle #F1F1F4` chips, active nav · `--canvas #F7F7F8` page background · `--surface #FFFFFF`
- `--accent`: set per business, default `#5B4BDB` · `--accent-soft`: accent at 9% over white · text on accent switches to ink when the accent's luminance is above 0.45
- Success `#0B6B45` on `#E7F6EE` · Warning `#8A4A06` on `#FEF3E2` · Danger `#A12A20` on `#FDECEA` · Notice bg `#FEF6E7` / border `#F6E2B8` · Required asterisk and error borders `#C2362B`
- Status pills: Confirmed = success, Pending = warning, Completed = `#3F4450` on `#EEEFF2`, Cancelled and No-show = danger.

## TYPOGRAPHY

Headings: Plus Jakarta Sans 800, letter-spacing −0.015em. UI and body: Inter 400–700, tabular figures for prices and times.

Marketing H1 56/62 (36/42 phone) · Marketing H2 38/46 (28/34 phone) · Display 28/34 · H1 26/32 (22 phone) · H2 20/26 · Title 15/20 700 · Body 15/22 · Small 13/18 500 · Label 12/16 700 uppercase +0.06em · Form inputs 16px (prevents iOS zoom).

## SPACING & SHAPE

- 4px grid: 4, 8, 12, 16, 20, 24, 32, 48. Page padding 16–20 phone / 32 desktop; card padding 16–20 (auth and setup cards 32); section gaps 12–20; marketing sections 96px vertical (56 phone).
- Radius: inputs, buttons, time slots 10 · primary CTA and calendar day cells 12 · service cards 14 · panels and cards 16 · marketing panels 20 · final CTA band 24 · chips and pills fully round.
- Elevation: none on cards. Floating summary and preview cards: `0 1px 2px rgba(16,17,21,.04), 0 8px 24px rgba(16,17,21,.06)`. Drawer: `-12px 0 40px rgba(16,17,21,.16)`.
- Touch targets ≥44px; primary CTA 48–52px tall.

## COMPONENTS

- Primary button: ink fill, white text. Disabled: `#E6E7EB` fill, `#6B7280` text, with a helper line underneath saying what's missing.
- Secondary button: white with 1px `--border`. Danger: text-only in danger red.
- Category chip: 40px pill; selected = ink fill, white text.
- Selectable card (service, staff, answer chip, template): white + `--line`. Selected = accent-soft fill + 1px accent border + 1px accent ring (no layout shift); a check replaces the plus.
- Time slot: 44px, r10, `--border`; selected = accent fill. Taken slots are hidden, never greyed. If the visitor's time zone pushes a slot past midnight, add a 10px "next day" sub-label.
- Calendar day cell: 44px. Available = ink 600 + 4px accent dot · Today = 1px `--border` ring · Selected = accent fill with white dot · Unavailable = `#A9AEB8` 400, disabled.
- Text field: 48px, r10, 1px `--border`. Error = `#C2362B` border + `0 0 0 3px rgba(194,54,43,.12)` ring + 13px danger message with an alert icon underneath. Success (e.g. URL available) = green border + green check message.
- Error banner: `#FDECEA` fill, `#F5C6C0` border, r12, alert icon, `#7A1F17` text.
- Switch: 44×26, on = accent, off = `#8C929C`. Status pill: 12px 700, padding 3×10.
- Segmented control: `#EEEFF2` track, white selected segment with a 1px shadow.

## RESPONSIVE (MOBILE FIRST)

Design at 390px first. Below about 760px the booking summary becomes a sticky bottom bar (total + selection on the left, CTA on the right). Above it, the summary is a sticky 300–380px right sidebar beside a fluid content column, max container 1160px (1200px on the marketing site). Use flex-wrap so columns stack naturally. Dashboard: 248px sidebar + fluid main; under 760px the sidebar becomes a wrapping row of nav buttons above the content. Wide tables and the week grid scroll sideways inside their own box. Marketing nav on phone: logo + wordmark + menu button; links, Log in and "Start free" move into the menu.

## ACCESSIBILITY

Real buttons, inputs and labels. `aria-pressed` on selectable cards and chips, `aria-current` on the active step and nav item, `role="switch"` on toggles, `role="tab"`/`tablist` for the industry tabs, `aria-invalid` + `aria-describedby` on fields with errors, `role="alert"` on error banners, visible focus rings, text ≥4.5:1, never colour alone for state.

---

# SCREENS

## 1. MARKETING HOMEPAGE — `/`

- **Top navigation** (sticky, white, bottom border): logo + "Digital Services Master", anchor links Features · Industries · Embed · Pricing, "Log in" text link, primary "Start free" button.
- **Hero** (canvas-grey background): pill "For clinics, salons and event businesses"; H1 "Launch a booking page or embed a scheduler on your website in minutes."; supporting paragraph; a claim field `[domain]/` + slug input with the primary button "Create your booking page"; three green-check points (Free plan · Works on any website · Google Calendar sync); text link "Or try the demo booking page".
  Right side: "Live preview · try it" label above an interactive mini booking card (business header; 1 · Service list; 2 · Day strip of 5 days; 3 · Time grid; footer with total + "Book now"). Booking shows a mini "You're booked" confirmation with "Try it again".
- **Industry showcase** (`#industries`): centred eyebrow, H2 "One booking system, shaped to your industry". Segmented tabs with icons: Clinics & Medical · Salons & Wellness · Events & Rentals. The panel shows a description, four checklist points of what the template sets up, chips (staff label, demo business), and a link to the demo — next to a mini booking card for that industry's demo business in its own accent colour (Brightside Dental Care blue, Lumen Skin Studio violet, Snapshot Booth Co. raspberry), with a sample intake question and, for events, a deposit line.
- **Features** (`#features`, grey band), three cards, each with a small visual, icon tile, title, paragraph and three checks:
  1. Shareable link & 1-line website embed — URL pill + dark code snippet of the `?embed=true` iframe.
  2. Two-way Google Calendar sync — mini timeline with hatched "Busy · from Google Calendar" blocks around an accent "Booking" block; "No email password required" (Google sign-in/OAuth).
  3. Custom intake questions & instant email alerts — a question with Yes/No chips + an owner alert email row with an `.ics` tag.
- **Embed** (`#embed`): H2 "One line of code. Any website.", three numbered steps, link to the embed demo; dark code card with a Copy button; platform chips (WordPress, Wix, Squarespace, Webflow, Astro, Plain HTML).
- **Pricing** (`#pricing`, grey band): Free card (0 / forever, "Start free") and Pro card (`[Price]` / month, ink border + ring, "For growing teams" pill, "Choose Pro"). Comparison table: booking pages, staff, link and embed, email alerts, Google Calendar sync, custom questions, packages/add-ons/deposits, custom domain + no badge.
- **Final CTA**: ink band (radius 24) "Ready to take bookings?" with white "Create your booking page" button and outlined "Log in".
- **Footer**: brand column, Product / Get started / Company link columns, "© 2026 Digital Services Master. All rights reserved."

## 2. SIGN UP & LOG IN — `/signup`, `/login`

Canvas-grey page, small header (logo linking home; "Already have an account? Log in" / "New here? Create an account" on the right — shortened to "Log in" / "Sign up" on phone), one centred white card (max 440px, r16, 1px line), small footer.

- Card: H1 ("Create your account" / "Welcome back") + one-line sub; "Continue with Google" secondary button; divider "or use your email"; fields; full-width primary submit ("Create account" / "Log in"); legal line on sign-up; switch link at the bottom.
- Sign-up fields: Your name, Work email, Password with show/hide eye button and a 4-segment strength meter (Too short / Weak / Fair / Good / Strong).
- Log-in fields: Email, Password with "Forgot password?" link, "Keep me logged in on this device" checkbox.
- **Error states**: per-field inline errors on submit; duplicate email shows "An account already uses this email. Log in instead"; wrong credentials show the error banner "That email and password don't match. Try again or reset your password." Typing in email or password clears the banner.
- Success: sign-up goes to `/setup`; log-in goes to `/dashboard`.

## 3. BUSINESS SETUP — `/setup` (first login, before `/dashboard`)

Canvas-grey page, header with logo and "Log out", "Step N of 2 · …" label with a 2-segment progress bar, one white card (max 680px).

- **Step 1 · Your business**: Business name* (auto-fills the URL until the user edits it); Booking page address* = `[domain]/` prefix + slug input with live status (neutral hint → green "is available" → red "already taken" with suggestion chips like `-ph`, `-bookings`, `-2`, or reserved/too-short errors); Your website (optional); a live preview of the page header (initials tile, name, URL). "Continue" validates and shows errors.
- **Step 2 · Template & region**: three template cards (radio group) — Clinics & Medical, Salons & Wellness, Events & Rentals — each with icon, description, sample-service chips and "3 intake questions · staff called …"; "Start from scratch instead" option; Currency select (PHP, AUD, USD, SGD, NZD, GBP); Time zone select (detected from the browser); a "Here's what we'll set up" summary. "Back" + "Create my booking page" → `/dashboard`. No template chosen shows "Choose a template, or start from scratch."

## 4. PUBLIC BOOKING PAGE — `/[business-slug]`

Desktop shell: white header with a 48px accent logo tile (initials or logo), business name (H2), "type • address" line, time-zone chip. Stepper of numbered pills (Service · Staff · Date & time · Details; completed steps clickable; back arrow). Two columns: fluid content + sticky Booking Summary card (logo, name, address; service + add-ons; staff; date and time, plus business-local time if the visitor's zone differs; Total; deposit line where relevant; CTA; policy text). Footer "Powered by Digital Services Master · Privacy · Terms".
Phone shell: compact header (back button, 40px logo, name, address), "STEP 2 OF 4 · STAFF" label + 4-segment progress bar, single column, sticky bottom bar with total + Continue.

- **Step 1 — Service / package**: H1 + helper. Horizontally scrolling category chips. Service cards: name, optional "Package · 3 sessions" pill, clock + duration, 2-line description, price right-aligned ("Free", "from ₱1,800"), round +/✓. Packages list what's included; a selected package expands "Customize with add-ons" checkboxes that update the total live. Single select.
- **Step 2 — Staff / resource**: card grid (2 columns phone, 3–4 desktop). "Any professional · Most availability" first, then 56px colour avatar, name, role, green "Next: Today, 2:00 PM" pill from real availability. The owner can hide this step.
- **Step 3 — Calendar + time slots**: Time zone select with globe icon (defaults to the visitor's browser zone) and a notice bar when it differs from the business's. Two cards side by side (stacked on phone): monthly calendar (prev/next, Sun–Sat, 44px day cells with dots, legend) and the slots panel for the selected day ("Thursday, 19 November" · "14 start times available", grouped Morning / Afternoon / Evening, auto-fill grid min 92px). The first available date is selected on entry.
- **Step 4 — Your details + custom questions**: First name* + Last name, Email*, Mobile with country code. "Questions from [Business]" card: Yes/No and multiple choice as pill chips, short answer as input, paragraph as textarea, required ones marked *. Checkboxes: booking policy (required) and SMS reminder. CTA "Confirm booking", helper "Fill in the required fields (*) to continue."
- **Step 5 — Confirmation**: green check circle, "You're booked", "A confirmation is on its way to [email]", reference pill; details card (Service, Staff, When, Where, Total); "Add to Google Calendar" and "Apple / Outlook (.ics)"; Reschedule · Cancel booking links; "Book another appointment".

## 5. EMBED VIEW — `/[business-slug]?embed=true`

Same component with no header, footer or grey canvas; compact stepper with the back button inside it; summary always in the sticky bottom bar; 16–24px padding; works from 320 to 760px wide. Companion `embed.js` resizes the iframe from postMessage height events, supports deep links (`&service=`, `&staff=`, `&hide_staff=1`) and a popup-button mode.

## 6. OWNER DASHBOARD — `/dashboard`

Shell: white 248px sidebar — logo + wordmark; business/website switcher (avatar, name, domain; popover lists all businesses + "Add a business or website"); nav: Bookings (pending badge), Services & packages, Availability, Booking page & embed, Calendar & email; bottom: "View booking page ↗" and the signed-in user. Main: H1 + subtitle + tab actions.

- **Bookings**: four stat cards (Today, This week, Awaiting confirmation, Booked value); week navigation + range; staff filter chips; Week | List toggle. Week view: 60px per hour, hour lines, tinted today column with a red current-time line, hatched closed hours, staff-coloured booking blocks (pending dashed amber, cancelled/no-show grey + strikethrough), overlapping bookings in side-by-side lanes. List view grouped by day. Clicking a booking opens a 420px right drawer (status, reference, contact links, details, intake answers, private note; Confirm/Decline, Reschedule/Cancel or Book again). Empty-week state with a button to the link and embed code.
- **Services & packages**: list (name, "60 min · ₱2,800 · 2 staff", visibility switch) + editor (name, category, duration, price, buffer, description, staff chips, package contents and editable add-ons, custom-question builder with drag handle, question, answer type, Required switch, delete, "+ Add question"; Delete / Saved / Save changes).
- **Availability**: weekly hours (switch, day, from/to time inputs, "+ Add break" or "Closed"); booking rules (start-time interval, minimum notice, booking window, business time zone, "Approve bookings manually"); time off & holidays; staff schedules with "Customize".
- **Booking page & embed**: public link (`[domain]/` + editable slug, Copy, Open); embed tabs Inline / Popup button / Link with dark code block + Copy; branding (accent swatches, logo upload, show staff step, show prices, live slot preview).
- **Calendar & email**: Google Calendar card (status pill, connected account, target calendar, Block busy times, Two-way sync, Add customer answers to the event, Disconnect; disconnected state with "Connect Google Calendar"). Email notifications card (New booking alert, Customer confirmation with .ics, Reschedules & cancellations, Daily agenda, Follow-up after visit; reminder timing; owner alert address; sender name; "Send test email" with inline success). "Later" strip: SMS reminders, Outlook calendar, online deposits, webhooks.

## DELIVERABLES

Desktop (1280–1440) and phone (390) frames for every screen above; every state (default, hover, focus, selected, disabled, empty, loading skeleton, error); and the three demo industries to show the labels swap cleanly.
