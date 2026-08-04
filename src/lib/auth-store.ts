import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type AuthState = {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  loading: boolean;
};

const empty: AuthState = { userId: null, email: null, profile: null, loading: true };

let state: AuthState = empty;
let started = false;
let firstApply = true;
const listeners = new Set<() => void>();
const userListeners = new Set<(userId: string | null) => void>();

const emit = () => listeners.forEach((l) => l());

function set(next: Partial<AuthState>) {
  state = { ...state, ...next };
  emit();
}

/** stores de dados se registram aqui para (re)carregar quando o usuário muda */
export function onUserChange(cb: (userId: string | null) => void) {
  userListeners.add(cb);
  if (!state.loading) cb(state.userId);
  return () => userListeners.delete(cb);
}

type SessionUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

async function ensureProfile(user: SessionUser) {
  const meta = user.user_metadata ?? {};
  const fullName =
    (typeof meta["full_name"] === "string" && meta["full_name"]) ||
    (typeof meta["name"] === "string" && meta["name"]) ||
    null;
  const avatarUrl =
    (typeof meta["avatar_url"] === "string" && meta["avatar_url"]) ||
    (typeof meta["picture"] === "string" && meta["picture"]) ||
    null;

  const payload = {
    id: user.id,
    email: user.email ?? null,
    full_name: fullName,
    avatar_url: avatarUrl,
  };
  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, email, full_name, avatar_url")
    .maybeSingle();
  if (!error && data) set({ profile: data as Profile });
  else set({ profile: payload });
}

function applySession(user: SessionUser | null) {
  const changed = firstApply || (user?.id ?? null) !== state.userId;
  firstApply = false;
  state = {
    ...state,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    profile: user ? state.profile : null,
    loading: false,
  };
  emit();
  if (changed) {
    userListeners.forEach((cb) => cb(state.userId));
    if (user) void ensureProfile(user);
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  void supabase.auth.getSession().then(({ data }) => {
    applySession((data.session?.user as SessionUser | undefined) ?? null);
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED") return;
    applySession((session?.user as SessionUser | undefined) ?? null);
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => listeners.delete(listener);
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => empty,
  );
}

export function getAuth() {
  return state;
}

/** resolve com o id do usuário assim que a sessão inicial for verificada */
export function waitForAuth(): Promise<string | null> {
  if (!state.loading) return Promise.resolve(state.userId);
  return new Promise((resolve) => {
    const off = onUserChange((id) => {
      off();
      resolve(id);
    });
  });
}

export async function signInWithGoogle() {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (result.error) throw result.error;
  return result;
}

export async function signOut() {
  await supabase.auth.signOut();
}
