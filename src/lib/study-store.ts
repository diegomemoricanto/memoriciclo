import { useSyncExternalStore } from "react";
import type { CycleStats, Plan, Session, StudyLog, Subject } from "./study-types";
import { uid } from "./study-types";

export type StudyState = {
  subjects: Subject[];
  plan: Plan | null;
  sessions: Session[];
  cycleStats: CycleStats;
  studyLogs: StudyLog[];
};

const KEY = "painel-estudos-v1";

const empty: StudyState = {
  subjects: [],
  plan: null,
  sessions: [],
  cycleStats: { completedCycles: 0 },
  studyLogs: [],
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