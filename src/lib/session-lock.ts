import { supabase } from "@/integrations/supabase/client";

/**
 * Trava de sessão de estudo ativa por usuário.
 * Duas camadas:
 *  - localStorage (abas do mesmo navegador, resposta instantânea);
 *  - tabela `study_session_locks` (aparelhos diferentes), com heartbeat.
 * Uma trava sem heartbeat recente é considerada abandonada e pode ser assumida.
 */

const LOCAL_KEY = "painel-estudos-session-lock";
const HOLDER_KEY = "painel-estudos-session-holder";
const LOCAL_STALE_MS = 30_000;
const REMOTE_STALE_MS = 45_000;
export const LOCK_HEARTBEAT_MS = 15_000;

type LocalLock = {
  holderId: string;
  sessionId: string;
  heartbeatAt: number;
  userId?: string | null;
};

let holderId = "";
export function getHolderId() {
  if (!holderId) {
    if (typeof window !== "undefined") {
      try {
        holderId = window.sessionStorage.getItem(HOLDER_KEY) ?? "";
      } catch {
        /* sessionStorage indisponível — usa identidade somente em memória */
      }
    }
    if (!holderId) {
      holderId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `h-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(HOLDER_KEY, holderId);
        } catch {
          /* sessionStorage indisponível — a expiração ainda evita trava permanente */
        }
      }
    }
  }
  return holderId;
}

function readLocal(): LocalLock | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalLock;
    if (!parsed?.holderId || typeof parsed.heartbeatAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLocal(lock: LocalLock | null) {
  if (typeof window === "undefined") return;
  try {
    if (lock) window.localStorage.setItem(LOCAL_KEY, JSON.stringify(lock));
    else window.localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* storage indisponível — a camada remota ainda protege */
  }
}

export type LockResult =
  { ok: true } | { ok: false; reason: "tab" | "device"; sessionId: string | null };

/** tenta assumir a trava para esta aba; falha se outra instância está estudando agora */
export async function acquireSessionLock(
  userId: string | null,
  sessionId: string,
): Promise<LockResult> {
  const me = getHolderId();
  const now = Date.now();

  const local = readLocal();
  const sameUser = !local?.userId || local.userId === userId;
  if (
    local &&
    sameUser &&
    local.holderId !== me &&
    now - local.heartbeatAt < LOCAL_STALE_MS
  ) {
    return { ok: false, reason: "tab", sessionId: local.sessionId ?? null };
  }

  if (userId) {
    const { data } = await supabase
      .from("study_session_locks")
      .select("holder_id, session_id, heartbeat_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (
      data &&
      data.holder_id !== me &&
      now - new Date(data.heartbeat_at).getTime() < REMOTE_STALE_MS
    ) {
      return { ok: false, reason: "device", sessionId: data.session_id ?? null };
    }
    await supabase.from("study_session_locks").upsert(
      {
        user_id: userId,
        holder_id: me,
        session_id: sessionId,
        heartbeat_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  }

  writeLocal({ holderId: me, sessionId, heartbeatAt: now, userId });
  return { ok: true };
}

/** renova a trava enquanto o cronômetro está aberto */
export async function heartbeatSessionLock(userId: string | null, sessionId: string) {
  const me = getHolderId();
  writeLocal({ holderId: me, sessionId, heartbeatAt: Date.now(), userId });
  if (!userId) return;
  await supabase
    .from("study_session_locks")
    .update({ heartbeat_at: new Date().toISOString(), session_id: sessionId })
    .eq("user_id", userId)
    .eq("holder_id", me);
}

/** libera a trava ao encerrar/sair da sessão */
export async function releaseSessionLock(userId: string | null) {
  const me = getHolderId();
  const local = readLocal();
  if (!local || local.holderId === me) writeLocal(null);
  if (!userId) return;
  await supabase
    .from("study_session_locks")
    .delete()
    .eq("user_id", userId)
    .eq("holder_id", me)
    .then(() => undefined);
}

/** remove uma trava abandonada quando o usuário confirma o desbloqueio */
export async function forceReleaseSessionLock(userId: string | null) {
  writeLocal(null);
  if (!userId) return;
  const { error } = await supabase.from("study_session_locks").delete().eq("user_id", userId);
  if (error) throw error;
}
