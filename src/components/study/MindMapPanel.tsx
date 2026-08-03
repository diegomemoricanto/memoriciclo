import { useState } from "react";
import { FileText, Loader2, Pencil, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MindMapCanvas } from "./MindMapCanvas";
import { extractPdfText } from "@/lib/pdf-text";
import { generateMindMap } from "@/lib/mindmap.functions";
import { setSubjectMindMap, useStudyState } from "@/lib/study-store";
import { mapNode, mindUid, nodeDepth, removeNode, type MindNode } from "@/lib/mindmap-types";
import { cn } from "@/lib/utils";
import type { Subject } from "@/lib/study-types";

type InputTab = "pdf" | "text";

export function MindMapPanel({ subject }: { subject: Subject | undefined }) {
  const { subjectMindMaps } = useStudyState();
  const saved = subject ? subjectMindMaps[subject.id] : undefined;

  const [tab, setTab] = useState<InputTab>("text");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<MindNode | null>(null);

  const canGenerate = (tab === "pdf" ? !!file : text.trim().length >= 20) && !status;
  const current = editing ? draft : saved;

  const generate = async () => {
    if (!subject) return;
    setError(null);
    try {
      let content = text.trim();
      if (tab === "pdf" && file) {
        setStatus("Lendo o PDF...");
        content = await extractPdfText(file);
        if (content.length < 20) {
          throw new Error("Não foi possível extrair texto deste PDF (talvez seja digitalizado).");
        }
      }
      setStatus("Analisando conteúdo...");
      const promise = generateMindMap({ data: { content, subject: subject.name } });
      const timer = setTimeout(() => setStatus("Montando o mapa..."), 1800);
      const { tree } = await promise;
      clearTimeout(timer);
      setSubjectMindMap(subject.id, tree);
      setShowInput(false);
      setEditing(false);
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar o mapa mental.");
    } finally {
      setStatus(null);
    }
  };

  const startEditing = () => {
    if (!saved) return;
    setDraft(saved);
    setEditing(true);
  };

  const addChild = (parentId: string) =>
    setDraft((d) =>
      d
        ? mapNode(d, (n) =>
            n.id === parentId
              ? {
                  ...n,
                  children: [...(n.children ?? []), { id: mindUid(), label: "Novo tópico" }],
                }
              : n,
          )
        : d,
    );

  const rename = (id: string, label: string) =>
    setDraft((d) => (d ? mapNode(d, (n) => (n.id === id ? { ...n, label } : n)) : d));

  const remove = (node: MindNode) => {
    if (node.children?.length && !window.confirm(`Excluir "${node.label}" e seus subtópicos?`)) {
      return;
    }
    setDraft((d) => (d ? removeNode(d, node.id) : d));
  };

  const addRootTopic = () =>
    setDraft((d) =>
      d ? { ...d, children: [...(d.children ?? []), { id: mindUid(), label: "Novo tópico" }] } : d,
    );

  if (!subject) return null;

  const showForm = showInput || !saved;

  return (
    <div className="mt-4">
      {showForm ? (
        <div className="rounded-xl border p-4">
          <div className="flex gap-2">
            {(
              [
                { id: "pdf" as InputTab, label: "Enviar PDF", icon: Upload },
                { id: "text" as InputTab, label: "Colar Texto", icon: FileText },
              ]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === t.id
                    ? "bg-mint text-mint-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <t.icon className="size-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {tab === "pdf" ? (
            <div className="mt-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground hover:bg-muted/40">
                <Upload className="size-5" />
                {file ? (
                  <span className="font-medium text-foreground">{file.name}</span>
                ) : (
                  <span>Clique para escolher um PDF do conteúdo</span>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          ) : (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o conteúdo da matéria (resumo, apostila, anotações)..."
              className="mt-3 min-h-[160px] resize-y"
            />
          )}

          {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}

          <div className="mt-4 flex gap-2">
            <Button
              variant="mint"
              size="pill"
              className="flex-1"
              disabled={!canGenerate}
              onClick={generate}
            >
              {status ? (
                <>
                  <Loader2 className="animate-spin" /> {status}
                </>
              ) : (
                <>
                  <Sparkles /> Gerar Mapa Mental
                </>
              )}
            </Button>
            {saved && (
              <Button
                variant="outline"
                size="pill"
                onClick={() => setShowInput(false)}
                disabled={!!status}
              >
                <X /> Cancelar
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {current && !showForm && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {nodeDepth(current)} níveis · arraste para mover, use o scroll para dar zoom
            </p>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={addRootTopic}>
                    <Sparkles /> + Adicionar tópico principal
                  </Button>
                  <Button
                    variant="mint"
                    size="sm"
                    onClick={() => {
                      if (draft) setSubjectMindMap(subject.id, draft);
                      setEditing(false);
                      setDraft(null);
                    }}
                  >
                    Salvar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setDraft(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    <Pencil /> Editar
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowInput(true)}>
                    <RefreshCw /> Gerar novamente
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="mt-3">
            <MindMapCanvas
              root={current}
              editing={editing}
              onRename={rename}
              onAddChild={addChild}
              onDelete={remove}
            />
          </div>
        </>
      )}
    </div>
  );
}
