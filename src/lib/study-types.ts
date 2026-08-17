export type Subject = {
  id: string;
  name: string;
  color: string;
  importance: number;
  knowledge: number;
  minSessionMinutes?: number;
  maxSessionMinutes?: number;
};

export type Plan = {
  weeklyHours: number;
  studyDays: string[];
  minSessionMinutes?: number;
  maxSessionMinutes?: number;
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
  topic?: string | null;
  questionsTotal?: number | null;
  questionsCorrect?: number | null;
  questionsWrong?: number | null;
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

export const WEEK_DAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Incrementos "fechados" permitidos para a duração de uma sessão (30 em 30 min). */
export const SESSION_INCREMENT = 30;
export const SESSION_OPTIONS = [30, 60, 90, 120, 150, 180];

export const DEFAULT_MIN_SESSION = 30;
export const DEFAULT_MAX_SESSION = 90;

export function subjectRange(subject: Subject) {
  const a = subject.minSessionMinutes ?? DEFAULT_MIN_SESSION;
  const b = subject.maxSessionMinutes ?? DEFAULT_MAX_SESSION;
  return { min: Math.max(5, Math.min(a, b)), max: Math.max(5, Math.max(a, b)) };
}

/**
 * Durações válidas (múltiplos de 30min) dentro do intervalo [mín, máx] da disciplina.
 * Se nenhum incremento padrão couber, usa o maior múltiplo de 30 que não estoure o
 * máximo; se nem isso for possível, usa o próprio máximo (`tooShort = true`).
 */
export function subjectSessionDurations(subject: Subject) {
  const { min, max } = subjectRange(subject);
  const options = SESSION_OPTIONS.filter((m) => m >= min && m <= max);
  if (options.length) return { options, tooShort: false };
  const fallback = Math.floor(max / SESSION_INCREMENT) * SESSION_INCREMENT;
  return { options: [fallback > 0 ? fallback : max], tooShort: true };
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function colorForIndex(i: number): string {
  return SUBJECT_PALETTE[i % SUBJECT_PALETTE.length] as string;
}

export function subjectPriority(subject: Subject) {
  return subject.importance * (6 - subject.knowledge);
}

export function subjectWeight(subject: Subject, subjects: Subject[]) {
  const total = subjects.reduce((s, x) => s + subjectPriority(x), 0);
  if (!total) return 0;
  return (subjectPriority(subject) / total) * 100;
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
  if (subjects.length === 0 || totalMinutes <= 0) return [];

  // 1) Para cada disciplina: tempo alvo total (peso % x horas semanais) quebrado
  //    em sessões de duração ALEATÓRIA dentro do intervalo mín/máx da própria disciplina.
  const queues = subjects.map((subject) => {
    const weight = subjectWeight(subject, subjects);
    const { options } = subjectSessionDurations(subject);
    const smallest = Math.min(...options);
    let target = Math.round((weight / 100) * totalMinutes);
    const durations: number[] = [];

    while (target >= smallest) {
      // Só escolhe entre incrementos fechados que ainda cabem no tempo restante.
      const fits = options.filter((m) => m <= target);
      const pool = fits.length ? fits : [smallest];
      const draw = pool[Math.floor(Math.random() * pool.length)] ?? smallest;
      durations.push(draw);
      target -= draw;
    }
    // Sobra menor que o menor incremento: arredonda para uma sessão fechada extra
    // apenas se estiver mais perto de completar do que de descartar.
    if (target >= smallest / 2) durations.push(smallest);
    if (!durations.length) durations.push(smallest);

    return { subject, weight, durations, index: 0, counter: 0 };
  });

  const totalWeight = queues.reduce((a, q) => a + q.weight, 0) || 1;

  // 2) Round-robin ponderado: intercala as sessões já dimensionadas.
  const out: Session[] = [];
  let order = 0;
  while (queues.some((q) => q.index < q.durations.length)) {
    const active = queues.filter((q) => q.index < q.durations.length);
    active.forEach((q) => (q.counter += q.weight));
    const pick = active.reduce((a, b) => (b.counter > a.counter ? b : a));
    pick.counter -= totalWeight;
    const minutes = pick.durations[pick.index] ?? subjectRange(pick.subject).max;
    pick.index += 1;
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
