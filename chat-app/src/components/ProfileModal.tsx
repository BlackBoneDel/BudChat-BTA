import { useState, useRef } from "react";
import { useAppAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { uploadAvatar } from "../lib/storage";
import type { Profile } from "../lib/types";

// Modal para editar el perfil propio (display name, avatar, bio).
export function ProfileModal({ profile, onClose }: { profile: Profile | null; onClose: () => void }) {
  const { user, refreshProfile } = useAppAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatar, setAvatar] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadAvatar(file, user.id);
    if (url) setAvatar(url);
  };

  const save = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ display_name: displayName, bio, avatar_url: avatar || null }).eq("id", user.id);
    await refreshProfile(user.id);
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mi perfil</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="profile-avatar-wrap" onClick={() => fileRef.current?.click()}>
          <img src={avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.username || "?"}`} alt="" className="profile-avatar-big" />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
          <span className="profile-avatar-edit">📷</span>
        </div>
        <label>Nombre visible</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} />
        <label>Biografía</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={160} />
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}
