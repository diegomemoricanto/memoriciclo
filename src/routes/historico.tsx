import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Metrics } from "@/components/study/Metrics";
import { useStudyState } from "@/lib/study-store";
import { formatSeconds } from "@/lib/study-types";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de estudos — Painel de Estudos" },
      {
        name: "description",
        content:
          "Veja quantas horas você estudou por disciplina e por dia, com base nos registros do seu ciclo de estudos.",
      },
      { property: "og:title", content: "Histórico de estudos — Painel de Estudos" },
      {
        property: "og:description",
        content: "Horas estudadas por disciplina e por dia nos últimos 30 dias.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { subjects, studyLogs } = useStudyState();
  const [tab, setTab] = useState<"historico" | "desempenho">("historico");

  const perSubject = subjects
    .map((s) => ({
      subject: s,
      seconds: studyLogs
        .filter((l) => l.subjectId === s.id)
        .reduce((a, l) => a + l.durationSeconds, 0),
    }))
    .sort((a, b) => b.seconds - a.seconds);
  const maxSubject = Math.max(1, ...perSubject.map((p) => p.seconds));

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().slice(0, 10);
    const seconds = studyLogs
      .filter((l) => l.date.slice(0, 10) === key)
      .reduce((a, l) => a + l.durationSeconds, 0);
    return { key, label: `${d.getDate()}/${d.getMonth() + 1}`, seconds };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.seconds));

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <h1 className="text-3xl font-semibold tracking-tight">Histórico</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Registros criados a cada pausa ou conclusão de sessão.
      </p>

      <div className="mt-5 flex gap-2">
        <Button
          variant={tab === "historico" ? "mint" : "outline"}
          size="sm"
          onClick={() => setTab("historico")}
        >
          Histórico
        </Button>
        <Button
          variant={tab === "desempenho" ? "mint" : "outline"}
          size="sm"
          onClick={() => setTab("desempenho")}
        >
          Desempenho
        </Button>
      </div>

      {tab === "desempenho" && (
        <div className="mt-6">
          <Metrics mode="week" />
        </div>
      )}
      {tab === "historico" && (
        <>
          <section className="mt-6 rounded-2xl bg-card p-5 shadow-soft">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total por disciplina
            </h2>
            {perSubject.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum estudo registrado ainda.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {perSubject.map(({ subject, seconds }) => (
                  <li key={subject.id}>
                    <div className="flex justify-between text-sm">
                      <span className="truncate pr-2">{subject.name}</span>
                      <span className="font-semibold">{formatSeconds(seconds)}</span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(seconds / maxSubject) * 100}%`,
                          backgroundColor: subject.color,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-5 rounded-2xl bg-card p-5 shadow-soft">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Últimos 14 dias
            </h2>
            <div className="mt-5 flex h-40 items-end gap-1.5">
              {days.map((d) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] text-muted-foreground">
                    {d.seconds > 0 ? formatSeconds(d.seconds) : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-mint"
                    style={{ height: `${Math.max(2, (d.seconds / maxDay) * 100)}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
