import { describe, expect, it } from "vitest";
import { SLEEPER_DURATION_MS, SPONSOR } from "@/lib/config";
import { buildSeedState } from "@/lib/data/seed";
import {
  DEFAULT_FILTERS,
  filterIncidents,
  kingdomMetrics,
  kingdomRestoration,
  sortIncidents,
} from "@/lib/selectors";
import { computeRemaining, phaseFor } from "@/lib/sleeper/clock";
import { SEVERITY_RANK } from "@/lib/labels";

const NOW = new Date("2026-10-30T12:00:00Z").getTime();
const state = buildSeedState(NOW);

describe("seed data", () => {
  it("meets the minimum content requirements", () => {
    expect(state.villages.length).toBeGreaterThanOrEqual(6);
    expect(state.incidents.length).toBeGreaterThanOrEqual(8);
    expect(state.announcements.length).toBeGreaterThanOrEqual(4);
    expect(state.initiatives.length).toBeGreaterThanOrEqual(3);
    expect(state.artifacts.length).toBeGreaterThanOrEqual(3);
  });

  it("covers every lifecycle status", () => {
    expect(new Set(state.incidents.map((i) => i.status))).toEqual(
      new Set(["submitted", "acknowledged", "in_restoration", "resolved"]),
    );
  });

  it("has unique references and valid relationships", () => {
    const refs = state.incidents.map((i) => i.reference);
    expect(new Set(refs).size).toBe(refs.length);
    const villages = new Set(state.villages.map((v) => v.id));
    const incidents = new Set(state.incidents.map((i) => i.id));
    for (const i of state.incidents) expect(villages.has(i.villageId)).toBe(true);
    for (const a of state.announcements) if (a.villageId) expect(villages.has(a.villageId)).toBe(true);
    for (const i of state.initiatives) {
      expect(villages.has(i.villageId)).toBe(true);
      for (const id of i.incidentIds) expect(incidents.has(id)).toBe(true);
    }
    for (const a of state.artifacts) for (const id of a.incidentIds) expect(incidents.has(id)).toBe(true);
  });

  it("is deterministic for a given moment", () => {
    expect(buildSeedState(NOW)).toEqual(buildSeedState(NOW));
  });
});

describe("filters", () => {
  it("combine with AND semantics", () => {
    const results = filterIncidents(state.incidents, { ...DEFAULT_FILTERS, villageId: "hollowmere", severity: "critical" }, state.villages);
    expect(results.map((i) => i.reference)).toEqual(["KNG-2026-0031"]);
  });

  it("searches reference, text and village name", () => {
    expect(filterIncidents(state.incidents, { ...DEFAULT_FILTERS, query: "0033" }, state.villages)).toHaveLength(1);
    expect(filterIncidents(state.incidents, { ...DEFAULT_FILTERS, query: "lantern archive" }, state.villages)).toHaveLength(1);
    const moonfall = filterIncidents(state.incidents, { ...DEFAULT_FILTERS, query: "moonfall" }, state.villages);
    expect(moonfall.every((i) => i.villageId === "moonfall" || /moonfall/i.test(i.description + i.title + (i.assignedTeam ?? "")))).toBe(true);
  });

  it("supports open-only status filtering", () => {
    const open = filterIncidents(state.incidents, { ...DEFAULT_FILTERS, status: "open" }, state.villages);
    expect(open.every((i) => i.status !== "resolved")).toBe(true);
  });

  it("sorts by severity with open incidents first", () => {
    const sorted = sortIncidents(state.incidents, "severity");
    expect(sorted[0].severity).toBe("critical");
    const openRanks = sorted.filter((i) => i.status !== "resolved").map((i) => SEVERITY_RANK[i.severity]);
    expect([...openRanks].sort((a, b) => b - a)).toEqual(openRanks);
  });
});

describe("metrics", () => {
  it("are computed from records", () => {
    const m = kingdomMetrics(state);
    expect(m.openIncidents).toBe(state.incidents.filter((i) => i.status !== "resolved").length);
    expect(m.restorationIndex).toBe(Math.round(state.villages.reduce((s, v) => s + v.restoration, 0) / state.villages.length));
    expect(kingdomRestoration([])).toBe(0);
  });
});

describe("the Sleeper's clock", () => {
  it("is 13 minutes and 4 seconds long", () => {
    expect(SLEEPER_DURATION_MS).toBe(784_000);
    expect(computeRemaining(NOW, NOW)).toBe(784);
  });

  it("counts down and never goes negative", () => {
    expect(computeRemaining(NOW, NOW + 4_000)).toBe(780);
    expect(computeRemaining(NOW, NOW + 784_000)).toBe(0);
    expect(computeRemaining(NOW, NOW + 10_000_000)).toBe(0);
  });

  it("moves through narrative phases", () => {
    expect(phaseFor(784)).toBe("dormant");
    expect(phaseFor(400)).toBe("stirring");
    expect(phaseFor(120)).toBe("restless");
    expect(phaseFor(30)).toBe("waking");
    expect(phaseFor(0)).toBe("awakened");
  });
});

describe("the Alliance Protocol", () => {
  it("uses the sponsor handle and URL exactly as briefed", () => {
    expect(SPONSOR.handle).toBe("@kapidhwaj.innovations");
    expect(SPONSOR.instagramUrl).toBe("https://www.instagram.com/kapidhwaj.innovations/");
  });
});
