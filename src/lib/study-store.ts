import { useSyncExternalStore } from "react";
import type { CycleStats, Plan, Session, StudyLog, Subject } from "./study-types";
import { uid } from "./study-types";
import type { MindNode } from "./mindmap-types";
import { getAuth, onUserChange } from "./auth-store";
import {
  deleteRemotePlan,
  deleteRemoteMindMap,
  deleteRemoteStudyLogs,
  insertRemoteStudyLog,
  loadStudyData,
  resetRemoteCycle,
  saveRemotePlan,
  setRemoteActivePlan,
  updateRemoteStudyLog,
  updateRemoteSession,
  upsertRemoteMindMap,
  type SavedPlan,
} from "./study-repo";
import {
  enqueuePending,
  flushPending,
  getPendingSync,
  initSyncQueue,
  subscribePendingSync,
  type PendingOp,
} from "./sync-queue";
import { clearAllPersistedTimers } from "./timer-persistence";

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
  pendingSync: PendingOp[];
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
  pendingSync: [],
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
  initSyncQueue(() => getAuth().userId);
  state = { ...state, pendingSync: getPendingSync() };
  subscribePendingSync(() => {
    state = { ...state, pendingSync: [...getPendingSync()] };
    emit();
  });
  onUserChange((id) => {
    if (!id) {
      state = { ...empty, loading: false };
      emit();
      return;
    }
    state = { ...state, loading: true };
    emit();
    void flushPending();
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
  state = syncActivePlan({ ...state, ...next });
  emit();
}

/** atualização imutável: devolve um novo estado com o planejamento ativo em sincronia */
function syncActivePlan(current: StudyState): StudyState {
  if (!current.activePlanId || !current.plan) return current;
  return {
    ...current,
    savedPlans: current.savedPlans.map((p) =>
      p.id === current.activePlanId
        ? {
            ...p,
            subjects: current.subjects,
            plan: current.plan as Plan,
            sessions: current.sessions,
            cycleStats: current.cycleStats,
          }
        : p,
    ),
  };
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

  /* sessões novas: nenhum cronômetro salvo do ciclo anterior pode ser reaproveitado */
  clearAllPersistedTimers();

  state = projectActive({
    ...state,
    activePlanId: id,
    savedPlans: existing
      ? state.savedPlans.map((p) => (p.id === id ? entry : p))
      : [...state.savedPlans, entry],
  });
  emit();

  const uidNow = userId();
  if (uidNow) {
    const protectedSubjects = [...new Set(state.studyLogs.map((l) => l.subjectId))];
    void saveRemotePlan(uidNow, entry, protectedSubjects).catch((error) =>
      enqueuePending({ kind: "plan", id: entry.id, entry }, error),
    );
  }
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
  topic?: string | null;
};

export function addStudyLog(
  subjectId: string,
  durationSeconds: number,
  questions?: QuestionsEntry,
  meta?: { sessionId?: string | null; startedAt?: string | null },
) {
  const hasQuestions =
    !!questions &&
    [questions.total, questions.correct, questions.wrong].some(
      (v) => v !== null && v !== undefined,
    );
  if (durationSeconds < 1 && !hasQuestions) return;
  const log: StudyLog = {
    id: uid(),
    subjectId,
    sessionId: meta?.sessionId ?? null,
    /* a data do registro é o INÍCIO do estudo, para que sessões que atravessam
       a meia-noite não distorçam médias e constância */
    date: meta?.startedAt ?? new Date().toISOString(),
    durationSeconds,
    topic: questions?.topic?.trim() ? questions.topic.trim() : null,
    questionsTotal: questions?.total ?? null,
    questionsCorrect: questions?.correct ?? null,
    questionsWrong: questions?.wrong ?? null,
  };
  setState({ studyLogs: [...state.studyLogs, log] });
  const uidNow = userId();
  if (uidNow) {
    const planId = state.activePlanId;
    void insertRemoteStudyLog(uidNow, planId, log).catch((error) =>
      enqueuePending({ kind: "studyLog", id: log.id, planId, log }, error),
    );
  }
}

export function updateSession(id: string, patch: Partial<Session>) {
  return updateSessionInternal(id, patch);
}

/** encontra os logs de um grupo disciplina + assunto(s) originais */
function topicGroupLogs(subjectId: string, sourceKeys: string[]) {
  const keys = new Set(sourceKeys);
  return state.studyLogs.filter((l) => l.subjectId === subjectId && keys.has(topicKeyOf(l)));
}

/**
 * renomeia/agrupa um assunto apenas para exibição: grava um apelido por chave original.
 * Nenhum registro histórico é alterado, fundido ou apagado.
 */
export function renameTopicGroup(subjectId: string, sourceKeys: string[], label: string) {
  const next = label.trim();
  if (!next || sourceKeys.length === 0) return;
  const aliases = { ...state.topicAliases };
  const uidNow = userId();
  for (const source of sourceKeys) {
    const key = aliasKey(subjectId, source);
    if (next === source) {
      delete aliases[key];
      if (uidNow)
        void deleteRemoteTopicAlias(uidNow, subjectId, source).catch((error) =>
          enqueuePending(
            { kind: "topicAlias", id: key, subjectId, sourceKey: source, label: null },
            error,
          ),
        );
    } else {
      aliases[key] = next;
      if (uidNow)
        void upsertRemoteTopicAlias(uidNow, subjectId, source, next).catch((error) =>
          enqueuePending(
            { kind: "topicAlias", id: key, subjectId, sourceKey: source, label: next },
            error,
          ),
        );
    }
  }
  setState({ topicAliases: aliases });
}

/** exclui todos os registros de um assunto de uma disciplina (ação explícita do usuário) */
export function deleteTopicGroup(subjectId: string, sourceKeys: string[]) {
  const group = topicGroupLogs(subjectId, sourceKeys);
  if (group.length === 0) return;
  const removed = new Set(group.map((l) => l.id));
  setState({ studyLogs: state.studyLogs.filter((l) => !removed.has(l.id)) });
  const uidNow = userId();
  if (uidNow) void deleteRemoteStudyLogs(uidNow, [...removed]).catch(() => undefined);
}

function updateSessionInternal(id: string, patch: Partial<Session>) {
  setState({
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });
  const uidNow = userId();
  if (uidNow && state.activePlanId) {
    const planId = state.activePlanId;
    const merged = state.sessions.find((s) => s.id === id);
    void updateRemoteSession(uidNow, planId, id, patch).catch((error) =>
      enqueuePending(
        {
          kind: "session",
          id,
          planId,
          sessionId: id,
          patch: merged
            ? {
                studiedSeconds: merged.studiedSeconds,
                completed: merged.completed,
                targetMinutes: merged.targetMinutes,
              }
            : patch,
        },
        error,
      ),
    );
  }
}

export function restartCycle() {
  const completedCycles = state.cycleStats.completedCycles + 1;
  clearAllPersistedTimers();
  setState({
    sessions: state.sessions.map((s) => ({ ...s, studiedSeconds: 0, completed: false })),
    cycleStats: { completedCycles },
  });
  const uidNow = userId();
  if (uidNow && state.activePlanId) {
    const planId = state.activePlanId;
    void resetRemoteCycle(uidNow, planId, completedCycles).catch((error) =>
      enqueuePending({ kind: "cycleReset", id: planId, planId, completedCycles }, error),
    );
  }
}

export function setSubjectMindMap(subjectId: string, map: MindNode) {
  setState({ subjectMindMaps: { ...state.subjectMindMaps, [subjectId]: map } });
  const uidNow = userId();
  if (uidNow) {
    void upsertRemoteMindMap(uidNow, "subject", subjectId, map).catch((error) =>
      enqueuePending(
        { kind: "mindMap", id: subjectId, scope: "subject", refId: subjectId, data: map },
        error,
      ),
    );
  }
}

export function removeSubjectMindMap(subjectId: string) {
  const next = { ...state.subjectMindMaps };
  delete next[subjectId];
  setState({ subjectMindMaps: next });
  const uidNow = userId();
  if (uidNow) {
    void deleteRemoteMindMap(uidNow, "subject", subjectId).catch(() => undefined);
  }
}
