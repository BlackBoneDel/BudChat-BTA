import { useState, useEffect } from "react";
import { useAppAuth } from "./context/AuthContext";
import { supabase, getCurrentUid } from "./lib/supabase";
import { LoginScreen } from "./components/LoginScreen";
import { ServerSidebar } from "./components/ServerSidebar";
import { ChannelSidebar } from "./components/ChannelSidebar";
import { MessageArea } from "./components/MessageArea";
import { MemberList } from "./components/MemberList";
import { UserPanel } from "./components/UserPanel";
import { ProfileModal } from "./components/ProfileModal";
import { AdminPanel } from "./components/AdminPanel";
import { InviteModal } from "./components/InviteModal";
import { useNotifications, notify } from "./hooks/useNotifications";

interface Active {
  kind: "channel" | "conversation";
  id: string;
}

// Componente raíz: arma la layout Discord y conecta todos los paneles.
export default function App() {
  const { user, profile } = useAppAuth();
  const [activeServer, setActiveServer] = useState<string | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [showMembers, setShowMembers] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [dmResults, setDmResults] = useState<{ id: string; username: string; display_name: string }[]>([]);
  const { unread, markAllRead } = useNotifications(user?.id);

  // Procesar invite link (?invite=CODE)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("invite");
    if (!code || !user) return;
    const join = async () => {
      const uid = user.id;
      const { data: inv } = await supabase.from("invites").select("*").eq("code", code).maybeSingle();
      if (inv && inv.server_id) {
        const { data: existing } = await supabase.from("server_members").select("*").eq("server_id", inv.server_id).eq("user_id", uid).maybeSingle();
        if (!existing) {
          await supabase.from("server_members").insert({ server_id: inv.server_id, user_id: uid, role: "member" });
          await supabase.from("invites").update({ uses: (inv.uses ?? 0) + 1 }).eq("id", inv.id);
        }
        setActiveServer(inv.server_id);
        window.history.replaceState({}, "", window.location.pathname);
      }
    };
    join();
  }, [user]);

  const openChannel = (kind: "channel" | "conversation", id: string) => setActive({ kind, id });

  const searchUsers = async (q: string) => {
    setDmSearch(q);
    if (q.length < 2) { setDmResults([]); return; }
    const me = (await getCurrentUid()) || "";
    const { data } = await supabase.from("profiles").select("id,username,display_name").ilike("username", `%${q}%`).neq("id", me).limit(8);
    setDmResults((data ?? []) as { id: string; username: string; display_name: string }[]);
  };

  const startDM = async (otherId: string) => {
    const uid = await getCurrentUid();
    if (!uid) return;
    // Busca conversación existente entre ambos
    const { data: existing } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", uid)
      .limit(500);
    const convIds = (existing ?? []).map((e) => e.conversation_id);
    let targetId: string | null = null;
    for (const cid of convIds) {
      const { data: ms } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", cid);
      const ids = (ms ?? []).map((m) => m.user_id);
      if (ids.length === 2 && ids.includes(otherId)) { targetId = cid; break; }
    }
    if (targetId) {
      openChannel("conversation", targetId);
    } else {
      const { data: conv } = await supabase.from("conversations").insert({ kind: "direct", name: null }).select("id").single();
      if (!conv) return;
      await supabase.from("conversation_members").insert([{ conversation_id: conv.id, user_id: uid }, { conversation_id: conv.id, user_id: otherId }]);
      openChannel("conversation", conv.id);
    }
    setDmSearch(""); setDmResults([]);
  };

  const createGroup = async (name: string, memberIds: string[]) => {
    const uid = await getCurrentUid();
    if (!uid || name.trim() === "") return;
    const { data: conv } = await supabase.from("conversations").insert({ kind: "group", name: name.trim() }).select("id").single();
    if (!conv) return;
    const all = Array.from(new Set([uid, ...memberIds]));
    const rows = all.map((id) => ({ conversation_id: conv.id, user_id: id }));
    await supabase.from("conversation_members").insert(rows);
    openChannel("conversation", conv.id);
  };

  if (!user) return <LoginScreen />;

  const canManage = (role: string | null) => role === "admin" || role === "owner";

  return (
    <div className="app">
      <ServerSidebar
        activeServer={activeServer}
        onSelect={(id) => { setActiveServer(id); setActive(null); }}
        onCreate={async (name) => {
          const uid = await getCurrentUid();
          if (!uid) return;
          const { data: srv } = await supabase.from("servers").insert({ name, owner_id: uid }).select("id").single();
          if (!srv) return;
          await supabase.from("server_members").insert({ server_id: srv.id, user_id: uid, role: "owner" });
          await supabase.from("channels").insert([
            { server_id: srv.id, name: "general", kind: "text" },
            { server_id: srv.id, name: "anuncios", kind: "text" },
          ]);
          setActiveServer(srv.id);
          await notify(uid, "server", "Servidor creado", `Tu servidor "${name}" está listo.`);
        }}
      />

      <div className="left-column">
        <ChannelSidebar
          activeServer={activeServer}
          active={active}
          onSelect={openChannel}
          onOpenInvite={() => setShowInvite(true)}
          onSearchUsers={searchUsers}
          dmSearch={dmSearch}
          dmResults={dmResults}
          onStartDM={startDM}
          onCreateGroup={createGroup}
          canManage={canManage}
          onOpenAdmin={() => setShowAdmin(true)}
          onShowMembers={() => setShowMembers(true)}
        />
        <UserPanel
          profile={profile}
          unread={unread}
          onShowProfile={() => setShowProfile(true)}
          onMarkRead={markAllRead}
          onOpenInvite={() => setShowInvite(true)}
        />
      </div>

      <div className="main-area">
        {active ? <MessageArea key={`${active.kind}:${active.id}`} channelId={active.id} kind={active.kind} /> :
          <div className="home-placeholder">
            <h2>¡Bienvenido, {profile?.display_name || profile?.username}!</h2>
            <p>Selecciona un canal o conversación, o crea un servidor nuevo.</p>
            <button onClick={() => setShowInvite(true)}>Invitar a alguien</button>
          </div>}
      </div>

      {showMembers && activeServer && (
        <MemberList serverId={activeServer} onClose={() => setShowMembers(false)} />
      )}

      {showProfile && <ProfileModal profile={profile} onClose={() => setShowProfile(false)} />}
      {showAdmin && <AdminPanel serverId={activeServer} onClose={() => setShowAdmin(false)} />}
      {showInvite && <InviteModal serverId={activeServer} onClose={() => setShowInvite(false)} />}
    </div>
  );
}
