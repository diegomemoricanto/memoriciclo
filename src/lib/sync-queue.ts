import { toast } from "sonner";
import type { Session, StudyLog } from "./study-types";
import type { SavedPlan } from "./study-repo";
import {
  deleteRemoteTopicAlias,
  insertRemoteStudyLog,
  resetRemoteCycle,
  saveRemotePlan,
  updateRemoteSession,
  upsertRemoteMindMap,
  upsertRemoteTopicAlias,
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
const attempts = new Map<string, number>();

export function enqueuePending(op: PendingOp, error?: unknown) {
  if (error) console.error("[sync] falha ao salvar, enfileirando", error);
  const key = keyOf(op);
  queue = [...queue.filter((o) => keyOf(o) !== key), op];
  persist();
  emit();
  if (!notifiedFailure) {
    notifiedFailure = true;
    toast.error(
      "Seu registro ficou salvo apenas neste aparelho — ainda não foi sincronizado. Vamos continuar tentando.",
    );
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
/** espera crescente (15s → 5min) para não martelar o servidor, mas nunca desistir */
function scheduleRetry() {
  if (retryTimer || typeof window === "undefined") return;
  const worst = Math.max(0, ...[...attempts.values()]);
  const delay = Math.min(15_000 * Math.max(1, worst), 300_000);
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void flushPending();
  }, delay);
}

/**
 * tenta reenviar tudo o que ficou pendente. Operações que falham NUNCA são
 * descartadas: continuam na fila (e visíveis no aviso de sincronização) até
 * o servidor confirmar ou o usuário remover manualmente.
 */
export async function flushPending(manual = false) {
  if (flushing || !queue.length) return;
  const userId = getUserId();
  if (!userId) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    if (manual) toast.error("Sem conexão agora — vamos tentar novamente automaticamente.");
    scheduleRetry();
    return;
  }
  flushing = true;
  const had = queue.length;
  const failed: PendingOp[] = [];
  for (const op of queue) {
    try {
      await run(op, userId);
      attempts.delete(keyOf(op));
    } catch (error) {
      console.error("[sync] reenvio falhou", error);
      const key = keyOf(op);
      attempts.set(key, (attempts.get(key) ?? 0) + 1);
      failed.push(op);
    }
  }
  queue = failed;
  persist();
  emit();
  flushing = false;
  if (!failed.length && had) {
    notifiedFailure = false;
    toast.success("Seus estudos foram sincronizados.");
  } else if (failed.length) {
    if (manual)
      toast.error(
        `${failed.length} registro(s) ainda não sincronizado(s) — mantivemos tudo salvo aqui e seguiremos tentando.`,
      );
    scheduleRetry();
  }
}

/** remove uma pendência da fila só quando o usuário pedir explicitamente */
export function discardPending(id: string) {
  queue = queue.filter((o) => o.id !== id);
  persist();
  emit();
}
