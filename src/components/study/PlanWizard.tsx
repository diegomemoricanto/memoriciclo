import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  SESSION_OPTIONS,
  WEEK_DAYS,
  colorForIndex,
  subjectWeight,
  uid,
  DEFAULT_MIN_SESSION,
  DEFAULT_MAX_SESSION,
  type Plan,
  type Subject,
} from "@/lib/study-types";

type Props = {
  initialSubjects: Subject[];
  initialPlan: Plan | null;
  onClose: () => void;
  onFinish: (subjects: Subject[], plan: Plan) => void;
};

const defaultPlan: Plan = {
  weeklyHours: 25,
  studyDays: ["segunda", "terça", "quarta", "quinta", "sexta"],
};

export function PlanWizard({ initialSubjects, initialPlan, onClose, onFinish }: Props) {
  const [step, setStep] = useState(1);
  const [subjects, setSubjects] = useState<Subject[]>(
    initialSubjects.length
      ? initialSubjects
      : [
          {
            id: uid(),
            name: "Português",
            color: colorForIndex(0),
            importance: 3,
            knowledge: 3,
            minSessionMinutes: DEFAULT_MIN_SESSION,
            maxSessionMinutes: DEFAULT_MAX_SESSION,
          },
          {
            id: uid(),
            name: "Matemática",
            color: colorForIndex(1),
            importance: 3,
            knowledge: 3,
            minSessionMinutes: DEFAULT_MIN_SESSION,
            maxSessionMinutes: DEFAULT_MAX_SESSION,
          },
        ],
  );
  const [plan, setPlan] = useState<Plan>(initialPlan ?? defaultPlan);

  const patchSubject = (id: string, patch: Partial<Subject>) =>
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addSubject = () =>
    setSubjects((prev) => [
      ...prev,
      {
        id: uid(),
        name: `Disciplina ${prev.length + 1}`,
        color: colorForIndex(prev.length),
        importance: 3,
        knowledge: 3,
        minSessionMinutes: DEFAULT_MIN_SESSION,
        maxSessionMinutes: DEFAULT_MAX_SESSION,
      },
    ]);

  const canFinish = subjects.length > 0 && plan.weeklyHours > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 p-3 sm:items-center sm:p-6">
      <div className="w-full max-w-5xl rounded-3xl bg-card p-5 shadow-soft sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Criar Planejamento</h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Etapa {step}/3
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}>
            <X />
          </Button>
        </div>

        {step === 1 ? (
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_260px]">
            <div>
              <p className="text-sm text-muted-foreground">
                Para cada disciplina, selecione a importância para sua prova e seu grau de
                conhecimento.
              </p>
              <Button variant="mint" className="mt-4" onClick={addSubject}>
                <Plus /> Adicionar disciplina
              </Button>
              <div className="mt-4 grid max-h-[52vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {subjects.map((s) => (
                  <div key={s.id} className="rounded-2xl border bg-background p-4 shadow-soft">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <Input
                        value={s.name}
                        onChange={(e) => patchSubject(s.id, { name: e.target.value })}
                        className="h-9 border-0 bg-transparent px-1 font-medium shadow-none focus-visible:ring-0"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${s.name}`}
                        onClick={() => setSubjects((p) => p.filter((x) => x.id !== s.id))}
                      >
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    </div>
                    <LabeledSlider
                      label="Importância"
                      value={s.importance}
                      onChange={(v) => patchSubject(s.id, { importance: v })}
                    />
                    <LabeledSlider
                      label="Conhecimento"
                      value={s.knowledge}
                      onChange={(v) => patchSubject(s.id, { knowledge: v })}
                    />
                    <div className="mt-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Duração da sessão (mín / máx)
                      </span>
                      <div className="mt-2 flex gap-2">
                        <MinutesSelect
                          value={s.minSessionMinutes ?? DEFAULT_MIN_SESSION}
                          onChange={(v) => patchSubject(s.id, { minSessionMinutes: v })}
                        />
                        <MinutesSelect
                          value={s.maxSessionMinutes ?? DEFAULT_MAX_SESSION}
                          onChange={(v) => patchSubject(s.id, { maxSessionMinutes: v })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-2xl bg-muted/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Peso do ciclo
              </h3>
              <div className="mt-3 max-h-[52vh] space-y-3 overflow-y-auto">
                {subjects.map((s) => {
                  const w = subjectWeight(s, subjects);
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between text-xs">
                        <span className="truncate pr-2">{s.name}</span>
                        <span className="font-semibold">{w.toFixed(1)}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${w}%`, backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          </div>
        ) : (
          <div className="mt-5 max-w-2xl space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quantas horas, em média, pretende estudar por semana?
              </label>
              <Input
                type="number"
                min={1}
                value={plan.weeklyHours}
                onChange={(e) => setPlan({ ...plan, weeklyHours: Number(e.target.value) })}
                className="mt-2 max-w-32"
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dias de estudo
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEK_DAYS.map((d) => {
                  const on = plan.studyDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setPlan({
                          ...plan,
                          studyDays: on
                            ? plan.studyDays.filter((x) => x !== d)
                            : [...plan.studyDays, d],
                        })
                      }
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm capitalize transition-colors",
                        on
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              A duração mínima e máxima de cada sessão agora é definida por disciplina, na
              etapa 1.
            </p>
          </div>
        )}

        <div className="mt-7 flex justify-between gap-3">
          <Button variant="outline" disabled={step === 1} onClick={() => setStep(1)}>
            Voltar
          </Button>
          {step === 1 ? (
            <Button variant="mint" disabled={!subjects.length} onClick={() => setStep(2)}>
              Avançar
            </Button>
          ) : (
            <Button variant="mint" disabled={!canFinish} onClick={() => onFinish(subjects, plan)}>
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function LabeledSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-4">
      <div className="flex justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-semibold">{value}</span>
      </div>
      <Slider
        className="mt-2"
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={(vals) => onChange(vals[0] ?? value)}
      />
    </div>
  );
}

function MinutesSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SESSION_OPTIONS.map((m) => (
          <SelectItem key={m} value={String(m)}>
            {m} min
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}