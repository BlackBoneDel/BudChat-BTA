import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAppAuth } from "../context/AuthContext";
import type { Server } from "../lib/types";

// Barra lateral de servidores (iconos) + botón para crear/unirse.
export function ServerSidebar({ activeServer, onSelect, onCreate }: {
  activeServer: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const { user } = useAppAuth();
  const [servers, setServers] = useState<Server[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Solo servidores donde el usuario es miembro
      const { data: memberships } = await supabase
        .from("server_members")
        .select("server_id")
        .eq("user_id", user.id);
      const ids = (memberships ?? []).map((m) => m.server_id);
      if (ids.length === 0) {
        setServers([]);
        return;
      }
      const { data } = await supabase.from("servers").select("*").in("id", ids);
      setServers((data ?? []) as Server[]);
    };
    load();
    // Suscribirse a cambios de membresía
    const ch = supabase.channel("servers-list");
    ch.on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [user]);

  const createServer = async (name: string) => {
    if (!user || !name.trim()) return;
    await onCreate(name.trim());
    setShowCreate(false);
  };

  return (
    <aside className="server-sidebar">
      <div className="server-list">
        {servers.map((s) => (
          <button
            key={s.id}
            className={`server-icon ${activeServer === s.id ? "active" : ""}`}
            title={s.name}
            onClick={() => onSelect(activeServer === s.id ? null : s.id)}
          >
            {s.name.slice(0, 2).toUpperCase()}
          </button>
        ))}
        <button className="server-icon add" title="Crear servidor" onClick={() => setShowCreate(true)}>
          +
        </button>
      </div>

      {showCreate && (
        <div className="modal">
          <h2>Nuevo servidor</h2>
          <input
            autoFocus
            placeholder="Nombre del servidor"
            onKeyDown={(e) => e.key === "Enter" && createServer((e.target as HTMLInputElement).value)}
          />
          <div className="modal-actions">
            <button onClick={() => setShowCreate(false)}>Cancelar</button>
            <button onClick={() => createServer((document.querySelector(".modal input") as HTMLInputElement).value)}>Crear</button>
          </div>
        </div>
      )}
    </aside>
  );
}
