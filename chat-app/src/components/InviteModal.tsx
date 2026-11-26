import { useState } from "react";
import { supabase, getCurrentUid } from "../lib/supabase";

// Modal de invitaciones: crear código y unirse con uno.
export function InviteModal({ serverId, onClose }: { serverId: string | null; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [joinErr, setJoinErr] = useState<string | null>(null);

  const create = async () => {
    const { data } = await supabase.rpc("gen_invite_code");
    const inviteCode = data || Math.random().toString(36).slice(2, 10);
    const uid = (await getCurrentUid()) || "";
    const { data: inv } = await supabase
      .from("invites")
      .insert({ server_id: serverId, code: inviteCode, label: "Invitación", created_by: uid })
      .select("code")
      .single();
    if (inv) {
      setCreated(inv.code);
      const link = `${window.location.origin}/?invite=${inv.code}`;
      try { await navigator.clipboard.writeText(link); } catch {}
    }
  };

  const join = async () => {
    if (!code.trim() || !serverId) return;
    const { data: inv } = await supabase.from("invites").select("*").eq("code", code.trim()).maybeSingle();
    if (!inv) { setJoinErr("Código no válido"); return; }
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) { setJoinErr("Invitación expirada"); return; }
    if (inv.max_uses !== null && inv.uses >= inv.max_uses) { setJoinErr("Invitación agotada"); return; }
    const uid = await getCurrentUid();
    if (!uid) return;
    const { data: existing } = await supabase.from("server_members").select("*").eq("server_id", serverId).eq("user_id", uid).maybeSingle();
    if (!existing) {
      await supabase.from("server_members").insert({ server_id: serverId, user_id: uid, role: "member" });
    }
    await supabase.from("invites").update({ uses: inv.uses + 1 }).eq("id", inv.id);
    onClose();
  };

  if (!serverId) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invitaciones</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="invite-section">
          <label>Generar invitación</label>
          <button onClick={create}>Crear código de invitación</button>
          {created && (
            <div className="invite-result">
              <code>{created}</code>
              <span className="invite-link">Se copió: {window.location.origin}/?invite={created}</span>
            </div>
          )}
        </div>

        <div className="invite-section">
          <label>Unirse con código</label>
          <div className="invite-join">
            <input placeholder="código de invitación" value={code} onChange={(e) => setCode(e.target.value)} />
            <button onClick={join}>Unirse</button>
          </div>
          {joinErr && <div className="login-error">{joinErr}</div>}
        </div>
      </div>
    </div>
  );
}
