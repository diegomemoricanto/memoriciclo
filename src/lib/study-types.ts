export type Subject = {
  id: string;
  name: string;
  color: string;
  importance: number;
  knowledge: number;
};

export type Plan = {
  weeklyHours: number;
  studyDays: string[];
  minSessionMinutes: number;
  maxSessionMinutes: number;
};

export type Session = {
  id: string;
  subjectId: string;
  targetMinutes: number;
  studiedSeconds: number;
  completed: boolean;
  order: number;
};

export type CycleStats = { completedCycles: number };

export type StudyLog = {
  id: string;
  subjectId: string;
  date: string;
  durationSeconds: number;
};

export const SUBJECT_PALETTE = [
  "#FFC9A8",
  "#9EE6CF",
  "#A8D0F5",
  "#FFE29A",
  "#FFB2AE",
  "#CDB8F5",
  "#B9E8A0",
  "#F7B8DC",
];

export const WEEK_DAYS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

export const SESSION_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120];

export const uid = () => Math.random().toString(36).slice(2, 10);

export function colorForIndex(i: number): string {
  return SUBJECT_PALETTE[i % SUBJECT_PALETTE.length] as string;
}

export function subjectWeight(subject: Subject, subjects: Subject[]) {
  const total = subjects.reduce((s, x) => s + x.importance, 0);
  if (!total) return 0;
  return (subject.importance / total) * 100;
}

export function formatMinutes(minutes: number) {
  return formatSeconds(Math.round(minutes * 60));
}

export function formatSeconds(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}min`;
  if (m === 0 && s > 0) return `${s}s`;
  return `${m}min`;
}

export function generateSessions(subjects: Subject[], plan: Plan): Session[] {
  const totalMinutes = plan.weeklyHours * 60;
  const min = Math.min(plan.minSessionMinutes, plan.maxSessionMinutes);
  const max = Math.max(plan.minSessionMinutes, plan.maxSessionMinutes);
  if (subjects.length === 0 || totalMinutes <= 0) return [];

  // Duração padrão de cada sessão curta (dentro do intervalo min/max).
  const sessionMinutes = Math.max(5, Math.round((min + max) / 2));

  // Número total de sessões curtas do ciclo.
  const totalSessions = Math.max(
    subjects.length,
    Math.round(totalMinutes / sessionMinutes),
  );

  // Quantidade de sessões por disciplina, proporcional ao peso (%).
  const queues = subjects.map((subject) => {
    const weight = subjectWeight(subject, subjects);
    return {
      subject,
      weight,
      remaining: Math.max(1, Math.round((weight / 100) * totalSessions)),
      counter: 0,
    };
  });

  const totalWeight = queues.reduce((a, q) => a + q.weight, 0) || 1;

  // Round-robin ponderado: intercala as disciplinas usando contador acumulado.
  const out: Session[] = [];
  let order = 0;
  while (queues.some((q) => q.remaining > 0)) {
    const active = queues.filter((q) => q.remaining > 0);
    active.forEach((q) => (q.counter += q.weight));
    const pick = active.reduce((a, b) => (b.counter > a.counter ? b : a));
    pick.counter -= totalWeight;
    pick.remaining -= 1;
    out.push({
      id: uid(),
      subjectId: pick.subject.id,
      targetMinutes: Math.min(max, Math.max(min, sessionMinutes)),
      studiedSeconds: 0,
      completed: false,
      order: order++,
    });
  }
  return out;
}