import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useCurrentUid } from "../hooks/useCurrentUid";
import type { Profile, Presence } from "../lib/types";

interface MemberRow {
  user_id: string;
  role: string;
  profile: Profile | null;
  presence: Presence | null;
}

const ROLE_GROUPS: { role: string; label: string }[] = [
  { role: "owner", label: "Fundadores" },
  { role: "admin", label: "Administradores" },
  { role: "moderator", label: "Moderadores" },
  { role: "member", label: "Miembros" },
];

// Lista de miembros del servidor (derecha), agrupada por rol y estado.
export function MemberList({ serverId, onClose }: { serverId: string | null; onClose: () => void }) {
  const myUid = useCurrentUid();
  const [members, setMembers] = useState<MemberRow[]>([]);

  useEffect(() => {
    if (!serverId) {
      setMembers([]);
      return;
    }
    let mounted = true;
    const load = async () => {
      const { data: ms } = await supabase
        .from("server_members")
        .select("user_id, role")
        .eq("server_id", serverId);
      const rows = (ms ?? []) as { user_id: string; role: string }[];
      const ids = rows.map((r) => r.user_id);
      const [{ data: ps }, { data: prs }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", ids),
        supabase.from("presence").select("*").in("user_id", ids),
      ]);
      if (!mounted) return;
      const profileMap: Record<string, Profile> = {};
      (ps ?? []).forEach((p) => (profileMap[p.id] = p as Profile));
      const presMap: Record<string, Presence> = {};
      (prs ?? []).forEach((p) => (presMap[p.user_id] = p as Presence));
      setMembers(
        rows.map((r) => ({ user_id: r.user_id, role: r.role, profile: profileMap[r.user_id] ?? null, presence: presMap[r.user_id] ?? null }))
      );
    };
    load();
    const ch = supabase.channel(`members:${serverId}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${serverId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "presence" }, load)
      .subscribe();
    return () => {
      mounted = false;
      ch.unsubscribe();
    };
  }, [serverId]);

  if (!serverId) return null;

  return (
    <aside className="member-list">
      <div className="member-list-header">
        <span>Miembros</span>
        <button onClick={onClose}>×</button>
      </div>
      {ROLE_GROUPS.map((g) => {
        const group = members.filter((m) => m.role === g.role);
        if (group.length === 0) return null;
        const online = group.filter((m) => m.presence?.status !== "offline" && m.presence?.status !== "invisible");
        const offline = group.filter((m) => m.presence?.status === "offline" || m.presence?.status === "invisible" || !m.presence);
        return (
          <div key={g.role} className="member-group">
            <div className="member-group-label">{g.label} — {group.length}</div>
            {online.map((m) => (
              <MemberRowItem key={m.user_id} m={m} isMe={m.user_id === myUid} />
            ))}
            {offline.length > 0 && (
              <>
                <div className="member-offline-label">Sin conexión — {offline.length}</div>
                {offline.map((m) => (
                  <MemberRowItem key={m.user_id} m={m} isMe={m.user_id === myUid} dim />
                ))}
              </>
            )}
          </div>
        );
      })}
    </aside>
  );
}

function MemberRowItem({ m, isMe, dim }: { m: MemberRow; isMe: boolean; dim?: boolean }) {
  const status = m.presence?.status || "offline";
  return (
    <div className={`member-row ${dim ? "offline" : ""}`}>
      <div className={`member-avatar status-${status}`}>
        <img src={m.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${m.profile?.username || "?"}`} alt="" />
        <span className="status-dot" data-status={status} />
      </div>
      <div className="member-info">
        <span className="member-name">{m.profile?.display_name || m.profile?.username || "Usuario"}</span>
        {isMe && <span className="member-me">(tú)</span>}
      </div>
    </div>
  );
}
