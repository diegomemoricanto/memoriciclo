/** Métricas de período independentes do filtro dos gráficos. */

export type PeriodUnit = "day" | "week" | "month" | "year";

export const localDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type LogLike = { date: string; durationSeconds: number };

/** Dias com estudo registrado (chaves locais, ordenadas). */
export function studyDayKeys(logs: LogLike[]): string[] {
  const set = new Set<string>();
  for (const l of logs) {
    if (l.durationSeconds <= 0) continue;
    const d = new Date(l.date);
    if (Number.isNaN(d.getTime())) continue;
    set.add(localDayKey(d));
  }
  return [...set].sort();
}

/**
 * Sequência de dias seguidos com atividade, terminando hoje (ou ontem, caso
 * hoje ainda não tenha registro). Valor único, sem depender de filtros.
 */
export function currentStreak(dayKeys: Iterable<string>): number {
  const set = dayKeys instanceof Set ? dayKeys : new Set(dayKeys);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!set.has(localDayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (set.has(localDayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export type PeriodAverages = {
  /** total de segundos estudados dentro da janela considerada */
  totalSeconds: number;
  /** primeiro dia com estudo (null quando não há registros) */
  firstDay: Date | null;
  /** quantidade de unidades (parciais contam como 1) por tipo de período */
  units: Record<PeriodUnit, number>;
  /** média de segundos por unidade de período */
  averages: Record<PeriodUnit, number>;
};

/**
 * Base de cálculo: soma real dos segundos estudados, dividida pela quantidade
 * de dias/semanas/meses/anos decorridos entre o primeiro registro e hoje.
 * Cada unidade é contada de forma independente, então trocar o filtro dos
 * gráficos nunca reaproveita o divisor de outro período.
 */
export function periodAverages(logs: LogLike[]): PeriodAverages {
  const totalSeconds = logs.reduce((a, l) => a + Math.max(0, l.durationSeconds), 0);
  const keys = studyDayKeys(logs);
  const empty: PeriodAverages = {
    totalSeconds,
    firstDay: null,
    units: { day: 1, week: 1, month: 1, year: 1 },
    averages: { day: 0, week: 0, month: 0, year: 0 },
  };
  if (keys.length === 0) return empty;

  const firstDay = new Date(`${keys[0]}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayCount = Math.max(
    1,
    Math.floor((today.getTime() - firstDay.getTime()) / 86400000) + 1,
  );
  const weekCount = Math.max(1, Math.ceil(dayCount / 7));
  const monthCount = Math.max(
    1,
    (today.getFullYear() - firstDay.getFullYear()) * 12 +
      (today.getMonth() - firstDay.getMonth()) +
      1,
  );
  const yearCount = Math.max(1, today.getFullYear() - firstDay.getFullYear() + 1);

  const units = { day: dayCount, week: weekCount, month: monthCount, year: yearCount };
  return {
    totalSeconds,
    firstDay,
    units,
    averages: {
      day: totalSeconds / units.day,
      week: totalSeconds / units.week,
      month: totalSeconds / units.month,
      year: totalSeconds / units.year,
    },
  };
}
