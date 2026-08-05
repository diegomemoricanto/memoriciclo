import { toast } from "sonner";
import type { Session, StudyLog } from "./study-types";
import type { SavedPlan } from "./study-repo";
import {
  insertRemoteStudyLog,
  resetRemoteCycle,
  saveRemotePlan,
  updateRemoteSession,
  upsertRemoteMindMap,
} from "./study-repo";
import type { MindNode } from "./mindmap-types";

export type PendingOp =
  | { kind: "studyLog"; id: string; planId: string | null; log: StudyLog }
  | {
      kind: "session";
      id: string;
      planId: string;
      sessionId: string;
      patch: Partial<Session>;
    }
  | { kind: "plan"; id: string; entry: SavedPlan }
  | { kind: "cycleReset"; id: string; planId: string; completedCycles: number }
  | {
      kind: "mindMap";
      id: string;
      scope: "topic" | "subject";
      refId: string;
      data: MindNode;
    };

const STORAGE_KEY = "pendingSync";

let queue: PendingOp[] = [];
let flushing = false;
let wired = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* storage cheio/indisponível — a fila continua em memória */
  }
}

function restore() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    queue = raw ? (JSON.parse(raw) as PendingOp[]) : [];
  } catch {
    queue = [];
  }
}

export function getPendingSync(): PendingOp[] {
  return queue;
}

export function subscribePendingSync(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** identidade de uma operação — reenvios da mesma sessão/mapa substituem o pendente antigo */
function keyOf(op: PendingOp) {
  switch (op.kind) {
    case "session":
      return `session:${op.planId}:${op.sessionId}`;
    case "plan":
      return `plan:${op.entry.id}`;
    case "cycleReset":
      return `cycleReset:${op.planId}`;
    case "mindMap":
      return `mindMap:${op.scope}:${op.refId}`;
    default:
      return `studyLog:${op.log.id}`;
  }
}

let notifiedFailure = false;

export function enqueuePending(op: PendingOp, error?: unknown) {
  if (error) console.error("[sync] falha ao salvar, enfileirando", error);
  const key = keyOf(op);
  queue = [...queue.filter((o) => keyOf(o) !== key), op];
  persist();
  emit();
  if (!notifiedFailure) {
    notifiedFailure = true;
    toast.error("Não foi possível salvar seu estudo agora, tentando novamente...");
  }
  scheduleRetry();
}

async function run(op: PendingOp, userId: string) {
  switch (op.kind) {
    case "studyLog":
      return insertRemoteStudyLog(userId, op.planId, op.log);
    case "session":
      return updateRemoteSession(userId, op.planId, op.sessionId, op.patch);
    case "plan":
      return saveRemotePlan(userId, op.entry);
    case "cycleReset":
      return resetRemoteCycle(userId, op.planId, op.completedCycles);
    case "mindMap":
      return upsertRemoteMindMap(userId, op.scope, op.refId, op.data);
  }
}

let getUserId: () => string | null = () => null;

export function initSyncQueue(resolveUserId: () => string | null) {
  getUserId = resolveUserId;
  if (wired || typeof window === "undefined") return;
  wired = true;
  restore();
  emit();
  window.addEventListener("online", () => void flushPending());
  void flushPending();
}

let retryTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleRetry() {
  if (retryTimer || typeof window === "undefined") return;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void flushPending();
  }, 15_000);
}

/** tenta reenviar tudo o que ficou pendente; mantém na fila o que falhar de novo */
export async function flushPending() {
  if (flushing || !queue.length) return;
  const userId = getUserId();
  if (!userId) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    scheduleRetry();
    return;
  }
  flushing = true;
  const had = queue.length;
  const failed: PendingOp[] = [];
  for (const op of queue) {
    try {
      await run(op, userId);
    } catch (error) {
      console.error("[sync] reenvio falhou", error);
      failed.push(op);
    }
  }
  queue = failed;
  persist();
  emit();
  flushing = false;
  if (!failed.length && had) {
    notifiedFailure = false;
    toast.success("Conexão restabelecida — seus estudos foram sincronizados.");
  } else if (failed.length) {
    scheduleRetry();
  }
}