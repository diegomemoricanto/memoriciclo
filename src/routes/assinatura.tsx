import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/assinatura")({
  head: () => ({
    meta: [
      { title: "Assinatura — Painel de Estudos" },
      {
        name: "description",
        content: "Consulte o status da sua assinatura e os recursos incluídos no seu plano.",
      },
      { property: "og:title", content: "Assinatura — Painel de Estudos" },
      {
        property: "og:description",
        content: "Status da assinatura e recursos do seu plano de estudos.",
      },
    ],
  }),
  component: AssinaturaPage,
});

function AssinaturaPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-8">
      <h1 className="text-2xl font-semibold tracking-tight">Assinatura</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Seu acesso está ativo no plano gratuito, com ciclos de estudo, mapas mentais e métricas
        ilimitados.
      </p>
      <section className="mt-6 rounded-2xl bg-card p-5 shadow-soft">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano atual</p>
        <p className="mt-1 text-xl font-semibold">Gratuito</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Planos pagos com recursos extras serão disponibilizados em breve.
        </p>
      </section>
    </main>
  );
}
