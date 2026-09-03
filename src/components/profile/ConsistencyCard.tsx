import { useMemo, useState } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toDayKey, useActivityDays } from "@/lib/profile-widgets";
import { useStudyState } from "@/lib/study-store";
import { currentStreak, studyDayKeys } from "@/lib/study-averages";

const WINDOW = 30;

const shortDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

export function ConsistencyCard() {
  const { days, ready } = useActivityDays();
  const { studyLogs } = useStudyState();
  const [offset, setOffset] = useState(0);
  const set = useMemo(() => new Set(days), [days]);

  const range = useMemo(() => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - offset * WINDOW);
    return Array.from({ length: WINDOW }, (_, i) => {
      const d = new Date(end);
      d.setDate(d.getDate() - (WINDOW - 1 - i));
      return d;
    });
  }, [offset]);

  /** dias seguidos com estudo registrado — valor único, sem depender de filtros */
  const streak = useMemo(() => currentStreak(studyDayKeys(studyLogs)), [studyLogs]);

  const daysAway = useMemo(() => {
    if (days.length === 0) return null;
    const last = new Date(`${days[days.length - 1]}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((today.getTime() - last.getTime()) / 86400000);
  }, [days]);

  const headline = !ready
    ? "Carregando sua constância..."
    : days.length === 0
      ? "Nenhum acesso registrado ainda."
      : streak > 0
        ? `Você está há ${streak} dia(s) estudando seguidos!`
        : `Você está há ${daysAway} dia(s) sem estudar!`;

  const todayKey = toDayKey(new Date());
  const mostRecent = days[days.length - 1];

  return (
    <section className="rounded-2xl bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="size-5 text-mint-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Constância nos estudos
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setOffset((o) => o + 1)}>
            <ChevronLeft />
          </Button>
          <span className="min-w-[110px] text-center text-sm font-medium">
            {shortDate(range[0]!)} ~ {shortDate(range[range.length - 1]!)}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - 1))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <p className="mt-4 text-lg font-semibold tracking-tight">{headline}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {range.map((d) => {
          const key = toDayKey(d);
          const active = set.has(key);
          const highlight = key === mostRecent || key === todayKey;
          return (
            <div
              key={key}
              title={`${shortDate(d)} — ${active ? "com atividade" : "sem atividade"}`}
              className={`flex size-7 items-center justify-center rounded-full text-[10px] font-semibold ${
                active
                  ? "bg-mint text-mint-foreground"
                  : "bg-destructive/10 text-destructive"
              } ${highlight ? "ring-2 ring-mint-foreground ring-offset-2 ring-offset-card" : ""}`}
            >
              {active ? d.getDate() : <X className="size-3.5" />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
