import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudyState } from "@/lib/study-store";
import { allSubjects } from "@/lib/mind-subjects";
import { addTopic, removeTopic, useSubjectTopics } from "@/lib/topics-store";

export const Route = createFileRoute("/mapas-mentais/$subjectId/")({
  head: () => ({
    meta: [
      { title: "Assuntos da disciplina — Mapas Mentais" },
      {
        name: "description",
        content: "Cadastre e organize os assuntos desta disciplina para criar mapas mentais.",
      },
      { property: "og:title", content: "Assuntos da disciplina — Mapas Mentais" },
      { property: "og:description", content: "Assuntos e mapas mentais por disciplina." },
    ],
  }),
  component: SubjectTopicsPage,
});

function SubjectTopicsPage() {
  const { subjectId } = Route.useParams();
  const { subjects, savedPlans } = useStudyState();
  const subject = allSubjects(subjects, savedPlans).find((s) => s.id === subjectId);
  const topics = useSubjectTopics()[subjectId] ?? [];

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const save = () => {
    if (!name.trim()) return;
    addTopic(subjectId, name);
    setName("");
    setAdding(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Button variant="outline" size="sm" asChild>
        <Link to="/mapas-mentais">
          <ArrowLeft /> Voltar
        </Link>
      </Button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {subject && (
            <span className="h-8 w-1.5 rounded-full" style={{ background: subject.color }} />
          )}
          <h1 className="text-3xl font-semibold tracking-tight">
            {subject?.name ?? "Disciplina"}
          </h1>
        </div>
        <Button variant="mint" size="pill" onClick={() => setAdding(true)}>
          <Plus /> Adicionar assunto
        </Button>
      </div>

      {adding && (
        <div className="mt-4 flex gap-2 rounded-2xl border bg-card p-3 shadow-soft">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setAdding(false);
            }}
            placeholder="Nome do assunto"
          />
          <Button variant="mint" size="sm" onClick={save} disabled={!name.trim()}>
            Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {topics.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-card/70 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum assunto cadastrado nesta disciplina.
          </p>
          <Button variant="mint" size="pill" className="mt-4" onClick={() => setAdding(true)}>
            <Plus /> Adicionar assunto
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {topics.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 rounded-2xl border bg-card pr-3 shadow-soft"
            >
              <Link
                to="/mapas-mentais/$subjectId/$topicId"
                params={{ subjectId, topicId: t.id }}
                className="flex flex-1 items-center gap-3 rounded-2xl p-4 transition-colors hover:bg-muted/50"
              >
                <span className="flex-1 text-sm font-semibold">{t.name}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              <button
                type="button"
                aria-label={`Excluir ${t.name}`}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  if (window.confirm(`Excluir o assunto "${t.name}" e seu mapa mental?`)) {
                    removeTopic(subjectId, t.id);
                  }
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
