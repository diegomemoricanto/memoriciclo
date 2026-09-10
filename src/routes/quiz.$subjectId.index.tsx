import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudyState } from "@/lib/study-store";
import { allSubjects } from "@/lib/mind-subjects";
import { addTopic, useSubjectTopics } from "@/lib/topics-store";
import { useSubjectQuizzes } from "@/lib/topic-quizzes";

export const Route = createFileRoute("/quiz/$subjectId/")({
  head: () => ({
    meta: [
      { title: "Quizzes da disciplina — Painel de Estudos" },
      {
        name: "description",
        content: "Crie assuntos e envie um quiz em HTML para cada um deles.",
      },
      { property: "og:title", content: "Quizzes da disciplina — Painel de Estudos" },
      { property: "og:description", content: "Quizzes em HTML por assunto da disciplina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubjectQuizPage,
});

function SubjectQuizPage() {
  const { subjectId } = Route.useParams();
  const { subjects, savedPlans } = useStudyState();
  const subject = allSubjects(subjects, savedPlans).find((s) => s.id === subjectId);
  const topics = useSubjectTopics()[subjectId] ?? [];
  const { quizzes } = useSubjectQuizzes(subjectId);

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
        <Link to="/quiz">
          <ArrowLeft /> Voltar
        </Link>
      </Button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {subject && (
            <span className="h-8 w-1.5 rounded-full" style={{ background: subject.color }} />
          )}
          <h1 className="text-3xl font-semibold tracking-tight">{subject?.name ?? "Disciplina"}</h1>
        </div>
        <Button variant="mint" size="pill" onClick={() => setAdding(true)}>
          <Plus /> Adicionar Tópico/Assunto
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada assunto pode ter um quiz em HTML, executado de forma isolada dentro do app.
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
            placeholder="Nome do tópico/assunto"
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
            <Plus /> Adicionar Tópico/Assunto
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {topics.map((t) => {
            const quiz = quizzes[t.id];
            return (
              <li key={t.id}>
                <Link
                  to="/quiz/$subjectId/$topicId"
                  params={{ subjectId, topicId: t.id }}
                  className="flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-soft transition-colors hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {quiz?.storagePath
                        ? `Quiz: ${quiz.title || quiz.fileName}`
                        : quiz?.title
                          ? `${quiz.title} — aguardando arquivo HTML`
                          : "Nenhum quiz criado"}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
