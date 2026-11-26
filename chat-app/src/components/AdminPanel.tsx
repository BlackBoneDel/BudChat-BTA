import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Profile, ServerMember } from "../lib/types";

// Panel de administración del servidor: miembros, roles, reportes, moderación.
export function AdminPanel({ serverId, onClose }: { serverId: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<"members" | "roles" | "reports">("members");
  const [members, setMembers] = useState<{ user_id: string; role: string; profile: Profile | null }[]>([]);
  const [reports, setReports] = useState<{ id: string; target_user: string; reason: string; status: string }[]>([]);

  useEffect(() => {
    if (!serverId) return;
    const loadMembers = async () => {
      const { data: ms } = await supabase.from("server_members").select("*").eq("server_id", serverId);
      const rows = ms ?? [];
      const ids = rows.map((r) => r.user_id);
      const { data: ps } = await supabase.from("profiles").select("*").in("id", ids);
      const map: Record<string, Profile> = {};
      (ps ?? []).forEach((p) => (map[p.id] = p as Profile));
      setMembers(rows.map((r) => ({ user_id: (r as ServerMember).user_id, role: (r as ServerMember).role, profile: map[(r as ServerMember).user_id] ?? null })));
    };
    loadMembers();
    const loadReports = async () => {
      // Reportes de usuarios que son miembros del servidor
      const { data: ms } = await supabase.from("server_members").select("user_id").eq("server_id", serverId);
      const ids = (ms ?? []).map((m) => m.user_id);
      const { data } = await supabase.from("reports").select("id,target_user,reason,status").in("target_user", ids).order("created_at", { ascending: false }).limit(50);
      setReports((data ?? []) as { id: string; target_user: string; reason: string; status: string }[]);
    };
    loadReports();
    const ch = supabase.channel(`admin:${serverId}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${serverId}` }, loadMembers)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, loadReports)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [serverId]);

  if (!serverId) return null;

  const changeRole = async (userId: string, role: string) => {
    await supabase.from("server_members").update({ role }).eq("server_id", serverId).eq("user_id", userId);
  };
  const kick = async (userId: string) => {
    await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", userId);
  };
  const resolveReport = async (id: string, status: string) => {
    await supabase.from("reports").update({ status }).eq("id", id);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Administración del servidor</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="admin-tabs">
          <button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}>Miembros</button>
          <button className={tab === "roles" ? "active" : ""} onClick={() => setTab("roles")}>Roles</button>
          <button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>Reportes</button>
        </div>
        <div className="admin-content">
          {tab === "members" && (
            <div className="admin-list">
              {members.map((m) => (
                <div key={m.user_id} className="admin-row">
                  <span className="admin-name">{m.profile?.display_name || m.profile?.username || "Usuario"}</span>
                  <select value={m.role} onChange={(e) => changeRole(m.user_id, e.target.value)}>
                    <option value="member">Miembro</option>
                    <option value="moderator">Moderador</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="danger" onClick={() => kick(m.user_id)}>Expulsar</button>
                </div>
              ))}
            </div>
          )}
          {tab === "roles" && (
            <div className="admin-list">
              <div className="admin-hint">Los roles básicos (member/moderator/admin/owner) se gestionan arriba. Roles personalizados: (ver esquema roles).</div>
            </div>
          )}
          {tab === "reports" && (
            <div className="admin-list">
              {reports.length === 0 && <div className="admin-hint">No hay reportes.</div>}
              {reports.map((r) => (
                <div key={r.id} className="admin-row">
                  <span className="admin-name">{r.reason}</span>
                  <select value={r.status} onChange={(e) => resolveReport(r.id, e.target.value)}>
                    <option value="open">Abierto</option>
                    <option value="resolved">Resuelto</option>
                    <option value="dismissed">Desestimado</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
