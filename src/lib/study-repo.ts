import { supabase } from "@/integrations/supabase/client";
import type { CycleStats, Plan, Session, StudyLog, Subject } from "./study-types";
import type { MindNode } from "./mindmap-types";

export type SavedPlan = {
  id: string;
  name: string;
  createdAt: string;
  subjects: Subject[];
  plan: Plan;
  sessions: Session[];
  cycleStats: CycleStats;
};

export type RemoteStudyData = {
  savedPlans: SavedPlan[];
  activePlanId: string | null;
  studyLogs: StudyLog[];
  subjectMindMaps: Record<string, MindNode>;
};

const nullish = <T>(v: T | null | undefined, fallback: T) =>
  v === null || v === undefined ? fallback : v;

/** lança se o Supabase retornou erro, para que a camada de sincronização possa reagir */
function check(result: { error: { message: string } | null }, op: string) {
  if (result.error) throw new Error(`${op}: ${result.error.message}`);
}

/** carrega todo o estado de estudos do usuário logado */
export async function loadStudyData(userId: string): Promise<RemoteStudyData> {
  const [plans, settings, subjects, sessions, stats, logs, maps] = await Promise.all([
    supabase.from("saved_plans").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("plan_settings").select("*").eq("user_id", userId),
    supabase.from("subjects").select("*").eq("user_id", userId).order("position"),
    supabase.from("sessions").select("*").eq("user_id", userId).order("order_index"),
    supabase.from("cycle_stats").select("*").eq("user_id", userId),
    supabase.from("study_logs").select("*").eq("user_id", userId).order("studied_at"),
    supabase.from("mind_maps").select("*").eq("user_id", userId).eq("scope", "subject"),
  ]);

  const savedPlans: SavedPlan[] = (plans.data ?? []).map((p) => {
    const s = (settings.data ?? []).find((x) => x.plan_id === p.id);
    const cs = (stats.data ?? []).find((x) => x.plan_id === p.id);
    return {
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      plan: {
        weeklyHours: Number(s?.weekly_hours ?? 0),
        studyDays: s?.study_days ?? [],
        ...(s?.min_session_minutes != null ? { minSessionMinutes: s.min_session_minutes } : {}),
        ...(s?.max_session_minutes != null ? { maxSessionMinutes: s.max_session_minutes } : {}),
      },
      subjects: (subjects.data ?? [])
        .filter((x) => x.plan_id === p.id)
        .map((x) => ({
          id: x.id,
          name: x.name,
          color: x.color,
          importance: x.importance,
          knowledge: x.knowledge,
          ...(x.min_session_minutes != null ? { minSessionMinutes: x.min_session_minutes } : {}),
          ...(x.max_session_minutes != null ? { maxSessionMinutes: x.max_session_minutes } : {}),
        })),
      sessions: (sessions.data ?? [])
        .filter((x) => x.plan_id === p.id)
        .map((x) => ({
          id: x.id,
          subjectId: x.subject_id,
          targetMinutes: x.target_minutes,
          studiedSeconds: x.studied_seconds,
          completed: x.completed,
          order: x.order_index,
        })),
      cycleStats: { completedCycles: nullish(cs?.completed_cycles, 0) },
    };
  });

  const active = (plans.data ?? []).find((p) => p.is_active);

  return {
    savedPlans,
    activePlanId: active?.id ?? savedPlans[savedPlans.length - 1]?.id ?? null,
    studyLogs: (logs.data ?? []).map((l) => ({
      id: l.id,
      subjectId: l.subject_id,
      date: l.studied_at,
      durationSeconds: l.duration_seconds,
      topic: l.topic,
      questionsTotal: l.questions_total,
      questionsCorrect: l.questions_correct,
      questionsWrong: l.questions_wrong,
    })),
    subjectMindMaps: Object.fromEntries(
      (maps.data ?? []).map((m) => [m.ref_id, m.data as unknown as MindNode]),
    ),
  };
}

/** grava um planejamento completo (plano, disciplinas, sessões, ciclos) e o marca como ativo */
export async function saveRemotePlan(userId: string, entry: SavedPlan) {
  check(
    await supabase.from("saved_plans").upsert(
    {
      id: entry.id,
      user_id: userId,
      name: entry.name,
      created_at: entry.createdAt,
      is_active: true,
    },
    { onConflict: "user_id,id" },
    ),
    "saved_plans.upsert",
  );
  check(
    await supabase
      .from("saved_plans")
      .update({ is_active: false })
      .eq("user_id", userId)
      .neq("id", entry.id),
    "saved_plans.deactivate",
  );

  check(
    await supabase.from("plan_settings").upsert(
    {
      plan_id: entry.id,
      user_id: userId,
      weekly_hours: entry.plan.weeklyHours,
      study_days: entry.plan.studyDays,
      min_session_minutes: entry.plan.minSessionMinutes ?? null,
      max_session_minutes: entry.plan.maxSessionMinutes ?? null,
    },
    { onConflict: "user_id,plan_id" },
    ),
    "plan_settings.upsert",
  );
  check(
    await supabase.from("cycle_stats").upsert(
    {
      plan_id: entry.id,
      user_id: userId,
      completed_cycles: entry.cycleStats.completedCycles,
    },
    { onConflict: "user_id,plan_id" },
    ),
    "cycle_stats.upsert",
  );

  check(
    await supabase.from("sessions").delete().eq("user_id", userId).eq("plan_id", entry.id),
    "sessions.delete",
  );
  check(
    await supabase.from("subjects").delete().eq("user_id", userId).eq("plan_id", entry.id),
    "subjects.delete",
  );

  if (entry.subjects.length) {
    check(
      await supabase.from("subjects").insert(
      entry.subjects.map((s, i) => ({
        id: s.id,
        plan_id: entry.id,
        user_id: userId,
        name: s.name,
        color: s.color,
        importance: s.importance,
        knowledge: s.knowledge,
        min_session_minutes: s.minSessionMinutes ?? null,
        max_session_minutes: s.maxSessionMinutes ?? null,
        position: i,
      })),
      ),
      "subjects.insert",
    );
  }
  if (entry.sessions.length) {
    check(
      await supabase.from("sessions").insert(
      entry.sessions.map((s) => ({
        id: s.id,
        plan_id: entry.id,
        user_id: userId,
        subject_id: s.subjectId,
        target_minutes: s.targetMinutes,
        studied_seconds: s.studiedSeconds,
        completed: s.completed,
        order_index: s.order,
      })),
      ),
      "sessions.insert",
    );
  }
}

export async function setRemoteActivePlan(userId: string, planId: string) {
  await supabase.from("saved_plans").update({ is_active: false }).eq("user_id", userId);
  await supabase
    .from("saved_plans")
    .update({ is_active: true })
    .eq("user_id", userId)
    .eq("id", planId);
}

export async function deleteRemotePlan(userId: string, planId: string) {
  await supabase.from("saved_plans").delete().eq("user_id", userId).eq("id", planId);
}

export async function updateRemoteSession(
  userId: string,
  planId: string,
  sessionId: string,
  patch: Partial<Session>,
) {
  const row: {
    studied_seconds?: number;
    completed?: boolean;
    target_minutes?: number;
  } = {
    ...(patch.studiedSeconds !== undefined ? { studied_seconds: patch.studiedSeconds } : {}),
    ...(patch.completed !== undefined ? { completed: patch.completed } : {}),
    ...(patch.targetMinutes !== undefined ? { target_minutes: patch.targetMinutes } : {}),
  };
  if (!Object.keys(row).length) return;
  check(
    await supabase
      .from("sessions")
      .update(row)
      .eq("user_id", userId)
      .eq("plan_id", planId)
      .eq("id", sessionId),
    "sessions.update",
  );
}

export async function resetRemoteCycle(userId: string, planId: string, completedCycles: number) {
  check(
    await supabase
      .from("sessions")
      .update({ studied_seconds: 0, completed: false })
      .eq("user_id", userId)
      .eq("plan_id", planId),
    "sessions.reset",
  );
  check(
    await supabase.from("cycle_stats").upsert(
    { plan_id: planId, user_id: userId, completed_cycles: completedCycles },
    {
      onConflict: "user_id,plan_id",
    },
    ),
    "cycle_stats.upsert",
  );
}

export async function insertRemoteStudyLog(userId: string, planId: string | null, log: StudyLog) {
  check(
    await supabase.from("study_logs").insert({
    id: log.id,
    user_id: userId,
    plan_id: planId,
    subject_id: log.subjectId,
    studied_at: log.date,
    duration_seconds: log.durationSeconds,
    topic: log.topic ?? null,
    questions_total: log.questionsTotal ?? null,
    questions_correct: log.questionsCorrect ?? null,
    questions_wrong: log.questionsWrong ?? null,
    }),
    "study_logs.insert",
  );
}

export async function upsertRemoteMindMap(
  scope: "topic" | "subject",
  userId: string,
  scope: "topic" | "subject",
  refId: string,
  data: MindNode,
) {
  check(
    await supabase.from("mind_maps").upsert(
    {
      user_id: userId,
      scope,
      ref_id: refId,
      data: data as unknown as never,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,scope,ref_id" },
    ),
    "mind_maps.upsert",
  );
}

export async function deleteRemoteMindMap(
  userId: string,
  scope: "topic" | "subject",
  refId: string,
) {
  await supabase
    .from("mind_maps")
    .delete()
    .eq("user_id", userId)
    .eq("scope", scope)
    .eq("ref_id", refId);
}

export async function loadRemoteTopicMindMaps(userId: string): Promise<Record<string, MindNode>> {
  const { data } = await supabase
    .from("mind_maps")
    .select("ref_id, data")
    .eq("user_id", userId)
    .eq("scope", "topic");
  return Object.fromEntries((data ?? []).map((m) => [m.ref_id, m.data as unknown as MindNode]));
}

export type RemoteTopic = { id: string; subjectId: string; name: string };

export async function loadRemoteTopics(userId: string): Promise<RemoteTopic[]> {
  const { data } = await supabase
    .from("subject_topics")
    .select("*")
    .eq("user_id", userId)
    .order("created_at");
  return (data ?? []).map((t) => ({ id: t.id, subjectId: t.subject_id, name: t.name }));
}

export async function insertRemoteTopic(userId: string, topic: RemoteTopic) {
  await supabase.from("subject_topics").insert({
    id: topic.id,
    user_id: userId,
    subject_id: topic.subjectId,
    name: topic.name,
  });
}

export async function deleteRemoteTopic(userId: string, topicId: string) {
  await supabase.from("subject_topics").delete().eq("user_id", userId).eq("id", topicId);
  await deleteRemoteMindMap(userId, "topic", topicId);
}
