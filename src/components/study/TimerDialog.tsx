import { useCallback, useEffect, useRef, useState } from "react";
import { AlarmClock, Brain, Check, Pause, Play, TimerIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MindMapPanel } from "./MindMapPanel";
import { cn } from "@/lib/utils";
import { formatMinutes, formatSeconds, type Session, type Subject } from "@/lib/study-types";
import type { QuestionsEntry } from "@/lib/study-store";

function playAlert() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7, 1.05, 1.4].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.3);
    });
  } catch {
    /* ignore */
  }
}

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

type PersistedTimer = {
  baseElapsed: number;
  startedAt: number | null;
  targetSeconds: number;
};

const TIMER_KEY_PREFIX = "painel-estudos-timer:";

function readPersisted(sessionId: string): PersistedTimer | null {
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

function writePersisted(sessionId: string, state: PersistedTimer) {
  try {
    localStorage.setItem(TIMER_KEY_PREFIX + sessionId, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function clearPersisted(sessionId: string) {
  try {
    localStorage.removeItem(TIMER_KEY_PREFIX + sessionId);
  } catch {
    /* ignore */
  }
}

export function TimerDialog({
  session,
  subject,
  onClose,
  onFinish,
  onTick,
}: {
  session: Session;
  subject: Subject | undefined;
  /** salva progresso parcial (segundos totais, delta desta abertura) */
  onClose: (totalSeconds: number, deltaSeconds: number) => void;
  onFinish: (totalSeconds: number, deltaSeconds: number, questions?: QuestionsEntry) => void;
  /** notifica o tempo decorrido para atualização visual em tempo real */
  onTick?: (totalSeconds: number) => void;
}) {
  const targetSeconds = session.targetMinutes * 60;
  const startRef = useRef(session.studiedSeconds);
  /** base = segundos já acumulados enquanto pausado; startedAt = timestamp do trecho em andamento */
  const baseRef = useRef(session.studiedSeconds);
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(session.studiedSeconds);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const reached = elapsed >= targetSeconds;
  const alerted = useRef(false);
  const [tab, setTab] = useState<"timer" | "map">("timer");
  const [askQuestions, setAskQuestions] = useState(false);
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [total, setTotal] = useState("");
  const remaining = Math.max(0, targetSeconds - elapsed);

  const persist = useCallback(() => {
    writePersisted(session.id, {
      baseElapsed: baseRef.current,
      startedAt: startedAtRef.current,
      targetSeconds,
    });
  }, [session.id, targetSeconds]);

  const compute = useCallback(() => {
    const active = startedAtRef.current !== null;
    const live = active ? (Date.now() - (startedAtRef.current as number)) / 1000 : 0;
    return Math.min(targetSeconds, baseRef.current + live);
  }, [targetSeconds]);

  /* restaura estado persistido (ou inicia rodando) */
  useEffect(() => {
    const saved = readPersisted(session.id);
    if (saved) {
      baseRef.current = Math.max(saved.baseElapsed, session.studiedSeconds);
      startedAtRef.current = saved.startedAt;
    } else {
      baseRef.current = session.studiedSeconds;
      startedAtRef.current = Date.now();
    }
    startRef.current = session.studiedSeconds;
    setRunning(startedAtRef.current !== null);
    setElapsed(compute());
    persist();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  /* tick de UI baseado em tempo real (imune a throttling de aba em background) */
  useEffect(() => {
    if (!ready || !running) return;
    const sync = () => setElapsed(compute());
    sync();
    const id = setInterval(sync, 500);
    const onVisible = () => {
      if (!document.hidden) sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [ready, running, compute]);

  useEffect(() => {
    if (reached && !alerted.current) {
      alerted.current = true;
      baseRef.current = targetSeconds;
      startedAtRef.current = null;
      setRunning(false);
      persist();
      playAlert();
    }
  }, [reached, targetSeconds, persist]);

  useEffect(() => {
    onTick?.(elapsed);
  }, [elapsed, onTick]);

  const toggle = () => {
    if (startedAtRef.current !== null) {
      baseRef.current = compute();
      startedAtRef.current = null;
      setRunning(false);
    } else {
      startedAtRef.current = Date.now();
      setRunning(true);
    }
    setElapsed(compute());
    persist();
  };

  const stop = () => {
    baseRef.current = compute();
    startedAtRef.current = null;
  };

  const handleClose = () => {
    stop();
    const total = baseRef.current;
    persist();
    onClose(total, Math.max(0, total - startRef.current));
  };

  const handleFinish = (questions?: QuestionsEntry) => {
    stop();
    const total = baseRef.current;
    clearPersisted(session.id);
    onFinish(total, Math.max(0, total - startRef.current), questions);
  };

  const num = (v: string) => {
    const n = Number(v);
    return v.trim() === "" || Number.isNaN(n) ? null : Math.max(0, Math.round(n));
  };
  const autoTotal = (() => {
    const c = num(correct);
    const w = num(wrong);
    if (c === null && w === null) return null;
    return (c ?? 0) + (w ?? 0);
  })();
  const totalValue = total.trim() === "" ? autoTotal : num(total);

  const submitQuestions = () => {
    handleFinish({ total: totalValue, correct: num(correct), wrong: num(wrong) });
  };

  const progress = Math.min(100, (elapsed / targetSeconds) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cronômetro da sessão"
    >
      <div
        className={cn(
          "max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-card p-6 shadow-soft",
          tab === "map" ? "max-w-3xl" : "max-w-md",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Sessão em andamento
            </p>
            <h2 className="flex items-center gap-2 truncate text-xl font-semibold">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: subject?.color ?? "#ddd" }}
              />
              {subject?.name ?? "Disciplina"}
            </h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="Fechar cronômetro" onClick={handleClose}>
            <X />
          </Button>
        </div>

        <div className="mt-4 flex gap-1 rounded-full bg-muted p-1">
          {[
            { id: "timer" as const, label: "Cronômetro", icon: TimerIcon },
            { id: "map" as const, label: "Mapa Mental", icon: Brain },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === t.id ? "bg-card shadow-soft" : "text-muted-foreground",
              )}
            >
              <t.icon className="size-3.5" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "map" ? (
          <MindMapPanel subject={subject} />
        ) : (
          <>
            <p
              aria-live="polite"
              className={cn(
                "mt-8 text-center text-6xl font-semibold tabular-nums tracking-tight",
                reached && "text-mint-foreground",
              )}
            >
              {formatClock(remaining)}
            </p>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Meta da sessão: {formatMinutes(session.targetMinutes)} · estudado{" "}
              {formatSeconds(Math.floor(elapsed))}
            </p>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-mint transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {reached ? (
              <>
                <div
                  role="alert"
                  className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-mint/25 px-4 py-3 text-center text-sm font-semibold text-mint-foreground"
                >
                  <AlarmClock className="size-4 shrink-0" />
                  Meta atingida! Registre suas horas.
                </div>
                {askQuestions ? (
                  <div className="mt-5 rounded-xl border bg-background p-4">
                    <p className="text-sm font-semibold">
                      Quantas questões você fez sobre esse assunto?
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Todos os campos são opcionais.
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <NumberField label="Acertos" value={correct} onChange={setCorrect} />
                      <NumberField label="Erros" value={wrong} onChange={setWrong} />
                      <NumberField
                        label="Total"
                        value={total}
                        onChange={setTotal}
                        placeholder={autoTotal === null ? "" : String(autoTotal)}
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="mint"
                        size="pill"
                        className="flex-1"
                        onClick={submitQuestions}
                      >
                        <Check /> Salvar e concluir
                      </Button>
                      <Button
                        variant="outline"
                        size="pill"
                        className="flex-1"
                        onClick={() => handleFinish()}
                      >
                        Pular
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="mint"
                    size="pill"
                    className="mt-4 w-full"
                    onClick={() => setAskQuestions(true)}
                  >
                    <Check /> Concluir
                  </Button>
                )}
              </>
            ) : (
              <div className="mt-6 flex gap-2">
                <Button
                  variant={running ? "outline" : "mint"}
                  size="pill"
                  className="flex-1"
                  onClick={toggle}
                >
                  {running ? (
                    <>
                      <Pause /> Pausar
                    </>
                  ) : (
                    <>
                      <Play /> Retomar
                    </>
                  )}
                </Button>
                <Button variant="outline" size="pill" className="flex-1" onClick={handleClose}>
                  Salvar e sair
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
