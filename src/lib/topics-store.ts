import { useSyncExternalStore } from "react";
import { getAuth, onUserChange } from "./auth-store";
import {
  deleteRemoteTopic,
  insertRemoteTopic,
  loadRemoteTopics,
  reorderRemoteTopics,
  type RemoteTopic,
} from "./study-repo";

export type Topic = { id: string; name: string };
export type SubjectTopics = Record<string, Topic[]>;

const empty: SubjectTopics = {};

let state: SubjectTopics = empty;
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const userId = () => getAuth().userId;

function group(rows: RemoteTopic[]): SubjectTopics {
  const out: SubjectTopics = {};
  for (const r of rows) {
    (out[r.subjectId] ??= []).push({ id: r.id, name: r.name });
  }
  return out;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  onUserChange((id) => {
    if (!id) {
      state = empty;
      emit();
      return;
    }
    void loadRemoteTopics(id).then((rows) => {
      state = group(rows);
      emit();
    });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

export function useSubjectTopics(): SubjectTopics {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => empty,
  );
}

const topicUid = () => Math.random().toString(36).slice(2, 10);

export function addTopic(subjectId: string, name: string) {
  const clean = name.trim();
  if (!clean) return;
  const list = state[subjectId] ?? [];
  const topic: Topic = { id: topicUid(), name: clean.slice(0, 120) };
  state = { ...state, [subjectId]: [...(state[subjectId] ?? []), topic] };
  emit();
  const uidNow = userId();
  if (uidNow) void insertRemoteTopic(uidNow, { ...topic, subjectId, position: list.length });
}

export function removeTopic(subjectId: string, topicId: string) {
  state = { ...state, [subjectId]: (state[subjectId] ?? []).filter((t) => t.id !== topicId) };
  emit();
  const uidNow = userId();
  if (uidNow) void deleteRemoteTopic(uidNow, topicId);
}

/** move um assunto de posição dentro da disciplina e persiste a nova ordem */
export function reorderTopics(subjectId: string, fromIndex: number, toIndex: number) {
  const list = [...(state[subjectId] ?? [])];
  if (fromIndex === toIndex) return;
  const moved = list[fromIndex];
  if (!moved) return;
  list.splice(fromIndex, 1);
  list.splice(Math.max(0, Math.min(list.length, toIndex)), 0, moved);
  state = { ...state, [subjectId]: list };
  emit();
  const uidNow = userId();
  if (uidNow) void reorderRemoteTopics(uidNow, list.map((t) => t.id));
}
