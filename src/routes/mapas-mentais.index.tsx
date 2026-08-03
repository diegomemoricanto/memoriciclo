import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyState } from "@/lib/study-store";
import { allSubjects } from "@/lib/mind-subjects";

export const Route = createFileRoute("/mapas-mentais/")({
  head: () => ({
    meta: [
      { title: "Mapas Mentais — Painel de Estudos" },
      {
        name: "description",
        content: "Escolha uma disciplina para organizar seus assuntos e mapas mentais de estudo.",
      },
      { property: "og:title", content: "Mapas Mentais — Painel de Estudos" },
      {
        property: "og:description",
        content: "Organize assuntos e mapas mentais por disciplina.",
      },
    ],
  }),
  component: MindMapsPage,
});

function MindMapsPage() {
  const { subjects, savedPlans } = useStudyState();
  const list = allSubjects(subjects, savedPlans);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Button variant="outline" size="sm" asChild>
        <Link to="/">
          <ArrowLeft /> Voltar
        </Link>
      </Button>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Mapas Mentais</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Selecione uma disciplina para ver seus assuntos.
      </p>

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-card/70 p-8 text-center">
          <Network className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhuma disciplina ainda. Crie um planejamento para começar.
          </p>
          <Button variant="mint" size="pill" className="mt-4" asChild>
            <Link to="/">Criar Planejamento</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {list.map((s) => (
            <li key={s.id}>
              <Link
                to="/mapas-mentais/$subjectId"
                params={{ subjectId: s.id }}
                className="flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-soft transition-colors hover:bg-muted/50"
              >
                <span className="h-8 w-1.5 rounded-full" style={{ background: s.color }} />
                <span className="flex-1 text-sm font-semibold">{s.name}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
