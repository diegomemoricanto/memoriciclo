import { useSyncExternalStore } from "react";
import type { MindNode } from "./mindmap-types";
import { mindUid } from "./mindmap-types";

export type MindMaps = Record<string, MindNode>;

const KEY = "mindMaps";
const empty: MindMaps = {};

let state: MindMaps = empty;
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
    if (raw) state = { ...empty, ...(JSON.parse(raw) as MindMaps) };
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

export function useMindMaps(): MindMaps {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => empty,
  );
}

export function setMindMap(topicId: string, map: MindNode) {
  state = { ...state, [topicId]: map };
  persist();
  emit();
}

export function removeMindMap(topicId: string) {
  const next = { ...state };
  delete next[topicId];
  state = next;
  persist();
  emit();
}

/** cria o mapa inicial: um único nó raiz com o nome do assunto */
export function createMindMap(topicId: string, label: string) {
  const root: MindNode = { id: mindUid(), label, children: [] };
  setMindMap(topicId, root);
  return root;
}

/** lista plana dos labels da árvore (com profundidade), para conferência */
export function flattenNodes(node: MindNode, depth = 0): { id: string; label: string; depth: number }[] {
  return [
    { id: node.id, label: node.label, depth },
    ...(node.children ?? []).flatMap((c) => flattenNodes(c, depth + 1)),
  ];
}