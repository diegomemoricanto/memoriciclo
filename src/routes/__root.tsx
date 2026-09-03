import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthGateProvider, useRequireAuth } from "@/components/auth/auth-gate";
import { signOut, useAuth } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Painel de Estudos" },
      {
        name: "description",
        content: "Ciclo de estudos com pesos por disciplina e cronômetro por sessão.",
      },
      { property: "og:title", content: "Painel de Estudos" },
      {
        property: "og:description",
        content: "Ciclo de estudos com pesos por disciplina e cronômetro por sessão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGateProvider>
        <div className="min-h-screen font-sans">
          <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-5">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted data-[status=active]:bg-mint data-[status=active]:text-mint-foreground"
            >
              Home
            </Link>
            <Link
              to="/planejamento"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted data-[status=active]:bg-mint data-[status=active]:text-mint-foreground"
            >
              Planejamento
            </Link>
            <Link
              to="/planejamentos"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted data-[status=active]:bg-mint data-[status=active]:text-mint-foreground"
            >
              Meus Planejamentos
            </Link>
            <Link
              to="/historico"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted data-[status=active]:bg-mint data-[status=active]:text-mint-foreground"
            >
              Histórico
            </Link>
            <Link
              to="/concursos"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted data-[status=active]:bg-mint data-[status=active]:text-mint-foreground"
            >
              Meus Concursos
            </Link>
            <span
              aria-disabled="true"
              className="cursor-default rounded-full px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              Mapas Mentais
            </span>
            <div className="ml-auto">
              <UserMenu />
            </div>
          </nav>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster />
        </div>
      </AuthGateProvider>
    </QueryClientProvider>
  );
}

function UserMenu() {
  const { userId, profile, email } = useAuth();
  const requireAuth = useRequireAuth();
  const [open, setOpen] = useState(false);

  if (!userId) {
    return (
      <Button variant="mint" size="sm" onClick={() => requireAuth()}>
        Entrar
      </Button>
    );
  }

  const name = profile?.full_name ?? profile?.email ?? email ?? "Conta";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Menu do usuário"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-mint text-sm font-semibold text-mint-foreground"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border bg-card p-1 shadow-soft">
            <p className="truncate px-3 py-2 text-xs text-muted-foreground">{name}</p>
            <Link
              to="/perfil"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Perfil
            </Link>
            <button
              type="button"
              onClick={async () => {
                setOpen(false);
                await signOut();
              }}
              className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-muted"
            >
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
