import { useSyncExternalStore } from "react";
import type { CycleStats, Plan, Session, StudyLog, Subject } from "./study-types";
import { uid } from "./study-types";
import type { MindNode } from "./mindmap-types";
import { getAuth, onUserChange } from "./auth-store";
import {
  deleteRemotePlan,
  insertRemoteStudyLog,
  loadStudyData,
  resetRemoteCycle,
  saveRemotePlan,
  setRemoteActivePlan,
  updateRemoteSession,
  upsertRemoteMindMap,
  type SavedPlan,
} from "./study-repo";

export type { SavedPlan };

export type StudyState = {
  subjects: Subject[];
  plan: Plan | null;
  sessions: Session[];
  cycleStats: CycleStats;
  studyLogs: StudyLog[];
  savedPlans: SavedPlan[];
  activePlanId: string | null;
  subjectMindMaps: Record<string, MindNode>;
  loading: boolean;
};

const empty: StudyState = {
  subjects: [],
  plan: null,
  sessions: [],
  cycleStats: { completedCycles: 0 },
  studyLogs: [],
  savedPlans: [],
  activePlanId: null,
  subjectMindMaps: {},
  loading: true,
};

let state: StudyState = empty;
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const userId = () => getAuth().userId;

function projectActive(next: StudyState): StudyState {
  const active = next.savedPlans.find((p) => p.id === next.activePlanId);
  return {
    ...next,
    subjects: active?.subjects ?? [],
    plan: active?.plan ?? null,
    sessions: active?.sessions ?? [],
    cycleStats: active?.cycleStats ?? { completedCycles: 0 },
  };
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  onUserChange((id) => {
    if (!id) {
      state = { ...empty, loading: false };
      emit();
      return;
    }
    state = { ...state, loading: true };
    emit();
    void loadStudyData(id).then((data) => {
      state = projectActive({ ...state, ...data, loading: false });
      emit();
    });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

export function useStudyState(): StudyState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => empty,
  );
}

export function getState() {
  return state;
}

/** atualização local + sincronia do planejamento ativo salvo */
export function setState(next: Partial<StudyState>) {
  state = { ...state, ...next };
  syncActivePlan();
  emit();
}

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

/** cria (ou atualiza) um planejamento e o define como ativo — grava no banco */
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

  state = projectActive({
    ...state,
    activePlanId: id,
    savedPlans: existing
      ? state.savedPlans.map((p) => (p.id === id ? entry : p))
      : [...state.savedPlans, entry],
  });
  emit();

  const uidNow = userId();
  if (uidNow) void saveRemotePlan(uidNow, entry);
  return id;
}

export function openPlan(id: string) {
  if (!state.savedPlans.some((p) => p.id === id)) return;
  state = projectActive({ ...state, activePlanId: id });
  emit();
  const uidNow = userId();
  if (uidNow) void setRemoteActivePlan(uidNow, id);
}

export function deletePlan(id: string) {
  const savedPlans = state.savedPlans.filter((p) => p.id !== id);
  const activePlanId =
    state.activePlanId === id
      ? (savedPlans[savedPlans.length - 1]?.id ?? null)
      : state.activePlanId;
  state = projectActive({ ...state, savedPlans, activePlanId });
  emit();
  const uidNow = userId();
  if (uidNow) void deleteRemotePlan(uidNow, id);
}

export type QuestionsEntry = {
  total?: number | null;
  correct?: number | null;
  wrong?: number | null;
};

export function addStudyLog(
  subjectId: string,
  durationSeconds: number,
  questions?: QuestionsEntry,
) {
  const hasQuestions =
    !!questions &&
    [questions.total, questions.correct, questions.wrong].some((v) => v !== null && v !== undefined);
  if (durationSeconds < 1 && !hasQuestions) return;
  const log: StudyLog = {
    id: uid(),
    subjectId,
    date: new Date().toISOString(),
    durationSeconds,
    questionsTotal: questions?.total ?? null,
    questionsCorrect: questions?.correct ?? null,
    questionsWrong: questions?.wrong ?? null,
  };
  setState({ studyLogs: [...state.studyLogs, log] });
  const uidNow = userId();
  if (uidNow) void insertRemoteStudyLog(uidNow, state.activePlanId, log);
}

export function updateSession(id: string, patch: Partial<Session>) {
  setState({
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });
  const uidNow = userId();
  if (uidNow && state.activePlanId) {
    void updateRemoteSession(uidNow, state.activePlanId, id, patch);
  }
}

export function restartCycle() {
  const completedCycles = state.cycleStats.completedCycles + 1;
  setState({
    sessions: state.sessions.map((s) => ({ ...s, studiedSeconds: 0, completed: false })),
    cycleStats: { completedCycles },
  });
  const uidNow = userId();
  if (uidNow && state.activePlanId) {
    void resetRemoteCycle(uidNow, state.activePlanId, completedCycles);
  }
}

export function setSubjectMindMap(subjectId: string, map: MindNode) {
  setState({ subjectMindMaps: { ...state.subjectMindMaps, [subjectId]: map } });
  const uidNow = userId();
  if (uidNow) void upsertRemoteMindMap(uidNow, "subject", subjectId, map);
}
