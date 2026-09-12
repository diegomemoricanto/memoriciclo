import type { StudyLog } from "./study-types";

/**
 * XP e nível são valores DERIVADOS, calculados em tempo real a partir dos
 * dados que já existem (logs de estudo + ciclos concluídos). Nada aqui é
 * persistido em banco, Storage ou localStorage.
 */

export type XpBreakdown = {
  xp: number;
  minutes: number;
  correct: number;
  wrong: number;
  completedCycles: number;
};

/**
 * XP = minutos estudados (durationSeconds/60, floor)
 *    + acertos × 2
 *    + erros × 1   (responder é o comportamento reforçado, não acertar)
 *    + ciclos concluídos × 50
 * Logs com durationSeconds <= 0 são ignorados.
 */
export function computeXp(studyLogs: StudyLog[], completedCycles: number): XpBreakdown {
  let minutes = 0;
  let correct = 0;
  let wrong = 0;
  for (const l of studyLogs) {
    if (l.durationSeconds > 0) minutes += l.durationSeconds;
    correct += l.questionsCorrect ?? 0;
    wrong += l.questionsWrong ?? 0;
  }
  const m = Math.floor(minutes / 60);
  const cycles = Math.max(0, completedCycles);
  return {
    xp: m + correct * 2 + wrong * 1 + cycles * 50,
    minutes: m,
    correct,
    wrong,
    completedCycles: cycles,
  };
}

/** limiar acumulado de XP para atingir o nível n: 100 × (n−1) × n / 2 */
export const levelThreshold = (n: number) => (100 * (n - 1) * n) / 2;

/** nível a partir do XP total (mínimo 1) — forma fechada da curva acumulada */
export function levelFromXp(xp: number): number {
  const safe = Math.max(0, xp);
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * safe) / 100)) / 2));
}

export type LevelProgress = {
  level: number;
  /** 0..1 dentro do nível atual */
  progress: number;
  /** XP que falta para o próximo nível */
  remaining: number;
  nextLevel: number;
};

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const current = levelThreshold(level);
  const next = levelThreshold(level + 1);
  const safe = Math.max(0, xp);
  const progress = Math.min(1, Math.max(0, (safe - current) / (next - current)));
  return {
    level,
    progress,
    remaining: Math.max(0, Math.ceil(next - safe)),
    nextLevel: level + 1,
  };
}
