import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Circle, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCountdown,
  formatExamDate,
  useContests,
  type Contest,
  type ContestInput,
} from "@/lib/contests-store";
import { useStudyState } from "@/lib/study-store";

export const Route = createFileRoute("/concursos")({
  head: () => ({
    meta: [
      { title: "Meus Concursos — Painel de Estudos" },
      {
        name: "description",
        content:
          "Cadastre seus concursos, acompanhe a contagem de dias até a prova e vincule cada um ao seu planejamento de estudos.",
      },
      { property: "og:title", content: "Meus Concursos — Painel de Estudos" },
      {
        property: "og:description",
        content: "Concursos, datas de prova e contagem regressiva em um só lugar.",
      },
    ],
  }),
  component: ContestsPage,
});

const emptyForm: ContestInput = { name: "", board: "", exam_date: "", registered: false };

function ContestsPage() {
  const { contests, ready, add, update, remove, linkPlan } = useContests();
  const { savedPlans, activePlanId } = useStudyState();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contest | null>(null);
  const [form, setForm] = useState<ContestInput>(emptyForm);
  const [confirm, setConfirm] = useState<Contest | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (contest: Contest) => {
    setEditing(contest);
    setForm({
      name: contest.name,
      board: contest.board ?? "",
      exam_date: contest.exam_date ?? "",
      registered: contest.registered,
    });
    setFormOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    if (editing) await update(editing.id, form);
    else await add(form);
    setFormOpen(false);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meus Concursos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize seus concursos e veja quantos dias faltam para cada prova.
          </p>
        </div>
        <Button variant="mint" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar concurso
        </Button>
      </header>

      {ready && contests.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed bg-card p-10 text-center">
          <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Nenhum concurso cadastrado ainda. Adicione o primeiro para acompanhar a contagem de
            dias.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {contests.map((contest) => (
            <article
              key={contest.id}
              className="rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">{contest.name}</h2>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {contest.board ? contest.board : "Banca não informada"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Editar concurso"
                    onClick={() => openEdit(contest)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir concurso"
                    onClick={() => setConfirm(contest)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatExamDate(contest.exam_date)}
                </span>
                <span className="rounded-full bg-mint px-3 py-1 font-medium text-mint-foreground">
                  {formatCountdown(contest.exam_date)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-muted-foreground">
                  {contest.registered ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  {contest.registered ? "Inscrição realizada" : "Inscrição não realizada"}
                </span>
              </div>

              <div className="mt-4 border-t pt-4">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Estudando para este concurso
                </Label>
                <Select
                  value={contest.plan_id ?? "none"}
                  onValueChange={(value) =>
                    void linkPlan(contest.id, value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Nenhum planejamento vinculado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum planejamento vinculado</SelectItem>
                    {savedPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                        {plan.id === activePlanId ? " (ativo)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar concurso" : "Adicionar concurso"}</DialogTitle>
            <DialogDescription>
              Os dados do concurso são apenas organizacionais e não alteram seu planejamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contest-name">Nome do concurso</Label>
              <Input
                id="contest-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Tribunal de Justiça — Analista"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contest-board">Banca organizadora</Label>
              <Input
                id="contest-board"
                value={form.board}
                onChange={(e) => setForm({ ...form, board: e.target.value })}
                placeholder="Ex.: FGV"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contest-date">Data da prova</Label>
              <Input
                id="contest-date"
                type="date"
                value={form.exam_date}
                onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status de inscrição</Label>
              <Select
                value={form.registered ? "yes" : "no"}
                onValueChange={(value) => setForm({ ...form, registered: value === "yes" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Inscrição não realizada</SelectItem>
                  <SelectItem value="yes">Inscrição realizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button variant="mint" disabled={!form.name.trim()} onClick={() => void submit()}>
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir concurso?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm ? `"${confirm.name}" será removido. ` : ""}
              Seu planejamento, disciplinas e registros de estudo não são afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) void remove(confirm.id);
                setConfirm(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}