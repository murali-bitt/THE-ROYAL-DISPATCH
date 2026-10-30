import type {
  AnnouncementInput,
  IncidentNoteInput,
  MilestoneInput,
  NewIncidentInput,
  TransitionInput,
  VillageManageInput,
  VillageProgressInput,
} from "@/lib/validation";
import type {
  Actor,
  Announcement,
  Incident,
  Initiative,
  KingdomSnapshot,
  PublicationState,
  Village,
} from "@/types/domain";

export type DataMode = "demo" | "supabase";

export interface Mutation<T> {
  snapshot: KingdomSnapshot;
  record: T;
}

/**
 * The UI talks only to this interface. The demo implementation keeps state in
 * localStorage; the Supabase implementation calls the server API, where the
 * session — not the client — decides the actor and the database enforces RLS.
 */
export interface KingdomRepository {
  readonly mode: DataMode;
  load(): Promise<KingdomSnapshot>;
  createIncident(input: NewIncidentInput, actor: Actor): Promise<Mutation<Incident>>;
  transitionIncident(id: string, input: TransitionInput, actor: Actor): Promise<Mutation<Incident>>;
  addIncidentNote(id: string, input: IncidentNoteInput, actor: Actor): Promise<Mutation<Incident>>;
  updateVillageProgress(id: string, input: VillageProgressInput, actor: Actor): Promise<Mutation<Village>>;
  manageVillage(id: string, input: VillageManageInput, actor: Actor): Promise<Mutation<Village>>;
  publishAnnouncement(input: AnnouncementInput, actor: Actor): Promise<Mutation<Announcement>>;
  setAnnouncementState(id: string, state: PublicationState, actor: Actor): Promise<Mutation<Announcement>>;
  setMilestone(initiativeId: string, input: MilestoneInput, actor: Actor): Promise<Mutation<Initiative>>;
  applyAwakening(): Promise<KingdomSnapshot>;
  /** Demo only: restore the seeded kingdom. */
  reset?(): Promise<KingdomSnapshot>;
  /** Demo only: notify when another tab changes the stored kingdom. */
  subscribe?(onChange: () => void): () => void;
}

export class RepositoryError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
    public status = 400,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}
