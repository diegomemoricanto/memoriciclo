import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Metrics } from "@/components/study/Metrics";
import { ConsistencyCard } from "@/components/profile/ConsistencyCard";
import { SubjectPanel } from "@/components/profile/SubjectPanel";
import { RemindersCard } from "@/components/profile/RemindersCard";
import { useAuth } from "@/lib/auth-store";
import { useRequireAuth } from "@/components/auth/auth-gate";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Meu painel de estudos — Painel de Estudos" },
      {
        name: "description",
        content:
          "Acompanhe sua constância nos estudos, horas estudadas, evolução e o desempenho por disciplina e assunto.",
      },
      { property: "og:title", content: "Meu painel de estudos — Painel de Estudos" },
      {
        property: "og:description",
        content: "Constância, desempenho por disciplina e métricas dos seus ciclos de estudo.",
      },
    ],
  }),
  component: PainelPage,
});

function PainelPage() {
  const { userId, profile, loading } = useAuth();
  const requireAuth = useRequireAuth();

  useEffect(() => {
    if (!loading && !userId) requireAuth();
  }, [loading, userId, requireAuth]);

  if (!userId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Meu painel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre com o Google para ver sua constância e suas métricas.
        </p>
      </main>
    );
  }

  const name = profile?.nickname ?? profile?.first_name ?? profile?.full_name ?? "Estudante";

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Olá, {name}!</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Este é o seu painel: constância, desempenho e disciplinas.
      </p>

      <div className="mt-6 space-y-4">
        <ConsistencyCard />
        <SubjectPanel />
        <RemindersCard />
      </div>

      <h2 className="mt-8 text-xl font-semibold tracking-tight">Desempenho</h2>

      <div className="mt-4">
        <Metrics />
      </div>
    </main>
  );
}
