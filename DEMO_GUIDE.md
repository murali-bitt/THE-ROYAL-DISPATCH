# The Royal Dispatch — Judge Demo Guide

**Setup (no credentials needed):**

```bash
npm install
npm run build && npm run start     # or: npm run dev
# open http://localhost:3000
```

The app runs in **local demo mode**: seeded fictional records live in your browser, every change persists across
refreshes. Use the **Demo** pill (bottom-left) to switch role — *it is a clearly labelled simulation, not security*. The
same pill can **reset the demo**, **skip the curse clock to its final 15 seconds**, or **restart it at 13:04**.

> Turn your speakers on for step 2. The site is **silent until you press SOUND (top-right)** — every visit, every reload.

## The Haunted Crown — what you are looking at

The visual identity is **The Haunted Crown** (“The kingdom remembers.”): a forgotten kingdom whose old protective
machinery has woken in the dark. Everything is strictly grayscale — moonlight, fog, dust and lantern-light are white or
black at some opacity.

**The living background** (behind every page, `components/atmosphere/`):

- **Occult circuitry** along the left, right and bottom edges — parallel traces, pads, terminals and lozenge runes — with
  the centre of the screen kept clear for reading.
- **The lantern:** move the mouse and a soft light follows it, revealing a brighter layer of the circuitry, making
  nearby nodes glint and nudging drifting dust aside. Leave the window and the light fades.
- **Spectral dust and embers** drift and occasionally flare; now and then a point of light runs along a trace.
- **The haunted moon** (original SVG) sits upper-right — large on the Overview, small on other pages. It shifts with the
  pointer, its shadow moves, its halo breathes, and once in a while its light falters. Look closely: it has a face.
  It dims as you scroll so it never sits bright behind text. After the awakening it is half-eclipsed.
- **Silhouettes:** a distant castle with one window still lit, a ruined chapel and a dead tree on the ridge, two hooded
  watchers, bare branches reaching in from the left, ravens crossing the sky, and ward sigils turning very slowly.
- **Fog** drifts in two layers; a vignette and film grain sit over it.
- **The storm:** every 8–18 s (the first within a few seconds of arriving), a silver-white lightning bolt strikes. It
  enters from a random point on the top edge, or high on a side, and falls steeply to a random point low on the screen.
  Its path is generated fresh each time, with up to three forks. Each strike has a short life: a faint trace, the
  strike, a dip, sometimes one restrained flicker, a fast fade and a dim afterglow. The sky behind the castle glows
  softly from where the bolt entered, so the silhouettes are backlit. The page itself never flashes. Bolts are dimmer
  over the centre of the screen, where you read, and thinner on phones. One bolt at a time, drawn by the same single
  animation loop.

It is one fixed, `pointer-events: none`, `aria-hidden` layer driven by a single animation loop. The loop pauses when
the tab is hidden. Touch devices get a gently wandering light instead of cursor effects, fewer particles and half the
frame rate. **Reduced motion** (the OS “reduce motion” setting): the loop renders one still frame, CSS animations finish
instantly, the ravens are removed and **there is no lightning at all**, leaving a composed, static night scene. When the
tab is hidden the storm pauses too, and on return it starts afresh rather than catching up on missed strikes. Page content arrives with a short fade
on navigation.

## The sound switch (top-right corner, every page)

- **SOUND OFF** by default. Nothing is created or played on load — not even if you enabled sound on a previous visit;
  a reload always starts silent.
- Press it → **SOUND ON** with a small level meter: an original ambient soundscape fades in over ~3 s (low ward drone,
  distant wind, a faint drifting spectral tone, sparse far-off bells). It is quiet by design and keeps playing as you
  move between pages — one soundscape, never a second copy.
- Press again → it fades out, every audio node is stopped and released, any active Kirmada MP3 clip is stopped and reset,
  and the audio context is suspended.
- The same switch controls **Kirmada’s portrait MP3 voice**, the **Alliance Protocol transmission**, the **report-sealed
  chime** and the **navigation whoosh**. If the browser refuses audio, the switch stays OFF and says why (and the
  transmission console shows the fault).

## Kirmada's portrait & MP3 voice interaction

The supplied `kirmada.jpg` is copied unchanged to `public/images/kirmada.jpg` and shown in **monochrome** by CSS
(`grayscale(1) contrast(1.22) brightness(1.22)`), and the supplied `kirmada.mp3` is copied unchanged to
`public/audio/kirmada.mp3` (`/audio/kirmada.mp3`). One component, `components/art/kirmada-portrait.tsx`, renders his
portrait everywhere at a fixed aspect ratio and wires the audio interaction:

- **With SOUND ON:** hover over any Kirmada portrait (or focus it with Tab, or tap it on a touch screen) to play
  `/audio/kirmada.mp3` from the beginning once (`loop = false`). The ambient soundscape dips gently underneath while
  the badge reads **THE SORCERER STIRS · SPEAKING**.
- **No stacking or restarts:** moving the cursor around inside the same portrait does not restart or duplicate playback.
  One shared `HTMLAudioElement` instance is reused across the entire app so two portraits can never overlap.
- **Clean fade-out:** move the cursor off the portrait (or Tab away) and the MP3 fades out over ~220 ms and resets to 0,
  ready to replay cleanly if you hover again.
- **With SOUND OFF:** the badge reads **THE SORCERER STIRS · ENABLE SOUND** and hovering/focusing/tapping is completely
  silent. Turning **SOUND OFF** mid-playback cuts and resets the MP3 immediately.
- **Placement:** Kirmada's portrait appears on the **Overview** antagonist profile, **The Grimoire** character dossier,
  the four **cursed artifacts** bound to him, **Royal Dispatches** concerning him (`dsp-council-artifact`, and after
  awakening `dsp-the-sleeper-has-awakened`), and **incident records** linked to his artifacts (`KNG-2026-0031`, etc.).

## The navigation whoosh

With SOUND ON, moving to another page from the header plays a short, original whoosh (~0.3 s): a soft gust of air
rising and falling through the archive, a faint low undertone and a brief high shimmer.

- **Triggers:** Overview, Registry, Villages, Dispatches, Restoration, Grimoire, Operations and **Report an incident**
  (including the phone menu), by click or by keyboard (Tab to a link, press Enter). It plays the moment you choose, never
  delaying the page.
- **Silent:** with SOUND OFF; on hover or focus; on the page you are already on; on Ctrl/⌘/Shift-clicks that open a new
  tab; and on everything that is not header navigation.
- **Rapid clicks** fold into one whoosh. It plays on its own interface channel, so it never stops the soundscape and
  never cuts off a running Alliance transmission or Kirmada's MP3. If it cannot play, navigation is unaffected.

## Five-minute walkthrough

1. **Landing (Overview `/`).** “**THE CROWN STILL HEARS YOU.**” surfaces word by word out of the dark. Move the mouse —
   the lantern reveals the circuitry; the moon follows. Within a few seconds the first lightning bolt strikes. The **curse clock** counts down from **13:04** (“Sleeping… wakes
   in”) inside a slowly turning dial whose arc is the sand left. Refresh — it does not restart. Metrics (open incidents,
   villages afflicted, restoration index, resolved) are computed from the records.
2. **The Séance + Kirmada's Voice + The Alliance Protocol.** Press **SOUND (top-right)**.
   - Scroll to **KIRMADA · The sorcerer who unmade the kingdom** on the Overview and hover over his portrait →
     `/audio/kirmada.mp3` plays over a dipped ambient soundscape; move off the portrait and it fades out cleanly.
   - Scroll to **“When the kingdom lost its voice, an alliance answered.”** — **KAPIDHWAJ, Official Event Partner**,
     handle **@kapidhwaj.innovations**.
   - Press **REPLAY ALLIANCE PROTOCOL TRANSMISSION** → an original ~3 s synthesised signal plays over the soundscape,
     which dips beneath it: low ward resonance, descending signal sweep, three relay pips, a metallic chime. The waveform
     animates, rings radiate, the status reads “Transmitting…”, then “Transmission received by all seven villages.”
     Press it again — it replays. The button is disabled while playing, so clicks never stack audio.
   - **VIEW @KAPIDHWAJ.INNOVATIONS ON INSTAGRAM** opens `https://www.instagram.com/kapidhwaj.innovations/` in a new tab.
   - **COPY HANDLE** copies `@kapidhwaj.innovations` (success is shown only if the copy worked; if the browser blocks
     the clipboard, the handle is selected and you are told to copy it manually).
3. **Send a Raven** (*Report an incident*). Title, *Damaged protective wards*, village **Thornwatch**, a landmark, a
   description, severity **High**. Try submitting empty first to see field errors and the error summary. Submit →
   “Your message has crossed the veil.” and a tracking reference such as **KNG-2026-0041**. With sound on, a soft chime
   seals it.
4. **Track this report** → the full record: lifecycle, details, activity timeline, and related dispatches.
5. **Demo pill → Village Steward.** A steward’s desk appears on the record. Assign **Wardwright Company III** →
   *Acknowledge & assign*; choose **Restoration in progress** → *Begin restoration*; post a progress update. The
   timeline updates instantly — refresh to confirm it persisted.
6. **Village.** Click **Thornwatch** on the record → your incident is listed under open incidents with its new status.
   Try the illustrated map on **The Forsaken Lands** (Villages): markers are buttons synchronised with the panel and
   directory, and a lantern-light glides to the village you choose.
7. **Dispatches** → **Publish a dispatch** (stewards: village scope; switch to **Royal Council** for kingdom-wide and
   archiving). It opens on its own page with related incidents and dispatches.
8. **Operations** → the triage queue (most severe first), village restoration slider, dispatch desk, milestone toggles.
   As a citizen this page is locked.
9. **Restoration & Grimoire.** **Restoration** answers *what is damaged / what is being done / how far* — all bars come
   from data; initiative progress = milestones completed. **Grimoire**: Kirmada’s portrait with hover/focus/tap MP3
   playback, his broken-wheel sigil, a chronicle, and five original artifacts linked to villages, incidents, restoration
   initiatives and royal dispatches.
10. **The Black Ledger** (Registry) → search (“lantern”, “0031”), combine filters (village + severity), sort, clear.
    Filters live in the URL. Hover a record — an illuminated rule rises beside it. Resize to a phone — the menu becomes
    a drawer listing each page by its kingdom name and its plain name; the sound switch stays top-right; no horizontal
    scrolling.
11. **The awakening.** Demo pill → **Final 15 s**. The clock's halo pulses faster as waking nears. At 00:00 a brief
    monochrome transition plays (it never blocks the page), a **Kingdom-wide alert** appears, the moon is half-eclipsed
    and the vignette deepens, two new incidents surface at Kingsfall and Moonfall, and a critical dispatch is issued.
    Your earlier reports are untouched.

Every page keeps a plain name next to its kingdom name: *The Black Ledger — Incident registry*, *The Forsaken Lands —
Village status*, *Whispers from the Crown — Royal dispatches*, *The Long Vigil — Restoration*, *The Night Watch —
Operations*, *Send a Raven — Report an incident*.

## Verified vs. not verified

- **Verified locally:** lint, strict typecheck, the production build, and:
  - **71 unit tests:** lifecycle (including reopening resolved incidents), permissions, validation, selectors, seed,
    clock, the sound engine, the soundscape and sound switch, Kirmada MP3 hover/leave/replay/mute/handoff/coexistence,
    the background layout, lightning geometry and timing, the background engine's lifecycle, the whoosh, the header
    navigation rule, and Kirmada portrait + MP3 asset integrity.
  - **37 Playwright browser tests:** the judge flow, filters, map markers, operations gating, mobile navigation, a
    grayscale audit of every computed colour on every page, overflow at 320/390/768 px, clock persistence and awakening
    idempotence; the sound switch, transmission playback and failure; the background and lightning strikes; the whoosh;
    Kirmada's portrait, artifact traceability links, and all 15 Kirmada MP3 browser scenarios (`/audio/kirmada.mp3` 200
    response + Web Audio decode verification, silent when off, hover play, no restart on internal mouse move, fade-out
    and reset on leave, replay on re-entry, keyboard focus/blur, touch tap toggle, single shared Audio instance across
    multiple portraits, immediate cutoff on global mute, coexistence with Alliance transmission and ambient soundscape,
    and graceful handling of rejected `play()` promises); and the sponsor link and copy handle.
- **Instagram destination:** the URL returns HTTP 200, but Instagram serves a login wall to automated requests, so the
  profile’s content could not be inspected. The link uses the handle exactly as given in the challenge brief.
- **Not verified:** the Supabase provider against a live project (no credentials were available). Automated tests verify
  audio decoding, node creation, and non-silent signal output, but physical speakers must be checked once on the
  presenting machine (below).

## Manual sound check (one minute, before presenting)

1. Open the site with speakers on. Confirm silence.
2. Press **SOUND** (top-right). Within ~3 s a low, quiet drone and wind should be audible, and the switch reads
   SOUND ON.
3. Hover over Kirmada's portrait on the Overview or `/grimoire`. Confirm `/audio/kirmada.mp3` plays clearly from the
   start, does not restart while moving the cursor inside the frame, and fades out smoothly when leaving.
4. Click to another page and back. The soundscape continues without restarting or doubling.
5. On the Overview, press **REPLAY ALLIANCE PROTOCOL TRANSMISSION**. The ~3 s signal plays clearly over a dipped
   soundscape and the status ends on “Transmission received…”.
6. Click **Registry**, then **Villages** in the header: each move should bring a short, quiet whoosh.
7. Press **SOUND** again. Any playing effect stops immediately and the soundscape fades out; reload: still silent.
