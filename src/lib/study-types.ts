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

export function colorForIndex(i: number) {
  return SUBJECT_PALETTE[i % SUBJECT_PALETTE.length];
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
  return `${m}min`;
}

export function generateSessions(subjects: Subject[], plan: Plan): Session[] {
  const totalMinutes = plan.weeklyHours * 60;
  const min = Math.min(plan.minSessionMinutes, plan.maxSessionMinutes);
  const max = Math.max(plan.minSessionMinutes, plan.maxSessionMinutes);
  const standard = Math.round((min + max) / 2);

  const queues = subjects
    .map((subject) => {
      const target = (totalMinutes * subjectWeight(subject, subjects)) / 100;
      const chunks: number[] = [];
      let remaining = Math.round(target);
      while (remaining > 0) {
        if (remaining <= max) {
          chunks.push(remaining);
          remaining = 0;
        } else if (remaining - standard < min) {
          chunks.push(Math.round(remaining / 2));
          chunks.push(remaining - Math.round(remaining / 2));
          remaining = 0;
        } else {
          chunks.push(standard);
          remaining -= standard;
        }
      }
      return { subject, chunks, credit: 0, weight: subjectWeight(subject, subjects) };
    })
    .filter((q) => q.chunks.length > 0);

  // weighted round-robin interleaving
  const out: Session[] = [];
  let order = 0;
  while (queues.some((q) => q.chunks.length > 0)) {
    const active = queues.filter((q) => q.chunks.length > 0);
    active.forEach((q) => (q.credit += q.weight));
    const pick = active.reduce((a, b) => (b.credit > a.credit ? b : a));
    pick.credit -= 100;
    const minutes = pick.chunks.shift()!;
    out.push({
      id: uid(),
      subjectId: pick.subject.id,
      targetMinutes: minutes,
      studiedSeconds: 0,
      completed: false,
      order: order++,
    });
  }
  return out;
}