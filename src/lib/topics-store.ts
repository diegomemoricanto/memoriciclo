import { useSyncExternalStore } from "react";

export type Topic = { id: string; name: string };
export type SubjectTopics = Record<string, Topic[]>;

const KEY = "subjectTopics";
const empty: SubjectTopics = {};

let state: SubjectTopics = empty;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

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
    if (raw) state = { ...empty, ...(JSON.parse(raw) as SubjectTopics) };
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
  state = {
    ...state,
    [subjectId]: [...(state[subjectId] ?? []), { id: topicUid(), name: clean.slice(0, 120) }],
  };
  persist();
  emit();
}

export function removeTopic(subjectId: string, topicId: string) {
  state = { ...state, [subjectId]: (state[subjectId] ?? []).filter((t) => t.id !== topicId) };
  persist();
  emit();
}
