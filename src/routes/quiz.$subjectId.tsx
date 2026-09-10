import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudyState } from "@/lib/study-store";
import { allSubjects } from "@/lib/mind-subjects";
import { useSubjectTopics } from "@/lib/topics-store";
import { useSubjectQuizzes } from "@/lib/topic-quizzes";
import { QuizBlock } from "@/components/quiz/QuizBlock";

export const Route = createFileRoute("/quiz/$subjectId")({
  head: () => ({
    meta: [
      { title: "Quizzes da disciplina — Painel de Estudos" },
      {
        name: "description",
        content: "Envie um quiz em HTML para cada assunto e responda direto no app.",
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
  const { quizzes, loading, busyTopicId, upload, remove } = useSubjectQuizzes(subjectId);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Button variant="outline" size="sm" asChild>
        <Link to="/quiz">
          <ArrowLeft /> Voltar
        </Link>
      </Button>

      <div className="mt-5 flex items-center gap-3">
        {subject && (
          <span className="h-8 w-1.5 rounded-full" style={{ background: subject.color }} />
        )}
        <h1 className="text-3xl font-semibold tracking-tight">{subject?.name ?? "Disciplina"}</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada assunto pode ter um quiz em HTML, executado de forma isolada dentro do app.
      </p>

      {topics.length === 0 ? (
        <div className="mt-8 rounded-2xl border bg-card/70 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum assunto cadastrado nesta disciplina. Cadastre os assuntos em Mapas Mentais.
          </p>
          <Button variant="mint" size="pill" className="mt-4" asChild>
            <Link to="/mapas-mentais/$subjectId" params={{ subjectId }}>
              Cadastrar assuntos
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {topics.map((t) => (
            <QuizBlock
              key={t.id}
              topicName={t.name}
              quiz={quizzes[t.id]}
              busy={loading || busyTopicId === t.id}
              onUpload={(file) => upload(t.id, file)}
              onRemove={() => remove(t.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
