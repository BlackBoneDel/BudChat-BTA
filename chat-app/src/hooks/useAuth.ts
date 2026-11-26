import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Profile, Status } from "../lib/types";

export interface AuthUser {
  user: import("@supabase/supabase-js").AuthUser | null;
  profile: Profile | null;
  loading: boolean;
}

// Hook de autenticación: sesión de Supabase + perfil asociado + presencia.
export function useAuth() {
  const [state, setState] = useState<AuthUser>({ user: null, profile: null, loading: true });

  const refreshProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    return data as Profile | null;
  }, []);

  // Actualizar presencia en la tabla (para otros usuarios)
  const upsertPresence = useCallback(
    (userId: string | undefined, status: Status) => {
      if (!userId) return;
      supabase.from("presence").upsert({
        user_id: userId,
        status,
        updated_at: new Date().toISOString(),
      });
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const apply = (user: import("@supabase/supabase-js").AuthUser | null) => {
      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }
      refreshProfile(user.id).then((profile) => {
        if (!mounted) return;
        setState({ user, profile, loading: false });
        if (profile) upsertPresence(user.id, profile.status);
      });
    };

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) apply(data.session?.user ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) apply(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshProfile, upsertPresence]);

  const setStatus = useCallback(
    (status: Status) => {
      if (!state.user) return;
      supabase.from("profiles").update({ status }).eq("id", state.user.id);
      upsertPresence(state.user.id, status);
    },
    [state.user, upsertPresence]
  );

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  return { ...state, setStatus, signOut, refreshProfile };
}
