# Digital Services Master Booking — Design handoff pack

UI/UX handoff for the multi-industry, multi-website booking system, to be built on Cloudflare Workers. Everything here describes the frontend design; no backend code is included.

Live clickable prototype (design canvas): https://claude.ai/artifact/5JSLnztA1vsbFjrEK19d8L

## What's inside

| File | Use it for |
|---|---|
| `design-prompt.md` | Ready-to-paste prompt for Claude Design or any design/code generator. Visual style, colours, type, spacing, components, responsive rules, and a screen-by-screen spec for every screen. |
| `flows-and-rules.md` | Routes, how screens connect, validation messages, slug rules, booking/availability rules, statuses, embed behaviour, Google Calendar and email settings, open decisions. Give this to the developer (or Codex) building the Workers app. |
| `tokens/tokens.css` | CSS variables for colours, fonts, type sizes, spacing, radius, shadows and sizes. Drop into the project as the base stylesheet. |
| `tokens/tokens.json` | Same tokens as JSON, for Tailwind config or any other build tool. |
| `sample-data/demo-businesses.json` | The three fictional demo businesses (salon/skin studio, dental clinic, photo booth company) with services, packages, add-ons, staff, intake questions and hours, plus the three setup templates. Useful as seed data. |
| `canvas-source/` | Source files of the design canvas boards (`.dc.html`) and their layout (`canvas.json`). Reference only. |

## Screens covered

1. Marketing homepage `/` — nav, hero with live mini booking card, industry tabs, 3 feature cards, embed section, Free/Pro pricing, footer
2. Sign up `/signup` and Log in `/login` — Google button, email/password, validation and error states
3. Business setup `/setup` — business name + booking URL claim, industry template, currency and time zone
4. Public booking page `/[business-slug]` — service/package → staff → calendar + time slots with time zone → details + custom questions → confirmation
5. Embed view `/[business-slug]?embed=true`
6. Owner dashboard `/dashboard` — bookings calendar/list + detail drawer, services and custom questions, availability, booking page and embed code, Google Calendar and email

Each screen has desktop and phone (390px) frames on the canvas.

## How to use it

- **Generating the design in Claude Design**: paste `design-prompt.md`, attach `tokens/tokens.css`, and ask for one screen at a time (for example "Build screen 4, the public booking page, desktop and phone").
- **Building with Codex or a developer**: start from `flows-and-rules.md` for routes and behaviour, `tokens/tokens.css` for styling, and `sample-data/demo-businesses.json` as seed data. Use the live canvas link to see how each screen behaves.
- **About the canvas source files**: the `.dc.html` files need the design canvas runtime (`support.js`), so they won't open as normal web pages. Open the canvas link above to see and click through them. They're included so the exact markup, copy and sample logic are available for reference.

## Placeholders still to decide

- `[domain]` — no domain chosen yet. Build on the Worker's free `workers.dev` address and attach a custom domain later.
- `[Price]` — Pro plan price, and the final Free vs Pro feature split.
- All businesses, people and prices in the demo data are fictional.
