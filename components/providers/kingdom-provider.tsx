"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { STORAGE_KEYS } from "@/lib/config";
import { isSupabaseConfigured } from "@/lib/env";
import { createLocalRepository } from "@/lib/data/local-repository";
import { createRemoteRepository } from "@/lib/data/remote-repository";
import type { DataMode, KingdomRepository } from "@/lib/data/repository";
import { restartClock } from "@/lib/sleeper/clock";
import type {
  AnnouncementInput,
  IncidentNoteInput,
  MilestoneInput,
  NewIncidentInput,
  TransitionInput,
  VillageManageInput,
  VillageProgressInput,
} from "@/lib/validation";
import { ROLES, type Actor, type KingdomSnapshot, type PublicationState, type Role } from "@/types/domain";

const DEMO_ACTORS: Record<Role, Actor> = {
  citizen: { role: "citizen", name: "Citizen" },
  steward: { role: "steward", name: "Steward Maren Vell" },
  admin: { role: "admin", name: "Councillor Oswin Hale" },
};

const EMPTY: KingdomSnapshot = {
  incidents: [],
  villages: [],
  announcements: [],
  initiatives: [],
  artifacts: [],
  awakeningAppliedAt: null,
};

type Status = "loading" | "ready" | "error";

interface KingdomContextValue {
  mode: DataMode;
  status: Status;
  error: string | null;
  snapshot: KingdomSnapshot;
  actor: Actor;
  signedIn: boolean;
  setDemoRole: (role: Role) => void;
  reload: () => Promise<void>;
  refreshSession: () => Promise<void>;
  actions: {
    createIncident: (input: NewIncidentInput) => ReturnType<KingdomRepository["createIncident"]>;
    transitionIncident: (id: string, input: TransitionInput) => ReturnType<KingdomRepository["transitionIncident"]>;
    addIncidentNote: (id: string, input: IncidentNoteInput) => ReturnType<KingdomRepository["addIncidentNote"]>;
    updateVillageProgress: (id: string, input: VillageProgressInput) => ReturnType<KingdomRepository["updateVillageProgress"]>;
    manageVillage: (id: string, input: VillageManageInput) => ReturnType<KingdomRepository["manageVillage"]>;
    publishAnnouncement: (input: AnnouncementInput) => ReturnType<KingdomRepository["publishAnnouncement"]>;
    setAnnouncementState: (id: string, state: PublicationState) => ReturnType<KingdomRepository["setAnnouncementState"]>;
    setMilestone: (initiativeId: string, input: MilestoneInput) => ReturnType<KingdomRepository["setMilestone"]>;
    applyAwakening: () => Promise<void>;
    resetDemo: () => Promise<void>;
  };
}

const KingdomContext = createContext<KingdomContextValue | null>(null);

/* The demo role is a tiny external store over localStorage, shared across tabs. */
const roleListeners = new Set<() => void>();

function readStoredRole(): Role {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.role);
    if (stored && (ROLES as readonly string[]).includes(stored)) return stored as Role;
  } catch {
    // ignore
  }
  return "citizen";
}

function writeStoredRole(role: Role) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.role, role);
  } catch {
    // ignore — the role lasts for this page view only
  }
  for (const listener of roleListeners) listener();
}

function subscribeRole(listener: () => void) {
  roleListeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEYS.role) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    roleListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const serverRole = (): Role => "citizen";

export function KingdomProvider({ children }: { children: ReactNode }) {
  const repository = useMemo<KingdomRepository>(
    () => (isSupabaseConfigured ? createRemoteRepository() : createLocalRepository()),
    [],
  );
  const [snapshot, setSnapshot] = useState<KingdomSnapshot>(EMPTY);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ actor: Actor; signedIn: boolean }>({
    actor: DEMO_ACTORS.citizen,
    signedIn: false,
  });
  const demoRole = useSyncExternalStore(subscribeRole, readStoredRole, serverRole);
  const actor = repository.mode === "demo" ? DEMO_ACTORS[demoRole] : session.actor;
  const signedIn = session.signedIn;
  const awakeningRequested = useRef(false);

  const reload = useCallback(
    () =>
      repository.load().then(
        (next) => {
          setSnapshot(next);
          setStatus("ready");
          setError(null);
        },
        (err: unknown) => {
          setError(err instanceof Error ? err.message : "The kingdom's records could not be loaded.");
          setStatus("error");
        },
      ),
    [repository],
  );

  // In production the actor comes from the server session, never the client.
  const refreshSession = useCallback((): Promise<void> => {
    if (repository.mode === "demo") return Promise.resolve();
    return fetch("/api/session", { cache: "no-store" })
      .then((response) => (response.ok ? (response.json() as Promise<{ signedIn: boolean; actor: Actor }>) : null))
      .then(
        (body) => {
          if (body) setSession({ actor: body.actor, signedIn: body.signedIn });
        },
        () => undefined, // keep the previous session
      );
  }, [repository]);

  useEffect(() => {
    // Initial load runs only in the browser; the server renders skeletons.
    void reload();
    void refreshSession();
    return repository.subscribe?.(() => void reload());
  }, [reload, refreshSession, repository]);

  const setDemoRole = useCallback(
    (role: Role) => {
      if (repository.mode === "demo") writeStoredRole(role);
    },
    [repository],
  );

  const actions = useMemo<KingdomContextValue["actions"]>(() => {
    async function commit<T>(promise: Promise<{ snapshot: KingdomSnapshot; record: T }>) {
      const result = await promise;
      setSnapshot(result.snapshot);
      return result;
    }
    return {
      createIncident: (input) => commit(repository.createIncident(input, actor)),
      transitionIncident: (id, input) => commit(repository.transitionIncident(id, input, actor)),
      addIncidentNote: (id, input) => commit(repository.addIncidentNote(id, input, actor)),
      updateVillageProgress: (id, input) => commit(repository.updateVillageProgress(id, input, actor)),
      manageVillage: (id, input) => commit(repository.manageVillage(id, input, actor)),
      publishAnnouncement: (input) => commit(repository.publishAnnouncement(input, actor)),
      setAnnouncementState: (id, state) => commit(repository.setAnnouncementState(id, state, actor)),
      setMilestone: (id, input) => commit(repository.setMilestone(id, input, actor)),
      async applyAwakening() {
        if (awakeningRequested.current) return;
        awakeningRequested.current = true;
        try {
          setSnapshot(await repository.applyAwakening());
        } catch {
          awakeningRequested.current = false;
        }
      },
      async resetDemo() {
        if (!repository.reset) return;
        const fresh = await repository.reset();
        try {
          window.localStorage.removeItem(STORAGE_KEYS.awakeningSeen);
        } catch {
          // ignore
        }
        restartClock();
        awakeningRequested.current = false;
        setSnapshot(fresh);
      },
    };
  }, [repository, actor]);

  const value = useMemo<KingdomContextValue>(
    () => ({ mode: repository.mode, status, error, snapshot, actor, signedIn, setDemoRole, reload, refreshSession, actions }),
    [repository.mode, status, error, snapshot, actor, signedIn, setDemoRole, reload, refreshSession, actions],
  );

  return <KingdomContext.Provider value={value}>{children}</KingdomContext.Provider>;
}

export function useKingdom() {
  const value = useContext(KingdomContext);
  if (!value) throw new Error("useKingdom must be used inside <KingdomProvider>.");
  return value;
}

export function useVillageMap() {
  const { snapshot } = useKingdom();
  return useMemo(() => new Map(snapshot.villages.map((v) => [v.id, v])), [snapshot.villages]);
}
