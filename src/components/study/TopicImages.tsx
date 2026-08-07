import { useRef, useState } from "react";
import { ImagePlus, Images, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTopicImages, type TopicImage } from "@/lib/topic-images";

export function TopicImages({ topicId, topicName }: { topicId: string; topicName?: string }) {
  const { images, loading, uploading, upload, remove } = useTopicImages(topicId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<TopicImage | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      await upload(file);
    } catch (e) {
      alert(`Não foi possível enviar a imagem: ${(e as Error).message}`);
    }
  };

  const del = async (img: TopicImage) => {
    if (!confirm("Excluir esta imagem?")) return;
    await remove(img);
    setPreview((p) => (p?.id === img.id ? null : p));
  };

  return (
    <div className="mt-6 rounded-2xl border bg-card/70 p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Images className="size-5 text-mint-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Imagens {topicName ? `— ${topicName}` : ""}
          </h2>
        </div>
        <Button variant="mint" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Enviar imagem
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {loading ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Carregando imagens...</p>
      ) : images.length === 0 ? (
        <p className="mt-8 mb-4 text-center text-sm text-muted-foreground">
          Nenhuma imagem enviada ainda para este assunto.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((img) => (
            <li key={img.id} className="group relative">
              <button
                type="button"
                onClick={() => setPreview(img)}
                className="block aspect-square w-full overflow-hidden rounded-xl border bg-muted"
              >
                <img
                  src={img.url}
                  alt={`Imagem do assunto ${topicName ?? ""}`}
                  loading="lazy"
                  className="size-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
              <button
                type="button"
                aria-label="Excluir imagem"
                onClick={() => void del(img)}
                className="absolute right-2 top-2 hidden place-items-center rounded-full bg-background/90 p-2 text-destructive shadow-soft group-hover:grid"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setPreview(null)}
            className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-background/90 text-foreground"
          >
            <X className="size-4" />
          </button>
          <img
            src={preview.url}
            alt={`Imagem ampliada do assunto ${topicName ?? ""}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
