import { useSyncExternalStore } from "react";
import type { CycleStats, Plan, Session, StudyLog, Subject } from "./study-types";
import { uid } from "./study-types";

export type SavedPlan = {
  id: string;
  name: string;
  createdAt: string;
  subjects: Subject[];
  plan: Plan;
  sessions: Session[];
  cycleStats: CycleStats;
};

export type StudyState = {
  subjects: Subject[];
  plan: Plan | null;
  sessions: Session[];
  cycleStats: CycleStats;
  studyLogs: StudyLog[];
  savedPlans: SavedPlan[];
  activePlanId: string | null;
};

const KEY = "painel-estudos-v1";

const empty: StudyState = {
  subjects: [],
  plan: null,
  sessions: [],
  cycleStats: { completedCycles: 0 },
  studyLogs: [],
  savedPlans: [],
  activePlanId: null,
};

let state: StudyState = empty;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...empty, ...(JSON.parse(raw) as StudyState) };
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  hydrate();
  return () => listeners.delete(listener);
}

export function useStudyState(): StudyState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => empty,
  );
}

export function setState(next: Partial<StudyState>) {
  state = { ...state, ...next };
  syncActivePlan();
  persist();
  emit();
}

/** mantém o planejamento salvo ativo em sincronia com o estado do dashboard */
function syncActivePlan() {
  if (!state.activePlanId || !state.plan) return;
  state.savedPlans = state.savedPlans.map((p) =>
    p.id === state.activePlanId
      ? {
          ...p,
          subjects: state.subjects,
          plan: state.plan as Plan,
          sessions: state.sessions,
          cycleStats: state.cycleStats,
        }
      : p,
  );
}

/** cria (ou atualiza) um planejamento salvo e o define como ativo — persiste imediatamente */
export function savePlanAndActivate(args: {
  id?: string | null;
  name?: string;
  subjects: Subject[];
  plan: Plan;
  sessions: Session[];
  cycleStats?: CycleStats;
}) {
  const existing = args.id ? state.savedPlans.find((p) => p.id === args.id) : undefined;
  const createdAt = existing?.createdAt ?? new Date().toISOString();
  const id = existing?.id ?? uid();
  const name =
    (args.name?.trim() || existing?.name) ??
    `Planejamento de ${new Date(createdAt).toLocaleDateString("pt-BR")}`;
  const cycleStats = args.cycleStats ?? { completedCycles: 0 };
  const entry: SavedPlan = {
    id,
    name,
    createdAt,
    subjects: args.subjects,
    plan: args.plan,
    sessions: args.sessions,
    cycleStats,
  };

  state = {
    ...state,
    subjects: args.subjects,
    plan: args.plan,
    sessions: args.sessions,
    cycleStats,
    activePlanId: id,
    savedPlans: existing
      ? state.savedPlans.map((p) => (p.id === id ? entry : p))
      : [...state.savedPlans, entry],
  };
  persist();
  emit();
  return id;
}

export function openPlan(id: string) {
  const found = state.savedPlans.find((p) => p.id === id);
  if (!found) return;
  state = {
    ...state,
    activePlanId: id,
    subjects: found.subjects,
    plan: found.plan,
    sessions: found.sessions,
    cycleStats: found.cycleStats,
  };
  persist();
  emit();
}

export function deletePlan(id: string) {
  const savedPlans = state.savedPlans.filter((p) => p.id !== id);
  const clearing = state.activePlanId === id;
  state = {
    ...state,
    savedPlans,
    ...(clearing
      ? {
          activePlanId: null,
          subjects: [],
          plan: null,
          sessions: [],
          cycleStats: { completedCycles: 0 },
        }
      : {}),
  };
  persist();
  emit();
}

export function getState() {
  return state;
}

export function addStudyLog(subjectId: string, durationSeconds: number) {
  if (durationSeconds < 1) return;
  setState({
    studyLogs: [
      ...state.studyLogs,
      { id: uid(), subjectId, date: new Date().toISOString(), durationSeconds },
    ],
  });
}

export function updateSession(id: string, patch: Partial<Session>) {
  setState({
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });
}

export function restartCycle() {
  setState({
    sessions: state.sessions.map((s) => ({ ...s, studiedSeconds: 0, completed: false })),
    cycleStats: { completedCycles: state.cycleStats.completedCycles + 1 },
  });
}