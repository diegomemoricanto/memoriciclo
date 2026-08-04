import { useState } from "react";
import { Check, NotebookPen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReminders } from "@/lib/profile-widgets";

export function RemindersCard() {
  const { reminders, add, update, remove } = useReminders();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const submit = async () => {
    await add(draft);
    setDraft("");
    setCreating(false);
  };

  return (
    <section className="rounded-2xl bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <NotebookPen className="size-5 text-mint-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lembretes
          </h2>
        </div>
        {reminders.length > 0 && !creating && (
          <Button variant="mint" size="sm" onClick={() => setCreating(true)}>
            <Plus /> Novo
          </Button>
        )}
      </div>

      {reminders.length === 0 && !creating ? (
        <div className="mt-4 flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-mint/30">
            <NotebookPen className="size-8 text-mint-foreground" />
          </span>
          <p className="text-sm font-semibold">Você ainda não criou nenhum lembrete.</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Use este espaço para anotar coisas importantes: datas de inscrição, provas, boletos a
            pagar, aulas...
          </p>
          <Button variant="mint" onClick={() => setCreating(true)}>
            <Plus /> Criar Lembrete
          </Button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {reminders.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2">
              <button
                type="button"
                aria-label={r.completed ? "Marcar como pendente" : "Marcar como concluído"}
                onClick={() => void update(r.id, { completed: !r.completed })}
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  r.completed ? "border-mint bg-mint text-mint-foreground" : "border-muted-foreground/40"
                }`}
              >
                {r.completed && <Check className="size-3" />}
              </button>
              {editingId === r.id ? (
                <Input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={async () => {
                    if (editText.trim()) await update(r.id, { text: editText.trim() });
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-8 flex-1"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(r.id);
                    setEditText(r.text);
                  }}
                  className={`flex-1 truncate text-left text-sm ${r.completed ? "text-muted-foreground line-through" : ""}`}
                >
                  {r.text}
                </button>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir lembrete"
                onClick={() => void remove(r.id)}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <div className="mt-3 flex gap-2">
          <Input
            autoFocus
            placeholder="Ex.: inscrição do concurso até 20/08"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
              if (e.key === "Escape") setCreating(false);
            }}
          />
          <Button variant="mint" onClick={() => void submit()}>
            Adicionar
          </Button>
          <Button variant="outline" onClick={() => setCreating(false)}>
            Cancelar
          </Button>
        </div>
      )}
    </section>
  );
}
