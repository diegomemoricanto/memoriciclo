import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMinutes, formatSeconds, type Session, type Subject } from "@/lib/study-types";

function playAlert() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((offset) => {
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
  onFinish: (totalSeconds: number, deltaSeconds: number) => void;
  /** notifica o tempo decorrido para atualização visual em tempo real */
  onTick?: (totalSeconds: number) => void;
}) {
  const targetSeconds = session.targetMinutes * 60;
  const startRef = useRef(session.studiedSeconds);
  const [elapsed, setElapsed] = useState(session.studiedSeconds);
  const [running, setRunning] = useState(true);
  const reached = elapsed >= targetSeconds;
  const alerted = useRef(false);

  useEffect(() => {
    if (!running || reached) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running, reached]);

  useEffect(() => {
    if (reached && !alerted.current) {
      alerted.current = true;
      setRunning(false);
      playAlert();
    }
  }, [reached]);

  useEffect(() => {
    onTick?.(elapsed);
  }, [elapsed, onTick]);

  const delta = () => Math.max(0, elapsed - startRef.current);
  const progress = Math.min(100, (elapsed / targetSeconds) * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cronômetro da sessão"
    >
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-soft">
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
            aria-label="Fechar cronômetro"
            onClick={() => onClose(elapsed, delta())}
          >
            <X />
          </Button>
        </div>

        <p className="mt-8 text-center text-6xl font-semibold tabular-nums tracking-tight">
          {formatSeconds(elapsed)}
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Meta da sessão: {formatMinutes(session.targetMinutes)}
        </p>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-mint transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {reached ? (
          <>
            <p className="mt-5 text-center text-sm font-medium text-mint-foreground">
              Tempo concluído! Registre suas horas.
            </p>
            <Button
              variant="mint"
              size="pill"
              className="mt-4 w-full"
              onClick={() => onFinish(elapsed, delta())}
            >
              <Check /> Concluir
            </Button>
          </>
        ) : (
          <div className="mt-6 flex gap-2">
            <Button
              variant={running ? "outline" : "mint"}
              size="pill"
              className="flex-1"
              onClick={() => setRunning((r) => !r)}
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
              onClick={() => onClose(elapsed, delta())}
            >
              Salvar e sair
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}