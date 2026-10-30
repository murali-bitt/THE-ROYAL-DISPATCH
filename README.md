# The Royal Dispatch

**Kingdom Incident Response & Restoration Network** — *“The kingdom is breaking. Your voice must reach the Crown.”*

A Spookathon project for **The Kingdom Under a Curse**: a working help portal where citizens of the fictional Kingdom of
Valmora report magical disasters, track their reports, follow village conditions, read royal dispatches and watch
restoration progress — while stewards and the Royal Council respond. All villages, people and events are fictional.

| Challenge card | Where it lives |
| --- | --- |
| **The Curse** — kingdom-help portal | Report → registry → incident timeline → steward desk → village status → dispatches → restoration |
| **The Wheel of Evil** — Kirmada & his artifacts | The Grimoire with Kirmada’s portrait, hover/focus/tap MP3 voice clip and dossier, his portrait wherever the story concerns him, linked artifacts on incidents, dispatches, restoration initiatives and villages, his broken-wheel sigil |
| **The Hex** — Midnight Noir | **The Haunted Crown**: strictly grayscale tokens (Tailwind’s colour palette is removed entirely), a living background (occult circuitry revealed by a cursor lantern, drifting dust, a haunted moon, silhouettes, fog, and a silver-white lightning storm), Cinzel inscriptions + editorial serif + mono |
| **The Sleeper** — “Wakes in 13:04” | Persistent 13:04 curse clock in a turning dial; at zero the Sleeper awakens (alert, eclipsed moon, surfaced incidents, dispatch) |
| **The Séance** — sound effects | A **SOUND** switch (top-right, off on every visit) starts an original ambient soundscape; hovering, focusing or tapping any Kirmada portrait plays the supplied `/audio/kirmada.mp3`; “Replay Alliance Protocol Transmission” plays an original Web Audio effect; a whoosh on header navigation; report-sealed chime |
| **The Alliance Protocol** — sponsor KAPIDHWAJ | Overview section, featured partner card with **@kapidhwaj.innovations**, Instagram link, copy handle, narrative references |

See **[DEMO_GUIDE.md](./DEMO_GUIDE.md)** for a five-minute judge walkthrough and **[SUBMISSION_CHECKLIST.md](./SUBMISSION_CHECKLIST.md)** for the full requirement-to-code audit.

## Quick start

Requires Node.js 20.9+ (developed on Node 24) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

No environment variables are needed. Without Supabase credentials the app runs in **local demo mode**: seeded records
are stored in the browser’s localStorage, every mutation persists across refreshes (and syncs between tabs), and a
**Demo role switcher** (bottom-left) lets you act as a Citizen, Village Steward or Royal Council member.

Production build:

```bash
npm run build
npm run start        # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` / `npm run start` | Production build / server |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript + React Compiler rules) |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` (strict) |
| `npm test` | Vitest unit tests (71 tests) — lifecycle, permissions, validation, selectors, seed integrity, clock maths, sound engine, soundscape, sound switch, Kirmada MP3 channel, background layout & lightning |
| `npm run test:e2e` | Playwright browser tests (37 tests) against the production build (run `npm run build` first; first time: `npx playwright install chromium`) |
| `npm run db:seed-sql` | Regenerate `supabase/seed.sql` from `lib/data/seed.ts` |
| `npm run check` | lint + typecheck + unit tests + build |

## Stack

Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Radix
primitives (dialog, popover, tabs, tooltip) · Motion for React · Lucide icons · React Hook Form + Zod 4 · Sonner toasts
· Supabase (`@supabase/ssr`) · Vitest · Playwright. Fonts (Cinzel, Cormorant Garamond, Inter Tight, JetBrains Mono —
SIL OFL) are vendored in `app/fonts`, so nothing depends on an external font service. No dependencies were added for the
visual redesign: the background is Canvas 2D + CSS, and all artwork is original inline SVG.

## Architecture

```
app/                    routes (each page is a static shell + client data sections) and /api route handlers
components/             feature components — incidents, villages, dispatches, restoration, operations,
                        grimoire, alliance, sleeper, shell (header, sound switch), art (Kirmada portrait, original SVG
                        map, seal, sigil, artifact glyphs), atmosphere (the haunted background, moon, silhouettes)
components/ui/          primitives — button, fields, dialog/drawer, marks (grayscale status language), progress…
lib/data/               seed.ts (one source of truth) · mutations.ts (pure, validated, permission-checked)
                        repository.ts (interface) · local-repository.ts · remote-repository.ts
lib/supabase/           server/browser clients, row ↔ domain mapping and persistence
lib/sleeper/            the single-interval curse clock store
lib/audio/              sound engine (effects + interface channel + Kirmada MP3 channel), ambient soundscape, global sound switch
lib/kirmada.ts          the portrait and audio assets and the rule for where Kirmada appears
lib/atmosphere/         background layout (pure, tested) and its single animation loop
lib/permissions.ts      one permission table used by UI, demo repository and API
lib/validation.ts       Zod schemas used by forms, demo repository and API
lib/selectors.ts        every metric and list is derived here from the shared snapshot
supabase/migrations/    schema, constraints, triggers and row-level security
supabase/seed.sql       generated seed (same records as the demo)
tests/unit · tests/e2e  Vitest · Playwright
```

**One data model, two providers.** The UI only talks to `KingdomRepository`. Every page reads the same `KingdomSnapshot`,
so a report filed on `/report` immediately appears in the registry, the overview metrics, the village page, the activity
feed and the steward queue. Business rules (validation, lifecycle `SUBMITTED → ACKNOWLEDGED → RESTORATION IN PROGRESS →
RESOLVED`, reopening into restoration, permissions, the awakening) live in pure functions in `lib/data/mutations.ts`,
used by the demo repository *and* by the API routes — so both modes behave identically.

**Metrics are computed, never hard-coded.** Open incidents, villages afflicted, critical count and the Kingdom
Restoration Index are derived from records. Village restoration values are the official steward-reported measures; the
Kingdom Restoration Index is labelled in the UI as an illustrative unweighted mean. Initiative progress is the share of
milestones completed.

**The curse clock** (`lib/sleeper/clock.ts`): duration is one constant, `SLEEPER_DURATION_MS` in `lib/config.ts`
(13 min 4 s). The start timestamp is persisted in localStorage, so refreshes never restart it; the awakened state is
derived from it. All clock displays share one `setInterval`, created with the first subscriber and cleared with the
last. At zero the repository surfaces two incidents and a dispatch **once** (idempotent), existing data is untouched,
and a short `pointer-events: none` monochrome transition plays once per browser — it never blocks reporting.

**Sound** (`lib/audio/`): `sound-engine.ts` owns the app’s only `AudioContext` (created inside a click, so nothing can
play on load) and three independent channels:
1. **Primary effect channel** (`currentVoice`): Alliance Protocol transmission (~2.9 s) and report-sealed chime (~0.7 s).
2. **Interface channel** (`uiVoice`): header navigation whoosh (~0.28 s) with a 140 ms fold for rapid clicks so it never
   cuts off a running Alliance transmission.
3. **Kirmada portrait voice channel** (`kirmadaElement`): a single shared `HTMLAudioElement` playing the supplied
   `/audio/kirmada.mp3` (`public/audio/kirmada.mp3`, copied byte-for-byte from `kirmada.mp3`). When global sound is ON,
   hovering, focusing or tapping any Kirmada portrait plays the MP3 from the beginning once (`loop = false`), ducks the
   ambient soundscape underneath, ignores repeated cursor movement inside the same portrait, fades out (~220 ms) and
   resets when leaving, and stops immediately if global sound is turned OFF.

`ambient.ts` is the soundscape: at most one session, which on stop fades out, stops its sources, disconnects its nodes
and clears its timers. `sound-control.ts` is the single switch shown top-right: off for every new page session (never
persisted), “on” only once the soundscape runs, and the master gate for every sound in the application.

**The haunted background** (`components/atmosphere/`, `lib/atmosphere/`): one fixed layer with `pointer-events: none`
and `aria-hidden`. A single `requestAnimationFrame` loop draws dust, the lantern’s reveal of the circuitry, node glints
and trace pulses on one canvas. The circuitry itself is drawn once per resize on another canvas and moved by a CSS
transform. Pointer, parallax and scroll go to CSS custom properties, so React never re-renders on mouse movement. The
pixel ratio is clamped (1.5, or 1.25 on touch) and the particle count is capped by area. The loop pauses while the tab
is hidden, touch devices skip cursor effects and run at half rate, and `prefers-reduced-motion` gets one still frame.
Pages fade in on navigation through a CSS animation that routes kept alive by `<Activity>` replay when shown again.
**The storm** (`lib/atmosphere/lightning.ts`, tunable in one `LIGHTNING` object) is part of the same loop. Each bolt's
jagged path is generated from a fresh random source and is steep, with bounded forks. A pure envelope gives it a trace,
the strike, a dip, an optional flicker, a fade and an afterglow. The next strike is a single timestamp, so a hidden tab
accumulates nothing. Under reduced motion there is no lightning.

**Kirmada’s portrait & voice** (`components/art/kirmada-portrait.tsx`): the supplied `kirmada.jpg` is copied unchanged
to `public/images/kirmada.jpg` and served through `next/image` at a fixed aspect ratio in monochrome CSS, and the
supplied `kirmada.mp3` is copied unchanged to `public/audio/kirmada.mp3`. Each user-facing portrait includes a subtle
Midnight Noir status cue (`The sorcerer stirs · Hover to hear` / `Speaking` / `Enable sound`) and responds to mouse
hover, keyboard focus and touch tap when global sound is ON.

**Next.js 16 notes.** Cache Components is enabled: pages prerender a static shell, request-time hooks (`usePathname`,
`useSearchParams`, dynamic `params`) sit inside `<Suspense>`. Routes stay mounted under React `<Activity>` when you
navigate away, so transient UI (drawers, the report receipt) is reset in `useLayoutEffect` cleanups and SVG ids are
scoped with `useId`. Middleware is `proxy.ts` (Next 16 naming); it only refreshes Supabase sessions.

## Production: Supabase

1. Create a Supabase project.
2. Apply `supabase/migrations/20261030000000_royal_dispatch.sql` (`supabase db push`, or paste it into the SQL editor),
   then run `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Create accounts at `/sign-in`. New accounts are **citizens**. Promote officers in SQL:
   `update public.profiles set role = 'steward' where id = '<user uuid>';` (or `'admin'`).

When configured, the app uses Supabase instead of localStorage (it never silently falls back) and the demo switcher
disappears. Security model:

- Every write goes through an API route that parses the body with the shared Zod schema, resolves the actor from verified
  JWT claims (`getClaims()`) and the `profiles` table — never from the request — and applies the shared permission and
  lifecycle rules.
- Postgres enforces the same rules independently: RLS (public read of the registry; anyone may file; only staff update
  incidents, post updates, set progress; stewards may only publish village-scoped dispatches; only admins archive or edit
  village records), triggers that force citizen reports to `submitted`/unassigned and assign references server-side, a
  guard preventing users from changing their own role, and CHECK constraints on lengths, ranges and attachment format.
- The reporter’s account id is excluded from public column grants. Only the publishable key is used; no service-role key.
- Attachments are downscaled and converted to monochrome JPEG in the browser, limited to JPEG/PNG/WebP data URLs
  (no SVG), size-capped, validated by Zod and by a database CHECK, and only rendered through `<img>`.

## Known limitations

- The Supabase adapter, migration and auth flow are implemented and type-checked but **were not run against a live
  Supabase project** (no credentials were available). Local demo mode is fully tested.
- In demo mode, roles are a client-side simulation and data lives in one browser (synced between its tabs).
- The curse clock is per browser. With Supabase, the first browser to reach zero triggers the (idempotent) awakening for
  everyone.
- Notifications are in-app only; no email or push messages are sent.
- The kingdom map is an illustrated chart, not geographic — fictional places have no real coordinates.
- KAPIDHWAJ’s role in Valmora is fiction written for this site; no official sponsor logo was supplied, so a typographic
  treatment and a neutral relay emblem are used instead.
- Audio is verified by instrumentation (graphs built, started, stopped, a non-silent signal at the output, and
  `/audio/kirmada.mp3` fetched and decoded with non-silent PCM samples), not by physical speakers: listen once on the
  presenting machine (`DEMO_GUIDE.md` has a one-minute check).
- The sound switch is deliberately not remembered between visits, so each visit begins silent.
- `kirmada.jpg` is a colour artwork; the site shows it in grayscale through CSS. The file itself is unchanged, so if it is
  reused elsewhere it will appear in colour.
