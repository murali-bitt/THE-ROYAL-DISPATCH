import { STORAGE_KEYS } from "@/lib/config";
import { PermissionError } from "@/lib/permissions";
import * as mutate from "@/lib/data/mutations";
import { buildSeedState, type KingdomState } from "@/lib/data/seed";
import { RepositoryError, type KingdomRepository, type Mutation } from "@/lib/data/repository";
import type { KingdomSnapshot } from "@/types/domain";

/**
 * Local demo provider. The whole kingdom lives in one localStorage entry, so
 * every page reads the same records and mutations survive refreshes.
 * Each mutation re-reads storage first, so two open tabs never clobber each
 * other's changes.
 *
 * This is a simulation: the role comes from the demo switcher and is
 * enforced here only so the demo behaves like the real thing.
 */

function isKingdomState(value: unknown): value is KingdomState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<KingdomState>;
  return (
    v.version === 1 &&
    typeof v.nextSequence === "number" &&
    Array.isArray(v.incidents) &&
    Array.isArray(v.villages) &&
    Array.isArray(v.announcements) &&
    Array.isArray(v.initiatives) &&
    Array.isArray(v.artifacts)
  );
}

function toSnapshot(state: KingdomState): KingdomSnapshot {
  return {
    incidents: state.incidents,
    villages: state.villages,
    announcements: state.announcements,
    initiatives: state.initiatives,
    artifacts: state.artifacts,
    awakeningAppliedAt: state.awakeningAppliedAt,
  };
}

function read(): KingdomState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.state);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isKingdomState(parsed)) return parsed;
    }
  } catch {
    // Corrupt or unavailable storage: fall through to a fresh seed.
  }
  const seeded = buildSeedState(Date.now());
  write(seeded, { quiet: true });
  return seeded;
}

function write(state: KingdomState, options: { quiet?: boolean } = {}) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(state));
  } catch {
    if (options.quiet) return;
    throw new RepositoryError(
      "Your browser's storage is full or blocked, so the change was not saved. Try removing the image or resetting the demo.",
      {},
      507,
    );
  }
}

function run<T>(fn: (state: KingdomState) => { state: KingdomState } & Record<string, unknown>, key: string): Mutation<T> {
  const current = read();
  let result: { state: KingdomState } & Record<string, unknown>;
  try {
    result = fn(current);
  } catch (error) {
    if (error instanceof mutate.DomainValidationError) throw new RepositoryError(error.message, error.fields, 422);
    if (error instanceof mutate.NotFoundError) throw new RepositoryError(error.message, {}, 404);
    if (error instanceof PermissionError) throw new RepositoryError(error.message, {}, 403);
    throw error;
  }
  write(result.state);
  return { snapshot: toSnapshot(result.state), record: result[key] as T };
}

// Simulate a short network round-trip so loading states are honest in the demo.
const settle = () => new Promise((resolve) => setTimeout(resolve, 220));

export function createLocalRepository(): KingdomRepository {
  return {
    mode: "demo",
    async load() {
      return toSnapshot(read());
    },
    async createIncident(input, actor) {
      await settle();
      return run((s) => mutate.createIncident(s, input, actor), "incident");
    },
    async transitionIncident(id, input, actor) {
      await settle();
      return run((s) => mutate.transitionIncident(s, id, input, actor), "incident");
    },
    async addIncidentNote(id, input, actor) {
      await settle();
      return run((s) => mutate.addIncidentNote(s, id, input, actor), "incident");
    },
    async updateVillageProgress(id, input, actor) {
      await settle();
      return run((s) => mutate.updateVillageProgress(s, id, input, actor), "village");
    },
    async manageVillage(id, input, actor) {
      await settle();
      return run((s) => mutate.manageVillage(s, id, input, actor), "village");
    },
    async publishAnnouncement(input, actor) {
      await settle();
      return run((s) => mutate.publishAnnouncement(s, input, actor), "announcement");
    },
    async setAnnouncementState(id, state, actor) {
      await settle();
      return run((s) => mutate.setAnnouncementState(s, id, state, actor), "announcement");
    },
    async setMilestone(initiativeId, input, actor) {
      await settle();
      return run((s) => mutate.setMilestone(s, initiativeId, input, actor), "initiative");
    },
    async applyAwakening() {
      const current = read();
      const next = mutate.applyAwakening(current);
      if (next !== current) write(next, { quiet: true });
      return toSnapshot(next);
    },
    async reset() {
      const seeded = buildSeedState(Date.now());
      write(seeded);
      return toSnapshot(seeded);
    },
    subscribe(onChange) {
      const handler = (event: StorageEvent) => {
        if (event.key === STORAGE_KEYS.state) onChange();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
  };
}
