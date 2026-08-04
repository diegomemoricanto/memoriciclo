import { Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, Layers, Network, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRequireAuth } from "@/components/auth/auth-gate";

export function Landing({ hasSaved, onCreate }: { hasSaved: boolean; onCreate: () => void }) {
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const features = [
    { icon: Layers, title: "Ciclos ponderados por peso", text: "Importância × conhecimento" },
    { icon: Timer, title: "Cronômetro por sessão", text: "Alerta ao bater o alvo" },
    { icon: BarChart3, title: "Histórico de horas", text: "Por disciplina e por dia" },
  ];
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-mint/25 via-background to-primary/10" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-mint/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-mint" /> 100% no seu navegador
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Painel de{" "}
            <span className="bg-gradient-to-r from-mint to-primary bg-clip-text text-transparent">
              Estudos
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Monte um ciclo de revisão inteligente: cada disciplina entra na sequência de acordo
            com o peso dela, em sessões curtas e cronometradas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="mint" size="pill" onClick={() => requireAuth(onCreate)}>
              Criar Planejamento
            </Button>
            <Button
              variant="outline"
              size="pill"
              onClick={() => requireAuth(() => navigate({ to: "/planejamentos" }))}
            >
              Meus Planejamentos
            </Button>
            <Button
              variant="outline"
              size="pill"
              onClick={() => requireAuth(() => navigate({ to: "/mapas-mentais" }))}
            >
              <Network /> Mapas Mentais
            </Button>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border bg-card/70 p-4 shadow-soft backdrop-blur"
              >
                <f.icon className="size-5 text-mint-foreground" />
                <p className="mt-3 text-sm font-semibold leading-snug">{f.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
        <LandingWheel />
      </div>
    </main>
  );
}

function LandingWheel() {
  const slices = 18;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const seg = circumference / slices;
  const palette = ["#9EE6CF", "#A8D0F5", "#FFC9A8", "#CDB8F5", "#FFE29A", "#F7B8DC"];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <div className="absolute inset-6 rounded-full bg-mint/20 blur-2xl" />
      <svg viewBox="0 0 180 180" className="relative h-full w-full animate-[spin_28s_linear_infinite]">
        {Array.from({ length: slices }).map((_, i) => (
          <circle
            key={i}
            cx={90}
            cy={90}
            r={radius}
            fill="none"
            stroke={palette[i % palette.length]}
            strokeWidth={26}
            strokeDasharray={`${seg - 3} ${circumference - seg + 3}`}
            strokeDashoffset={-i * seg}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-semibold">Ciclo</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          intercalado
        </span>
      </div>
    </div>
  );
}

