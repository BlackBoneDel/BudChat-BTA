import { useEffect, useState } from "react";
import { supabase, getCurrentUid } from "../lib/supabase";
import type { Channel, Conversation } from "../lib/types";

interface Props {
  activeServer: string | null;
  active: { kind: "channel" | "conversation"; id: string } | null;
  onSelect: (kind: "channel" | "conversation", id: string) => void;
  onOpenInvite: () => void;
  onSearchUsers: (q: string) => void;
  dmSearch: string;
  dmResults: { id: string; username: string; display_name: string }[];
  onStartDM: (otherId: string) => void;
  onCreateGroup: (name: string, memberIds: string[]) => void;
  canManage: (role: string | null) => boolean;
  onOpenAdmin: () => void;
  onShowMembers: () => void;
}

// Panel lateral izquierdo: lista de canales del servidor + conversaciones DM.
export function ChannelSidebar({ activeServer, active, onSelect, onOpenInvite, onSearchUsers, dmSearch, dmResults, onStartDM, onCreateGroup, canManage, onOpenAdmin, onShowMembers }: Props) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [serverRole, setServerRole] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const uid = getCurrentUid();

  useEffect(() => {
    if (!activeServer || !uid) { setChannels([]); setServerRole(null); return; }
    let mounted = true;
    const load = async () => {
      const { data: cs } = await supabase.from("channels").select("*").eq("server_id", activeServer).order("name", { ascending: true });
      if (!mounted) return;
      setChannels((cs ?? []) as Channel[]);
      const { data: me } = await supabase.from("server_members").select("role").eq("server_id", activeServer).eq("user_id", uid).maybeSingle();
      setServerRole(me ? (me as { role: string }).role : null);
    };
    load();
    const ch = supabase.channel(`channels:${activeServer}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "channels", filter: `server_id=eq.${activeServer}` }, load).subscribe();
    return () => { mounted = false; ch.unsubscribe(); };
  }, [activeServer, uid]);

  useEffect(() => {
    if (!uid) { setConversations([]); return; }
    let mounted = true;
    const load = async () => {
      const { data: cm } = await supabase.from("conversation_members").select("conversation_id,user_id").eq("user_id", uid);
      const convIds = (cm ?? []).map((c) => c.conversation_id);
      const { data: convs } = await supabase.from("conversations").select("*").in("id", convIds);
      if (!mounted) return;
      setConversations((convs ?? []) as Conversation[]);
    };
    load();
    const ch = supabase.channel(`convs:${uid}`);
    ch.on("postgres_changes", { event: "*", schema: "public", table: "conversation_members", filter: `user_id=eq.${uid}` }, load).subscribe();
    return () => { mounted = false; ch.unsubscribe(); };
  }, [uid]);

  const createChannel = async () => {
    if (!activeServer) return;
    const name = window.prompt("Nombre del canal");
    if (!name?.trim()) return;
    const { data } = await supabase.from("channels").insert({ server_id: activeServer, name: name.trim().toLowerCase().replace(/\s+/g, "-"), kind: "text" }).select("id").single();
    if (data) onSelect("channel", data.id);
  };

  return (
    <div className="channel-sidebar">
      <div className="channel-header">
        <span>{channels.find((c) => c.id === active?.id)?.name ?? "Canales"}</span>
        <div className="header-actions">
          <button onClick={onShowMembers} title="Miembros">👥</button>
          <button onClick={onOpenInvite} title="Invitar">🔗</button>
          {canManage(serverRole) && <button onClick={onOpenAdmin} title="Admin">⚙️</button>}
        </div>
      </div>

      <div className="channel-list">
        {channels.filter((c) => c.kind === "text").map((c) => (
          <button key={c.id} className={`channel ${active?.kind === "channel" && active.id === c.id ? "active" : ""}`} onClick={() => onSelect("channel", c.id)}>
            <span className="hash">#</span> {c.name}
          </button>
        ))}
        <button className="create-channel" onClick={createChannel}>+ Nuevo canal</button>
      </div>

      <div className="dm-section">
        <div className="dm-header">
          <span>Conversaciones</span>
        </div>

        <div className="dm-search">
          <input
            placeholder="Buscar usuario para DM…"
            value={dmSearch}
            onChange={(e) => { onSearchUsers(e.target.value); setNewGroup(""); setGroupMembers([]); }}
          />
        </div>

        {dmSearch !== "" && (
          <div className="dm-search-results">
            {dmResults.length === 0 && <div className="dm-hint">Sin resultados</div>}
            {dmResults.map((u) => (
              <div key={u.id} className="dm-search-row">
                <label className="dm-checkbox">
                  <input type="checkbox" checked={groupMembers.includes(u.id)} onChange={() => setGroupMembers((s) => s.includes(u.id) ? s.filter((x) => x !== u.id) : [...s, u.id])} />
                </label>
                <span>{u.display_name || u.username}</span>
                <button onClick={() => onStartDM(u.id)}>Mensaje</button>
              </div>
            ))}
            {dmSearch.length >= 2 && groupMembers.length >= 1 && (
              <button className="dm-create-group" onClick={() => onCreateGroup(newGroup.trim() || `Grupo ${groupMembers.length + 1}`, groupMembers)}>
                Crear grupo
              </button>
            )}
          </div>
        )}

        {conversations.map((c) => (
          <button key={c.id} className={`channel ${active?.kind === "conversation" && active.id === c.id ? "active" : ""}`} onClick={() => onSelect("conversation", c.id)}>
            {c.kind === "direct" ? "👤 " : "👥 "}{c.name || "Conversación"}
          </button>
        ))}
        <div className="dm-hint">Busca arriba para iniciar una conversación nueva.</div>
      </div>
    </div>
  );
}
