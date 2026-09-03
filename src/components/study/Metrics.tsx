import { useMemo, useState } from "react";
import { Flame, Layers, Target, Timer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyState } from "@/lib/study-store";
import { allSubjects } from "@/lib/mind-subjects";
import { formatSeconds, subjectWeight } from "@/lib/study-types";
import { topicBreakdown } from "@/lib/topic-stats";

type Period = "day" | "week" | "month" | "year";

const PERIODS: { id: Period; label: string }[] = [
  { id: "day", label: "Dia" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "year", label: "Ano" },
];

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

/** janelas do eixo X conforme o período escolhido */
function buckets(period: Period): { key: string; label: string; start: Date; end: Date }[] {
  const now = new Date();
  if (period === "day") {
    return Array.from({ length: 30 }, (_, i) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (29 - i));
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return {
        key: dayKey(start),
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        start,
        end,
      };
    });
  }
  if (period === "week") {
    return Array.from({ length: 12 }, (_, i) => {
      const start = startOfWeek(now);
      start.setDate(start.getDate() - (11 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return {
        key: dayKey(start),
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        start,
        end,
      };
    });
  }
  if (period === "month") {
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      return {
        key: `${start.getFullYear()}-${start.getMonth()}`,
        label: start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        start,
        end,
      };
    });
  }
  return Array.from({ length: 5 }, (_, i) => {
    const year = now.getFullYear() - (4 - i);
    return {
      key: String(year),
      label: String(year),
      start: new Date(year, 0, 1),
      end: new Date(year + 1, 0, 1),
    };
  });
}

function accuracyColor(pct: number) {
  if (pct >= 70) return "#3FAE86";
  if (pct >= 50) return "#E0A32E";
  return "#DC5B57";
}

export function Metrics() {
  const [period, setPeriod] = useState<Period>("week");
  const { studyLogs, subjects, savedPlans } = useStudyState();
  const known = useMemo(() => allSubjects(subjects, savedPlans), [subjects, savedPlans]);

  const totalSeconds = studyLogs.reduce((a, l) => a + l.durationSeconds, 0);
  const totalCycles = savedPlans.reduce((a, p) => a + p.cycleStats.completedCycles, 0);

  /** streak real: independente do filtro de período dos gráficos */
  const streak = useMemo(() => currentStreak(studyDayKeys(studyLogs)), [studyLogs]);

  /** médias por período, cada divisor calculado de forma independente */
  const periodStats = useMemo(() => periodAverages(studyLogs), [studyLogs]);


  /** mesma janela de agrupamento para os dois gráficos */
  const series = useMemo(
    () =>
      buckets(period).map((b) => {
        const logs = studyLogs.filter((l) => {
          const t = new Date(l.date).getTime();
          return t >= b.start.getTime() && t < b.end.getTime();
        });
        const correct = logs.reduce((a, l) => a + (l.questionsCorrect ?? 0), 0);
        const answered = logs.reduce(
          (a, l) => a + (l.questionsTotal ?? (l.questionsCorrect ?? 0) + (l.questionsWrong ?? 0)),
          0,
        );
        return {
          key: b.key,
          label: b.label,
          seconds: logs.reduce((a, l) => a + l.durationSeconds, 0),
          answered,
          accuracy: answered ? (correct / answered) * 100 : null,
        };
      }),
    [studyLogs, period],
  );

  const maxSeries = Math.max(1, ...series.map((s) => s.seconds));

  const questions = useMemo(() => {
    const perSubject = known
      .map((s) => {
        const logs = studyLogs.filter((l) => l.subjectId === s.id);
        const correct = logs.reduce((a, l) => a + (l.questionsCorrect ?? 0), 0);
        const wrong = logs.reduce((a, l) => a + (l.questionsWrong ?? 0), 0);
        const answered = logs.reduce(
          (a, l) => a + (l.questionsTotal ?? (l.questionsCorrect ?? 0) + (l.questionsWrong ?? 0)),
          0,
        );
        return {
          subject: s,
          answered,
          correct,
          wrong,
          accuracy: answered ? (correct / answered) * 100 : 0,
          topics: topicBreakdown(logs).filter((t) => t.answered > 0),
        };
      })
      .filter((d) => d.answered > 0)
      .sort((a, b) => a.accuracy - b.accuracy);
    const answered = perSubject.reduce((a, d) => a + d.answered, 0);
    const correct = perSubject.reduce((a, d) => a + d.correct, 0);
    return {
      perSubject,
      answered,
      correct,
      accuracy: answered ? (correct / answered) * 100 : 0,
    };
  }, [known, studyLogs]);

  const distribution = useMemo(
    () =>
      known
        .map((s) => {
          const seconds = studyLogs
            .filter((l) => l.subjectId === s.id)
            .reduce((a, l) => a + l.durationSeconds, 0);
          const real = totalSeconds ? (seconds / totalSeconds) * 100 : 0;
          const planned = subjects.some((x) => x.id === s.id) ? subjectWeight(s, subjects) : 0;
          return { subject: s, seconds, real, planned };
        })
        .filter((d) => d.seconds > 0 || d.planned > 0)
        .sort((a, b) => b.seconds - a.seconds),
    [known, studyLogs, totalSeconds, subjects],
  );

  const periodLabel = PERIODS.find((p) => p.id === period)?.label ?? "";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Timer} label="Total estudado" value={formatSeconds(totalSeconds)} />
        <StatCard icon={Flame} label="Dias seguidos" value={`${streak} dia(s)`} />
        <StatCard icon={Layers} label="Ciclos completos" value={String(totalCycles)} />
        <StatCard
          icon={Target}
          label="Acerto em questões"
          value={questions.answered ? `${questions.accuracy.toFixed(1)}%` : "—"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Período dos gráficos
        </p>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.id}
              variant={period === p.id ? "mint" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={TrendingUp}
          label={`Média por ${periodLabel.toLowerCase()}`}
          value={formatSeconds(
            series.reduce((a, s) => a + s.seconds, 0) / Math.max(1, series.length),
          )}
        />
        <StatCard icon={Target} label="Questões respondidas" value={String(questions.answered)} />
      </div>

      <section className="rounded-2xl bg-card p-5 shadow-soft">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Horas estudadas por {periodLabel.toLowerCase()}
        </h2>
        <div className="mt-5 flex h-44 items-end gap-1.5">
          {series.map((s) => (
            <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground">
                {s.seconds > 0 ? formatSeconds(s.seconds) : ""}
              </span>
              <div
                className="w-full rounded-t-md bg-mint"
                style={{ height: `${Math.max(2, (s.seconds / maxSeries) * 100)}%` }}
                title={`${s.label}: ${formatSeconds(s.seconds)}`}
              />
              <span className="text-[9px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-soft">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          % de acerto em questões por {periodLabel.toLowerCase()}
        </h2>
        <div className="mt-5 flex h-44 items-end gap-1.5">
          {series.map((s) => (
            <div key={s.key} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] text-muted-foreground">
                {s.accuracy === null ? "" : `${Math.round(s.accuracy)}%`}
              </span>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: `${Math.max(2, s.accuracy ?? 0)}%`,
                  backgroundColor: s.accuracy === null ? "#E6E6E6" : accuracyColor(s.accuracy),
                }}
                title={`${s.label}: ${s.accuracy === null ? "sem questões" : `${s.accuracy.toFixed(1)}% (${s.answered} questões)`}`}
              />
              <span className="text-[9px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-soft">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Desempenho em questões
        </h2>
        {questions.answered === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma questão registrada ainda. Ao concluir uma sessão, informe acertos e erros.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-6">
              <p className="text-sm">
                <span className="font-semibold">{questions.answered}</span> questões respondidas
              </p>
              <p className="text-sm">
                <span
                  className="font-semibold"
                  style={{ color: accuracyColor(questions.accuracy) }}
                >
                  {questions.accuracy.toFixed(1)}%
                </span>{" "}
                de acerto geral
              </p>
            </div>
            <ul className="mt-4 space-y-3">
              {questions.perSubject.map((d) => (
                <li key={d.subject.id}>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: d.subject.color }}
                    />
                    <span className="flex-1 truncate">{d.subject.name}</span>
                    <span className="text-xs text-muted-foreground">{d.answered} questões</span>
                    <span
                      className="w-16 text-right text-sm font-semibold"
                      style={{ color: accuracyColor(d.accuracy) }}
                    >
                      {d.accuracy.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, d.accuracy)}%`,
                        backgroundColor: accuracyColor(d.accuracy),
                      }}
                    />
                  </div>
                  {d.topics.length > 0 && (
                    <ul className="mt-2 space-y-1.5 border-l-2 border-border/60 pl-3">
                      {d.topics.map((t) => (
                        <li key={t.key} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate text-muted-foreground">{t.label}</span>
                          <span className="text-muted-foreground">{t.answered} questões</span>
                          <span
                            className="w-14 text-right font-semibold"
                            style={{ color: accuracyColor(t.accuracy ?? 0) }}
                          >
                            {t.accuracy === null ? "—" : `${t.accuracy.toFixed(1)}%`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-soft">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tempo por disciplina vs. peso planejado
        </h2>
        {distribution.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum estudo registrado ainda.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {distribution.map(({ subject, seconds, real, planned }) => (
              <li key={subject.id}>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="flex-1 truncate">{subject.name}</span>
                  <span className="font-semibold">{formatSeconds(seconds)}</span>
                </div>
                <div className="mt-1.5 space-y-1">
                  <Bar value={real} color={subject.color} caption={`real ${real.toFixed(1)}%`} />
                  <Bar
                    value={planned}
                    color={subject.color}
                    dashed
                    caption={`plano ${planned.toFixed(1)}%`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Bar({
  value,
  color,
  caption,
  dashed,
}: {
  value: number;
  color: string;
  caption: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, value)}%`,
            backgroundColor: color,
            opacity: dashed ? 0.45 : 1,
          }}
        />
      </div>
      <span className="w-24 text-right text-[10px] text-muted-foreground">{caption}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-soft">
      <Icon className="size-5 text-mint-foreground" />
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
