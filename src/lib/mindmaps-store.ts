import { useSyncExternalStore } from "react";
import type { MindNode } from "./mindmap-types";
import { mindUid } from "./mindmap-types";
import { getAuth, onUserChange } from "./auth-store";
import { deleteRemoteMindMap, loadRemoteTopicMindMaps, upsertRemoteMindMap } from "./study-repo";

export type MindMaps = Record<string, MindNode>;

const empty: MindMaps = {};

let state: MindMaps = empty;
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const userId = () => getAuth().userId;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  onUserChange((id) => {
    if (!id) {
      state = empty;
      emit();
      return;
    }
    void loadRemoteTopicMindMaps(id).then((maps) => {
      state = maps;
      emit();
    });
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
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
  emit();
  const uidNow = userId();
  if (uidNow) void upsertRemoteMindMap(uidNow, "topic", topicId, map);
}

export function removeMindMap(topicId: string) {
  const next = { ...state };
  delete next[topicId];
  state = next;
  emit();
  const uidNow = userId();
  if (uidNow) void deleteRemoteMindMap(uidNow, "topic", topicId);
}

/** cria o mapa inicial: um único nó raiz com o nome do assunto */
export function createMindMap(topicId: string, label: string) {
  const root: MindNode = { id: mindUid(), label, children: [] };
  setMindMap(topicId, root);
  return root;
}

/** lista plana dos labels da árvore (com profundidade), para conferência */
export function flattenNodes(
  node: MindNode,
  depth = 0,
): { id: string; label: string; depth: number }[] {
  return [
    { id: node.id, label: node.label, depth },
    ...(node.children ?? []).flatMap((c) => flattenNodes(c, depth + 1)),
  ];
}
