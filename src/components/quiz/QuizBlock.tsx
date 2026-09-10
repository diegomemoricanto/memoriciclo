import { useRef, useState } from "react";
import { FileUp, Loader2, Play, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchQuizHtml, type TopicQuiz } from "@/lib/topic-quizzes";

type Props = {
  topicName: string;
  quiz: TopicQuiz | undefined;
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

export function QuizBlock({ topicName, quiz, busy, onUpload, onRemove }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const pick = (file: File | undefined) => {
    if (!file) return;
    const isHtml = /\.html?$/i.test(file.name) || file.type === "text/html";
    if (!isHtml) {
      toast.error("Envie um arquivo .html");
      return;
    }
    setHtml(null);
    void onUpload(file)
      .then(() => toast.success("Quiz enviado."))
      .catch(() => toast.error("Não foi possível enviar o quiz."));
  };

  const open = async () => {
    if (!quiz) return;
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
    <li className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-40 flex-1">
          <p className="text-sm font-semibold">{topicName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {quiz ? quiz.fileName : "Nenhum quiz enviado"}
          </p>
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

        {quiz && (
          <Button variant="mint" size="sm" onClick={() => void open()} disabled={opening || busy}>
            {opening ? <Loader2 className="animate-spin" /> : <Play />} Abrir quiz
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <FileUp />}
          {quiz ? "Substituir" : "Enviar HTML"}
        </Button>
        {quiz && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (!window.confirm(`Remover o quiz de "${topicName}"?`)) return;
              setHtml(null);
              void onRemove()
                .then(() => toast.success("Quiz removido."))
                .catch(() => toast.error("Não foi possível remover o quiz."));
            }}
          >
            <Trash2 /> Remover
          </Button>
        )}
      </div>

      {html !== null && (
        <div className="mt-4 overflow-hidden rounded-xl border bg-background">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Quiz — {topicName}</span>
            <button
              type="button"
              aria-label="Fechar quiz"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
              onClick={() => setHtml(null)}
            >
              <X className="size-4" />
            </button>
          </div>
          <iframe
            title={`Quiz de ${topicName}`}
            srcDoc={html}
            sandbox="allow-scripts allow-forms allow-popups"
            className="h-[70vh] w-full border-0 bg-white"
          />
        </div>
      )}
    </li>
  );
}
