import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Loader2, LogIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, useAuth, waitForAuth } from "@/lib/auth-store";

type RequireAuth = (action?: () => void) => void;

const AuthActionContext = createContext<RequireAuth>(() => {});

/** roda a ação se o usuário estiver logado; senão abre o popup "Continuar com Google" */
export function useRequireAuth() {
  return useContext(AuthActionContext);
}

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  const requireAuth = useCallback<RequireAuth>((action) => {
    void waitForAuth().then((id) => {
      if (id) {
        action?.();
        return;
      }
      pending.current = action ?? null;
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    setOpen(false);
    const action = pending.current;
    pending.current = null;
    action?.();
  }, [userId]);

  return (
    <AuthActionContext.Provider value={requireAuth}>
      {children}
      {open && (
        <GoogleSignInDialog
          onClose={() => {
            pending.current = null;
            setOpen(false);
          }}
        />
      )}
    </AuthActionContext.Provider>
  );
}

function GoogleSignInDialog({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError("Não conseguimos concluir o login. Tente novamente.");
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Entrar na sua conta"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-card p-7 text-center shadow-soft">
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint/25">
          <LogIn className="size-5 text-mint-foreground" />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Entre para continuar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Seus planejamentos, sessões e mapas mentais ficam salvos na sua conta e disponíveis em
          qualquer dispositivo.
        </p>
        <Button variant="mint" size="pill" className="mt-6 w-full" disabled={busy} onClick={signIn}>
          {busy ? <Loader2 className="animate-spin" /> : <GoogleMark />} Continuar com Google
        </Button>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.3h12.4c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.4z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7A14.6 14.6 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8.3 2.4-6.4 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
