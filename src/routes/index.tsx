import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Clock, Play, RotateCcw, Settings2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanWizard } from "@/components/study/PlanWizard";
import { TimerDialog } from "@/components/study/TimerDialog";
import { cn } from "@/lib/utils";
import {
  addStudyLog,
  restartCycle,
  setState,
  updateSession,
  useStudyState,
} from "@/lib/study-store";
import {
  formatMinutes,
  formatSeconds,
  generateSessions,
  subjectWeight,
  type Plan,
  type Session,
  type Subject,
} from "@/lib/study-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Estudos — Ciclo de revisão e cronômetro" },
      {
        name: "description",
        content:
          "Monte um ciclo de estudos ponderado pelo peso de cada disciplina e cronometre cada sessão. Tudo salvo no seu navegador.",
      },
      { property: "og:title", content: "Painel de Estudos — Ciclo de revisão e cronômetro" },
      {
        property: "og:description",
        content: "Cronograma cíclico de revisão com pesos por disciplina e cronômetro por sessão.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { subjects, plan, sessions, cycleStats } = useStudyState();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const subjectById = useMemo(
    () => Object.fromEntries(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  const totalTargetSeconds = sessions.reduce((a, s) => a + s.targetMinutes * 60, 0);
  const totalStudiedSeconds = sessions.reduce((a, s) => a + s.studiedSeconds, 0);
  const progress = totalTargetSeconds ? (totalStudiedSeconds / totalTargetSeconds) * 100 : 0;

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const openSession = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session || session.completed) return;
    setActiveId(id);
  };

  const savePartial = (session: Session, totalSeconds: number, delta: number) => {
    if (delta > 0) addStudyLog(session.subjectId, delta);
    updateSession(session.id, { studiedSeconds: totalSeconds });
    setActiveId(null);
  };

  const finishSession = (session: Session, totalSeconds: number, delta: number) => {
    if (delta > 0) addStudyLog(session.subjectId, delta);
    updateSession(session.id, { studiedSeconds: totalSeconds, completed: true });
    setActiveId(null);
  };

  const finishWizard = (nextSubjects: Subject[], nextPlan: Plan) => {
    if (totalStudiedSeconds > 0 && sessions.length > 0) {
      const ok = window.confirm(
        "Você já tem progresso neste ciclo. Regerar a sequência vai zerar o progresso atual. Continuar?",
      );
      if (!ok) return;
    }
    setActiveId(null);
    setState({
      subjects: nextSubjects,
      plan: nextPlan,
      sessions: generateSessions(nextSubjects, nextPlan),
    });
    setWizardOpen(false);
  };

  if (!plan || sessions.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Painel de Estudos</h1>
        <p className="mt-3 text-muted-foreground">
          Crie seu planejamento para gerar um ciclo de estudos ponderado pelo peso de cada
          disciplina.
        </p>
        <Button variant="mint" size="pill" className="mt-6" onClick={() => setWizardOpen(true)}>
          Criar Planejamento
        </Button>
        {wizardOpen && (
          <PlanWizard
            initialSubjects={subjects}
            initialPlan={plan}
            onClose={() => setWizardOpen(false)}
            onFinish={finishWizard}
          />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Planejamento</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setActiveId(null);
              restartCycle();
            }}
          >
            <RotateCcw /> Recomeçar Ciclo
          </Button>
          <Button variant="mint" onClick={() => setWizardOpen(true)}>
            <Settings2 /> Editar Planejamento
          </Button>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[55fr_45fr]">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <section className="flex flex-col items-center rounded-2xl bg-card p-5 shadow-soft">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Ciclos completos
              </p>
              <div className="mt-3 flex h-24 w-24 items-center justify-center rounded-full border-4 border-mint text-3xl font-semibold">
                {cycleStats.completedCycles}
              </div>
            </section>

            <section className="rounded-2xl bg-card p-5 shadow-soft">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Progresso
              </p>
              <p className="mt-2 text-lg font-semibold">
                {formatSeconds(totalStudiedSeconds)} / {formatSeconds(totalTargetSeconds)}
              </p>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-mint transition-all"
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
            </section>
          </div>

          <section className="flex h-[560px] flex-col rounded-2xl bg-card p-5 shadow-soft">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sequência dos estudos
            </h2>
            <ul className="scroll-visible mt-4 flex-1 space-y-4 overflow-y-auto pr-3">
              {sessions.map((session) => {
                const subject = subjectById[session.subjectId];
                const running = activeId === session.id;
                const targetSeconds = Math.max(1, session.targetMinutes * 60);
                const pct = session.completed
                  ? 100
                  : Math.min(100, (session.studiedSeconds / targetSeconds) * 100);
                return (
                  <li
                    key={session.id}
                    className={cn(
                      "relative flex items-center gap-3 overflow-hidden rounded-xl border bg-background p-3 pl-5",
                      session.completed && "opacity-70",
                      running && "border-mint",
                    )}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-1.5"
                      style={{ backgroundColor: subject?.color ?? "#ddd" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          session.completed && "line-through",
                        )}
                      >
                        {subject?.name ?? "Disciplina"}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3 shrink-0" />
                        {formatSeconds(session.studiedSeconds)} /{" "}
                        {formatMinutes(session.targetMinutes)}
                      </p>
                    </div>
                    {session.completed ? (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint/30">
                        <Check className="size-4 text-mint-foreground" />
                      </span>
                    ) : (
                      <Button
                        variant={running ? "mint" : "outline"}
                        size="icon"
                        aria-label={running ? "Pausar sessão" : "Iniciar sessão"}
                        onClick={() => openSession(session.id)}
                      >
                        <Play />
                      </Button>
                    )}
                    <span className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <span
                        className="block h-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: subject?.color ?? "#ddd",
                        }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
            <Button
              variant="outline"
              className="mt-4 w-full shrink-0"
              onClick={() => setWizardOpen(true)}
            >
              <SlidersHorizontal /> Ajustar Ciclo
            </Button>
          </section>
        </div>

        <section className="h-fit rounded-2xl bg-card p-5 shadow-soft">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ciclo
          </h2>
          <CycleDonut
            sessions={sessions}
            subjectById={subjectById}
            totalSeconds={totalTargetSeconds}
          />
          <div className="mt-5 flex h-3 overflow-hidden rounded-full">
            {subjects.map((s) => (
              <span
                key={s.id}
                style={{ width: `${subjectWeight(s, subjects)}%`, backgroundColor: s.color }}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {subjects.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 truncate">{s.name}</span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {subjectWeight(s, subjects).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <button
        type="button"
        aria-label="Cronômetro"
        onClick={() => {
          const next = sessions.find((s) => !s.completed);
          if (next) openSession(next.id);
        }}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-mint text-mint-foreground shadow-soft transition-transform hover:scale-105"
      >
        <Clock />
      </button>

      {wizardOpen && (
        <PlanWizard
          initialSubjects={subjects}
          initialPlan={plan}
          onClose={() => setWizardOpen(false)}
          onFinish={finishWizard}
        />
      )}

      {activeSession && (
        <TimerDialog
          key={activeSession.id}
          session={activeSession}
          subject={subjectById[activeSession.subjectId]}
          onClose={(total, delta) => savePartial(activeSession, total, delta)}
          onFinish={(total, delta) => finishSession(activeSession, total, delta)}
        />
      )}
    </main>
  );
}

function CycleDonut({
  sessions,
  subjectById,
  totalSeconds,
}: {
  sessions: Session[];
  subjectById: Record<string, Subject | undefined>;
  totalSeconds: number;
}) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative mx-auto mt-4 h-48 w-48">
      <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
        {sessions.map((session) => {
          const share = totalSeconds
            ? (session.targetMinutes * 60) / totalSeconds
            : 1 / Math.max(1, sessions.length);
          const length = share * circumference;
          const gap = Math.min(1.5, length * 0.15);
          const visible = Math.max(0.5, length - gap);
          const el = (
            <circle
              key={session.id}
              cx={90}
              cy={90}
              r={radius}
              fill="none"
              stroke={subjectById[session.subjectId]?.color ?? "#ddd"}
              strokeWidth={22}
              strokeDasharray={`${visible} ${circumference - visible}`}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold">{formatSeconds(totalSeconds)}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          por ciclo
        </span>
      </div>
    </div>
  );
}