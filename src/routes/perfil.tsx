import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Metrics } from "@/components/study/Metrics";
import { ConsistencyCard } from "@/components/profile/ConsistencyCard";
import { SubjectPanel } from "@/components/profile/SubjectPanel";
import { RemindersCard } from "@/components/profile/RemindersCard";
import { signOut, useAuth } from "@/lib/auth-store";
import { useRequireAuth } from "@/components/auth/auth-gate";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil e desempenho — Painel de Estudos" },
      {
        name: "description",
        content:
          "Veja seus dados de conta e as métricas de desempenho: horas estudadas, evolução, distribuição por disciplina e sequência de dias.",
      },
      { property: "og:title", content: "Meu perfil e desempenho — Painel de Estudos" },
      {
        property: "og:description",
        content: "Métricas de desempenho dos seus ciclos de estudo.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId, email, profile, loading } = useAuth();
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !userId) requireAuth();
  }, [loading, userId, requireAuth]);

  if (!userId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Meu perfil</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre com o Google para ver seu perfil e suas métricas.
        </p>
      </main>
    );
  }

  const name = profile?.full_name ?? "Estudante";
  const avatar = profile?.avatar_url;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">
      <section className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-5 shadow-soft">
        {avatar ? (
          <img
            src={avatar}
            alt={`Foto de ${name}`}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mint text-xl font-semibold text-mint-foreground">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="truncate text-sm text-muted-foreground">{profile?.email ?? email}</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await signOut();
            navigate({ to: "/" });
          }}
        >
          <LogOut /> Sair
        </Button>
      </section>

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
