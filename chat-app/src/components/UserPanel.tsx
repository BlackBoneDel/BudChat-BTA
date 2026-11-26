import { useState, useRef, useEffect } from "react";
import { useAppAuth } from "../context/AuthContext";
import type { Profile, Status } from "../lib/types";

const STATUSES: { value: Status; label: string; emoji: string }[] = [
  { value: "online", label: "En línea", emoji: "🟢" },
  { value: "away", label: "Ausente", emoji: "🟡" },
  { value: "dnd", label: "No molestar", emoji: "🔴" },
  { value: "invisible", label: "Invisible", emoji: "⚫" },
];

// Panel de usuario (abajo-izquierda) con avatar, estado y menú.
export function UserPanel({
  profile,
  unread = 0,
  onShowProfile,
  onMarkRead,
  onOpenInvite,
}: {
  profile: Profile | null;
  unread?: number;
  onShowProfile: () => void;
  onMarkRead: () => void | Promise<void>;
  onOpenInvite: () => void;
}) {
  const { user, setStatus, signOut } = useAppAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user || !profile) return null;
  const status = profile.status || "offline";

  return (
    <div className="user-panel" ref={ref}>
      <div className="user-panel-info" onClick={() => { setStatusOpen((v) => !v); setMenuOpen(false); }}>
        <div className={`user-panel-avatar status-${status}`}>
          <img src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}`} alt="" />
          <span className="status-dot" data-status={status} />
        </div>
        <div className="user-panel-text">
          <div className="user-panel-name">{profile.display_name || profile.username}</div>
          <div className="user-panel-status">{STATUSES.find((s) => s.value === status)?.label || "Sin conexión"}</div>
        </div>
      </div>

      <div className="user-panel-actions">
        {statusOpen && (
          <div className="status-popover">
            {STATUSES.map((s) => (
              <button key={s.value} className={status === s.value ? "selected" : ""} onClick={() => { setStatus(s.value); setStatusOpen(false); }}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        )}
        <button className="icon-btn" title="Notificaciones" onClick={() => { setMenuOpen((v) => !v); setStatusOpen(false); }}>🔔{unread > 0 ? <span className="badge">{unread}</span> : null}</button>
        <button className="icon-btn" title="Ajustes" onClick={() => { setMenuOpen((v) => !v); setStatusOpen(false); }}>⚙️</button>
      </div>

      {menuOpen && (
        <div className="user-menu">
          {unread > 0 && (
            <button onClick={() => { setMenuOpen(false); onMarkRead(); }}>Marcar como leídas ({unread})</button>
          )}
          <button onClick={() => { setMenuOpen(false); onOpenInvite(); }}>Invitar amigos</button>
          <button onClick={() => { setMenuOpen(false); onShowProfile(); }}>Mi perfil</button>
          <button onClick={() => { setMenuOpen(false); signOut(); }}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
