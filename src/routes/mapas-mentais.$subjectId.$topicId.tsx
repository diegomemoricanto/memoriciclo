import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Network, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSubjectTopics } from "@/lib/topics-store";
import { createMindMap, setMindMap, useMindMaps } from "@/lib/mindmaps-store";
import { MindMapCanvas } from "@/components/study/MindMapCanvas";
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
        {map && (
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
          </div>
        )}
      </div>
      {!map ? (
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
          <MindMapCanvas
            root={map}
            editing={editing}
            onRename={rename}
            onAddChild={addChild}
            onDelete={remove}
          />
        </div>
      )}
    </main>
  );
}
