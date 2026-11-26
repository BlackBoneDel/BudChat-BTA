import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Hook que expone el uid del usuario autenticado (para comparaciones en render).
export function useCurrentUid(): string | null {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUid(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}
