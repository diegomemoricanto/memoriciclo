import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { QuestionsEntry } from "@/lib/study-store";

export type ManualEntry = { seconds: number; questions: QuestionsEntry };

export function ManualStudyForm({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave: (entry: ManualEntry) => void;
}) {
  const [minutes, setMinutes] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [topic, setTopic] = useState("");

  const num = (v: string) => {
    const n = Number(v);
    return v.trim() === "" || Number.isNaN(n) ? null : Math.max(0, Math.round(n));
  };
  const total = (num(correct) ?? 0) + (num(wrong) ?? 0);

  const submit = () => {
    const mins = num(minutes) ?? 0;
    onSave({
      seconds: mins * 60,
      questions: {
        total: total > 0 ? total : null,
        correct: num(correct),
        wrong: num(wrong),
        topic: topic.trim() ? topic.trim() : null,
      },
    });
  };

  return (
    <div className="mt-3 space-y-3 rounded-lg border bg-muted/40 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Minutos</span>
          <Input
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="30"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Acertos</span>
          <Input
            inputMode="numeric"
            value={correct}
            onChange={(e) => setCorrect(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Erros</span>
          <Input
            inputMode="numeric"
            value={wrong}
            onChange={(e) => setWrong(e.target.value)}
            placeholder="0"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">Total</span>
          <Input readOnly value={total ? String(total) : ""} placeholder="0" />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
          Tópico estudado
        </span>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: Crase" />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="mint" size="sm" onClick={submit}>
          Salvar estudo
        </Button>
      </div>
    </div>
  );
}