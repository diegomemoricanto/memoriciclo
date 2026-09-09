import type { StudyLog } from "./study-types";

export const GENERAL_TOPIC = "Geral";

export type TopicStat = {
  key: string;
  label: string;
  /** chaves originais dos registros agrupados sob este rótulo (nunca reescritas) */
  sources: string[];
  seconds: number;
  correct: number;
  wrong: number;
  answered: number;
  accuracy: number | null;
};

const answeredOf = (l: StudyLog) =>
  l.questionsTotal ?? (l.questionsCorrect ?? 0) + (l.questionsWrong ?? 0);

/** chave original do assunto de um registro (sessões sem assunto caem em "Geral") */
export const topicKeyOf = (log: StudyLog) => log.topic?.trim() || GENERAL_TOPIC;

/**
 * agrupa logs por assunto para exibição. `aliases` mapeia a chave original do assunto
 * para um rótulo de exibição — apenas visual, os registros originais ficam intactos.
 */
export function topicBreakdown(
  logs: StudyLog[],
  aliases: Record<string, string> = {},
): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const l of logs) {
    const source = topicKeyOf(l);
    const label = aliases[source]?.trim() || source;
    const current =
      map.get(label) ??
      ({
        key: label,
        label,
        sources: [],
        seconds: 0,
        correct: 0,
        wrong: 0,
        answered: 0,
        accuracy: null,
      } as TopicStat);
    if (!current.sources.includes(source)) current.sources.push(source);
    current.seconds += l.durationSeconds;
    current.correct += l.questionsCorrect ?? 0;
    current.wrong += l.questionsWrong ?? 0;
    current.answered += answeredOf(l);
    map.set(label, current);
  }
  return [...map.values()]
    .map((t) => ({ ...t, accuracy: t.answered ? (t.correct / t.answered) * 100 : null }))
    .sort((a, b) => {
      if (a.accuracy === null && b.accuracy === null)
        return a.label.localeCompare(b.label, "pt-BR");
      if (a.accuracy === null) return 1;
      if (b.accuracy === null) return -1;
      return a.accuracy - b.accuracy;
    });
}
