# The Royal Dispatch — Spookathon Submission Checklist

This checklist maps every mandatory Spookathon challenge requirement, sponsor requirement, and Kirmada MP3 integration requirement to its implementation location, how judges can experience it, its automated test coverage, and any manual or optional external verification notes.

---

## 1. Requirement 1 — The Wheel of Evil: Kirmada

| Aspect | Implementation Location | How Judges Can See It | Automated Tests | Manual / Caveats |
| --- | --- | --- | --- | --- |
| **Kirmada character profile & lore** | `components/grimoire/grimoire-view.tsx`, `components/overview/overview-sections.tsx`, `lib/kirmada.ts` | Visit `/` (`#curse-heading`) for the antagonist profile and `/grimoire` for the full dossier, 5-part chronicle, and broken-wheel sigil. | `tests/e2e/storm-whoosh-kirmada.spec.ts`, `tests/unit/navigation-and-kirmada.test.ts` | None. |
| **Monochrome portrait asset (`kirmada.jpg`)** | `public/images/kirmada.jpg`, `components/art/kirmada-portrait.tsx` | Displayed in monochrome (`grayscale(1) contrast(1.22) brightness(1.22)`) on `/`, `/grimoire`, artifact lore cards, Kirmada dispatches, and Kirmada-linked incidents. | `tests/unit/navigation-and-kirmada.test.ts`, `tests/e2e/storm-whoosh-kirmada.spec.ts`, `tests/e2e/noir-and-sleeper.spec.ts` | Source `kirmada.jpg` is preserved byte-for-byte in root and `public/images/kirmada.jpg`. |
| **Cursed artifacts connected to villages, incidents, restoration & dispatches** | `lib/data/seed.ts` (`SEED_ARTIFACTS`), `components/grimoire/grimoire-view.tsx` (`ArtifactList`), `components/incidents/incident-detail.tsx`, `components/villages/village-views.tsx` | On `/grimoire`, each of the 5 artifacts links directly to its afflicted village, active incident record(s), containment/restoration initiative, and associated Royal Dispatch. | `tests/unit/selectors-and-seed.test.ts`, `tests/e2e/storm-whoosh-kirmada.spec.ts` | None. |

---

## 2. Requirement 2 — The Curse: The Kingdom Under a Curse

| Aspect | Implementation Location | How Judges Can See It | Automated Tests | Manual / Caveats |
| --- | --- | --- | --- | --- |
| **Citizen incident reporting & reference receipt** | `app/report/page.tsx`, `components/incidents/report-form.tsx`, `lib/validation.ts`, `lib/data/mutations.ts` | Visit `/report`, submit a report (named or anonymous, optional monochrome evidence plate), receive reference `KNG-2026-0041` and click **Track this report**. | `tests/unit/mutations.test.ts`, `tests/e2e/kingdom-flow.spec.ts` | None. |
| **Incident registry, search, URL-synced filters & reference lookup** | `app/incidents/page.tsx`, `components/incidents/incident-registry.tsx`, `lib/selectors.ts` | Visit `/incidents`, search by reference/keyword, filter by village, category, severity, status, and sort order. | `tests/unit/selectors-and-seed.test.ts`, `tests/e2e/kingdom-flow.spec.ts` | None. |
| **Incident lifecycle (`submitted → acknowledged → in_restoration → resolved` + reopen)** | `lib/permissions.ts`, `lib/data/mutations.ts`, `components/incidents/incident-actions.tsx`, `components/incidents/incident-detail.tsx` | Switch Demo role pill (bottom-left) to **Village Steward** on `/incidents/KNG-2026-0041` or `/operations`, assign a team, advance through restoration to resolved, or reopen into restoration. | `tests/unit/mutations.test.ts`, `tests/e2e/kingdom-flow.spec.ts` | None. |
| **Village directory, interactive SVG map & service conditions** | `app/villages/page.tsx`, `app/villages/[slug]/page.tsx`, `components/villages/village-views.tsx`, `components/art/kingdom-map.tsx` | Visit `/villages` to click map markers and inspect all 7 villages, or `/villages/hollowmere` for village-specific incidents, dispatches, restoration log, and steward progress controls. | `tests/e2e/kingdom-flow.spec.ts` | Fictional kingdom map is an illustrated chart. |
| **Royal dispatches & announcements** | `app/dispatches/page.tsx`, `app/dispatches/[id]/page.tsx`, `components/dispatches/dispatch-views.tsx`, `components/dispatches/dispatch-composer.tsx` | Visit `/dispatches` to filter by Kingdom-wide / Village scope, view featured urgent dispatches, publish new dispatches (Steward/Council), and archive/republish (Council). | `tests/unit/mutations.test.ts`, `tests/e2e/kingdom-flow.spec.ts` | None. |
| **Restoration tracker & milestone progress** | `app/restoration/page.tsx`, `components/restoration/restoration-view.tsx`, `components/operations/operations-console.tsx` | Visit `/restoration` to see village restoration bars, active initiatives, milestone checklists, and field logs; toggle milestones as Steward/Council. | `tests/unit/mutations.test.ts`, `tests/unit/selectors-and-seed.test.ts`, `tests/e2e/kingdom-flow.spec.ts` | None. |

---

## 3. Requirement 3 — The Hex: Midnight Noir

| Aspect | Implementation Location | How Judges Can See It | Automated Tests | Manual / Caveats |
| --- | --- | --- | --- | --- |
| **Strict grayscale palette (`--color-*: initial`)** | `app/globals.css`, `components/ui/marks.tsx` | Every surface, border, text token, status chip, map marker, and audio indicator across all 10 routes is strictly monochrome (`R = G = B`). | `tests/e2e/noir-and-sleeper.spec.ts` (asserts `max(r,g,b) - min(r,g,b) <= 8` on every element across all routes) | None. |
| **Haunted background, silver-white lightning & reduced motion** | `components/atmosphere/haunted-background.tsx`, `lib/atmosphere/engine.ts`, `lib/atmosphere/lightning.ts` | Move cursor on `/` to reveal occult circuitry with the lantern; watch randomized silver-white lightning strikes every 8–18 s; enable OS `prefers-reduced-motion` for a still scene without lightning. | `tests/unit/atmosphere-engine.test.ts`, `tests/unit/atmosphere-layout.test.ts`, `tests/unit/lightning.test.ts`, `tests/e2e/haunted-crown.spec.ts`, `tests/e2e/storm-whoosh-kirmada.spec.ts` | None. |

---

## 4. Requirement 4 — The Séance: Sound Effects & Kirmada MP3 Integration

| Aspect | Implementation Location | How Judges Can See It | Automated Tests | Manual / Caveats |
| --- | --- | --- | --- | --- |
| **Global SOUND ON/OFF switch** | `components/shell/sound-toggle.tsx`, `lib/audio/sound-control.ts`, `lib/audio/ambient.ts` | Top-right **SOUND** button starts OFF on every page load/reload; clicking turns on the ambient soundscape and gates all audio effects. | `tests/unit/sound-control.test.ts`, `tests/e2e/haunted-crown.spec.ts`, `tests/e2e/seance-and-alliance.spec.ts` | Listen once on presenting hardware before demoing. |
| **Kirmada portrait MP3 hover / focus / tap (`/audio/kirmada.mp3`)** | `public/audio/kirmada.mp3`, `lib/kirmada.ts`, `lib/audio/sound-engine.ts`, `lib/audio/sound-control.ts`, `components/art/kirmada-portrait.tsx` | With SOUND ON, hover, Tab-focus, or tap any Kirmada portrait (`/`, `/grimoire`, `/dispatches/dsp-council-artifact`, `/incidents/KNG-2026-0031`) to hear `/audio/kirmada.mp3` play from start once (`loop = false`), ignore internal cursor motion, and fade out (~220 ms) on leave. | `tests/unit/navigation-and-kirmada.test.ts`, `tests/unit/sound-control.test.ts` (7 tests), `tests/e2e/storm-whoosh-kirmada.spec.ts` (all 15 Kirmada MP3 cases) | Physical speaker output should be checked once in `DEMO_GUIDE.md`'s 1-minute sound check. |
| **Alliance Protocol transmission, navigation whoosh & report chime** | `lib/audio/sound-engine.ts`, `components/alliance/alliance-protocol.tsx`, `components/shell/nav.tsx`, `components/incidents/report-form.tsx` | With SOUND ON, click **Replay Alliance Protocol Transmission** on `/`, navigate via header links to hear the whoosh, or submit a report on `/report` to hear the confirmation chime. | `tests/unit/sound-engine.test.ts`, `tests/unit/sound-control.test.ts`, `tests/e2e/seance-and-alliance.spec.ts`, `tests/e2e/storm-whoosh-kirmada.spec.ts` | None. |

---

## 5. Requirement 5 — The Sleeper: Wakes in 13:04

| Aspect | Implementation Location | How Judges Can See It | Automated Tests | Manual / Caveats |
| --- | --- | --- | --- | --- |
| **Persistent 13:04 countdown & idempotent awakening** | `lib/config.ts` (`SLEEPER_DURATION_MS`), `lib/sleeper/clock.ts`, `components/sleeper/curse-clock.tsx`, `components/sleeper/awakening.tsx`, `lib/data/mutations.ts` (`applyAwakening`) | Visible in the header, Overview dial, and Grimoire. Use the Demo pill (**Final 15 s**) to watch the countdown reach `00:00`, trigger the non-blocking awakening overlay, surface 2 incidents + 1 critical dispatch once, and preserve all existing records. | `tests/unit/selectors-and-seed.test.ts`, `tests/unit/mutations.test.ts`, `tests/e2e/noir-and-sleeper.spec.ts` | None. |

---

## 6. Requirement 6 — Sponsor Integration: KAPIDHWAJ

| Aspect | Implementation Location | How Judges Can See It | Automated Tests | Manual / Caveats |
| --- | --- | --- | --- | --- |
| **KAPIDHWAJ Alliance Protocol section & `@kapidhwaj.innovations` link** | `lib/config.ts` (`SPONSOR`), `components/alliance/alliance-protocol.tsx`, `components/shell/footer.tsx` | Scroll to **The Alliance Protocol** on `/` (and footer on every page) to see KAPIDHWAJ (`@kapidhwaj.innovations`), replay the transmission, open `https://www.instagram.com/kapidhwaj.innovations/` in a new tab, or copy the handle with honest clipboard feedback. | `tests/e2e/seance-and-alliance.spec.ts` | Instagram serves a login wall to automated bots after HTTP 200. |

---

## 7. Optional Production Architecture: Supabase

| Aspect | Implementation Location | How Judges Can See It | Automated Tests | Manual / Caveats |
| --- | --- | --- | --- | --- |
| **Supabase schema, RLS, triggers & API routes** | `supabase/migrations/20261030000000_royal_dispatch.sql`, `supabase/seed.sql`, `lib/supabase/kingdom.ts`, `app/api/**` | Inspect migration SQL, seed script (`npm run db:seed-sql`), and API routes. Without `.env.local` credentials, the app runs in local demo mode automatically. | Typechecked (`npm run typecheck`) and shared domain mutations tested in `tests/unit/mutations.test.ts` | Not executed against a live external Supabase instance during local automated testing. |
