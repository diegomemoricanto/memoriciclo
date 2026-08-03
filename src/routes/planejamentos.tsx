import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Clock, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanWizard } from "@/components/study/PlanWizard";
import {
  deletePlan,
  openPlan,
  savePlanAndActivate,
  useStudyState,
} from "@/lib/study-store";
import { formatSeconds, generateSessions, type Plan, type Subject } from "@/lib/study-types";

export const Route = createFileRoute("/planejamentos")({
  head: () => ({
    meta: [
      { title: "Meus Planejamentos — Painel de Estudos" },
      {
        name: "description",
        content:
          "Veja, abra e exclua todos os seus planejamentos de estudo salvos, com disciplinas, horas semanais e progresso do ciclo.",
      },
      { property: "og:title", content: "Meus Planejamentos — Painel de Estudos" },
      {
        property: "og:description",
        content: "Todos os seus ciclos de estudo salvos em um só lugar.",
      },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { savedPlans, activePlanId } = useStudyState();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const navigate = useNavigate();

  const finishWizard = (subjects: Subject[], plan: Plan, name: string) => {
    savePlanAndActivate({ subjects, plan, sessions: generateSessions(subjects, plan), name });
    setWizardOpen(false);
    navigate({ to: "/planejamento" });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Meus Planejamentos</h1>
        <Button variant="mint" onClick={() => setWizardOpen(true)}>
          <Plus /> Novo Planejamento
        </Button>
      </header>

      {savedPlans.length === 0 ? (
        <p className="mt-10 rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
          Nenhum planejamento salvo ainda.{" "}
          <Link to="/" className="font-semibold text-mint-foreground underline">
            Voltar ao início
          </Link>
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {savedPlans.map((p) => {
            const target = p.sessions.reduce((a, s) => a + s.targetMinutes * 60, 0);
            const studied = p.sessions.reduce((a, s) => a + s.studiedSeconds, 0);
            const pct = target ? Math.min(100, (studied / target) * 100) : 0;
            return (
              <li key={p.id} className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Criado em {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      {p.id === activePlanId ? " · ativo" : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir ${p.name}`}
                    onClick={() => setConfirmId(p.id)}
                  >
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="size-3.5" /> {p.subjects.length} disciplinas
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {p.plan.weeklyHours}h / semana
                  </span>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {formatSeconds(studied)} / {formatSeconds(target)}
                    </span>
                    <span className="font-semibold">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-mint" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {p.cycleStats.completedCycles} ciclo(s) completo(s)
                  </p>
                </div>

                <Button
                  variant="mint"
                  className="mt-4 w-full"
                  onClick={() => {
                    openPlan(p.id);
                    navigate({ to: "/planejamento" });
                  }}
                >
                  <FolderOpen /> Abrir
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Excluir planejamento?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. As sessões e o progresso deste planejamento serão
              removidos.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmId(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deletePlan(confirmId);
                  setConfirmId(null);
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {wizardOpen && (
        <PlanWizard
          initialSubjects={[]}
          initialPlan={null}
          onClose={() => setWizardOpen(false)}
          onFinish={finishWizard}
        />
      )}
    </main>
  );
}
