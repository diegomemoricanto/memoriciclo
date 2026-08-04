import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Table2 } from "lucide-react";
import { useStudyState } from "@/lib/study-store";
import { allSubjects } from "@/lib/mind-subjects";
import { formatSeconds } from "@/lib/study-types";
import { topicBreakdown } from "@/lib/topic-stats";

function badgeClass(pct: number) {
  if (pct > 70) return "bg-mint text-mint-foreground";
  if (pct >= 40) return "bg-amber-100 text-amber-800";
  return "bg-destructive/15 text-destructive";
}

export function SubjectPanel() {
  const { studyLogs, subjects, savedPlans } = useStudyState();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const rows = useMemo(() => {
    const known = allSubjects(subjects, savedPlans);
    return known
      .map((s) => {
        const logs = studyLogs.filter((l) => l.subjectId === s.id);
        const seconds = logs.reduce((a, l) => a + l.durationSeconds, 0);
        const correct = logs.reduce((a, l) => a + (l.questionsCorrect ?? 0), 0);
        const wrong = logs.reduce((a, l) => a + (l.questionsWrong ?? 0), 0);
        const total = logs.reduce(
          (a, l) => a + (l.questionsTotal ?? (l.questionsCorrect ?? 0) + (l.questionsWrong ?? 0)),
          0,
        );
        return {
          subject: s,
          seconds,
          correct,
          wrong,
          total,
          accuracy: total ? (correct / total) * 100 : null,
          topics: topicBreakdown(logs),
        };
      })
      .sort((a, b) => a.subject.name.localeCompare(b.subject.name, "pt-BR"));
  }, [studyLogs, subjects, savedPlans]);

  return (
    <section className="rounded-2xl bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Table2 className="size-5 text-mint-foreground" />
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Painel
        </h2>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Cadastre disciplinas em um planejamento para ver o painel.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3 font-semibold" colSpan={2}>
                  Disciplinas
                </th>
                <th className="pb-2 pr-3 font-semibold">Tempo</th>
                <th className="pb-2 pr-3 text-center font-semibold" title="Acertos">
                  ✓
                </th>
                <th className="pb-2 pr-3 text-center font-semibold" title="Erros">
                  ✗
                </th>
                <th className="pb-2 pr-3 text-center font-semibold" title="Total de questões">
                  ✏️
                </th>
                <th className="pb-2 text-right font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.subject.id}>
                  <tr className="border-t border-border/60">
                    <td className="w-6 py-2">
                      {r.topics.length > 0 && (
                        <button
                          type="button"
                          aria-label={
                            open[r.subject.id]
                              ? `Recolher tópicos de ${r.subject.name}`
                              : `Expandir tópicos de ${r.subject.name}`
                          }
                          aria-expanded={!!open[r.subject.id]}
                          onClick={() =>
                            setOpen((o) => ({ ...o, [r.subject.id]: !o[r.subject.id] }))
                          }
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {open[r.subject.id] ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: r.subject.color }}
                        />
                        <span className="truncate">{r.subject.name}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-3">{r.seconds > 0 ? formatSeconds(r.seconds) : "-"}</td>
                    <td className="py-2 pr-3 text-center">{r.correct}</td>
                    <td className="py-2 pr-3 text-center">{r.wrong}</td>
                    <td className="py-2 pr-3 text-center">{r.total}</td>
                    <td className="py-2 text-right">
                      {r.accuracy === null ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(r.accuracy)}`}
                        >
                          {r.accuracy.toFixed(0)}%
                        </span>
                      )}
                    </td>
                  </tr>
                  {open[r.subject.id] &&
                    r.topics.map((t) => (
                      <tr
                        key={`${r.subject.id}-${t.key}`}
                        className="border-t border-border/40 bg-muted/30 text-xs"
                      >
                        <td />
                        <td className="py-1.5 pl-4 pr-3 text-muted-foreground">{t.label}</td>
                        <td className="py-1.5 pr-3">
                          {t.seconds > 0 ? formatSeconds(t.seconds) : "-"}
                        </td>
                        <td className="py-1.5 pr-3 text-center">{t.correct}</td>
                        <td className="py-1.5 pr-3 text-center">{t.wrong}</td>
                        <td className="py-1.5 pr-3 text-center">{t.answered}</td>
                        <td className="py-1.5 text-right">
                          {t.accuracy === null ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass(t.accuracy)}`}
                            >
                              {t.accuracy.toFixed(0)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
