import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlarmClock, Brain, Check, Pause, Play, TimerIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MindMapPanel } from "./MindMapPanel";
import { cn } from "@/lib/utils";
import { formatMinutes, formatSeconds, type Session, type Subject } from "@/lib/study-types";
import type { QuestionsEntry } from "@/lib/study-store";
import { addTopic, useSubjectTopics } from "@/lib/topics-store";
import {
  clearPersistedTimer,
  readPersistedTimer,
  writePersistedTimer,
} from "@/lib/timer-persistence";

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

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-xl border bg-card px-3 text-sm tabular-nums outline-none focus:border-mint"
      />
    </label>
  );
}

/** payload único de encerramento — vale para conclusão e para saída parcial */
export type WrapUpResult = {
  totalSeconds: number;
  deltaSeconds: number;
  questions: QuestionsEntry;
  /** ISO do início real da sessão */
  startedAt: string;
};

const NEW_TOPIC = "__new__";

export function TimerDialog({
  session,
  subject,
  onClose,
  onFinish,
  onTick,
}: {
  session: Session;
  subject: Subject | undefined;
  /** saída parcial: grava o tempo real estudado sem concluir a sessão */
  onClose: (result: WrapUpResult) => void;
  /** conclusão da sessão */
  onFinish: (result: WrapUpResult) => void;
  /** notifica o tempo decorrido para atualização visual em tempo real */
  onTick?: (totalSeconds: number) => void;
}) {
  const targetSeconds = session.targetMinutes * 60;
  const startRef = useRef(session.studiedSeconds);
  /** base = segundos já acumulados enquanto pausado; startedAt = timestamp do trecho em andamento */
  const baseRef = useRef(session.studiedSeconds);
  const startedAtRef = useRef<number | null>(null);
  /** ISO do início do estudo desta sessão (usado como data do registro) */
  const startedIsoRef = useRef(new Date().toISOString());
  const [clock, setClock] = useState<{ elapsed: number; running: boolean }>({
    elapsed: session.studiedSeconds,
    running: false,
  });
  const { elapsed, running } = clock;
  const [ready, setReady] = useState(false);
  const reached = elapsed >= targetSeconds;
  const alerted = useRef(false);
  const [tab, setTab] = useState<"timer" | "map">("timer");
  /** null = cronômetro; "finish" = concluída; "partial" = salvar e sair */
  const [wrapMode, setWrapMode] = useState<null | "finish" | "partial">(null);

  const allTopics = useSubjectTopics();
  const topics = useMemo(
    () => (subject ? (allTopics[subject.id] ?? []) : []),
    [allTopics, subject],
  );
  /** assunto escolhido: "" = sem assunto, NEW_TOPIC = criar novo */
  const [topicChoice, setTopicChoice] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [total, setTotal] = useState("");
  const remaining = Math.max(0, targetSeconds - elapsed);

  const persist = useCallback(() => {
    writePersistedTimer(session.id, {
      baseElapsed: baseRef.current,
      startedAt: startedAtRef.current,
      targetSeconds,
      startedIso: startedIsoRef.current,
    });
  }, [session.id, targetSeconds]);

  /** tempo real decorrido, sem truncar na meta (sessão e log usam o mesmo número) */
  const compute = useCallback(() => {
    const active = startedAtRef.current !== null;
    const live = active ? (Date.now() - (startedAtRef.current as number)) / 1000 : 0;
    return Math.max(0, Math.round(baseRef.current + live));
  }, []);

  /* restaura estado persistido (ou inicia rodando) */
  useEffect(() => {
    const saved = readPersistedTimer(session.id);
    if (saved) {
      baseRef.current = saved.baseElapsed;
      startedAtRef.current = saved.startedAt;
      startedIsoRef.current = saved.startedIso ?? new Date().toISOString();
    } else {
      baseRef.current = session.studiedSeconds;
      startedAtRef.current = Date.now();
      startedIsoRef.current = new Date().toISOString();
    }
    startRef.current = baseRef.current;
    setClock({ elapsed: compute(), running: startedAtRef.current !== null });
    persist();
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  /* tick de UI baseado em tempo real (imune a throttling de aba em background) */
  useEffect(() => {
    if (!ready || !running) return;
    const sync = () =>
      setClock((prev) => {
        const next = compute();
        return prev.elapsed === next ? prev : { ...prev, elapsed: next };
      });
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
      baseRef.current = elapsed;
      startedAtRef.current = null;
      setClock({ elapsed, running: false });
      persist();
      playAlert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reached]);

  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const lastNotified = useRef<number | null>(null);
  useEffect(() => {
    const seconds = Math.floor(elapsed);
    if (lastNotified.current === seconds) return;
    lastNotified.current = seconds;
    onTickRef.current?.(seconds);
  }, [elapsed]);

  const toggle = () => {
    if (startedAtRef.current !== null) {
      baseRef.current = compute();
      startedAtRef.current = null;
    } else {
      startedAtRef.current = Date.now();
    }
    setClock({ elapsed: compute(), running: startedAtRef.current !== null });
    persist();
  };

  /** pausa o cronômetro e abre o formulário de encerramento (único caminho de gravação) */
  const openWrapUp = (mode: "finish" | "partial") => {
    baseRef.current = compute();
    startedAtRef.current = null;
    setClock({ elapsed: baseRef.current, running: false });
    persist();
    setWrapMode(mode);
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

  /** resolve o assunto escolhido, criando-o na lista normalizada se for novo */
  const resolveTopic = (): string | null => {
    if (topicChoice === NEW_TOPIC) {
      const clean = newTopic.trim();
      if (!clean) return null;
      const existing = topics.find((t) => t.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing.name;
      if (subject) addTopic(subject.id, clean);
      return clean;
    }
    if (!topicChoice) return null;
    return topics.find((t) => t.id === topicChoice)?.name ?? null;
  };

  /** ÚNICO ponto de gravação de encerramento de sessão */
  const commit = (withQuestions: boolean) => {
    baseRef.current = compute();
    startedAtRef.current = null;
    const totalSeconds = baseRef.current;
    const result: WrapUpResult = {
      totalSeconds,
      deltaSeconds: Math.max(0, totalSeconds - startRef.current),
      questions: withQuestions
        ? {
            total: totalValue,
            correct: num(correct),
            wrong: num(wrong),
            topic: resolveTopic(),
          }
        : { total: null, correct: null, wrong: null, topic: resolveTopic() },
      startedAt: startedIsoRef.current,
    };
    /* o cronômetro salvo nunca sobrevive a um encerramento, parcial ou completo */
    clearPersistedTimer(session.id);
    if (wrapMode === "finish") onFinish(result);
    else onClose(result);
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Encerrar e registrar sessão"
            onClick={() => {
              setTab("timer");
              openWrapUp(reached ? "finish" : "partial");
            }}
          >
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
          <div key="panel-map">
            <MindMapPanel subject={subject} />
          </div>
        ) : (
          <div key="panel-timer">
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

            {wrapMode ? (
              <div key="wrap">
                <div
                  role="alert"
                  className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-mint/25 px-4 py-3 text-center text-sm font-semibold text-mint-foreground"
                >
                  <AlarmClock className="size-4 shrink-0" />
                  {wrapMode === "partial"
                    ? `Registrando ${formatSeconds(Math.floor(elapsed))} estudados`
                    : "Meta atingida! Registre suas horas."}
                </div>
                <div className="mt-5 rounded-xl border bg-background p-4">
                  <p className="text-sm font-semibold">
                    O que você estudou em {subject?.name ?? "esta disciplina"}?
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Todos os campos são opcionais.
                  </p>
                  <label className="mt-4 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Assunto estudado
                    </span>
                    <select
                      value={topicChoice}
                      onChange={(e) => setTopicChoice(e.target.value)}
                      className="h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-mint"
                    >
                      <option value="">Sem assunto específico</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                      <option value={NEW_TOPIC}>+ Novo assunto…</option>
                    </select>
                  </label>
                  {topicChoice === NEW_TOPIC && (
                    <input
                      type="text"
                      value={newTopic}
                      autoFocus
                      placeholder="Nome do novo assunto"
                      onChange={(e) => setNewTopic(e.target.value)}
                      className="mt-2 h-10 w-full rounded-xl border bg-card px-3 text-sm outline-none focus:border-mint"
                    />
                  )}
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
                      onClick={() => commit(true)}
                    >
                      <Check /> {wrapMode === "partial" ? "Salvar e sair" : "Salvar e concluir"}
                    </Button>
                    <Button
                      variant="outline"
                      size="pill"
                      className="flex-1"
                      onClick={() => commit(false)}
                    >
                      Pular
                    </Button>
                  </div>
                </div>
              </div>
            ) : reached ? (
              <div key="done">
                <div
                  role="alert"
                  className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-mint/25 px-4 py-3 text-center text-sm font-semibold text-mint-foreground"
                >
                  <AlarmClock className="size-4 shrink-0" />
                  Meta atingida! Registre suas horas.
                </div>
                <Button
                  variant="mint"
                  size="pill"
                  className="mt-4 w-full"
                  onClick={() => openWrapUp("finish")}
                >
                  <Check /> Concluir
                </Button>
              </div>
            ) : (
              <div key="controls" className="mt-6 flex gap-2">
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
                <Button
                  variant="outline"
                  size="pill"
                  className="flex-1"
                  onClick={() => openWrapUp("partial")}
                >
                  Salvar e sair
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
