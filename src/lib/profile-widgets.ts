import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-store";

export const toDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** registra o acesso de hoje e devolve todos os dias com atividade */
export function useActivityDays() {
  const { userId, loading } = useAuth();
  const [days, setDays] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      setDays([]);
      setReady(true);
      return;
    }
    let alive = true;
    void (async () => {
      const today = toDayKey(new Date());
      await supabase
        .from("user_activity_days")
        .upsert({ user_id: userId, day: today }, { onConflict: "user_id,day" });
      const { data } = await supabase
        .from("user_activity_days")
        .select("day")
        .order("day", { ascending: true });
      if (!alive) return;
      setDays((data ?? []).map((r) => r.day as string));
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [userId, loading]);

  return { days, ready };
}

export type Reminder = {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
};

export function useReminders() {
  const { userId, loading } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);

  const reload = useCallback(async () => {
    if (!userId) {
      setReminders([]);
      return;
    }
    const { data } = await supabase
      .from("reminders")
      .select("id, text, completed, created_at")
      .order("created_at", { ascending: true });
    setReminders((data ?? []) as Reminder[]);
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    void reload();
  }, [loading, reload]);

  const add = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value || !userId) return;
      await supabase.from("reminders").insert({ user_id: userId, text: value });
      await reload();
    },
    [userId, reload],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Pick<Reminder, "text" | "completed">>) => {
      await supabase.from("reminders").update(patch).eq("id", id);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from("reminders").delete().eq("id", id);
      await reload();
    },
    [reload],
  );

  return { reminders, add, update, remove };
}
