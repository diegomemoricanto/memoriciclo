import { AlertTriangle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useStudyState } from "@/lib/study-store";
import { flushPending } from "@/lib/sync-queue";

/** aviso persistente: existem registros salvos só no aparelho, ainda não sincronizados */
export function SyncStatus() {
  const { pendingSync } = useStudyState();
  const [retrying, setRetrying] = useState(false);
  if (!pendingSync.length) return null;

  const retry = async () => {
    setRetrying(true);
    try {
      await flushPending(true);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
      <AlertTriangle className="size-4" aria-hidden />
      <span>
        {pendingSync.length} registro{pendingSync.length > 1 ? "s" : ""} não sincronizado
        {pendingSync.length > 1 ? "s" : ""}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 gap-1 px-2 text-amber-900 hover:bg-amber-100"
        onClick={() => void retry()}
        disabled={retrying}
      >
        <RefreshCw className={retrying ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />
        Tentar agora
      </Button>
    </div>
  );
}
