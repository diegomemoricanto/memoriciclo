/** estado do cronômetro guardado no navegador, por sessão do ciclo */
export type PersistedTimer = {
  baseElapsed: number;
  startedAt: number | null;
  targetSeconds: number;
  /** ISO do momento em que a sessão começou a ser estudada */
  startedIso: string;
};

export const TIMER_KEY_PREFIX = "painel-estudos-timer:";

export function readPersistedTimer(sessionId: string): PersistedTimer | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY_PREFIX + sessionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedTimer;
    if (typeof parsed?.baseElapsed !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedTimer(sessionId: string, state: PersistedTimer) {
  try {
    localStorage.setItem(TIMER_KEY_PREFIX + sessionId, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function clearPersistedTimer(sessionId: string) {
  try {
    localStorage.removeItem(TIMER_KEY_PREFIX + sessionId);
  } catch {
    /* ignore */
  }
}

/** limpa todos os cronômetros salvos (recomeço de ciclo / regeração do plano) */
export function clearAllPersistedTimers() {
  try {
    if (typeof localStorage === "undefined") return;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(TIMER_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
