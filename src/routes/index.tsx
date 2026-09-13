import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PlanWizard } from "@/components/study/PlanWizard";
import { Landing } from "@/components/study/Landing";
import { savePlanAndActivate, useStudyState } from "@/lib/study-store";
import { generateSessions, type Plan, type Subject } from "@/lib/study-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Estudos — Ciclo de revisão e cronômetro" },
      {
        name: "description",
        content:
          "Monte um ciclo de estudos ponderado pelo peso de cada disciplina e cronometre cada sessão. Tudo salvo no seu navegador.",
      },
      { property: "og:title", content: "Painel de Estudos — Ciclo de revisão e cronômetro" },
      {
        property: "og:description",
        content: "Cronograma cíclico de revisão com pesos por disciplina e cronômetro por sessão.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { subjects, plan, savedPlans, cycleStats, activePlanId } = useStudyState();
  const [wizardOpen, setWizardOpen] = useState(false);
  const navigate = useNavigate();

  const finishWizard = (nextSubjects: Subject[], nextPlan: Plan, name: string) => {
    savePlanAndActivate({
      id: activePlanId,
      name,
      subjects: nextSubjects,
      plan: nextPlan,
      sessions: generateSessions(nextSubjects, nextPlan),
      cycleStats,
    });
    setWizardOpen(false);
    navigate({ to: "/planejamento" });
  };

  return (
    <>
      <Landing hasSaved={savedPlans.length > 0} onCreate={() => setWizardOpen(true)} />
      {wizardOpen && (
        <PlanWizard
          initialSubjects={subjects}
          initialPlan={plan}
          onClose={() => setWizardOpen(false)}
          onFinish={finishWizard}
        />
      )}
    </>
  );
}
