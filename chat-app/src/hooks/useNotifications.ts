import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

// Hook de notificaciones: suscripción realtime + lista + marcar como leídas.
export function useNotifications(userId: string | null | undefined) {
  const [items, setItems] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) { setItems([]); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as AppNotification[]);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const ch = supabase.channel(`notifs:${userId}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [userId, refresh]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    refresh();
  }, [userId, refresh]);

  const unread = items.filter((i) => !i.read).length;
  return { items, unread, markAllRead, refresh };
}

// Helper para crear una notificación.
export async function notify(userId: string, kind: string, title: string, body = "") {
  await supabase.from("notifications").insert({ user_id: userId, kind, title, body });
}
