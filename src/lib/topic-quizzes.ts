import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuth, onUserChange } from "@/lib/auth-store";

export type TopicQuiz = {
  id: string;
  subjectId: string;
  topicId: string;
  fileName: string;
  storagePath: string;
  updatedAt: string;
};

const BUCKET = "topic-quizzes";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 12);

/** quizzes (um por assunto) de uma disciplina do usuário logado */
export function useSubjectQuizzes(subjectId: string) {
  const [quizzes, setQuizzes] = useState<Record<string, TopicQuiz>>({});
  const [loading, setLoading] = useState(true);
  const [busyTopicId, setBusyTopicId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(getAuth().userId);

  useEffect(() => {
    const off = onUserChange(setUserId);
    return () => {
      off();
    };
  }, []);

  const reload = useCallback(async () => {
    if (!userId) {
      setQuizzes({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("topic_quizzes")
      .select("*")
      .eq("user_id", userId)
      .eq("subject_id", subjectId);
    const map: Record<string, TopicQuiz> = {};
    for (const r of data ?? []) {
      map[r.topic_id] = {
        id: r.id,
        subjectId: r.subject_id,
        topicId: r.topic_id,
        fileName: r.file_name,
        storagePath: r.storage_path,
        updatedAt: r.updated_at,
      };
    }
    setQuizzes(map);
    setLoading(false);
  }, [subjectId, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** envia (ou substitui) o arquivo HTML do quiz daquele assunto */
  const upload = useCallback(
    async (topicId: string, file: File) => {
      if (!userId) return;
      setBusyTopicId(topicId);
      try {
        const previous = quizzes[topicId];
        const id = previous?.id ?? uid();
        const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
        const path = `${userId}/${subjectId}/${topicId}/${uid()}-${safeName}`;
        const up = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: "text/html", upsert: false });
        if (up.error) throw new Error(up.error.message);

        const row = {
          id,
          user_id: userId,
          subject_id: subjectId,
          topic_id: topicId,
          file_name: file.name.slice(-120),
          storage_path: path,
          updated_at: new Date().toISOString(),
        };
        const saved = await supabase
          .from("topic_quizzes")
          .upsert(row, { onConflict: "user_id,topic_id" });
        if (saved.error) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw new Error(saved.error.message);
        }
        if (previous && previous.storagePath !== path) {
          await supabase.storage.from(BUCKET).remove([previous.storagePath]);
        }
        await reload();
      } finally {
        setBusyTopicId(null);
      }
    },
    [quizzes, reload, subjectId, userId],
  );

  const remove = useCallback(
    async (topicId: string) => {
      if (!userId) return;
      const quiz = quizzes[topicId];
      if (!quiz) return;
      setBusyTopicId(topicId);
      try {
        await supabase.storage.from(BUCKET).remove([quiz.storagePath]);
        await supabase.from("topic_quizzes").delete().eq("user_id", userId).eq("id", quiz.id);
        await reload();
      } finally {
        setBusyTopicId(null);
      }
    },
    [quizzes, reload, userId],
  );

  return { quizzes, loading, busyTopicId, upload, remove };
}

/** baixa o HTML do quiz para renderizar isolado em iframe sandbox */
export async function fetchQuizHtml(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) throw new Error(error?.message ?? "Falha ao carregar o quiz.");
  return await data.text();
}
