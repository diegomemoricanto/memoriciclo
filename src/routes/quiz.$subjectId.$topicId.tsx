import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileUp, Loader2, Pencil, Play, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStudyState } from "@/lib/study-store";
import { allSubjects } from "@/lib/mind-subjects";
import { useSubjectTopics } from "@/lib/topics-store";
import { fetchQuizHtml, useSubjectQuizzes } from "@/lib/topic-quizzes";

export const Route = createFileRoute("/quiz/$subjectId/$topicId")({
  head: () => ({
    meta: [
      { title: "Quiz do assunto — Painel de Estudos" },
      {
        name: "description",
        content: "Crie o título do quiz e envie o arquivo HTML para responder dentro do app.",
      },
      { property: "og:title", content: "Quiz do assunto — Painel de Estudos" },
      { property: "og:description", content: "Título do quiz e upload do arquivo HTML." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TopicQuizPage,
});

function TopicQuizPage() {
  const { subjectId, topicId } = Route.useParams();
  const { subjects, savedPlans } = useStudyState();
  const subject = allSubjects(subjects, savedPlans).find((s) => s.id === subjectId);
  const topic = (useSubjectTopics()[subjectId] ?? []).find((t) => t.id === topicId);
  const { quizzes, loading, busyTopicId, setTitle, upload, remove } = useSubjectQuizzes(subjectId);
  const quiz = quizzes[topicId];
  const busy = loading || busyTopicId === topicId;

  const fileRef = useRef<HTMLInputElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [html, setHtml] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    setTitleDraft(quiz?.title ?? "");
  }, [quiz?.title]);

  const saveTitle = () => {
    if (!titleDraft.trim()) return;
    void setTitle(topicId, titleDraft)
      .then(() => {
        setEditingTitle(false);
        toast.success("Título do quiz salvo.");
      })
      .catch(() => toast.error("Não foi possível salvar o título."));
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    const isHtml = /\.html?$/i.test(file.name) || file.type === "text/html";
    if (!isHtml) {
      toast.error("Envie um arquivo .html");
      return;
    }
    setHtml(null);
    void upload(topicId, file)
      .then(() => toast.success("Quiz enviado."))
      .catch(() => toast.error("Não foi possível enviar o quiz."));
  };

  const open = async () => {
    if (!quiz?.storagePath) return;
    setOpening(true);
    try {
      setHtml(await fetchQuizHtml(quiz.storagePath));
    } catch {
      toast.error("Não foi possível abrir o quiz.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Button variant="outline" size="sm" asChild>
        <Link to="/quiz/$subjectId" params={{ subjectId }}>
          <ArrowLeft /> Voltar
        </Link>
      </Button>

      <div className="mt-5 flex items-center gap-3">
        {subject && (
          <span className="h-8 w-1.5 rounded-full" style={{ background: subject.color }} />
        )}
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{topic?.name ?? "Assunto"}</h1>
          <p className="text-sm text-muted-foreground">{subject?.name ?? "Disciplina"}</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".html,text/html"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <section className="mt-6 rounded-2xl border bg-card p-4 shadow-soft">
        {!quiz?.title || editingTitle ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Título do quiz</p>
            <div className="flex flex-wrap gap-2">
              <Input
                autoFocus
                className="min-w-40 flex-1"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                placeholder="Ex.: NR 6 — Questões de fixação"
              />
              <Button
                variant="mint"
                size="sm"
                onClick={saveTitle}
                disabled={busy || !titleDraft.trim()}
              >
                {busy ? <Loader2 className="animate-spin" /> : null} Salvar título
              </Button>
              {quiz?.title && (
                <Button variant="outline" size="sm" onClick={() => setEditingTitle(false)}>
                  Cancelar
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Depois de salvar o título você poderá enviar o arquivo HTML deste quiz.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-40 flex-1">
              <p className="text-sm font-semibold">{quiz.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {quiz.storagePath ? quiz.fileName : "Nenhum arquivo HTML enviado"}
              </p>
            </div>

            {quiz.storagePath && (
              <Button
                variant="mint"
                size="sm"
                onClick={() => void open()}
                disabled={opening || busy}
              >
                {opening ? <Loader2 className="animate-spin" /> : <Play />} Abrir quiz
              </Button>
            )}
            <Button
              variant={quiz.storagePath ? "outline" : "mint"}
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              {busy ? <Loader2 className="animate-spin" /> : <FileUp />}
              {quiz.storagePath ? "Substituir Arquivo HTML" : "Enviar Arquivo HTML"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                setTitleDraft(quiz.title);
                setEditingTitle(true);
              }}
            >
              <Pencil /> Renomear
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`Remover o quiz "${quiz.title}"?`)) return;
                setHtml(null);
                void remove(topicId)
                  .then(() => toast.success("Quiz removido."))
                  .catch(() => toast.error("Não foi possível remover o quiz."));
              }}
            >
              <Trash2 /> Remover
            </Button>
          </div>
        )}

        {html !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-6">
            <div className="flex h-full w-full flex-col overflow-hidden bg-background sm:h-[90vh] sm:w-[90vw] sm:rounded-2xl sm:border sm:shadow-2xl">
              <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                <span className="truncate text-sm font-medium text-muted-foreground">
                  Quiz — {quiz?.title ?? topic?.name}
                </span>
                <button
                  type="button"
                  aria-label="Fechar quiz"
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
                  onClick={() => setHtml(null)}
                >
                  <X className="size-5" />
                </button>
              </div>
              <iframe
                title={`Quiz de ${topic?.name ?? "assunto"}`}
                srcDoc={html}
                sandbox="allow-scripts allow-forms allow-popups"
                className="min-h-0 w-full flex-1 border-0 bg-white"
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
