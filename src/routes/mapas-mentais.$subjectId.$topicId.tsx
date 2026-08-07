import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Maximize2, Minimize2, Network, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSubjectTopics } from "@/lib/topics-store";
import { createMindMap, setMindMap, useMindMaps } from "@/lib/mindmaps-store";
import { MindMapCanvas } from "@/components/study/MindMapCanvas";
import { TopicImages } from "@/components/study/TopicImages";
import { mapNode, mindUid, removeNode, type MindNode } from "@/lib/mindmap-types";

export const Route = createFileRoute("/mapas-mentais/$subjectId/$topicId")({
  head: () => ({
    meta: [
      { title: "Mapa mental do assunto — Painel de Estudos" },
      {
        name: "description",
        content: "Mapa mental do assunto selecionado, em construção nesta área do app.",
      },
      { property: "og:title", content: "Mapa mental do assunto — Painel de Estudos" },
      { property: "og:description", content: "Mapa mental por assunto de cada disciplina." },
    ],
  }),
  component: TopicPage,
});

function TopicPage() {
  const { subjectId, topicId } = Route.useParams();
  const topic = (useSubjectTopics()[subjectId] ?? []).find((t) => t.id === topicId);
  const map = useMindMaps()[topicId];
  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  const [tab, setTab] = useState<"map" | "images">("map");

  const rename = (id: string, label: string) => {
    if (!map) return;
    setMindMap(
      topicId,
      mapNode(map, (n) => (n.id === id ? { ...n, label } : n)),
    );
  };

  const addChild = (id: string) => {
    if (!map) return;
    const child: MindNode = { id: mindUid(), label: "Novo tópico", children: [] };
    setMindMap(
      topicId,
      mapNode(map, (n) => (n.id === id ? { ...n, children: [...(n.children ?? []), child] } : n)),
    );
  };

  const remove = (node: MindNode) => {
    if (!map) return;
    const kids = node.children?.length ?? 0;
    if (kids > 0 && !confirm(`Excluir "${node.label}" e seus ${kids} subitens?`)) return;
    setMindMap(topicId, removeNode(map, node.id));
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Button variant="outline" size="sm" asChild>
        <Link to="/mapas-mentais/$subjectId" params={{ subjectId }}>
          <ArrowLeft /> Voltar
        </Link>
      </Button>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{topic?.name ?? "Assunto"}</h1>
        {tab === "map" && map && (
          <div className="flex items-center gap-2">
            {editing && (
              <Button variant="outline" size="sm" onClick={() => addChild(map.id)}>
                <Plus /> Adicionar tópico principal
              </Button>
            )}
            <Button
              variant={editing ? "mint" : "outline"}
              size="sm"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? (
                <>
                  <Check /> Concluir
                </>
              ) : (
                <>
                  <Pencil /> Editar
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Maximizar"
              onClick={() => setFull(true)}
            >
              <Maximize2 />
            </Button>
          </div>
        )}
      </div>
      <div className="mt-4 inline-flex rounded-full border bg-muted/40 p-1">
        {(
          [
            ["map", "Mapa Interativo"],
            ["images", "Imagens"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-mint text-mint-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "images" ? (
        <TopicImages topicId={topicId} {...(topic?.name ? { topicName: topic.name } : {})} />
      ) : !map ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border bg-card/70 p-12 text-center shadow-soft">
          <Network className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum mapa mental salvo para este assunto ainda.
          </p>
          <Button variant="mint" onClick={() => createMindMap(topicId, topic?.name ?? "Assunto")}>
            Criar mapa mental
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border bg-card/70 p-3 shadow-soft">
          {!full && (
            <MindMapCanvas
              root={map}
              editing={editing}
              onRename={rename}
              onAddChild={addChild}
              onDelete={remove}
              fileName={(topic?.name ?? "mapa-mental").replace(/\s+/g, "-").toLowerCase()}
            />
          )}
        </div>
      )}
      {full && map && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="flex items-center justify-between gap-3 border-b px-6 py-4">
            <h2 className="truncate text-lg font-semibold">{topic?.name ?? "Assunto"}</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Restaurar tamanho"
                onClick={() => setFull(false)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Minimize2 className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setFull(false)}
                className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
          <div className="relative flex-1">
            <MindMapCanvas
              root={map}
              editing={editing}
              onRename={rename}
              onAddChild={addChild}
              onDelete={remove}
              className="h-full rounded-none border-0"
              fileName={(topic?.name ?? "mapa-mental").replace(/\s+/g, "-").toLowerCase()}
            />
          </div>
        </div>
      )}
    </main>
  );
}
