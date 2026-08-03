import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubjectTopics } from "@/lib/topics-store";
import { createMindMap, flattenNodes, useMindMaps } from "@/lib/mindmaps-store";

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
  const nodes = map ? flattenNodes(map) : [];

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <Button variant="outline" size="sm" asChild>
        <Link to="/mapas-mentais/$subjectId" params={{ subjectId }}>
          <ArrowLeft /> Voltar
        </Link>
      </Button>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">{topic?.name ?? "Assunto"}</h1>
      {!map ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border bg-card/70 p-12 text-center shadow-soft">
          <Network className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum mapa mental salvo para este assunto ainda.
          </p>
          <Button
            variant="mint"
            onClick={() => createMindMap(topicId, topic?.name ?? "Assunto")}
          >
            Criar mapa mental
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border bg-card/70 p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nós salvos ({nodes.length})
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {nodes.map((n) => (
              <li key={n.id} style={{ paddingLeft: n.depth * 16 }}>
                <span className="text-muted-foreground">{n.depth > 0 ? "└ " : ""}</span>
                {n.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
