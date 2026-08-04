import { useMemo } from "react";
import { Flame, Layers, Timer, TrendingUp } from "lucide-react";
import { useStudyState } from "@/lib/study-store";
import { allSubjects } from "@/lib/mind-subjects";
import { formatSeconds, subjectWeight } from "@/lib/study-types";

type Mode = "day" | "week";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

export function Metrics({ mode = "week" }: { mode?: Mode }) {
  const { studyLogs, subjects, savedPlans } = useStudyState();
  const known = useMemo(() => allSubjects(subjects, savedPlans), [subjects, savedPlans]);

  const totalSeconds = studyLogs.reduce((a, l) => a + l.durationSeconds, 0);
  const totalCycles = savedPlans.reduce((a, p) => a + p.cycleStats.completedCycles, 0);

  const streak = useMemo(() => {
    const days = new Set(studyLogs.map((l) => l.date.slice(0, 10)));
    let count = 0;
    const cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(dayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [studyLogs]);

  const series = useMemo(() => {
    if (mode === "day") {
      return Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const key = dayKey(d);
        return {
          key,
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          seconds: studyLogs
            .filter((l) => l.date.slice(0, 10) === key)
            .reduce((a, l) => a + l.durationSeconds, 0),
        };
      });
    }
    return Array.from({ length: 12 }, (_, i) => {
      const start = startOfWeek(new Date());
      start.setDate(start.getDate() - (11 - i) * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return {
        key: dayKey(start),
        label: `${start.getDate()}/${start.getMonth() + 1}`,
        seconds: studyLogs
          .filter((l) => {
            const t = new Date(l.date).getTime();
            return t >= start.getTime() && t < end.getTime();
          })
          .reduce((a, l) => a + l.durationSeconds, 0),
      };
    });
  }, [studyLogs, mode]);

  const maxSeries = Math.max(1, ...series.map((s) => s.seconds));

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

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Timer} label="Total estudado" value={formatSeconds(totalSeconds)} />
        <StatCard icon={Flame} label="Dias seguidos" value={`${streak} dia(s)`} />
        <StatCard icon={Layers} label="Ciclos completos" value={String(totalCycles)} />
        <StatCard
          icon={TrendingUp}
          label={mode === "day" ? "Média por dia (30d)" : "Média por semana (12s)"}
          value={formatSeconds(
            series.reduce((a, s) => a + s.seconds, 0) / Math.max(1, series.length),
          )}
        />
      </div>

      <section className="rounded-2xl bg-card p-5 shadow-soft">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Evolução {mode === "day" ? "por dia (últimos 30)" : "por semana (últimas 12)"}
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
