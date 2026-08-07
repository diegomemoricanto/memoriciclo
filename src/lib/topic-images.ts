import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuth, onUserChange } from "@/lib/auth-store";

export type TopicImage = {
  id: string;
  topicId: string;
  storagePath: string;
  createdAt: string;
  url: string;
};

const BUCKET = "topic-images";

const uid = () => Math.random().toString(36).slice(2, 10);

async function signed(paths: string[]) {
  if (!paths.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  return Object.fromEntries(
    (data ?? []).map((d) => [d.path ?? "", d.signedUrl]).filter(([p]) => p),
  ) as Record<string, string>;
}

export function useTopicImages(topicId: string) {
  const [images, setImages] = useState<TopicImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(getAuth().userId);

  useEffect(() => onUserChange(setUserId), []);

  const reload = useCallback(async () => {
    if (!userId) {
      setImages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("topic_images")
      .select("*")
      .eq("user_id", userId)
      .eq("topic_id", topicId)
      .order("created_at");
    const rows = data ?? [];
    const urls = await signed(rows.map((r) => r.storage_path));
    setImages(
      rows.map((r) => ({
        id: r.id,
        topicId: r.topic_id,
        storagePath: r.storage_path,
        createdAt: r.created_at,
        url: urls[r.storage_path] ?? "",
      })),
    );
    setLoading(false);
  }, [topicId, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upload = useCallback(
    async (file: File) => {
      if (!userId) return;
      setUploading(true);
      try {
        const id = uid();
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${userId}/${topicId}/${id}-${safeName}`;
        const up = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        });
        if (up.error) throw new Error(up.error.message);
        const ins = await supabase
          .from("topic_images")
          .insert({ id, user_id: userId, topic_id: topicId, storage_path: path });
        if (ins.error) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw new Error(ins.error.message);
        }
        await reload();
      } finally {
        setUploading(false);
      }
    },
    [reload, topicId, userId],
  );

  const remove = useCallback(
    async (image: TopicImage) => {
      if (!userId) return;
      await supabase.storage.from(BUCKET).remove([image.storagePath]);
      await supabase
        .from("topic_images")
        .delete()
        .eq("user_id", userId)
        .eq("id", image.id);
      await reload();
    },
    [reload, userId],
  );

  return { images, loading, uploading, upload, remove };
}
