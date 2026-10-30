/**
 * Seed content for The Royal Dispatch. Entirely fictional.
 *
 * Timestamps are expressed as minutes before "now" so the demo always feels
 * current. The local repository materialises them once (then persists the
 * result), and scripts/generate-seed-sql.mts turns the same records into
 * supabase/seed.sql — one source of truth for both providers.
 *
 * Only type imports are allowed here so the file can be executed directly by
 * Node's type stripping.
 */
import type {
  Announcement,
  Artifact,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  IncidentCategory,
  Initiative,
  Role,
  ServiceKey,
  ServiceState,
  Village,
  VillageCondition,
} from "../../types/domain";

const M = 1;
const H = 60 * M;
const D = 24 * H;

export interface SeedVillage {
  id: string;
  name: string;
  epithet: string;
  description: string;
  condition: VillageCondition;
  services: Record<ServiceKey, ServiceState>;
  restoration: number;
  map: { x: number; y: number };
  log: { ago: number; message: string; authorName: string; restoration: number }[];
}

export interface SeedIncidentEvent {
  ago: number;
  kind: "submitted" | "status" | "note" | "assignment";
  message: string;
  authorName: string;
  authorRole: Role | "system";
  to?: IncidentStatus;
  team?: string;
}

export interface SeedIncident {
  sequence: number;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  villageId: string;
  location: string;
  reporter: { anonymous: boolean; name: string | null };
  events: SeedIncidentEvent[];
}

export interface SeedAnnouncement extends Omit<Announcement, "publishedAt"> {
  ago: number;
}

export interface SeedInitiative extends Omit<Initiative, "milestones" | "updates" | "incidentIds"> {
  incidentSequences: number[];
  milestones: { id: string; title: string; doneAgo: number | null }[];
  updates: { ago: number; message: string; authorName: string }[];
}

export interface SeedArtifact extends Omit<Artifact, "incidentIds"> {
  incidentSequences: number[];
}

/* ------------------------------------------------------------------ */
/* Villages                                                            */
/* ------------------------------------------------------------------ */

export const SEED_VILLAGES: SeedVillage[] = [
  {
    id: "kingsfall",
    name: "Kingsfall",
    epithet: "Seat of the Crown",
    description:
      "The walled capital on the Downs, home to the Royal Council and the Old Archive. Beneath the Downs lies the barrow where the war against Kirmada ended — or was thought to.",
    condition: "strained",
    services: {
      communications: "degraded",
      roads: "operational",
      water: "operational",
      food: "operational",
      wards: "degraded",
    },
    restoration: 64,
    map: { x: 49, y: 51 },
    log: [
      {
        ago: 2 * D,
        message: "City wards reinforced at the north gate. Archive closed to the public.",
        authorName: "Steward Ilsabet Crane",
        restoration: 58,
      },
      {
        ago: 6 * H,
        message: "Black-flame lantern contained beneath the Archive. East stacks remain sealed.",
        authorName: "Steward Ilsabet Crane",
        restoration: 64,
      },
    ],
  },
  {
    id: "ashenreach",
    name: "Ashenreach",
    epithet: "The Ember Terraces",
    description:
      "A terraced market town on the western trade road. Its kilns have burned for three hundred years; since the curse, the ash no longer settles.",
    condition: "afflicted",
    services: {
      communications: "degraded",
      roads: "disrupted",
      water: "operational",
      food: "degraded",
      wards: "operational",
    },
    restoration: 38,
    map: { x: 18, y: 44 },
    log: [
      {
        ago: 2 * D,
        message: "Western trade road closed at the second milestone. Carts are being turned back.",
        authorName: "Steward Corin Ashby",
        restoration: 30,
      },
      {
        ago: 1 * D + 4 * H,
        message: "Foot detour through Blackbriar opened. Food carts rerouted via the south lane.",
        authorName: "Steward Corin Ashby",
        restoration: 38,
      },
    ],
  },
  {
    id: "hollowmere",
    name: "Hollowmere",
    epithet: "Village of the Still Lake",
    description:
      "Fishers and well-keepers on the shore of a lake so still it holds the stars by day. The water turned black on the night of the first tolling.",
    condition: "afflicted",
    services: {
      communications: "operational",
      roads: "operational",
      water: "disrupted",
      food: "degraded",
      wards: "degraded",
    },
    restoration: 52,
    map: { x: 34, y: 70 },
    log: [
      {
        ago: 4 * D,
        message: "Lake intake sealed. Water is being carried in from Kingsfall cisterns.",
        authorName: "Steward Wenna Hollis",
        restoration: 20,
      },
      {
        ago: 3 * H,
        message: "Filter beds rebuilt. Boiled water is safe to drink; the purification rite is next.",
        authorName: "Steward Wenna Hollis",
        restoration: 52,
      },
    ],
  },
  {
    id: "thornwatch",
    name: "Thornwatch",
    epithet: "Fortress of the Northern Ridge",
    description:
      "A border keep and its village, guardians of the ward-line that has held the northern dark at bay since the Accord. Most of the stones have gone cold.",
    condition: "critical",
    services: {
      communications: "degraded",
      roads: "degraded",
      water: "operational",
      food: "operational",
      wards: "disrupted",
    },
    restoration: 21,
    map: { x: 47, y: 15 },
    log: [
      {
        ago: 3 * D,
        message: "Ward-line failure confirmed along the ridge. Families below the keep are moving inside the walls.",
        authorName: "Steward Bram Holloway",
        restoration: 8,
      },
      {
        ago: 20 * H,
        message: "Survey complete. Recovered codex pages give us the binding words; re-inscription begins at dawn.",
        authorName: "Steward Bram Holloway",
        restoration: 21,
      },
    ],
  },
  {
    id: "moonfall",
    name: "Moonfall",
    epithet: "The Bell-Tower Cliffs",
    description:
      "A cliff-top village of bell-ringers and beacon-keepers that relays the kingdom's signals to the eastern coast. The beacons went dark; the bells did not stop.",
    condition: "afflicted",
    services: {
      communications: "disrupted",
      roads: "operational",
      water: "operational",
      food: "operational",
      wards: "degraded",
    },
    restoration: 30,
    map: { x: 80, y: 32 },
    log: [
      {
        ago: 1 * D + 2 * H,
        message: "All seven beacons extinguished. Messages east now travel by rider — expect a day's delay.",
        authorName: "Steward Osric Penhale",
        restoration: 30,
      },
    ],
  },
  {
    id: "blackbriar",
    name: "Blackbriar",
    epithet: "Hamlet Beneath the Briarwood",
    description:
      "Farmsteads and granaries at the edge of the old forest, feeding half the western villages. The grey mould has been burned out; the harvest is thin but clean.",
    condition: "strained",
    services: {
      communications: "operational",
      roads: "degraded",
      water: "operational",
      food: "degraded",
      wards: "operational",
    },
    restoration: 78,
    map: { x: 24, y: 24 },
    log: [
      {
        ago: 3 * D,
        message: "Granary cleared and resupplied from Greyhaven. Ration lines have ended.",
        authorName: "Steward Ada Fenwick",
        restoration: 78,
      },
    ],
  },
  {
    id: "greyhaven",
    name: "Greyhaven",
    epithet: "The Harbour of Lamps",
    description:
      "The kingdom's southern harbour, so far spared the worst of the curse. Its ships now carry grain and lamp-oil to the afflicted villages.",
    condition: "stable",
    services: {
      communications: "operational",
      roads: "operational",
      water: "operational",
      food: "operational",
      wards: "operational",
    },
    restoration: 96,
    map: { x: 68, y: 80 },
    log: [
      {
        ago: 5 * D,
        message: "Fog horn repaired. Harbour fully operational and supplying relief convoys.",
        authorName: "Steward Lio Marsh",
        restoration: 96,
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Incidents                                                           */
/* ------------------------------------------------------------------ */

const sys = (ago: number): SeedIncidentEvent => ({
  ago,
  kind: "submitted",
  message: "Report received by the Royal Dispatch.",
  authorName: "The Royal Dispatch",
  authorRole: "system",
});

export const SEED_INCIDENTS: SeedIncident[] = [
  {
    sequence: 31,
    title: "Lake water turned black and perfectly still",
    description:
      "At the third bell after midnight the whole of Hollowmere lake went black, like poured ink. It does not ripple when stones are thrown in. Fish are floating at the shore and the well-houses draw the same black water. Two households have fallen ill after drinking before the warning.",
    category: "water_food",
    severity: "critical",
    villageId: "hollowmere",
    location: "Lake intake below the Fisher's Steps",
    reporter: { anonymous: false, name: "Maud Teller" },
    events: [
      sys(5 * D),
      {
        ago: 5 * D - 2 * H,
        kind: "status",
        to: "acknowledged",
        team: "Waterkeepers of Hollowmere",
        message: "Verified on site. Waterkeepers dispatched; do not draw lake water.",
        authorName: "Steward Wenna Hollis",
        authorRole: "steward",
      },
      {
        ago: 4 * D,
        kind: "status",
        to: "in_restoration",
        message: "Intake sealed. Divers are searching the lake bed for the source.",
        authorName: "Steward Wenna Hollis",
        authorRole: "steward",
      },
      {
        ago: 1 * D,
        kind: "note",
        message:
          "A drowned bell was raised from the lake bed and silenced. Water at the intake is running clear for the first time in four days.",
        authorName: "Steward Wenna Hollis",
        authorRole: "steward",
      },
      {
        ago: 3 * H,
        kind: "note",
        message: "Filter beds rebuilt. Boil all drawn water until the purification rite is complete.",
        authorName: "Steward Wenna Hollis",
        authorRole: "steward",
      },
    ],
  },
  {
    sequence: 32,
    title: "Northern ward-stones dark along the ridge",
    description:
      "The ward-stones on the ridge path above Thornwatch have stopped glowing — I counted more than twenty dark between the keep and the old watchtower. Frost is forming on the inside of the line, and something large was heard moving below the scree last night.",
    category: "wards",
    severity: "critical",
    villageId: "thornwatch",
    location: "Ridge path between the keep and the Old Watchtower",
    reporter: { anonymous: false, name: "Sergeant Edda Marr" },
    events: [
      sys(3 * D),
      {
        ago: 3 * D - 30 * M,
        kind: "status",
        to: "acknowledged",
        team: "Wardwright Company III",
        message: "Ward-line failure confirmed. Wardwright Company III riding north tonight.",
        authorName: "Steward Bram Holloway",
        authorRole: "steward",
      },
      {
        ago: 2 * D + 12 * H,
        kind: "status",
        to: "in_restoration",
        message: "Wardwrights on the ridge. Families below the keep are sheltering inside the walls.",
        authorName: "Steward Bram Holloway",
        authorRole: "steward",
      },
      {
        ago: 20 * H,
        kind: "note",
        message:
          "Survey complete: 24 of 31 stones are dark. Recovered pages of the Thornbound Codex confirm the binding words needed to re-inscribe them.",
        authorName: "Steward Bram Holloway",
        authorRole: "steward",
      },
    ],
  },
  {
    sequence: 33,
    title: "Western trade road swallowed by an ash fissure",
    description:
      "A fissure has opened across the trade road two miles west of Ashenreach. It breathes warm ash and the edge keeps crumbling. A cart and two oxen went in; the driver escaped. Merchants are now trying to cross at night, which is dangerous.",
    category: "roads",
    severity: "high",
    villageId: "ashenreach",
    location: "Western trade road, second milestone",
    reporter: { anonymous: false, name: "Tobin Reyes, carter" },
    events: [
      sys(2 * D + 6 * H),
      {
        ago: 2 * D,
        kind: "status",
        to: "acknowledged",
        team: "Roadwardens of the West",
        message: "Road closed at the second milestone. Roadwardens posted at both ends.",
        authorName: "Steward Corin Ashby",
        authorRole: "steward",
      },
      {
        ago: 1 * D + 4 * H,
        kind: "note",
        message: "Fissure mapped at 140 paces. A foot detour through Blackbriar is open; no carts.",
        authorName: "Steward Corin Ashby",
        authorRole: "steward",
      },
    ],
  },
  {
    sequence: 34,
    title: "Signal beacons extinguished; bells ring at midnight",
    description:
      "All seven beacons on the Moonfall cliffs went out at once and will not relight — the oil burns, but gives no light. Every night at midnight the bell-tower rings thirteen times, though the tower is locked and empty.",
    category: "communication",
    severity: "high",
    villageId: "moonfall",
    location: "Beacon line and the Old Bell-Tower",
    reporter: { anonymous: true, name: null },
    events: [
      sys(1 * D + 8 * H),
      {
        ago: 1 * D + 2 * H,
        kind: "status",
        to: "acknowledged",
        team: "Signal Corps of Moonfall",
        message: "Signal Corps assigned. Messages east are travelling by rider until the beacons return.",
        authorName: "Steward Osric Penhale",
        authorRole: "steward",
      },
    ],
  },
  {
    sequence: 35,
    title: "Granary stores blighted with grey mould",
    description:
      "The east granary is covered in a grey mould that spreads overnight. It smells of wet ash. About a third of the winter grain is ruined and families are beginning to ration.",
    category: "water_food",
    severity: "moderate",
    villageId: "blackbriar",
    location: "East granary, Miller's Lane",
    reporter: { anonymous: false, name: "Ada Fenwick" },
    events: [
      sys(9 * D),
      {
        ago: 9 * D - 1 * H,
        kind: "status",
        to: "acknowledged",
        team: "Granary Wardens",
        message: "Granary Wardens assigned. Do not eat from the east granary.",
        authorName: "Steward Ada Fenwick",
        authorRole: "steward",
      },
      {
        ago: 8 * D,
        kind: "status",
        to: "in_restoration",
        message: "Blighted stores being burned beyond the hedge line.",
        authorName: "Steward Ada Fenwick",
        authorRole: "steward",
      },
      {
        ago: 3 * D,
        kind: "status",
        to: "resolved",
        message: "Granary cleared and scrubbed with salt. Clean grain delivered from Greyhaven; rationing has ended.",
        authorName: "Steward Ada Fenwick",
        authorRole: "steward",
      },
    ],
  },
  {
    sequence: 36,
    title: "Lantern found burning with black flame in the Old Archive",
    description:
      "An archivist found a lantern on a reading desk in the east stacks, burning with a flame that gives off darkness instead of light. The candles nearest it went out and would not relight. No one admits to having brought it in.",
    category: "cursed_artifact",
    severity: "high",
    villageId: "kingsfall",
    location: "Old Archive, east stacks",
    reporter: { anonymous: false, name: "Archivist Pell" },
    events: [
      sys(14 * H),
      {
        ago: 13 * H,
        kind: "status",
        to: "acknowledged",
        team: "Royal Arcanum",
        message: "Royal Arcanum notified. East stacks evacuated.",
        authorName: "Steward Ilsabet Crane",
        authorRole: "steward",
      },
      {
        ago: 11 * H,
        kind: "status",
        to: "in_restoration",
        message: "Arcanists are working to contain the object.",
        authorName: "Steward Ilsabet Crane",
        authorRole: "steward",
      },
      {
        ago: 6 * H,
        kind: "note",
        message: "The lantern is sealed in a lead casket beneath the Archive. Do not approach the east stacks.",
        authorName: "Steward Ilsabet Crane",
        authorRole: "steward",
      },
    ],
  },
  {
    sequence: 37,
    title: "Shelter needs dry bedding and healers",
    description:
      "The chapel hall is sheltering fourteen families whose wells went black. We are out of dry bedding and several children have the grey cough. We need a healer and blankets before the frost.",
    category: "shelter_healing",
    severity: "moderate",
    villageId: "hollowmere",
    location: "Chapel hall, Lantern Square",
    reporter: { anonymous: false, name: "Sister Agnes" },
    events: [
      sys(1 * D),
      {
        ago: 20 * H,
        kind: "status",
        to: "acknowledged",
        team: "Healers of the Grey Order",
        message: "Two healers and a cart of blankets leaving Kingsfall at first light.",
        authorName: "Steward Wenna Hollis",
        authorRole: "steward",
      },
    ],
  },
  {
    sequence: 38,
    title: "Shadows moving against the wind on the terraces",
    description:
      "On the upper kiln terraces, the shadows of the chimneys lean towards the east no matter where the sun is. Tonight they started to move while nothing else did. No one has been hurt, but the children are frightened.",
    category: "magical_anomaly",
    severity: "low",
    villageId: "ashenreach",
    location: "Upper kiln terraces",
    reporter: { anonymous: true, name: null },
    events: [sys(5 * H)],
  },
  {
    sequence: 39,
    title: "Messenger ravens refusing to fly south",
    description:
      "None of the keep's ravens will carry messages south toward Kingsfall. They circle the tower and return. Our reports to the Council are now going by rider, which takes two days.",
    category: "communication",
    severity: "moderate",
    villageId: "thornwatch",
    location: "Raven loft, Thornwatch Keep",
    reporter: { anonymous: false, name: "Hob the Loftkeeper" },
    events: [sys(2 * H + 10 * M)],
  },
  {
    sequence: 40,
    title: "Harbour fog horn sounding unprompted",
    description:
      "The harbour fog horn has been sounding on clear nights with no one at the lever. Fishermen worry it is a warning of something coming in from the sea.",
    category: "communication",
    severity: "low",
    villageId: "greyhaven",
    location: "Harbour mouth, the Lamp Mole",
    reporter: { anonymous: false, name: "Jory Penn" },
    events: [
      sys(6 * D),
      {
        ago: 6 * D - 2 * H,
        kind: "status",
        to: "acknowledged",
        team: "Kingsfall City Watch",
        message: "Watch engineer sent to inspect the horn mechanism.",
        authorName: "Steward Lio Marsh",
        authorRole: "steward",
      },
      {
        ago: 5 * D,
        kind: "status",
        to: "resolved",
        message: "The horn's valve was jammed open by salt crust. Cleaned and tested. No enchantment found.",
        authorName: "Steward Lio Marsh",
        authorRole: "steward",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

export const SEED_ANNOUNCEMENTS: SeedAnnouncement[] = [
  {
    id: "dsp-council-artifact",
    title: "The Council investigates a newly discovered cursed artifact",
    summary:
      "A lantern burning with black flame was found in the Old Archive. It is contained. Report any object that behaves the same way.",
    body:
      "Last night an archivist found a lantern in the east stacks of the Old Archive that burns with a flame of darkness. It has been sealed in lead beneath the Archive by the Royal Arcanum, and the east stacks are closed until further notice.\n\nThe Council believes the lantern is one of the artifacts scattered by Kirmada before the Battle of Kingsfall Downs. More may surface.\n\nIf you find an object that dims nearby light, rings, runs backwards, or points always in one direction: do not touch it, do not carry it indoors, and file a report under \"Cursed artifact\" at once.",
    priority: "urgent",
    category: "council",
    villageId: null,
    issuedBy: "The Royal Council",
    ago: 10 * H,
    state: "published",
  },
  {
    id: "dsp-alliance-relays",
    title: "The Alliance Protocol is invoked: allied relays carry the Crown's word",
    summary:
      "With the Moonfall beacons dark, KAPIDHWAJ's signal relays now link every village to the Royal Dispatch.",
    body:
      "By decree of the Royal Council, the old accord with KAPIDHWAJ — the allied order of ward engineers and signal keepers — has been invoked.\n\nWhile the Moonfall beacons remain dark, the alliance's relays carry reports from every village to the stewards in Kingsfall, and carry the Crown's dispatches back. Alliance wardwrights are also standing with Company III on the Thornwatch ridge.\n\nNothing changes for citizens: keep filing reports here. Every signal still reaches the Crown.",
    priority: "advisory",
    category: "council",
    villageId: null,
    issuedBy: "The Royal Council",
    ago: 1 * D + 1 * H,
    state: "published",
  },
  {
    id: "dsp-thornwatch-barrier",
    title: "Protective barrier has failed near Thornwatch",
    summary:
      "Most of the northern ward-stones are dark. Travel on the ridge path is forbidden; families below the keep should shelter inside the walls.",
    body:
      "The ward-line on the northern ridge has failed along most of its length. Wardwright Company III is re-inscribing the stones, beginning in the east.\n\nUntil the line is restored:\n\nDo not travel the ridge path or the scree beneath it, by day or night. Households below the keep should move inside the walls; the keep's hall has beds and fires.\n\nReport any light, sound or movement beyond the line to the Dispatch under \"Damaged protective wards\".",
    priority: "critical",
    category: "wards",
    villageId: "thornwatch",
    issuedBy: "Office of the Wardwrights",
    ago: 1 * D,
    state: "published",
  },
  {
    id: "dsp-hollowmere-water",
    title: "Water restoration has begun in Hollowmere",
    summary:
      "The lake intake is sealed and the filter beds are rebuilt. Boiled water is now safe; the purification rite follows.",
    body:
      "The source of the black water — a drowned bell on the lake bed — has been raised and silenced by the Waterkeepers.\n\nThe filter beds at the intake have been rebuilt. Water drawn from the village pumps is safe once boiled. Do not drink directly from the lake until the purification rite is complete; the Dispatch will announce it here.\n\nCisterns of clean water from Kingsfall remain available at Lantern Square each morning.",
    priority: "advisory",
    category: "water",
    villageId: "hollowmere",
    issuedBy: "Waterkeepers of Hollowmere",
    ago: 20 * H,
    state: "published",
  },
  {
    id: "dsp-western-road",
    title: "Western trade road temporarily closed beyond Ashenreach",
    summary:
      "An ash fissure has opened at the second milestone. Carts must turn back; a foot detour runs through Blackbriar.",
    body:
      "The western trade road is closed at the second milestone west of Ashenreach, where a fissure of warm ash has opened across the road.\n\nCarts and riders must not attempt to cross, especially at night. A foot detour through Blackbriar is open and marked with white stakes. Relief carts are being routed by the south lane.\n\nThe Roadwardens expect to bridge the fissure within the week.",
    priority: "advisory",
    category: "roads",
    villageId: "ashenreach",
    issuedBy: "Roadwardens of the West",
    ago: 2 * D,
    state: "published",
  },
  {
    id: "dsp-lantern-curfew",
    title: "Keep one light burning after dusk",
    summary: "Every household is asked to keep a single lamp lit through the night until the curse is lifted.",
    body:
      "By order of the Council, every household in the kingdom is asked to keep a single lamp burning from dusk until dawn.\n\nGreyhaven is sending lamp-oil to every village; stewards will distribute it free of charge.\n\nA lit window helps the Watch see the streets, and reminds neighbours they are not alone.",
    priority: "routine",
    category: "relief",
    villageId: null,
    issuedBy: "The Royal Council",
    ago: 4 * D,
    state: "published",
  },
  {
    id: "dsp-moonfall-refuge",
    title: "Moonfall bell-tower open as refuge",
    summary: "Superseded: the bell-tower is now locked after the midnight ringing began.",
    body:
      "The Old Bell-Tower in Moonfall was opened as a night refuge on the first day of the curse.\n\nThis notice is superseded. The tower has been locked since the midnight ringing began; families should shelter at the beacon-keepers' hall instead.",
    priority: "routine",
    category: "relief",
    villageId: "moonfall",
    issuedBy: "Steward Osric Penhale",
    ago: 3 * D,
    state: "archived",
  },
];

/* ------------------------------------------------------------------ */
/* Restoration initiatives                                             */
/* ------------------------------------------------------------------ */

export const SEED_INITIATIVES: SeedInitiative[] = [
  {
    id: "init-northern-wards",
    title: "Re-binding the Northern Wards",
    summary:
      "Re-inscribing the thirty-one ward-stones of the Thornwatch ridge with the binding words recovered from the Thornbound Codex.",
    villageId: "thornwatch",
    lead: "Wardwright Company III",
    incidentSequences: [32, 39],
    milestones: [
      { id: "ms-nw-1", title: "Survey every ward-stone on the ridge", doneAgo: 20 * H },
      { id: "ms-nw-2", title: "Recover the binding words from the Codex", doneAgo: 18 * H },
      { id: "ms-nw-3", title: "Re-inscribe the twelve eastern stones", doneAgo: null },
      { id: "ms-nw-4", title: "Re-inscribe the nineteen western stones", doneAgo: null },
      { id: "ms-nw-5", title: "Hold the vigil of confirmation", doneAgo: null },
    ],
    nextSteps: [
      "Re-inscription of the eastern stones begins at dawn.",
      "Ridge path stays closed until the vigil is complete.",
    ],
    updates: [
      {
        ago: 18 * H,
        message: "Binding words confirmed against three surviving pages. Ink and chisels issued.",
        authorName: "Steward Bram Holloway",
      },
    ],
  },
  {
    id: "init-hollowmere-waters",
    title: "Clearing the Hollowmere Waters",
    summary: "Removing the source of the black water and restoring safe drinking water to every well-house.",
    villageId: "hollowmere",
    lead: "Waterkeepers of Hollowmere",
    incidentSequences: [31, 37],
    milestones: [
      { id: "ms-hw-1", title: "Seal the lake intake", doneAgo: 4 * D },
      { id: "ms-hw-2", title: "Raise the drowned bell", doneAgo: 1 * D },
      { id: "ms-hw-3", title: "Rebuild the filter beds", doneAgo: 3 * H },
      { id: "ms-hw-4", title: "Perform the purification rite", doneAgo: null },
      { id: "ms-hw-5", title: "Reopen all well-houses", doneAgo: null },
    ],
    nextSteps: ["Purification rite at the next new moon.", "Well-houses reopen one by one after testing."],
    updates: [
      {
        ago: 3 * H,
        message: "Filter beds rebuilt; boiled water declared safe.",
        authorName: "Steward Wenna Hollis",
      },
    ],
  },
  {
    id: "init-western-road",
    title: "Reopening the Western Trade Road",
    summary: "Bridging the ash fissure at the second milestone so carts can reach the western villages again.",
    villageId: "ashenreach",
    lead: "Roadwardens of the West",
    incidentSequences: [33],
    milestones: [
      { id: "ms-wr-1", title: "Map the fissure", doneAgo: 1 * D + 4 * H },
      { id: "ms-wr-2", title: "Open the foot detour via Blackbriar", doneAgo: 1 * D + 4 * H },
      { id: "ms-wr-3", title: "Bridge the fissure with ironwood", doneAgo: null },
      { id: "ms-wr-4", title: "Reopen the road to carts", doneAgo: null },
    ],
    nextSteps: ["Ironwood beams arriving from Blackbriar.", "Night crossings remain forbidden."],
    updates: [
      {
        ago: 1 * D + 4 * H,
        message: "Detour staked in white. Foot traffic moving; carts held at Ashenreach.",
        authorName: "Steward Corin Ashby",
      },
    ],
  },
  {
    id: "init-moonfall-beacons",
    title: "Rekindling the Moonfall Beacons",
    summary: "Restoring the eastern signal line and silencing the midnight bells.",
    villageId: "moonfall",
    lead: "Signal Corps of Moonfall",
    incidentSequences: [34],
    milestones: [
      { id: "ms-mb-0", title: "Raise an Alliance Protocol relay on the cliffs", doneAgo: 1 * D + 1 * H },
      { id: "ms-mb-1", title: "Inspect all seven beacons", doneAgo: 1 * D },
      { id: "ms-mb-2", title: "Silence the midnight bells", doneAgo: null },
      { id: "ms-mb-3", title: "Relight the seven beacons", doneAgo: null },
      { id: "ms-mb-4", title: "Restore the raven post", doneAgo: null },
    ],
    nextSteps: [
      "Arcanists to examine the bell-tower before anyone enters it.",
      "Messages east travel on the allied relay until the beacons are relit.",
    ],
    updates: [
      {
        ago: 1 * D,
        message: "Beacon oil is sound; the darkness is in the flame itself. Requesting the Arcanum.",
        authorName: "Steward Osric Penhale",
      },
    ],
  },
  {
    id: "init-blackbriar-granary",
    title: "Blackbriar Granary Recovery",
    summary: "Clearing the grey mould and resupplying the western villages' winter grain.",
    villageId: "blackbriar",
    lead: "Granary Wardens",
    incidentSequences: [35],
    milestones: [
      { id: "ms-bg-1", title: "Burn the blighted stores", doneAgo: 8 * D },
      { id: "ms-bg-2", title: "Salt-scrub the granary", doneAgo: 5 * D },
      { id: "ms-bg-3", title: "Resupply from Greyhaven", doneAgo: 3 * D },
    ],
    nextSteps: ["Monthly inspection of all granaries until spring."],
    updates: [
      {
        ago: 3 * D,
        message: "Clean grain delivered. Rationing ended across Blackbriar.",
        authorName: "Steward Ada Fenwick",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* The Grimoire                                                        */
/* ------------------------------------------------------------------ */

export const SEED_ARTIFACTS: SeedArtifact[] = [
  {
    id: "lantern-of-unlit-hours",
    name: "The Lantern of Unlit Hours",
    epithet: "It burns, and the room grows darker.",
    glyph: "lantern",
    origin: "Found in the Old Archive, Kingsfall",
    description:
      "A tarnished iron lantern whose flame casts darkness instead of light. Nearby candles gutter and refuse to relight.",
    lore:
      "Kirmada is said to have carried it through the siege of Kingsfall so that no sentry would see him pass. Where it burns, the night forgets to end.",
    disaster: "Its twin flame is believed to be smothering the Moonfall beacons.",
    containment: "Sealed in lead beneath the Archive",
    villageId: "kingsfall",
    incidentSequences: [36, 34],
  },
  {
    id: "thornbound-codex",
    name: "The Thornbound Codex",
    epithet: "Its pages were once the wards themselves.",
    glyph: "codex",
    origin: "Pages scattered along the Thornwatch ridge",
    description:
      "A book bound in briar, whose pages hold the binding words that wake the ward-stones. Kirmada tore it apart; its pages drift on the ridge wind.",
    lore:
      "Each page Kirmada tore loose put out a stone on the northern line. Each page recovered lets a wardwright light one again.",
    disaster: "Its unbinding caused the failure of the northern ward-line.",
    containment: "Fragments recovered — three pages",
    villageId: "thornwatch",
    incidentSequences: [32],
  },
  {
    id: "drowned-bell",
    name: "The Drowned Bell",
    epithet: "It tolled once, under the water.",
    glyph: "bell",
    origin: "Raised from the bed of Hollowmere lake",
    description:
      "A small bronze bell, green with age, its clapper bound with black hair. When it rang beneath the lake, the water turned to ink.",
    lore:
      "The fishers say Kirmada drowned it there as a promise: that one day every bell in the kingdom would ring for him.",
    disaster: "Its tolling poisoned the Hollowmere waters.",
    containment: "Raised and silenced by the Waterkeepers",
    villageId: "hollowmere",
    incidentSequences: [31],
  },
  {
    id: "ashen-compass",
    name: "The Ashen Compass",
    epithet: "It does not point north.",
    glyph: "compass",
    origin: "Last seen on the Ashenreach terraces",
    description:
      "A brass compass filled with grey ash instead of a needle. The ash gathers and points, always, toward the same place under Kingsfall Downs.",
    lore:
      "Travellers who follow it never arrive where they meant to go. The road it opens is a wound, and the earth splits to make way for it.",
    disaster: "Linked to the ash fissure on the western trade road and the leaning shadows of the terraces.",
    containment: "Unaccounted for",
    villageId: "ashenreach",
    incidentSequences: [33, 38],
  },
  {
    id: "sleepers-hourglass",
    name: "The Sleeper's Hourglass",
    epithet: "The sand runs upward.",
    glyph: "hourglass",
    origin: "Beneath Kingsfall Downs, in the Sleeper's barrow",
    description:
      "An hourglass of black glass buried with the one the Crown believed it had defeated. Its sand falls upward, and very little of it remains below.",
    lore:
      "Kirmada did not die at the Battle of Kingsfall Downs. He slept, and set a glass to wake him. The Council's scryers read the remaining sand at thirteen minutes and four seconds.",
    disaster: "The source of the curse clock that every steward now watches.",
    containment: "Running",
    villageId: "kingsfall",
    incidentSequences: [],
  },
];

/* ------------------------------------------------------------------ */
/* The awakening — records that surface when the Sleeper wakes         */
/* ------------------------------------------------------------------ */

export const AWAKENING_INCIDENTS: Omit<SeedIncident, "sequence" | "events">[] = [
  {
    title: "The barrow-stones beneath Kingsfall Downs have split",
    description:
      "At the moment the curse clock reached zero, the capstone of the Sleeper's barrow cracked from end to end. Cold air is pouring from the opening and the grass around it has turned grey. The Watch has drawn a cordon but no one will go nearer.",
    category: "magical_anomaly",
    severity: "critical",
    villageId: "kingsfall",
    location: "The Sleeper's Barrow, Kingsfall Downs",
    reporter: { anonymous: false, name: "Watch of the Barrow" },
  },
  {
    title: "Every clock in Moonfall stopped at 13:04",
    description:
      "Every clock, sundial and hourglass in Moonfall has stopped at the same moment, reading thirteen and four. The midnight bells rang once more and then fell silent. People are gathering in the square and asking what it means.",
    category: "magical_anomaly",
    severity: "high",
    villageId: "moonfall",
    location: "Moonfall village square",
    reporter: { anonymous: false, name: "Beacon-keeper Rhosyn" },
  },
];

export const AWAKENING_ANNOUNCEMENT: Omit<Announcement, "publishedAt"> = {
  id: "dsp-the-sleeper-has-awakened",
  title: "The Sleeper has awakened",
  summary:
    "The barrow beneath Kingsfall Downs has opened. Kirmada stirs. Report every new disturbance to the Dispatch at once.",
  body:
    "The curse clock has run out. At that moment the capstone of the barrow beneath Kingsfall Downs split, and every clock in Moonfall stopped.\n\nThe Council now believes the Sleeper is Kirmada himself, who did not die at the Battle of Kingsfall Downs but bound himself in sleep with the artifacts scattered across the kingdom.\n\nAll citizens: stay within lamplight after dusk. Do not approach the Downs. Report every new disturbance to the Royal Dispatch — every signal matters now more than ever.\n\nThe Dispatch remains open. Your reports and every restoration effort already under way continue unchanged.",
  priority: "critical",
  category: "curse",
  villageId: null,
  issuedBy: "The Royal Council",
  state: "published",
};

/* ------------------------------------------------------------------ */
/* Materialisation                                                     */
/* ------------------------------------------------------------------ */

export interface KingdomState {
  version: 1;
  nextSequence: number;
  incidents: Incident[];
  villages: Village[];
  announcements: Announcement[];
  initiatives: Initiative[];
  artifacts: Artifact[];
  awakeningAppliedAt: string | null;
}

export function formatReference(prefix: string, year: number, sequence: number) {
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function seedIncidentId(sequence: number) {
  return `inc-${String(sequence).padStart(4, "0")}`;
}

/** Build a fresh kingdom state with seed timestamps relative to `now`. */
export function buildSeedState(now: number, prefix = "KNG"): KingdomState {
  const at = (ago: number) => new Date(now - ago * 60_000).toISOString();
  const year = new Date(now).getFullYear();

  const incidents: Incident[] = SEED_INCIDENTS.map((seed) => {
    let status: IncidentStatus = "submitted";
    let assignedTeam: string | null = null;
    const updates = seed.events.map((event, index) => {
      const fromStatus = status;
      if (event.to) status = event.to;
      if (event.team) assignedTeam = event.team;
      return {
        id: `${seedIncidentId(seed.sequence)}-u${index}`,
        at: at(event.ago),
        kind: event.kind,
        message: event.message,
        authorName: event.authorName,
        authorRole: event.authorRole,
        ...(event.to ? { fromStatus, toStatus: event.to } : {}),
      };
    });
    return {
      id: seedIncidentId(seed.sequence),
      reference: formatReference(prefix, year, seed.sequence),
      title: seed.title,
      description: seed.description,
      category: seed.category,
      severity: seed.severity,
      villageId: seed.villageId,
      location: seed.location,
      submittedAt: at(seed.events[0].ago),
      updatedAt: at(seed.events[seed.events.length - 1].ago),
      status,
      reporter: seed.reporter,
      assignedTeam,
      attachment: null,
      updates,
    };
  });

  const villages: Village[] = SEED_VILLAGES.map((seed) => ({
    id: seed.id,
    name: seed.name,
    epithet: seed.epithet,
    description: seed.description,
    condition: seed.condition,
    services: { ...seed.services },
    restoration: seed.restoration,
    map: seed.map,
    updatedAt: at(Math.min(...seed.log.map((l) => l.ago))),
    log: seed.log.map((entry, index) => ({
      id: `${seed.id}-log${index}`,
      at: at(entry.ago),
      message: entry.message,
      authorName: entry.authorName,
      restoration: entry.restoration,
    })),
  }));

  const announcements: Announcement[] = SEED_ANNOUNCEMENTS.map(({ ago, ...rest }) => ({
    ...rest,
    publishedAt: at(ago),
  }));

  const initiatives: Initiative[] = SEED_INITIATIVES.map(
    ({ incidentSequences, milestones, updates, ...rest }) => ({
      ...rest,
      incidentIds: incidentSequences.map(seedIncidentId),
      milestones: milestones.map((m) => ({
        id: m.id,
        title: m.title,
        done: m.doneAgo !== null,
        doneAt: m.doneAgo !== null ? at(m.doneAgo) : null,
      })),
      updates: updates.map((u, index) => ({
        id: `${rest.id}-up${index}`,
        at: at(u.ago),
        message: u.message,
        authorName: u.authorName,
      })),
    }),
  );

  const artifacts: Artifact[] = SEED_ARTIFACTS.map(({ incidentSequences, ...rest }) => ({
    ...rest,
    incidentIds: incidentSequences.map(seedIncidentId),
  }));

  const maxSequence = Math.max(...SEED_INCIDENTS.map((i) => i.sequence));

  return {
    version: 1,
    nextSequence: maxSequence + 1,
    incidents,
    villages,
    announcements,
    initiatives,
    artifacts,
    awakeningAppliedAt: null,
  };
}
