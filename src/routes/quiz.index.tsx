import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, ListChecks, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSubject, useStudyState } from "@/lib/study-store";
import { allSubjects } from "@/lib/mind-subjects";

export const Route = createFileRoute("/quiz/")({
  head: () => ({
    meta: [
      { title: "Quiz — Painel de Estudos" },
      {
        name: "description",
        content: "Escolha uma disciplina para enviar e responder quizzes por assunto.",
      },
      { property: "og:title", content: "Quiz — Painel de Estudos" },
      { property: "og:description", content: "Quizzes organizados por disciplina e assunto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizSubjectsPage,
});

function QuizSubjectsPage() {
  const { subjects, savedPlans, activePlanId } = useStudyState();
  const list = allSubjects(subjects, savedPlans);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const save = () => {
    if (!name.trim()) return;
    const id = addSubject(name);
    if (!id) {
      toast.error("Crie ou abra um planejamento antes de adicionar matérias.");
      return;
    }
    setName("");
    setAdding(false);
    toast.success("Matéria adicionada.");
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Button variant="outline" size="sm" asChild>
        <Link to="/">
          <ArrowLeft /> Voltar
        </Link>
      </Button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Quiz</h1>
        <Button variant="mint" size="pill" onClick={() => setAdding(true)} disabled={!activePlanId}>
          <Plus /> Adicionar Matéria
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Selecione uma disciplina para ver os assuntos e seus quizzes.
      </p>

      {adding && (
        <div className="mt-4 flex flex-wrap gap-2 rounded-2xl border bg-card p-3 shadow-soft">
          <Input
            autoFocus
            className="min-w-40 flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="Nome da matéria"
          />
          <Button variant="mint" size="sm" onClick={save} disabled={!name.trim()}>
            Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-card/70 p-8 text-center">
          <ListChecks className="mx-auto size-6 text-muted-foreground" />
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
                to="/quiz/$subjectId"
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
