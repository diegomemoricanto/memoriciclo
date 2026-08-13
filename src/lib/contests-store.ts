import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

export type Contest = {
  id: string;
  name: string;
  board: string | null;
  exam_date: string | null;
  registered: boolean;
  plan_id: string | null;
};

export type ContestInput = {
  name: string;
  board: string;
  exam_date: string;
  registered: boolean;
};

/** dias restantes até a data da prova (negativo = já passou) */
export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const parts = date.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts as [number, number, number];
  const target = new Date(y, m - 1, d);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86400000);
}

export function formatCountdown(date: string | null): string {
  const days = daysUntil(date);
  if (days === null) return "Data da prova não definida";
  if (days > 1) return `Faltam ${days} dias`;
  if (days === 1) return "Falta 1 dia";
  if (days === 0) return "A prova é hoje";
  return `Prova realizada há ${Math.abs(days)} ${Math.abs(days) === 1 ? "dia" : "dias"}`;
}

export function formatExamDate(date: string | null): string {
  if (!date) return "—";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function useContests() {
  const { userId, loading } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) {
      setContests([]);
      setReady(true);
      return;
    }
    const { data } = await supabase
      .from("contests")
      .select("id, name, board, exam_date, registered, plan_id")
      .order("exam_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    setContests((data ?? []) as Contest[]);
    setReady(true);
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    void reload();
  }, [loading, reload]);

  const add = useCallback(
    async (input: ContestInput) => {
      if (!userId) return;
      await supabase.from("contests").insert({
        user_id: userId,
        name: input.name.trim(),
        board: input.board.trim() || null,
        exam_date: input.exam_date || null,
        registered: input.registered,
      });
      await reload();
    },
    [userId, reload],
  );

  const update = useCallback(
    async (id: string, input: ContestInput) => {
      await supabase
        .from("contests")
        .update({
          name: input.name.trim(),
          board: input.board.trim() || null,
          exam_date: input.exam_date || null,
          registered: input.registered,
        })
        .eq("id", id);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from("contests").delete().eq("id", id);
      await reload();
    },
    [reload],
  );

  /** vincula (ou desvincula) o planejamento informado ao concurso */
  const linkPlan = useCallback(
    async (id: string, planId: string | null) => {
      await supabase.from("contests").update({ plan_id: planId }).eq("id", id);
      await reload();
    },
    [reload],
  );

  return { contests, ready, add, update, remove, linkPlan, reload };
}