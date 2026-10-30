import { describe, expect, it } from "vitest";
import * as m from "@/lib/data/mutations";
import { buildSeedState } from "@/lib/data/seed";
import { PermissionError } from "@/lib/permissions";
import { initiativeProgress } from "@/lib/selectors";
import type { Actor } from "@/types/domain";

const NOW = new Date("2026-10-30T12:00:00Z").getTime();
const citizen: Actor = { role: "citizen", name: "Citizen" };
const steward: Actor = { role: "steward", name: "Steward Test" };
const admin: Actor = { role: "admin", name: "Councillor Test" };

const report = {
  title: "Bridge stones humming at night",
  category: "magical_anomaly" as const,
  villageId: "hollowmere",
  location: "Old stone bridge",
  description: "Every night the stones of the old bridge hum loudly and frost forms on the railings.",
  severity: "high" as const,
  anonymous: false,
  reporterName: "Tamsin",
  attachment: null,
};

describe("createIncident", () => {
  it("mints the next readable reference and records a submitted entry", () => {
    const state = buildSeedState(NOW);
    const { state: next, incident } = m.createIncident(state, report, citizen, new Date(NOW));
    expect(incident.reference).toBe("KNG-2026-0041");
    expect(incident.status).toBe("submitted");
    expect(incident.updates).toHaveLength(1);
    expect(next.nextSequence).toBe(state.nextSequence + 1);
    expect(next.incidents[0].id).toBe(incident.id);
    // the original state is never mutated
    expect(state.incidents).toHaveLength(10);
  });

  it("drops the reporter name for anonymous reports", () => {
    const { incident } = m.createIncident(buildSeedState(NOW), { ...report, anonymous: true }, citizen);
    expect(incident.reporter).toEqual({ anonymous: true, name: null });
  });

  it("rejects malformed reports with field errors", () => {
    expect(() => m.createIncident(buildSeedState(NOW), { ...report, title: "x", description: "short" }, citizen)).toThrow(
      m.DomainValidationError,
    );
    try {
      m.createIncident(buildSeedState(NOW), { ...report, title: "x" }, citizen);
    } catch (error) {
      expect((error as m.DomainValidationError).fields.title).toBeTruthy();
    }
  });

  it("rejects unknown villages and unsafe attachments", () => {
    expect(() => m.createIncident(buildSeedState(NOW), { ...report, villageId: "atlantis" }, citizen)).toThrow(m.NotFoundError);
    expect(() =>
      m.createIncident(buildSeedState(NOW), { ...report, attachment: "data:image/svg+xml;base64,PHN2Zz4=" }, citizen),
    ).toThrow(m.DomainValidationError);
  });
});

describe("incident lifecycle", () => {
  const fresh = () => m.createIncident(buildSeedState(NOW), report, citizen);

  it("forbids citizens from changing status", () => {
    const { state, incident } = fresh();
    expect(() => m.transitionIncident(state, incident.id, { to: "acknowledged", team: "Royal Arcanum" }, citizen)).toThrow(
      PermissionError,
    );
  });

  it("requires a team to acknowledge and a note to resolve", () => {
    const { state, incident } = fresh();
    expect(() => m.transitionIncident(state, incident.id, { to: "acknowledged" }, steward)).toThrow(m.DomainValidationError);
    const ack = m.transitionIncident(state, incident.id, { to: "acknowledged", team: "Royal Arcanum" }, steward);
    expect(ack.incident.assignedTeam).toBe("Royal Arcanum");
    expect(() => m.transitionIncident(ack.state, incident.id, { to: "resolved" }, steward)).toThrow(m.DomainValidationError);
  });

  it("follows SUBMITTED → ACKNOWLEDGED → IN RESTORATION → RESOLVED and never skips", () => {
    const { state, incident } = fresh();
    expect(() => m.transitionIncident(state, incident.id, { to: "resolved", note: "Done and dusted now." }, steward)).toThrow(
      m.DomainValidationError,
    );
    let s = m.transitionIncident(state, incident.id, { to: "acknowledged", team: "Royal Arcanum" }, steward).state;
    s = m.transitionIncident(s, incident.id, { to: "in_restoration" }, steward).state;
    const done = m.transitionIncident(s, incident.id, { to: "resolved", note: "Stones re-set and blessed." }, steward);
    expect(done.incident.status).toBe("resolved");
    expect(done.incident.updates.map((u) => u.toStatus).filter(Boolean)).toEqual(["acknowledged", "in_restoration", "resolved"]);
  });

  it("allows reopening a resolved incident into restoration and preserves prior history", () => {
    const { state, incident } = fresh();
    let s = m.transitionIncident(state, incident.id, { to: "acknowledged", team: "Royal Arcanum" }, steward).state;
    s = m.transitionIncident(s, incident.id, { to: "in_restoration" }, steward).state;
    s = m.transitionIncident(s, incident.id, { to: "resolved", note: "Stones re-set and blessed." }, steward).state;
    const reopened = m.transitionIncident(s, incident.id, { to: "in_restoration", note: "Frost returned after midnight." }, steward);
    expect(reopened.incident.status).toBe("in_restoration");
    expect(reopened.incident.updates).toHaveLength(5);
    expect(reopened.incident.updates.at(-1)).toMatchObject({
      fromStatus: "resolved",
      toStatus: "in_restoration",
      message: "Frost returned after midnight.",
    });
  });

  it("appends steward notes to the timeline", () => {
    const { state, incident } = fresh();
    const { incident: noted } = m.addIncidentNote(state, incident.id, { message: "Wardwrights on the bridge." }, steward);
    expect(noted.updates.at(-1)?.message).toBe("Wardwrights on the bridge.");
    expect(noted.updates.at(-1)?.authorName).toBe("Steward Test");
  });
});

describe("dispatch permissions", () => {
  const dispatch = {
    title: "Lantern oil arrives today",
    summary: "Greyhaven ships have landed lamp oil for every household.",
    body: "Collect your share from the steward's hall before dusk. One flask per household.",
    priority: "routine" as const,
    category: "relief" as const,
    issuedBy: "Steward Test",
  };

  it("lets stewards publish only village dispatches", () => {
    const state = buildSeedState(NOW);
    expect(() => m.publishAnnouncement(state, { ...dispatch, villageId: null }, steward)).toThrow(PermissionError);
    const { announcement } = m.publishAnnouncement(state, { ...dispatch, villageId: "moonfall" }, steward);
    expect(announcement.state).toBe("published");
  });

  it("lets the Council publish kingdom-wide and archive", () => {
    const state = buildSeedState(NOW);
    const { state: s, announcement } = m.publishAnnouncement(state, { ...dispatch, villageId: null }, admin);
    expect(() => m.setAnnouncementState(s, announcement.id, "archived", steward)).toThrow(PermissionError);
    expect(m.setAnnouncementState(s, announcement.id, "archived", admin).announcement.state).toBe("archived");
  });
});

describe("restoration", () => {
  it("records village progress with a log entry", () => {
    const { village } = m.updateVillageProgress(buildSeedState(NOW), "thornwatch", { restoration: 35, message: "Eastern stones lit." }, steward);
    expect(village.restoration).toBe(35);
    expect(village.log.at(-1)?.restoration).toBe(35);
  });

  it("only lets the Council edit the village record itself", () => {
    const state = buildSeedState(NOW);
    const v = state.villages[0];
    const input = { condition: "stable" as const, description: v.description, services: v.services };
    expect(() => m.manageVillage(state, v.id, input, steward)).toThrow(PermissionError);
    expect(m.manageVillage(state, v.id, input, admin).village.condition).toBe("stable");
  });

  it("derives initiative progress from milestones", () => {
    const state = buildSeedState(NOW);
    const initiative = state.initiatives.find((i) => i.id === "init-northern-wards")!;
    expect(initiativeProgress(initiative)).toBe(40);
    const { initiative: next } = m.setMilestone(state, initiative.id, { milestoneId: "ms-nw-3", done: true }, steward);
    expect(initiativeProgress(next)).toBe(60);
  });
});

describe("applyAwakening", () => {
  it("surfaces records exactly once and preserves existing data", () => {
    const { state } = m.createIncident(buildSeedState(NOW), report, citizen);
    const awake = m.applyAwakening(state, new Date(NOW));
    expect(awake.incidents).toHaveLength(state.incidents.length + 2);
    expect(awake.announcements[0].id).toBe("dsp-the-sleeper-has-awakened");
    expect(awake.awakeningAppliedAt).not.toBeNull();
    for (const original of state.incidents) expect(awake.incidents).toContainEqual(original);
    expect(m.applyAwakening(awake)).toBe(awake);
  });
});
