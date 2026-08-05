import { useEffect, useState } from "react";
import {
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  MoreVertical,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MindMapCanvas } from "./MindMapCanvas";
import { extractPdfText } from "@/lib/pdf-text";
import { generateMindMap } from "@/lib/mindmap.functions";
import { removeSubjectMindMap, setSubjectMindMap, useStudyState } from "@/lib/study-store";
import { mapNode, mindUid, nodeDepth, removeNode, type MindNode } from "@/lib/mindmap-types";
import { cn } from "@/lib/utils";
import type { Subject } from "@/lib/study-types";

type InputTab = "pdf" | "text";
type MapMeta = { title?: string; sources?: string[] };

const META_KEY = "mindMapMeta";

function readMeta(subjectId: string): MapMeta {
  if (typeof window === "undefined") return {};
  try {
    const all = JSON.parse(window.localStorage.getItem(META_KEY) ?? "{}") as Record<string, MapMeta>;
    return all[subjectId] ?? {};
  } catch {
    return {};
  }
}

function writeMeta(subjectId: string, meta: MapMeta) {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(window.localStorage.getItem(META_KEY) ?? "{}") as Record<string, MapMeta>;
    all[subjectId] = { ...all[subjectId], ...meta };
    window.localStorage.setItem(META_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function flatten(node: MindNode, depth = 0): string[] {
  return [
    `${"  ".repeat(depth)}${depth === 0 ? "" : "- "}${node.label}`,
    ...(node.children ?? []).flatMap((c) => flatten(c, depth + 1)),
  ];
}

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

  const [title, setTitle] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [titleEditing, setTitleEditing] = useState(false);
  const [full, setFull] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!subject) return;
    const meta = readMeta(subject.id);
    setTitle(meta.title ?? `${subject.name} Mapa`);
    setSources(meta.sources ?? []);
    setFeedback(null);
  }, [subject?.id, subject?.name, subject]);

  const canGenerate = (tab === "pdf" ? !!file : text.trim().length >= 20) && !status;
  const current = editing ? draft : saved;

  const generate = async () => {
    if (!subject) return;
    setError(null);
    try {
      let content = text.trim();
      let sourceLabel = "Texto colado";
      if (tab === "pdf" && file) {
        setStatus("Lendo o PDF...");
        content = await extractPdfText(file);
        sourceLabel = file.name;
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
      const nextTitle = `${subject.name} Mapa`;
      setTitle(nextTitle);
      setSources([sourceLabel]);
      writeMeta(subject.id, { title: nextTitle, sources: [sourceLabel] });
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

  const share = async () => {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(`${title}\n\n${flatten(current).join("\n")}`);
      toast.success("Mapa mental copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar o mapa mental.");
    }
  };

  const deleteMap = () => {
    if (!subject) return;
    if (!window.confirm("Excluir este mapa mental? Essa ação não pode ser desfeita.")) return;
    removeSubjectMindMap(subject.id);
    writeMeta(subject.id, { sources: [] });
    setEditing(false);
    setDraft(null);
    setFull(false);
    setShowInput(false);
    toast.success("Mapa mental excluído.");
  };

  if (!subject) return null;

  const showForm = showInput || !saved;

  const titleBlock = (
    <div className="min-w-0">
      {titleEditing ? (
        <input
          autoFocus
          defaultValue={title}
          onBlur={(e) => {
            const next = e.target.value.trim() || title;
            setTitle(next);
            writeMeta(subject.id, { title: next });
            setTitleEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setTitleEditing(false);
          }}
          className="w-full max-w-xs rounded-md border bg-background px-2 py-1 text-lg font-medium outline-none"
        />
      ) : (
        <h3
          className="cursor-text truncate text-lg font-medium tracking-tight"
          title="Clique para renomear"
          onClick={() => setTitleEditing(true)}
        >
          {title}
        </h3>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="mt-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft hover:text-foreground"
          >
            Ver {sources.length} {sources.length === 1 ? "fonte" : "fontes"}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fontes usadas
          </p>
          {sources.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhuma fonte registrada.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {sources.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm">
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{s}</span>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );

  const actionIcons = (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Compartilhar"
        onClick={share}
        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Share2 className="size-4" />
      </button>
      <button
        type="button"
        aria-label={full ? "Restaurar tamanho" : "Maximizar"}
        onClick={() => setFull((v) => !v)}
        className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {full ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Mais opções"
            className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MoreVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={deleteMap} className="text-destructive">
            <Trash2 /> Excluir mapa mental
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {full && (
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => setFull(false)}
          className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );

  const canvas = (fullscreen: boolean) =>
    current ? (
      <MindMapCanvas
        root={current}
        editing={editing}
        onRename={rename}
        onAddChild={addChild}
        onDelete={remove}
        fileName={title.replace(/\s+/g, "-").toLowerCase()}
        className={fullscreen ? "h-full rounded-none border-0" : undefined}
      />
    ) : null;

  return (
    <div className="mt-4">
      {showForm ? (
        <div className="rounded-xl border p-4">
          <div className="flex gap-2">
            {[
              { id: "pdf" as InputTab, label: "Enviar PDF", icon: Upload },
              { id: "text" as InputTab, label: "Colar Texto", icon: FileText },
            ].map((t) => (
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
        <div className="rounded-2xl border bg-card/70 p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            {titleBlock}
            {actionIcons}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {nodeDepth(current)} níveis · arraste os nós ou o fundo, use o scroll para dar zoom
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
          <div className="mt-3">{!full && canvas(false)}</div>
        </div>
      )}

      {full && current && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-start justify-between gap-3 border-b px-6 py-4">
            {titleBlock}
            {actionIcons}
          </div>
          <div className="relative flex-1">
            {canvas(true)}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button
                type="button"
                onClick={() => setFeedback("up")}
                className={cn(
                  "flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted",
                  feedback === "up" && "bg-mint text-mint-foreground",
                )}
              >
                <ThumbsUp className="size-4" /> Conteúdo bom
              </button>
              <button
                type="button"
                onClick={() => setFeedback("down")}
                className={cn(
                  "flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-soft hover:bg-muted",
                  feedback === "down" && "bg-destructive text-destructive-foreground",
                )}
              >
                <ThumbsDown className="size-4" /> Conteúdo ruim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
