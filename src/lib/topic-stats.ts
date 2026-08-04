import type { StudyLog } from "./study-types";

export const GENERAL_TOPIC = "Geral";

export type TopicStat = {
  key: string;
  label: string;
  seconds: number;
  correct: number;
  wrong: number;
  answered: number;
  accuracy: number | null;
};

const answeredOf = (l: StudyLog) =>
  l.questionsTotal ?? (l.questionsCorrect ?? 0) + (l.questionsWrong ?? 0);

/** agrupa logs por tópico (sessões sem tópico caem em "Geral") */
export function topicBreakdown(logs: StudyLog[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const l of logs) {
    const label = l.topic?.trim() || GENERAL_TOPIC;
    const current =
      map.get(label) ??
      ({ key: label, label, seconds: 0, correct: 0, wrong: 0, answered: 0, accuracy: null } as TopicStat);
    current.seconds += l.durationSeconds;
    current.correct += l.questionsCorrect ?? 0;
    current.wrong += l.questionsWrong ?? 0;
    current.answered += answeredOf(l);
    map.set(label, current);
  }
  return [...map.values()]
    .map((t) => ({ ...t, accuracy: t.answered ? (t.correct / t.answered) * 100 : null }))
    .sort((a, b) => {
      if (a.accuracy === null && b.accuracy === null) return a.label.localeCompare(b.label, "pt-BR");
      if (a.accuracy === null) return 1;
      if (b.accuracy === null) return -1;
      return a.accuracy - b.accuracy;
    });
}