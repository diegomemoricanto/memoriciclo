import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Flame, Layers, Network, Play, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/components/auth/auth-gate";
import { currentStreak, studyDayKeys } from "@/lib/study-averages";
import type { Plan, Session, StudyLog, Subject } from "@/lib/study-types";

type LandingProps = {
  plan: Plan | null;
  sessions: Session[];
  subjects: Subject[];
  studyLogs: StudyLog[];
  onCreate: () => void;
};

export function Landing({ plan, sessions, subjects, studyLogs, onCreate }: LandingProps) {
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const features = [
    { icon: Layers, title: "Ciclos ponderados por peso", text: "Importância × conhecimento" },
    { icon: Timer, title: "Cronômetro por sessão", text: "Alerta ao bater o alvo" },
    { icon: BarChart3, title: "Histórico de horas", text: "Por disciplina e por dia" },
  ];
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-mint/25 via-background to-primary/10" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-mint/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-mint" /> 100% no seu navegador
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Painel de{" "}
            <span className="bg-gradient-to-r from-mint to-primary bg-clip-text text-transparent">
              Estudos
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Monte um ciclo de revisão inteligente: cada disciplina entra na sequência de acordo com
            o peso dela, em sessões curtas e cronometradas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="mint" size="pill" onClick={() => requireAuth(onCreate)}>
              Criar Planejamento
            </Button>
            <Button
              variant="outline"
              size="pill"
              onClick={() => requireAuth(() => navigate({ to: "/planejamentos" }))}
            >
              Meus Planejamentos
            </Button>
            <Button
              variant="outline"
              size="pill"
              onClick={() => requireAuth(() => navigate({ to: "/mapas-mentais" }))}
            >
              <Network /> Mapas Mentais
            </Button>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border bg-card/70 p-4 shadow-soft backdrop-blur"
              >
                <f.icon className="size-5 text-mint-foreground" />
                <p className="mt-3 text-sm font-semibold leading-snug">{f.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <LandingWheel />
          <CurrentCycleCard
            plan={plan}
            sessions={sessions}
            subjects={subjects}
            studyLogs={studyLogs}
            onCreate={onCreate}
          />
        </div>
      </div>
    </main>
  );
}

function LandingWheel() {
  const slices = 10;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const seg = circumference / slices;
  const palette = ["#9EE6CF", "#A8D0F5", "#FFC9A8", "#CDB8F5", "#FFE29A", "#F7B8DC"];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <div className="absolute inset-6 rounded-full bg-mint/20 blur-2xl" />
      <svg
        viewBox="0 0 180 180"
        className="relative h-full w-full animate-[spin_28s_linear_infinite]"
      >
        {Array.from({ length: slices }).map((_, i) => (
          <circle
            key={i}
            cx={90}
            cy={90}
            r={radius}
            fill="none"
            stroke={palette[i % palette.length]}
            strokeWidth={26}
            strokeDasharray={`${seg - 6} ${circumference - seg + 6}`}
            strokeDashoffset={-i * seg}
          />
        ))}
      </svg>
      <div className="absolute inset-[21%] rounded-full bg-background/70 backdrop-blur" />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center">
        <span className="bg-gradient-to-r from-mint to-primary bg-clip-text text-4xl font-semibold text-transparent sm:text-6xl">
          Ciclo
        </span>
        <span className="mt-2 text-sm font-bold uppercase tracking-[0.25em] text-mint-foreground sm:text-base">
          intercalado
        </span>
      </div>
    </div>
  );
}

function CurrentCycleCard({ plan, sessions, subjects, studyLogs, onCreate }: LandingProps) {
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const pending = sessions.filter((session) => !session.completed);
  const current = pending[0];
  const subjectById = new Map(subjects.map((subject) => [subject.id, subject]));
  const currentSubject = current ? subjectById.get(current.subjectId) : undefined;
  const nextNames = pending
    .slice(1, 3)
    .map((session) => subjectById.get(session.subjectId)?.name)
    .filter((name): name is string => Boolean(name));
  const streak = currentStreak(studyDayKeys(studyLogs));

  return (
    <section className="mt-6 rounded-2xl border bg-card/70 p-4 shadow-soft backdrop-blur">
      {!plan || sessions.length === 0 ? (
        <>
          <h2 className="text-lg font-semibold">Monte seu primeiro ciclo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre suas disciplinas e o app organiza a sequência.
          </p>
          <Button
            variant="mint"
            size="pill"
            className="mt-4 w-full sm:w-auto"
            onClick={() => requireAuth(onCreate)}
          >
            Criar Planejamento
          </Button>
        </>
      ) : current && currentSubject ? (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Agora no seu ciclo
          </p>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: currentSubject.color }}
            />
            <h2 className="truncate text-xl font-semibold">{currentSubject.name}</h2>
          </div>
          {nextNames.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Depois: {nextNames.join(", ")}</p>
          )}
          <Button
            variant="mint"
            size="pill"
            className="mt-4 w-full sm:w-auto"
            onClick={() =>
              requireAuth(() =>
                navigate({ to: "/planejamento", search: { iniciar: "proxima" } }),
              )
            }
          >
            <Play /> Começar sessão
          </Button>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold">Ciclo concluído!</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Você fechou todas as sessões deste ciclo.
          </p>
          <Button
            variant="mint"
            size="pill"
            className="mt-4 w-full sm:w-auto"
            onClick={() => navigate({ to: "/planejamento" })}
          >
            Iniciar novo ciclo
          </Button>
        </>
      )}

      {streak > 0 && (
        <div className="mt-4 flex items-center gap-2 border-t pt-3 text-sm font-medium text-muted-foreground">
          <Flame className="size-4 text-mint-foreground" />
          <span>{streak} dias estudando</span>
        </div>
      )}
    </section>
  );
}
