import type { Subject } from "./study-types";
import type { SavedPlan } from "./study-store";

/** todas as disciplinas conhecidas do app (plano ativo + planejamentos salvos), sem duplicatas */
export function allSubjects(subjects: Subject[], savedPlans: SavedPlan[]): Subject[] {
  const map = new Map<string, Subject>();
  for (const s of [...subjects, ...savedPlans.flatMap((p) => p.subjects)]) {
    if (!map.has(s.id)) map.set(s.id, s);
  }
  return [...map.values()];
}
